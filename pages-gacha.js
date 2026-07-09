import { GameDB } from '@db';
import { getState } from '@state';
import { drawGachaMany, getGachaPityStatus } from '@actions/gacha';
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

function getRecordRarity(record) {
  const meta = getRecordMeta(record);
  return meta?.rarity || 'R';
}

function getHighestRarity(records = []) {
  const order = { N: 0, R: 1, SR: 2, SSR: 3 };
  return records.reduce((best, record) => (order[getRecordRarity(record)] > order[best] ? getRecordRarity(record) : best), 'R');
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
  return `<article class="core-result-card rarity-${item.rarity.toLowerCase()} ${record.pityHit ? 'pity-hit' : ''}"><div style="font-size:34px">${item.icon}</div><b>${item.name} ×${record.qty}</b><span>${item.rarity} / ${GameDB.getItemTypeLabel(item.type)}</span><p>${item.description}</p></article>`;
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
  const highest = getHighestRarity(records);
  showModal(`
    <div class="core-modal-card gacha-result-modal lucky-result-modal rarity-${highest.toLowerCase()}">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">WISH RESULT</span>
      <h2>${highest === 'SSR' ? '契約成立' : '祈願結果'}</h2>
      <div class="core-list">${records.map(renderDrop).join('')}</div>
    </div>
  `);
}

function renderLuckyCard(record, index) {
  const meta = getRecordMeta(record);
  const rarity = getRecordRarity(record);
  return `
    <span class="lucky-v20-card rarity-${rarity.toLowerCase()} ${record.pityHit ? 'pity-hit' : ''}" style="--card-index:${index}" aria-hidden="true">
      <i>${meta?.icon || '◇'}</i>
    </span>`;
}

function showGachaRitualModal(records = []) {
  if (!records.length) return;
  const highest = getHighestRarity(records);
  const hasSSR = highest === 'SSR' || records.some((record) => record.pityHit);
  const title = hasSSR ? '契約魔法陣展開' : highest === 'SR' ? '星糖泛起柔光' : '星糖投入祈願機';
  const subtitle = records.length >= 10 ? '十連祈願中，卡片正在依序翻開。' : '祈願機啟動，星光正在凝聚。';
  showModal(`
    <div class="core-modal-card compact lucky-v20-modal rarity-${highest.toLowerCase()} ${hasSSR ? 'is-ssr' : ''}">
      <span class="core-modal-kicker">LUCKY V20</span>
      <div class="lucky-v20-stage" aria-hidden="true">
        <div class="lucky-v20-bg"></div>
        <div class="lucky-v20-mist mist-a"></div>
        <div class="lucky-v20-mist mist-b"></div>
        <div class="lucky-v20-machine">
          <span class="lucky-v20-orb">✦</span>
          <span class="lucky-v20-slot"></span>
          <span class="lucky-v20-base"></span>
        </div>
        <div class="lucky-v20-ring ring-a"></div>
        <div class="lucky-v20-ring ring-b"></div>
        <div class="lucky-v20-rays"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="lucky-v20-cards">${records.slice(0, 10).map(renderLuckyCard).join('')}</div>
      </div>
      <h2>${title}</h2>
      <p>${subtitle}</p>
    </div>
  `);
  window.setTimeout(() => showGachaResultModal(records), hasSSR ? 1900 : 1580);
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
  const result = drawGachaMany('standard', times);
  if (!result.ok) {
    emitNotice('祈願失敗', result.message);
    renderGacha();
    return;
  }

  const drawn = result.drops || [];
  if (result.partial) emitNotice('祈願中止', result.message || '星糖不足，已保留成功抽到的結果。');
  renderGacha();
  if (drawn.some((record) => record.pityHit)) emitNotice('SSR 保底觸發', '柔和金霧亮起，契約魔法陣已經展開。');
  if (drawn.length) window.setTimeout(() => showGachaRitualModal(drawn), 120);
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
