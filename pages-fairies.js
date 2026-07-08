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

function isFairyOwned(fairyId) {
  return Boolean(getFairyState(fairyId).owned);
}

function getFairyAffectionText(fairyId) {
  if (!isFairyOwned(fairyId)) return '—';
  return String(Number(getFairyState(fairyId).affection || 0));
}

function getFairyStatus(fairyId) {
  return isFairyOwned(fairyId) ? '已契約' : '尚未契約';
}

function getFairyStatusIcon(fairyId) {
  return isFairyOwned(fairyId) ? '契約中' : '未契約';
}

function openFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;

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
        <div><dt>好感度</dt><dd>${getFairyAffectionText(fairyId)}</dd></div>
        <div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div>
        <div><dt>說明</dt><dd>${fairy.description}</dd></div>
        <div><dt>ID</dt><dd>${fairy.id}</dd></div>
      </dl>
    </div>
  `);
}

function renderFairyCard(fairy) {
  const owned = isFairyOwned(fairy.id);
  const status = getFairyStatus(fairy.id);

  return `
    <article class="core-item-card ssr ${owned ? '' : 'is-undiscovered'}" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(GameDB.getFairySearchText(fairy))}" data-search-match="true">
      <div class="core-item-icon">${fairy.icon}</div>
      <div>
        <b>${fairy.name}</b>
        <span>${GameDB.getRarityLabel(fairy.rarity)} / ${status} / 好感 ${getFairyAffectionText(fairy.id)}</span>
        <p>「${fairy.quote}」</p>
        <div class="core-item-meta">
          <small>來源：${GameDB.getFairySourceText(fairy)}</small>
          <small>${owned ? fairy.description : '尚未契約前不會累積好感度。'}</small>
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
    ${pageHeader('FAIRY / CHARACTER ROOM', '精靈', '這裡是角色頁。精靈必須先契約，之後完成相關委託才會增加好感度。')}
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
