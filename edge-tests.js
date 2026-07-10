import { GameDB } from '@db';
import { getState, replaceState } from '@state';
import { createStateDraft } from './state-transactions.js?v=core001';
import { drawGachaMany } from '@actions/gacha';
import { claimDailyReward } from '@actions/daily';
import { gatherAt } from '@actions/gather';
import { importSave } from '@save';
import { openSettings, closeModal } from '@ui';
import { renderFairies } from '@pages/fairies';

function shouldRunEdgeTests() {
  return new URLSearchParams(window.location.search).get('edge') === '1';
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function prepareState(original, mutate) {
  const draft = clone(original);
  if (typeof mutate === 'function') mutate(draft);
  replaceState(draft);
  return getState();
}

function runCase(results, name, test) {
  const startedAt = performance.now();
  try {
    const detail = test() || '';
    results.push({ name, ok: true, detail, durationMs: Math.round(performance.now() - startedAt) });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error?.message || String(error),
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
}

function getDropRarity(drop) {
  if (drop?.kind === 'fairy') return GameDB.fairies?.[drop.id]?.rarity;
  if (drop?.kind === 'item') return GameDB.items?.[drop.id]?.rarity;
  return null;
}

function testHardPity(original) {
  const pool = GameDB.gachaPools?.standard;
  assert(pool, '找不到 standard 祈願池');
  const hardPityAt = Math.max(1, Number(GameDB.gachaConfig?.hardPityAt || 20));
  const cost = Math.max(1, Number(pool.cost?.amount || 1));

  prepareState(original, (draft) => {
    draft.player ||= {};
    draft.player[pool.cost.currency] = cost;
    draft.gacha = { totalPulls: hardPityAt - 1, pityCounter: hardPityAt - 1 };
    draft.gachaHistory = [];
  });

  const result = drawGachaMany('standard', 1);
  assert(result.ok && result.drops?.length === 1, result.message || '保底抽卡失敗');
  const drop = result.drops[0];
  assert(drop.pityHit === true, '第 20 抽沒有標記 pityHit');
  assert(getDropRarity(drop) === 'SSR', `保底結果不是 SSR：${drop.kind}/${drop.id}`);
  assert(Number(getState().gacha?.pityCounter || 0) === 0, '抽到 SSR 後保底沒有歸零');
  return `${drop.kind}:${drop.id}，保底歸零`;
}

function testPartialTenPull(original) {
  const pool = GameDB.gachaPools?.standard;
  assert(pool, '找不到 standard 祈願池');
  const cost = Math.max(1, Number(pool.cost?.amount || 1));
  const affordablePulls = 3;

  prepareState(original, (draft) => {
    draft.player ||= {};
    draft.player[pool.cost.currency] = cost * affordablePulls;
    draft.gacha = { totalPulls: 0, pityCounter: 0 };
    draft.gachaHistory = [];
  });

  const result = drawGachaMany('standard', 10);
  assert(result.ok, result.message || '部分十連失敗');
  assert(result.partial === true, '貨幣不足時沒有標記 partial');
  assert(result.drops?.length === affordablePulls, `應完成 ${affordablePulls} 抽，實際 ${result.drops?.length || 0} 抽`);
  assert(Number(getState().player?.[pool.cost.currency] || 0) === 0, '貨幣沒有剛好扣完');
  assert(Number(getState().gacha?.totalPulls || 0) === affordablePulls, '累計抽數不正確');
  assert(getState().gachaHistory?.length === affordablePulls, '抽卡紀錄數量不正確');
  return `只夠 ${affordablePulls} 抽時，正確完成 ${result.drops.length} 抽`;
}

function testDuplicateDailyClaim(original) {
  prepareState(original, (draft) => {
    draft.daily ||= {};
    draft.daily.lastCheckIn = null;
    draft.daily.streak = 0;
  });

  const first = claimDailyReward();
  assert(first.ok, first.message || '第一次簽到失敗');
  const stateAfterFirst = clone({ player: getState().player, inventory: getState().inventory, daily: getState().daily });
  const second = claimDailyReward();
  const stateAfterSecond = clone({ player: getState().player, inventory: getState().inventory, daily: getState().daily });

  assert(!second.ok && second.reason === 'claimed', '同一天第二次簽到沒有被阻止');
  assert(JSON.stringify(stateAfterSecond) === JSON.stringify(stateAfterFirst), '第二次簽到仍改動了獎勵或狀態');
  return '同日第二次簽到被拒絕，狀態未改動';
}

function testGatherLimitAndRollover(original) {
  const locationId = Object.keys(GameDB.gatherTables || {})[0];
  assert(locationId, '沒有採集地點');
  const limit = Math.max(1, Number(GameDB.gatherConfig?.dailyLimit || 5));

  prepareState(original, (draft) => {
    draft.unlockedScenes ||= {};
    draft.unlockedScenes[locationId] = true;
    draft.gathering ||= {};
    draft.gathering[locationId] = { lastDate: null, count: 0 };
  });

  for (let i = 0; i < limit; i += 1) {
    const result = gatherAt(locationId);
    assert(result.ok, `第 ${i + 1} 次採集失敗：${result.message || ''}`);
  }
  const blocked = gatherAt(locationId);
  assert(!blocked.ok && blocked.isDepleted, `第 ${limit + 1} 次採集沒有被阻止`);
  assert(Number(getState().gathering?.[locationId]?.count || 0) === limit, '採集上限後次數仍增加');

  prepareState(original, (draft) => {
    draft.unlockedScenes ||= {};
    draft.unlockedScenes[locationId] = true;
    draft.gathering ||= {};
    draft.gathering[locationId] = { lastDate: '2000-01-01', count: limit };
  });
  const rollover = gatherAt(locationId);
  assert(rollover.ok, '跨日後採集次數沒有重置');
  assert(getState().gathering?.[locationId]?.lastDate === localDateString(), '跨日後沒有寫入今天日期');
  assert(Number(getState().gathering?.[locationId]?.count || 0) === 1, '跨日後採集次數不是 1');
  return `每日 ${limit} 次上限與跨日重置正常`;
}

function testLegacySaveMigration(original) {
  const fairyId = Object.keys(GameDB.fairies || {})[0];
  assert(fairyId, '沒有精靈資料可測試');
  const legacy = {
    saveVersion: 1,
    player: { leafCoin: 777 },
    inventory: { desert_oasis_dew: 2, oasis_dew: 3 },
    fairies: {
      [fairyId]: {
        owned: true,
        affection: 12,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        name: '不應存入',
        passiveBuff: { value: 999 },
      },
    },
    gachaHistory: [{
      poolId: 'standard',
      kind: 'item',
      id: 'desert_oasis_dew',
      qty: 1,
      pityHit: false,
      item: { id: 'desert_oasis_dew', name: '不應存入' },
    }],
  };

  const imported = importSave(JSON.stringify(legacy));
  assert(imported.inventory?.oasis_dew === 5, '舊綠洲露數量沒有合併');
  assert(!Object.prototype.hasOwnProperty.call(imported.inventory || {}, 'desert_oasis_dew'), '舊素材 ID 沒有移除');
  assert(Object.keys(imported.fairies?.[fairyId] || {}).every((key) => ['owned', 'affection', 'obtainedAt'].includes(key)), '精靈資料沒有依白名單清洗');
  assert(Object.keys(imported.gachaHistory?.[0] || {}).every((key) => ['poolId', 'kind', 'id', 'qty', 'pityHit', 'pityCounterAfter', 'totalPullsAfter', 'at'].includes(key)), '抽卡紀錄仍保留完整物件');
  assert(imported.gachaHistory?.[0]?.id === 'oasis_dew', '抽卡歷史的舊 ID 沒有轉換');

  replaceState(imported);
  assert(Number(getState().player?.leafCoin || 0) === 777, '舊存檔既有貨幣沒有保留');
  assert(Number(getState().player?.starSugar || 0) === 128, '舊存檔缺少的新欄位沒有套用新版預設值');
  return '舊 ID 合併、物件清洗、新欄位預設值正常';
}

function testInvalidSaveRejection(original) {
  prepareState(original);
  const before = JSON.stringify(getState());
  const invalidInputs = ['', '[]', 'not-json-or-base64'];
  let rejected = 0;

  invalidInputs.forEach((input) => {
    try {
      importSave(input);
    } catch (error) {
      rejected += 1;
    }
  });

  assert(rejected === invalidInputs.length, `只拒絕 ${rejected}/${invalidInputs.length} 種無效存檔`);
  assert(JSON.stringify(getState()) === before, '匯入失敗後目前存檔被改動');
  return `${rejected} 種無效存檔全部拒絕`;
}

function testSettingsEventBinding(original) {
  prepareState(original, (draft) => {
    draft.settings ||= {};
    draft.settings.sound = false;
  });

  for (let i = 0; i < 20; i += 1) openSettings();
  const button = document.querySelector('#modalHost [data-setting="sound"]');
  assert(button, '找不到音效設定按鈕');
  button.click();
  assert(getState().settings?.sound === true, '單次點擊沒有只切換一次，疑似事件重複綁定');
  closeModal();
  return '設定視窗重開 20 次後，單次點擊只執行一次';
}

function findFairyGiftPair() {
  for (const fairy of Object.values(GameDB.fairies || {})) {
    for (const itemId of fairy.favoriteSweets || []) {
      const item = GameDB.items?.[itemId];
      if (item && GameDB.isGiftableItem?.(item)) return { fairy, itemId };
    }
  }
  return null;
}

function testFairyEventBinding(original) {
  const pair = findFairyGiftPair();
  assert(pair, '找不到可送禮的精靈與物品');
  const { fairy, itemId } = pair;
  const startingQty = 5;

  prepareState(original, (draft) => {
    draft.fairies ||= {};
    draft.fairies[fairy.id] = { owned: true, affection: 0, obtainedAt: new Date().toISOString() };
    draft.inventory ||= {};
    draft.inventory[itemId] = startingQty;
  });

  for (let i = 0; i < 20; i += 1) renderFairies();
  const button = document.querySelector(`#page-fairies [data-feed-fairy="${fairy.id}"][data-gift-item="${itemId}"]`);
  assert(button, '找不到精靈送禮按鈕');
  button.click();

  const base = Number(GameDB.fairyConfig?.giftAffection || 5);
  const multiplier = Number(GameDB.fairyConfig?.favoriteMultiplier || 2);
  const expectedGain = Math.max(1, Math.round(base * multiplier));
  assert(Number(getState().inventory?.[itemId] || 0) === startingQty - 1, '單次點擊消耗了不只一份禮物');
  assert(Number(getState().fairies?.[fairy.id]?.affection || 0) === expectedGain, '單次點擊增加了不只一次好感');
  closeModal();
  return `精靈頁重繪 20 次後，禮物 -1、好感 +${expectedGain}`;
}

export function runEdgeTests() {
  if (!shouldRunEdgeTests()) return { skipped: true, results: [] };

  const original = createStateDraft();
  const results = [];

  try {
    runCase(results, '第 20 抽保底 SSR', () => testHardPity(original));
    runCase(results, '星糖不足的部分十連', () => testPartialTenPull(original));
    runCase(results, '同日重複簽到', () => testDuplicateDailyClaim(original));
    runCase(results, '採集上限與跨日重置', () => testGatherLimitAndRollover(original));
    runCase(results, '舊存檔遷移與白名單清洗', () => testLegacySaveMigration(original));
    runCase(results, '無效存檔拒絕', () => testInvalidSaveRejection(original));
    runCase(results, '設定 modal 事件防重複', () => testSettingsEventBinding(original));
    runCase(results, '精靈送禮事件防重複', () => testFairyEventBinding(original));
  } finally {
    closeModal();
    replaceState(original);
    renderFairies();
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  const report = { skipped: false, ok: failed === 0, passed, failed, results };
  window.__fairyCafeEdgeReport = report;

  if (failed) console.error('[Edge Tests]', report);
  else console.info('[Edge Tests]', report);

  return report;
}

export function renderEdgeTestReport(report) {
  if (!report || report.skipped) return '';
  const rows = report.results.map((result) => `
    <li class="${result.ok ? 'is-pass' : 'is-fail'}">
      <b>${result.ok ? '✅' : '❌'} ${escapeHtml(result.name)}</b>
      <span>${escapeHtml(result.detail || '')}</span>
      <small>${result.durationMs}ms</small>
    </li>
  `).join('');

  return `
    <div class="core-modal-card smoke-test-modal edge-test-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">EDGE CASE TEST</span>
      <h2>${report.ok ? '邊界測試全部通過' : '邊界測試發現問題'}</h2>
      <p>通過 ${report.passed} 項，失敗 ${report.failed} 項。測試完成後已還原原本存檔。</p>
      <ul class="smoke-test-results">${rows}</ul>
    </div>
  `;
}
