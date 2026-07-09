import { GameDB } from '@db';
import { getState } from '@state';
import { drawGacha, getGachaPityStatus } from '@actions/gacha';
import { emitNotice } from '@eventBus';
import { showModal } from '@ui';

function pageHeader(kicker, title, body) {
  return `<div class="core-page-head gacha-page-head"><span>${kicker}</span><h2>${title}</h2><p>${body}</p></div>`;
}

function getRecordMeta(record) {
  if (record.kind === 'fairy') return GameDB.fairies[record.id];
  if (record.kind === 'item') return GameDB.items[record.id];
  return null;
}

function renderDrop(record) {
  if (!record) return '';
  if (record.kind === 'fairy') {
    const fairy = GameDB.fairies[record.id];
    if (!fairy) return '';
    return `<article class="core-result-card ssr ${record.pityHit ? 'pity-hit' : ''}"><div style="font-size:44px">${fairy.icon}</div><b>${fairy.name}</b><span>${fairy.rarity}${record.pityHit ? ' / 保底' : ''} 契約成立</span><p>「${fairy.quote}」</p></article>`;
  }
  const item = GameDB.items[record.id];
  if (!item) return '';
  return `<article class="core-result-card ${record.pityHit ? 'pity-hit' : ''}"><div style="font-size:34px">${item.icon}</div><b>${item.name} ×${record.qty}</b><span>${item.rarity} / ${GameDB.getItemTypeLabel(item.type)}</span><p>${item.description}</p></article>`;
}

function renderPityStatus() {
  const pity = getGachaPityStatus();
  const percent = Math.round((pity.pityCounter / pity.hardPityAt) * 100);
  return `
    <div class="gacha-pity-box">
      <div><b>SSR 保底</b><span>${pity.pityCounter}/${pity.hardPityAt}</span></div>
      <em><strong style="width:${Math.min(100, percent)}%"></strong></em>
      <small>還差 ${pity.remaining} 抽保底；累計 ${pity.totalPulls} 抽。</small>
    </div>`;
}

function getHistoryRecords() {
  return (getState().gachaHistory || []).slice(0, Number(GameDB.gachaConfig?.historyLimit || 20));
}

function renderHistoryList() {
  const history = getHistoryRecords();
  if (!history.length) return '<p class="core-empty">還沒有祈願歷史。</p>';
  return `<div class="gacha-history-list">${history.map((record, index) => {
    const meta = getRecordMeta(record);
    if (!meta) return '';
    const typeLabel = record.kind === 'fairy' ? '精靈契約' : '素材商品';
    return `<article class="gacha-history-row ${record.pityHit ? 'pity-hit' : ''}"><span>${String(index + 1).padStart(2, '0')}</span><b>${meta.icon || '◇'} ${meta.name || record.id}</b><small>${typeLabel}${record.qty ? ` ×${record.qty}` : ''}${record.pityHit ? '｜保底' : ''}</small></article>`;
  }).join('')}</div>`;
}

function showGachaHistoryModal() {
  showModal(`
    <div class="core-modal-card gacha-history-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">WISH HISTORY</span>
      <h2>祈願紀錄</h2>
      <p>最近 ${Number(GameDB.gachaConfig?.historyLimit || 20)} 筆祈願會保留在這裡。</p>
      ${renderHistoryList()}
    </div>
  `);
}

function showGachaResultModal(records = []) {
  if (!records.length) return;
  showModal(`
    <div class="core-modal-card gacha-result-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">WISH RESULT</span>
      <h2>祈願結果</h2>
      <div class="core-list">${records.map(renderDrop).join('')}</div>
    </div>
  `);
}

function getFeaturedFairy(pool) {
  const fairyDrop = (pool.drops || []).find((drop) => drop.kind === 'fairy');
  return GameDB.fairies?.[fairyDrop?.id] || Object.values(GameDB.fairies || {})[0] || null;
}

function renderFeaturedCharacter(fairy) {
  if (!fairy) return '';
  const buff = fairy.passiveBuff?.label || '祈願限定精靈';
  return `
    <section class="gacha-character-banner" aria-label="本期祈願角色">
      <div class="gacha-banner-copy">
        <span class="gacha-banner-tag">SSR PICK UP</span>
        <h3>${fairy.name}</h3>
        <p>「${fairy.quote || '今天的魔法，也會好好抵達。'}」</p>
        <div class="gacha-character-tags"><span>${fairy.rarity || 'SSR'}</span><span>${buff}</span></div>
      </div>
      <div class="gacha-character-stage" aria-label="${fairy.name} 立繪佔位">
        <div class="gacha-character-aura"></div>
        <div class="gacha-character-standee"><span>${fairy.icon || '🧚'}</span></div>
        <div class="gacha-character-nameplate">${fairy.name}</div>
      </div>
    </section>`;
}

function renderPoolDrops(pool) {
  const drops = (pool.drops || []).slice(0, 6);
  return `
    <div class="gacha-pool-preview">
      <span>可能獲得</span>
      <div>${drops.map((drop) => {
        const meta = drop.kind === 'fairy' ? GameDB.fairies?.[drop.id] : GameDB.items?.[drop.id];
        return `<b>${meta?.icon || '◇'}</b>`;
      }).join('')}</div>
    </div>`;
}

function handleGachaClick(event) {
  const page = document.querySelector('#page-gacha');
  if (!page?.contains(event.target)) return;

  const historyButton = event.target.closest('[data-gacha-history]');
  if (historyButton) {
    showGachaHistoryModal();
    return;
  }

  const button = event.target.closest('[data-draw]');
  if (!button) return;

  button.disabled = true;
  const times = Number(button.dataset.draw || 1);
  const drawn = [];
  for (let i = 0; i < times; i += 1) {
    const result = drawGacha('standard');
    if (!result.ok) {
      emitNotice('祈願失敗', result.message);
      break;
    }
    drawn.push(result.drop);
  }

  renderGacha();
  if (drawn.some((record) => record.pityHit)) emitNotice('SSR 保底觸發', '魔法陣亮起，保底 SSR 已經降臨。');
  if (drawn.length) window.setTimeout(() => showGachaResultModal(drawn), 180);
}

function bindGachaEvents() {
  const page = document.querySelector('#page-gacha');
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', handleGachaClick);
}

export function renderGacha() {
  const page = document.querySelector('#page-gacha');
  if (!page) return;
  const state = getState();
  const pool = GameDB.gachaPools.standard;
  const costMeta = GameDB.currencies[pool.cost.currency];
  const featuredFairy = getFeaturedFairy(pool);
  page.innerHTML = `
    ${pageHeader('WISH', '星糖祈願', '本期精靈 Pick Up。立繪先用佔位，之後可以換成你畫的角色圖。')}
    <section class="gacha-wish-page">
      <div class="gacha-stage-actions">
        <button type="button" data-gacha-history>祈願紀錄</button>
      </div>
      ${renderFeaturedCharacter(featuredFairy)}
      <section class="gacha-control-panel">
        <div class="gacha-pool-title">
          <span>STANDARD WISH</span>
          <h3>${pool.name}</h3>
          <p>${pool.description}</p>
        </div>
        ${renderPityStatus()}
        ${renderPoolDrops(pool)}
        <div class="gacha-currency-row"><span>持有 ${costMeta.icon} ${state.player[pool.cost.currency]}</span><span>單抽 ${costMeta.icon} ${pool.cost.amount}</span></div>
        <div class="gacha-draw-actions"><button type="button" data-draw="1">祈願 1 次</button><button type="button" data-draw="10">祈願 10 次</button></div>
      </section>
    </section>`;
}

export function initGachaPage() { bindGachaEvents(); }
