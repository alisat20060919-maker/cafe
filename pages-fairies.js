import { GameDB } from '@db';
import { getState } from '@state';
import { showModal } from '@ui';
import { Events, on } from '@eventBus';

function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
}

function escapeAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getFairyState(fairyId) {
  return getState().fairies?.[fairyId] || { owned: false, affection: 0 };
}

function getFairyStatus(fairyId) {
  const record = getFairyState(fairyId);
  if (record.owned) return '已契約';
  if (Number(record.affection || 0) > 0) return '已結識';
  return '尚未契約';
}

function getFairyStatusIcon(fairyId) {
  const record = getFairyState(fairyId);
  if (record.owned) return '契約中';
  if (Number(record.affection || 0) > 0) return '好感中';
  return '未契約';
}

function openFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;

  const record = getFairyState(fairyId);
  const affection = Number(record.affection || 0);

  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">FAIRY PROFILE</span>
      <div class="core-detail-head">
        <div class="core-detail-icon">${fairy.icon}</div>
        <div>
          <h2>${fairy.name}</h2>
          <p>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')} / ${getFairyStatus(fairyId)}</p>
        </div>
      </div>
      <p class="core-detail-quote">「${fairy.quote}」</p>
      <dl class="core-detail-list">
        <div><dt>契約狀態</dt><dd>${getFairyStatus(fairyId)}</dd></div>
        <div><dt>好感度</dt><dd>${affection}</dd></div>
        <div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div>
        <div><dt>說明</dt><dd>${fairy.description}</dd></div>
        <div><dt>ID</dt><dd>${fairy.id}</dd></div>
      </dl>
    </div>
  `);
}

function renderFairyCard(fairy) {
  const record = getFairyState(fairy.id);
  const affection = Number(record.affection || 0);
  const owned = Boolean(record.owned);
  const status = getFairyStatus(fairy.id);

  return `
    <article class="core-item-card ssr ${owned ? '' : 'is-undiscovered'}" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(GameDB.getFairySearchText(fairy))}" data-search-match="true">
      <div class="core-item-icon">${fairy.icon}</div>
      <div>
        <b>${fairy.name}</b>
        <span>${GameDB.getRarityLabel(fairy.rarity)} / ${status} / 好感 ${affection}</span>
        <p>「${fairy.quote}」</p>
        <div class="core-item-meta">
          <small>來源：${GameDB.getFairySourceText(fairy)}</small>
          <small>${fairy.description}</small>
        </div>
        <button type="button" class="core-detail-button" data-fairy-detail="${fairy.id}">查看角色資料</button>
      </div>
      <strong>${getFairyStatusIcon(fairy.id)}</strong>
    </article>
  `;
}

export function renderFairies() {
  const page = document.querySelector('#page-fairies');
  if (!page) return;

  const cards = Object.values(GameDB.fairies || {})
    .sort((a, b) => {
      const aState = getFairyState(a.id);
      const bState = getFairyState(b.id);
      return Number(bState.owned) - Number(aState.owned)
        || Number(bState.affection || 0) - Number(aState.affection || 0)
        || a.name.localeCompare(b.name, 'zh-Hant');
    })
    .map(renderFairyCard)
    .join('');

  page.innerHTML = `
    ${pageHeader('FAIRY / CHARACTER ROOM', '精靈', '這裡是角色頁。背包只顯示已擁有的東西，精靈頁會列出所有精靈、契約狀態與好感度。')}
    <div class="core-list" id="fairy-list">
      ${cards || '<div class="core-empty">目前沒有精靈資料。</div>'}
    </div>
  `;

  $all('[data-fairy-detail]', page).forEach((button) => {
    button.addEventListener('click', () => openFairyDetail(button.dataset.fairyDetail));
  });
}

export function initFairiesPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-fairies');
    if (page?.classList.contains('active')) renderFairies();
  });
}
