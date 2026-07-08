import { GameDB } from '@db';
import { getState } from '@state';
import { showModal } from '@ui';
import { Events, on } from '@eventBus';

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head fairy-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
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

function openFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;

  showModal(`
    <div class="core-modal-card core-detail-modal fairy-profile-modal">
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
  const affection = getFairyAffectionText(fairy.id);

  return `
    <button type="button" class="fairy-character-card ${owned ? 'is-owned' : 'is-locked'}" data-fairy-detail="${fairy.id}" aria-label="查看${fairy.name}角色資料">
      <span class="fairy-card-badge">${status}</span>
      <span class="fairy-card-portrait" aria-hidden="true">${fairy.icon}</span>
      <span class="fairy-card-name">${fairy.name}</span>
      <span class="fairy-card-meta">${GameDB.getRarityLabel(fairy.rarity)}｜好感 ${affection}</span>
    </button>
  `;
}

function handleFairyClick(event) {
  const button = event.target.closest('[data-fairy-detail]');
  const page = document.querySelector('#page-fairies');
  if (!button || !page?.contains(button)) return;
  openFairyDetail(button.dataset.fairyDetail);
}

function bindFairyEvents() {
  const page = document.querySelector('#page-fairies');
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', handleFairyClick);
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
    ${pageHeader('FAIRY / CHARACTER CODEX', '精靈角色卡', '精靈以小格角色卡顯示。點開卡片可以查看完整角色資料；未契約前不會累積好感度。')}
    <div class="fairy-card-grid" id="fairy-list">
      ${cards || '<div class="core-empty">目前沒有精靈資料。</div>'}
    </div>
  `;
}

export function initFairiesPage() {
  bindFairyEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-fairies');
    if (page?.classList.contains('active')) renderFairies();
  });
}
