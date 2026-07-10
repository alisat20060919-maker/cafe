import { GameDB } from '@db';
import { getState, replaceState } from '@state';
import { createStateDraft } from './state-transactions.js?v=core001';
import { toggleSetting } from './state-transactions.js?v=core001';
import { drawGachaMany } from '@actions/gacha';
import { claimDailyReward } from '@actions/daily';
import { gatherAt } from '@actions/gather';
import { completeCommission } from '@actions/commission';
import { craftRecipe, getMaxCraftable } from './craft-actions.js?v=core101';
import { exportSave, importSave } from '@save';

function shouldRunSmokeTests() {
  const params = new URLSearchParams(window.location.search);
  return params.get('smoke') === '1';
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

function testSaveRoundTrip(original) {
  const encoded = exportSave(original);
  const decoded = importSave(encoded);
  assert(decoded && typeof decoded === 'object', '匯入結果不是物件');
  assert(Number(decoded.saveVersion || 0) === Number(original.saveVersion || 0), 'saveVersion 不一致');
  assert(Number(decoded.player?.starSugar || 0) === Number(original.player?.starSugar || 0), '玩家貨幣不一致');
  assert(JSON.stringify(decoded.inventory || {}) === JSON.stringify(original.inventory || {}), '背包資料不一致');
  return `匯出字串 ${encoded.length} 字元`;
}

function testSettingTransaction(original) {
  prepareState(original);
  const before = Boolean(getState().settings?.sound);
  const returned = toggleSetting('sound');
  const after = Boolean(getState().settings?.sound);
  assert(after === !before, '設定值沒有切換');
  assert(returned === after, 'transaction 回傳值不一致');
  return `${before ? 'ON' : 'OFF'} → ${after ? 'ON' : 'OFF'}`;
}

function testDailyReward(original) {
  prepareState(original, (draft) => {
    draft.daily ||= {};
    draft.daily.lastCheckIn = null;
    draft.daily.streak = 0;
  });
  const result = claimDailyReward();
  assert(result.ok, result.message || '簽到失敗');
  assert(Number(getState().daily?.streak || 0) === 1, '連續簽到天數不是 1');
  assert(Boolean(getState().daily?.lastCheckIn), '沒有寫入簽到日期');
  return result.message;
}

function testGachaBatch(original) {
  const pool = GameDB.gachaPools?.standard;
  assert(pool, '找不到 standard 祈願池');
  const cost = Math.max(0, Number(pool.cost?.amount || 0));
  const count = 10;
  const startingCurrency = cost * count + 500;

  prepareState(original, (draft) => {
    draft.player ||= {};
    draft.player[pool.cost.currency] = startingCurrency;
    draft.gacha = { totalPulls: 0, pityCounter: 0 };
    draft.gachaHistory = [];
  });

  const result = drawGachaMany('standard', count);
  assert(result.ok, result.message || '十連抽失敗');
  assert(result.drops?.length === count, `預期 ${count} 抽，實際 ${result.drops?.length || 0} 抽`);
  assert(Number(getState().gacha?.totalPulls || 0) === count, '累計抽數不正確');
  assert(Number(getState().player?.[pool.cost.currency] || 0) === startingCurrency - cost * count, '抽卡貨幣扣除不正確');
  assert(Array.isArray(getState().gachaHistory) && getState().gachaHistory.length === count, '抽卡歷史數量不正確');
  return `${count} 抽完成，保底計數 ${result.pity?.pityCounter ?? '—'}`;
}

function testGathering(original) {
  const locationId = Object.keys(GameDB.gatherTables || {})[0];
  assert(locationId, '沒有任何採集表');

  prepareState(original, (draft) => {
    draft.unlockedScenes ||= {};
    draft.unlockedScenes[locationId] = true;
    draft.gathering ||= {};
    draft.gathering[locationId] = { lastDate: null, count: 0 };
  });

  const beforeInventory = clone(getState().inventory || {});
  const result = gatherAt(locationId);
  assert(result.ok, result.message || '採集失敗');
  assert(Number(getState().gathering?.[locationId]?.count || 0) === 1, '採集次數沒有增加');
  const itemId = result.drop?.itemId;
  assert(itemId && Number(getState().inventory?.[itemId] || 0) > Number(beforeInventory[itemId] || 0), '採集物沒有加入背包');
  return `${locationId}：${result.dropView?.name || itemId}`;
}

function testAtomicBatchCrafting(original) {
  const recipe = Object.values(GameDB.recipes || {}).find((entry) => (
    entry?.station === 'kitchen'
    && Object.keys(entry.cost || {}).length > 0
    && GameDB.items?.[entry.output?.itemId]
  ));
  assert(recipe, '找不到可測試的廚房配方');
  const quantity = 3;
  const initialOutput = 2;

  prepareState(original, (draft) => {
    draft.player ||= {};
    draft.player.exp = Math.max(Number(draft.player.exp || 0), 999999);
    draft.player.level = Math.max(Number(draft.player.level || 1), 99);
    draft.unlockedScenes ||= {};
    Object.keys(GameDB.scenes || {}).forEach((sceneId) => { draft.unlockedScenes[sceneId] = true; });
    draft.inventory ||= {};
    Object.entries(recipe.cost || {}).forEach(([itemId, unitQty]) => {
      draft.inventory[itemId] = Number(unitQty || 0) * quantity;
    });
    draft.inventory[recipe.output.itemId] = initialOutput;
    draft.collection ||= {};
    draft.collection.discoveredItems ||= {};
    delete draft.collection.discoveredItems[recipe.output.itemId];
  });

  assert(getMaxCraftable(recipe.id) === quantity, `最多製作次數不是 ${quantity}`);
  const result = craftRecipe(recipe.id, quantity);
  assert(result.ok, result.message || '批次製作失敗');

  Object.keys(recipe.cost || {}).forEach((itemId) => {
    assert(Number(getState().inventory?.[itemId] || 0) === 0, `${itemId} 沒有正確扣完`);
  });

  const expectedOutput = initialOutput + Number(recipe.output.qty || 1) * quantity;
  assert(Number(getState().inventory?.[recipe.output.itemId] || 0) === expectedOutput, '批次成品數量不正確');
  assert(getState().collection?.discoveredItems?.[recipe.output.itemId] === true, '成品沒有登錄圖鑑');

  const stateBeforeFailure = JSON.stringify(getState());
  const failed = craftRecipe(recipe.id, 1);
  assert(!failed.ok, '材料不足時仍製作成功');
  assert(JSON.stringify(getState()) === stateBeforeFailure, '製作失敗後背包或狀態仍被改動');

  return `${recipe.name} ×${quantity} 原子交易與失敗回滾正常`;
}

function testCommission(original) {
  const commission = Object.values(GameDB.commissions || {})[0];
  assert(commission?.id, '沒有可測試的委託');
  const requirements = GameDB.getCommissionRequiredItems?.(commission) || commission.requiredItems || {};

  prepareState(original, (draft) => {
    draft.player ||= {};
    draft.player.exp = Math.max(Number(draft.player.exp || 0), 999999);
    draft.unlockedScenes ||= {};
    Object.keys(GameDB.scenes || {}).forEach((sceneId) => { draft.unlockedScenes[sceneId] = true; });
    draft.inventory ||= {};
    Object.entries(requirements).forEach(([itemId, qty]) => {
      draft.inventory[itemId] = Math.max(Number(draft.inventory[itemId] || 0), Number(qty || 0));
    });
    draft.commissions ||= {};
    delete draft.commissions[commission.id];
  });

  const result = completeCommission(commission.id);
  assert(result.ok, result.message || '委託完成失敗');
  assert(getState().commissions?.[commission.id]?.status === 'completed', '委託狀態不是 completed');
  return commission.title || commission.id;
}

export function runSmokeTests() {
  if (!shouldRunSmokeTests()) return { skipped: true, results: [] };

  const original = createStateDraft();
  const results = [];

  try {
    runCase(results, '存檔匯出／匯入', () => testSaveRoundTrip(original));
    runCase(results, '設定中央交易', () => testSettingTransaction(original));
    runCase(results, '每日簽到', () => testDailyReward(original));
    runCase(results, '十連抽與貨幣扣除', () => testGachaBatch(original));
    runCase(results, '採集與背包入帳', () => testGathering(original));
    runCase(results, '批次製作原子交易', () => testAtomicBatchCrafting(original));
    runCase(results, '委託完成與狀態', () => testCommission(original));
  } finally {
    replaceState(original);
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  const report = { skipped: false, ok: failed === 0, passed, failed, results };
  window.__fairyCafeSmokeReport = report;

  if (failed) console.error('[Smoke Tests]', report);
  else console.info('[Smoke Tests]', report);

  return report;
}

export function renderSmokeTestReport(report) {
  if (!report || report.skipped) return '';
  const rows = report.results.map((result) => `
    <li class="${result.ok ? 'is-pass' : 'is-fail'}">
      <b>${result.ok ? '✅' : '❌'} ${escapeHtml(result.name)}</b>
      <span>${escapeHtml(result.detail || '')}</span>
      <small>${result.durationMs}ms</small>
    </li>
  `).join('');

  return `
    <div class="core-modal-card smoke-test-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">REGRESSION TEST</span>
      <h2>${report.ok ? '核心功能測試通過' : '核心功能測試失敗'}</h2>
      <p>通過 ${report.passed} 項，失敗 ${report.failed} 項。測試完成後已還原原本存檔。</p>
      <ul class="smoke-test-results">${rows}</ul>
    </div>
  `;
}
