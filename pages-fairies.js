import { GameDB } from '@db';
import { getState } from '@state';
import { feedFairy, getFairyDialogue } from '@actions/fairy';
import { showModal } from '@ui';
import { Events, on, emitNotice } from '@eventBus';

let selectedFairyId = null;
let selectedDialogue = '';

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

function getFairyAffection(fairyId) {
  return Number(getFairyState(fairyId).affection || 0);
}

function getFairyAffectionText(fairyId) {
  if (!isFairyOwned(fairyId)) return '—';
  return String(getFairyAffection(fairyId));
}

function getFairyStatus(fairyId) {
  return isFairyOwned(fairyId) ? '已契約' : '尚未契約';
}

function getFavoriteText(fairy) {
  return (fairy.favoriteSweets || [])
    .map((itemId) => `${GameDB.items?.[itemId]?.icon || '◇'} ${GameDB.items?.[itemId]?.name || itemId}`)
    .join('、') || '尚未設定';
}

function getGiftableInventory() {
  const state = getState();
  return Object.entries(state.inventory || {})
    .filter(([itemId, qty]) => Number(qty || 0) > 0 && GameDB.isGiftableItem(itemId))
    .map(([itemId, qty]) => ({ itemId, qty, item: GameDB.items[itemId] }))
    .filter((entry) => entry.item);
}

function getSortedFairies() {
  return Object.values(GameDB.fairies || {})
    .sort((a, b) => {
      const aState = getFairyState(a.id);
      const bState = getFairyState(b.id);
      return Number(bState.owned) - Number(aState.owned)
        || Number(bState.affection || 0) - Number(aState.affection || 0)
        || a.name.localeCompare(b.name, 'zh-Hant');
    });
}

function getSelectedFairy(fairies = getSortedFairies()) {
  const selected = fairies.find((fairy) => fairy.id === selectedFairyId);
  if (selected) return selected;
  const firstOwned = fairies.find((fairy) => isFairyOwned(fairy.id));
  const fallback = firstOwned || fairies[0] || null;
  selectedFairyId = fallback?.id || null;
  return fallback;
}

function renderGiftButtons(fairyId, mode = 'page') {
  if (!isFairyOwned(fairyId)) return '<p class="core-empty fairy-gift-empty">尚未契約，不能送禮。</p>';
  const gifts = getGiftableInventory();
  if (!gifts.length) return '<p class="core-empty fairy-gift-empty">背包裡沒有可送禮的甜點或飲品。</p>';

  return `
    <div class="fairy-gift-list ${mode === 'page' ? 'fairy-gift-shelf' : ''}">
      ${gifts.map(({ itemId, qty, item }) => `
        <button type="button" data-feed-fairy="${fairyId}" data-gift-item="${itemId}" title="${item.name} ×${qty}">
          <span>${item.icon}</span><b>×${qty}</b>
        </button>
      `).join('')}
    </div>
  `;
}

function openFairyDetail(fairyId, dialogueOverride = null) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;
  const owned = isFairyOwned(fairyId);
  const dialogue = dialogueOverride || selectedDialogue || (owned ? getFairyDialogue(fairyId) : fairy.quote);

  showModal(`
    <div class="core-modal-card core-detail-modal fairy-profile-modal" data-fairy-modal="${fairyId}">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">FAIRY PROFILE</span>
      <div class="core-detail-head">
        <div class="core-detail-icon">${fairy.icon}</div>
        <div>
          <h2>${fairy.name}</h2>
          <p>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')} / ${getFairyStatus(fairyId)}</p>
        </div>
      </div>
      <p class="core-detail-quote">「${dialogue}」</p>
      <dl class="core-detail-list">
        <div><dt>契約狀態</dt><dd>${getFairyStatus(fairyId)}</dd></div>
        <div><dt>好感度</dt><dd>${getFairyAffectionText(fairyId)}</dd></div>
        <div><dt>最愛點心</dt><dd>${getFavoriteText(fairy)}</dd></div>
        <div><dt>被動 Buff</dt><dd>${fairy.passiveBuff?.label || '尚未設定'}</dd></div>
        <div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div>
        <div><dt>故事</dt><dd>${fairy.story || fairy.description}</dd></div>
        <div><dt>ID</dt><dd>${fairy.id}</dd></div>
      </dl>
      <div class="fairy-modal-actions">
        <button type="button" data-fairy-talk="${fairy.id}" ${owned ? '' : 'disabled'}>聽一句話</button>
      </div>
      <h3 class="fairy-gift-title">送禮</h3>
      ${renderGiftButtons(fairyId, 'modal')}
    </div>
  `);
}

function renderAffectionBar(fairyId) {
  const owned = isFairyOwned(fairyId);
  const affection = getFairyAffection(fairyId);
  const percent = owned ? Math.min(100, affection) : 0;
  return `
    <div class="fairy-affection-box">
      <div><b>好感度</b><span>${owned ? affection : '未契約'}</span></div>
      <em><strong style="width:${percent}%"></strong></em>
    </div>`;
}

function renderFeaturedFairy(fairy) {
  if (!fairy) return '<div class="core-empty">目前沒有精靈資料。</div>';
  const owned = isFairyOwned(fairy.id);
  const dialogue = selectedDialogue || (owned ? getFairyDialogue(fairy.id) : fairy.quote);
  return `
    <section class="fairy-profile-stage ${owned ? 'is-owned' : 'is-locked'}">
      <div class="fairy-stage-copy">
        <span class="fairy-rarity-pill">${fairy.rarity}｜${getFairyStatus(fairy.id)}</span>
        <h3>${fairy.name}</h3>
        <p class="fairy-stage-quote">「${dialogue}」</p>
        ${renderAffectionBar(fairy.id)}
        <div class="fairy-info-chips">
          <span>${fairy.passiveBuff?.label || '尚未設定 Buff'}</span>
          <span>最愛：${getFavoriteText(fairy)}</span>
        </div>
        <div class="fairy-stage-actions">
          <button type="button" data-fairy-talk="${fairy.id}" ${owned ? '' : 'disabled'}>聽一句話</button>
          <button type="button" data-fairy-detail="${fairy.id}">詳細資料</button>
        </div>
      </div>
      <div class="fairy-standee-area" aria-label="${fairy.name} 立繪佔位">
        <div class="fairy-standee-aura"></div>
        <div class="fairy-standee"><span>${fairy.icon}</span></div>
        <div class="fairy-nameplate">${fairy.name}</div>
      </div>
      <div class="fairy-gift-panel">
        <b>送禮</b>
        ${renderGiftButtons(fairy.id)}
      </div>
    </section>`;
}

function renderFairySelectorCard(fairy) {
  const owned = isFairyOwned(fairy.id);
  const active = fairy.id === selectedFairyId;
  return `
    <button type="button" class="fairy-selector-card ${owned ? 'is-owned' : 'is-locked'} ${active ? 'active' : ''}" data-fairy-select="${fairy.id}" aria-label="選擇${fairy.name}">
      <span class="fairy-selector-icon">${fairy.icon}</span>
      <span class="fairy-selector-badge">${fairy.rarity}</span>
      <b>${fairy.name}</b>
      <small>${owned ? `好感 ${getFairyAffection(fairy.id)}` : '未契約'}</small>
    </button>`;
}

function handleFairyFeed(feedButton) {
  const fairyId = feedButton.dataset.feedFairy;
  const result = feedFairy(fairyId, feedButton.dataset.giftItem);
  selectedFairyId = fairyId;
  selectedDialogue = result.dialogue || selectedDialogue;
  emitNotice(result.ok ? '送禮完成' : '送禮失敗', result.message);
  if (feedButton.closest('.fairy-profile-modal')) openFairyDetail(fairyId, result.dialogue || null);
  renderFairies();
}

function handleFairyTalk(talkButton) {
  selectedFairyId = talkButton.dataset.fairyTalk;
  selectedDialogue = getFairyDialogue(selectedFairyId);
  if (talkButton.closest('.fairy-profile-modal')) openFairyDetail(selectedFairyId, selectedDialogue);
  else renderFairies();
}

function handleFairyClick(event) {
  const page = document.querySelector('#page-fairies');
  const inPage = page?.contains(event.target);
  const inModal = Boolean(event.target.closest('.fairy-profile-modal'));
  if (!inPage && !inModal) return;

  const feedButton = event.target.closest('[data-feed-fairy]');
  if (feedButton) {
    handleFairyFeed(feedButton);
    return;
  }
  const talkButton = event.target.closest('[data-fairy-talk]');
  if (talkButton) {
    handleFairyTalk(talkButton);
    return;
  }
  const detailButton = event.target.closest('[data-fairy-detail]');
  if (detailButton) {
    selectedFairyId = detailButton.dataset.fairyDetail;
    openFairyDetail(selectedFairyId);
    return;
  }
  const selectButton = event.target.closest('[data-fairy-select]');
  if (selectButton) {
    selectedFairyId = selectButton.dataset.fairySelect;
    selectedDialogue = '';
    renderFairies();
  }
}

function bindFairyEvents() {
  if (document.body.dataset.fairyEventsBound === 'true') return;
  document.body.dataset.fairyEventsBound = 'true';
  document.addEventListener('click', handleFairyClick);
}

export function renderFairies() {
  const page = document.querySelector('#page-fairies');
  if (!page) return;
  const fairies = getSortedFairies();
  const selectedFairy = getSelectedFairy(fairies);

  page.innerHTML = `
    ${pageHeader('FAIRY', '精靈', '選擇精靈查看大角色卡、好感度、能力與送禮。')}
    ${renderFeaturedFairy(selectedFairy)}
    <section class="fairy-selector-section">
      <div class="fairy-selector-head"><b>精靈名冊</b><span>${fairies.filter((fairy) => isFairyOwned(fairy.id)).length}/${fairies.length} 已契約</span></div>
      <div class="fairy-selector-grid" id="fairy-list">
        ${fairies.map(renderFairySelectorCard).join('') || '<div class="core-empty">目前沒有精靈資料。</div>'}
      </div>
    </section>
  `;
}

export function initFairiesPage() {
  bindFairyEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-fairies');
    if (page?.classList.contains('active')) renderFairies();
  });
}
