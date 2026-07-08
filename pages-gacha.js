import { GameDB } from '@db';
import { getState } from '@state';
import { drawGacha, getGachaPityStatus } from '@actions/gacha';
import { emitNotice } from '@eventBus';

let lastResults = [];

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
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
    return `<article class="core-result-card ssr ${record.pityHit ? 'pity-hit' : ''}"><b>${fairy.icon} ${fairy.name}</b><span>${fairy.rarity}${record.pityHit ? ' / 保底' : ''}</span><p>「${fairy.quote}」</p></article>`;
  }
  const item = GameDB.items[record.id];
  if (!item) return '';
  return `<article class="core-result-card ${record.pityHit ? 'pity-hit' : ''}"><b>${item.icon} ${item.name} ×${record.qty}</b><span>${item.rarity} / ${item.typeName}</span><p>${item.description}</p></article>`;
}

function renderPityStatus() {
  const pity = getGachaPityStatus();
  const percent = Math.round((pity.pityCounter / pity.hardPityAt) * 100);
  return `
    <div class="gacha-pity-box">
      <b>SSR 保底進度</b>
      <span>${pity.pityCounter}/${pity.hardPityAt}｜還差 ${pity.remaining} 抽</span>
      <em><strong style="width:${Math.min(100, percent)}%"></strong></em>
      <small>累計祈願 ${pity.totalPulls} 次；抽到 SSR 後保底歸零。</small>
    </div>
  `;
}

function renderHistory() {
  const history = (getState().gachaHistory || []).slice(0, Number(GameDB.gachaConfig?.historyLimit || 20));
  if (!history.length) return '<p class="core-empty">還沒有祈願歷史。</p>';

  return `
    <div class="gacha-history-list">
      ${history.map((record) => {
        const meta = getRecordMeta(record);
        if (!meta) return '';
        return `<span class="${record.pityHit ? 'pity-hit' : ''}">${meta.icon || '◇'} ${meta.name || record.id}${record.pityHit ? '｜保底' : ''}</span>`;
      }).join('')}
    </div>
  `;
}

function handleGachaClick(event) {
  const button = event.target.closest('[data-draw]');
  const page = document.querySelector('#page-gacha');
  if (!button || !page?.contains(button)) return;

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

  if (drawn.some((record) => record.pityHit)) emitNotice('SSR 保底觸發', '魔法陣亮起，保底 SSR 已經降臨。');
  lastResults = drawn;
  renderGacha(lastResults);
}

function bindGachaEvents() {
  const page = document.querySelector('#page-gacha');
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', handleGachaClick);
}

export function renderGacha(results = lastResults) {
  const page = document.querySelector('#page-gacha');
  if (!page) return;

  const state = getState();
  const pool = GameDB.gachaPools.standard;
  const costMeta = GameDB.currencies[pool.cost.currency];

  page.innerHTML = `
    ${pageHeader('WISH / ACTION MODULE', '星糖祈願', '祈願會累積保底。最近 20 筆紀錄會保存在本機存檔中。')}
    <section class="core-gacha-layout gacha-stage">
      <div class="core-gacha-machine">
        <div class="gacha-magic-circle"><div class="core-orb">✦</div></div>
        <h3>${pool.name}</h3>
        <p>${pool.description}</p>
        ${renderPityStatus()}
        <div class="core-pills">
          <span>${costMeta.icon} ${costMeta.name} ${state.player[pool.cost.currency]}</span>
          <span>單抽 ${pool.cost.amount}</span>
        </div>
        <div class="core-actions-row">
          <button type="button" data-draw="1">抽 1 次</button>
          <button type="button" data-draw="10">抽 10 次</button>
        </div>
      </div>
      <div class="core-result-list">
        ${results.length ? results.map(renderDrop).join('') : '<p class="core-empty">還沒有祈願結果。先抽一次看看。</p>'}
      </div>
    </section>
    <section class="core-page-head gacha-history-panel">
      <span>WISH HISTORY</span>
      <h2>最近 20 筆祈願</h2>
      ${renderHistory()}
    </section>
  `;
}

export function initGachaPage() {
  bindGachaEvents();
}
