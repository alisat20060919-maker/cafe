import { GameDB } from '@db';
import { getState } from '@state';
import { showModal } from '@ui';
import { Events, on } from '@eventBus';

let currentInventoryFilter = 'all';
let currentInventoryRarity = 'all';
let currentInventorySort = 'default';
let currentInventoryQuery = '';

function $all(selector, root = document) { return [...root.querySelectorAll(selector)]; }

function pageHeader(kicker, title, body) {
  return `<div class="core-page-head inventory-page-head"><span>${kicker}</span><h2>${title}</h2><p>${body}</p></div>`;
}

function escapeAttr(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getInventorySummary(state) {
  const itemCount = Object.values(state.inventory || {}).reduce((total, count) => total + Number(count || 0), 0);
  const ownedKinds = Object.values(state.inventory || {}).filter((count) => Number(count || 0) > 0).length;
  const fairyCount = Object.values(state.fairies || {}).filter((data) => data?.owned).length;
  return { itemCount, ownedKinds, fairyCount };
}

function renderFilterTabs() {
  return GameDB.getInventoryCategories()
    .map((category) => `<button type="button" data-filter="${category.id}" class="${currentInventoryFilter === category.id ? 'active' : ''}"><span>${category.icon}</span><b>${category.label}</b></button>`)
    .join('');
}

function renderRarityTabs() {
  return GameDB.getInventoryRarities()
    .map((rarity) => `<button type="button" data-rarity-filter="${rarity.id}" class="${currentInventoryRarity === rarity.id ? 'active' : ''}"><span>${rarity.icon}</span><b>${rarity.label}</b></button>`)
    .join('');
}

function renderSortOptions() {
  return GameDB.getInventorySortOptions()
    .map((sort) => `<option value="${sort.id}" ${currentInventorySort === sort.id ? 'selected' : ''}>${sort.icon} ${sort.label}</option>`)
    .join('');
}

function renderEmptyInventoryState() {
  return `
    <section class="core-empty-state inventory-empty-state" aria-label="背包空狀態">
      <div class="core-empty-orb">🧺</div>
      <h3>背包還是空的</h3>
      <p>目前沒有已擁有的素材或精靈。可以先去祈願、回店鋪採集，或打開圖鑑預覽全部世界資料。</p>
      <div class="core-actions-row core-empty-actions">
        <button type="button" data-route="gacha">前往祈願</button>
        <button type="button" data-route="home">回到店鋪</button>
        <button type="button" data-route="collection">打開圖鑑</button>
      </div>
    </section>`;
}

function renderInventoryHero(summary) {
  return `
    <section class="inventory-hero-card">
      <div class="inventory-hero-copy">
        <span>WAREHOUSE</span>
        <h3>魔法倉庫</h3>
        <p>主畫面只顯示道具格子；點擊道具可以查看來源、用途與完整說明。</p>
      </div>
      <div class="inventory-hero-stats">
        <b>道具 ${summary.itemCount}</b>
        <b>種類 ${summary.ownedKinds}</b>
        <b>精靈 ${summary.fairyCount}</b>
      </div>
    </section>`;
}

function renderInventoryToolbar() {
  return `
    <section class="inventory-toolbar">
      <div class="inventory-search-box"><label for="inventory-search">搜尋</label><input id="inventory-search" type="search" value="${escapeAttr(currentInventoryQuery)}" placeholder="素材、甜點、來源或用途" autocomplete="off" /></div>
      <div class="inventory-sort-box"><label for="inventory-sort">排序</label><select id="inventory-sort">${renderSortOptions()}</select></div>
    </section>`;
}

function renderInventoryFilters() {
  return `
    <section class="inventory-filter-panel" aria-label="背包篩選">
      <div><p>分類</p><div class="inventory-filter-tabs" aria-label="背包分類篩選">${renderFilterTabs()}</div></div>
      <div><p>稀有度</p><div class="inventory-filter-tabs" aria-label="背包稀有度篩選">${renderRarityTabs()}</div></div>
    </section>`;
}

function getCardNumber(card, key) { return Number(card.dataset[key] || 0); }
function getCardText(card, key) { return String(card.dataset[key] || ''); }
function compareDefault(a, b) { return getCardNumber(a, 'sortDefault') - getCardNumber(b, 'sortDefault'); }

function sortInventoryCards(page) {
  const list = page.querySelector('#inventory-list');
  if (!list) return;
  const empty = page.querySelector('#inventory-search-empty');
  const cards = $all('.core-item-card', list);
  const sorted = cards.sort((a, b) => {
    if (currentInventorySort === 'rarity_desc') return getCardNumber(b, 'sortRarity') - getCardNumber(a, 'sortRarity') || compareDefault(a, b);
    if (currentInventorySort === 'rarity_asc') return getCardNumber(a, 'sortRarity') - getCardNumber(b, 'sortRarity') || compareDefault(a, b);
    if (currentInventorySort === 'count_desc') return getCardNumber(b, 'sortCount') - getCardNumber(a, 'sortCount') || compareDefault(a, b);
    if (currentInventorySort === 'type_asc') return getCardNumber(a, 'sortType') - getCardNumber(b, 'sortType') || compareDefault(a, b);
    if (currentInventorySort === 'name_asc') return getCardText(a, 'sortName').localeCompare(getCardText(b, 'sortName'), 'zh-Hant') || compareDefault(a, b);
    return compareDefault(a, b);
  });
  sorted.forEach((card) => list.insertBefore(card, empty || null));
  updateInventorySearch(page);
}

function updateInventorySearch(page) {
  const list = page.querySelector('#inventory-list');
  const input = page.querySelector('#inventory-search');
  const empty = page.querySelector('#inventory-search-empty');
  if (!list) return;
  if (input && input.value !== currentInventoryQuery) input.value = currentInventoryQuery;
  const query = GameDB.normalizeSearchText(currentInventoryQuery || '');
  let visibleCount = 0;
  let cardCount = 0;
  list.dataset.currentFilter = currentInventoryFilter;
  list.dataset.currentRarity = currentInventoryRarity;
  list.dataset.searchMode = query ? 'filtered' : 'all';
  $all('.core-item-card', list).forEach((card) => {
    cardCount += 1;
    const searchText = card.dataset.search || '';
    const searchMatch = !query || searchText.includes(query);
    const categoryMatch = currentInventoryFilter === 'all' || card.dataset.category === currentInventoryFilter;
    const rarityMatch = currentInventoryRarity === 'all' || card.dataset.rarity === currentInventoryRarity;
    card.dataset.searchMatch = searchMatch ? 'true' : 'false';
    if (searchMatch && categoryMatch && rarityMatch) visibleCount += 1;
  });
  if (empty) empty.hidden = cardCount === 0 || visibleCount > 0;
}

function setActiveFilter(page, selector, activeButton) {
  $all(selector, page).forEach((button) => button.classList.toggle('active', button === activeButton));
}

function openItemDetail(itemId) {
  const item = GameDB.items[itemId];
  if (!item) return;
  const state = getState();
  const owned = Number(state.inventory[item.id] || 0);
  showModal(`
    <div class="core-modal-card core-detail-modal inventory-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">ITEM DETAIL</span>
      <div class="core-detail-head"><div class="core-detail-icon">${item.icon}</div><div><h2>${item.name}</h2><p>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</p></div></div>
      <dl class="core-detail-list"><div><dt>持有數量</dt><dd>×${owned}</dd></div><div><dt>來源</dt><dd>${GameDB.getItemSourceText(item)}</dd></div><div><dt>用途</dt><dd>${item.use}</dd></div><div><dt>說明</dt><dd>${item.description}</dd></div><div><dt>ID</dt><dd>${item.id}</dd></div></dl>
    </div>`);
}

function openFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;
  showModal(`
    <div class="core-modal-card core-detail-modal inventory-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">FAIRY DETAIL</span>
      <div class="core-detail-head"><div class="core-detail-icon">${fairy.icon}</div><div><h2>${fairy.name}</h2><p>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')}</p></div></div>
      <p class="core-detail-quote">「${fairy.quote}」</p>
      <dl class="core-detail-list"><div><dt>契約狀態</dt><dd>已契約</dd></div><div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div><div><dt>說明</dt><dd>${fairy.description}</dd></div><div><dt>ID</dt><dd>${fairy.id}</dd></div></dl>
    </div>`);
}

function handleInventoryClick(event) {
  const page = document.querySelector('#page-inventory');
  const button = event.target.closest('button');
  if (!button || !page?.contains(button)) return;
  if (button.dataset.filter) {
    currentInventoryFilter = button.dataset.filter || 'all';
    setActiveFilter(page, '[data-filter]', button);
    updateInventorySearch(page);
    return;
  }
  if (button.dataset.rarityFilter) {
    currentInventoryRarity = button.dataset.rarityFilter || 'all';
    setActiveFilter(page, '[data-rarity-filter]', button);
    updateInventorySearch(page);
    return;
  }
  if (button.dataset.detailKind) {
    if (button.dataset.detailKind === 'fairy') return openFairyDetail(button.dataset.detailId);
    openItemDetail(button.dataset.detailId);
  }
}

function handleInventoryInput(event) {
  const page = document.querySelector('#page-inventory');
  if (page?.contains(event.target) && event.target.matches('#inventory-search')) {
    currentInventoryQuery = event.target.value || '';
    updateInventorySearch(page);
  }
}

function handleInventoryChange(event) {
  const page = document.querySelector('#page-inventory');
  if (page?.contains(event.target) && event.target.matches('#inventory-sort')) {
    currentInventorySort = event.target.value || 'default';
    sortInventoryCards(page);
  }
}

function bindInventoryEvents() {
  const page = document.querySelector('#page-inventory');
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', handleInventoryClick);
  page.addEventListener('input', handleInventoryInput);
  page.addEventListener('change', handleInventoryChange);
}

function renderItemCard(item, count, index) {
  return `
    <button type="button" class="core-item-card inventory-slot-card rarity-${item.rarity.toLowerCase()}" data-category="${item.type}" data-rarity="${item.rarity}" data-search="${escapeAttr(GameDB.getItemSearchText(item))}" data-search-match="true" data-sort-default="${index}" data-sort-rarity="${GameDB.getRarityRank(item.rarity)}" data-sort-type="${GameDB.getItemTypeRank(item.type)}" data-sort-count="${count}" data-sort-name="${escapeAttr(item.name)}" data-detail-kind="item" data-detail-id="${item.id}">
      <span class="inventory-slot-rarity">${item.rarity}</span>
      <span class="inventory-slot-icon">${item.icon}</span>
      <b>${item.name}</b>
      <small>${GameDB.getItemTypeLabel(item.type)}</small>
      <strong>×${count}</strong>
    </button>`;
}

function renderFairyCard(fairy, index, offset) {
  return `
    <button type="button" class="core-item-card inventory-slot-card inventory-fairy-slot ssr" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(GameDB.getFairySearchText(fairy))}" data-search-match="true" data-sort-default="${offset + index}" data-sort-rarity="${GameDB.getRarityRank(fairy.rarity)}" data-sort-type="${GameDB.getItemTypeRank('fairy')}" data-sort-count="1" data-sort-name="${escapeAttr(fairy.name)}" data-detail-kind="fairy" data-detail-id="${fairy.id}">
      <span class="inventory-slot-rarity">${fairy.rarity}</span>
      <span class="inventory-slot-icon">${fairy.icon}</span>
      <b>${fairy.name}</b>
      <small>${GameDB.getItemTypeLabel('fairy')}</small>
      <strong>契約</strong>
    </button>`;
}

export function renderInventory() {
  const page = document.querySelector('#page-inventory');
  if (!page) return;
  const state = getState();
  const summary = getInventorySummary(state);
  const itemCards = Object.values(GameDB.items)
    .map((item, index) => ({ item, count: Number(state.inventory[item.id] || 0), index }))
    .filter(({ count }) => count > 0)
    .map(({ item, count, index }) => renderItemCard(item, count, index))
    .join('');
  const fairyDefaultOffset = Object.values(GameDB.items).length;
  const fairyCards = Object.entries(state.fairies)
    .filter(([, data]) => data?.owned)
    .map(([fairyId], index) => {
      const fairy = GameDB.fairies[fairyId];
      if (!fairy) return '';
      return renderFairyCard(fairy, index, fairyDefaultOffset);
    })
    .join('');
  const hasInventoryContent = Boolean(itemCards || fairyCards);
  page.innerHTML = `
    ${pageHeader('BAG', '背包', '整理成道具倉庫；點擊格子查看來源、用途與完整說明。')}
    <div class="core-actions-row collection-entry-actions"><button type="button" data-route="collection">打開圖鑑</button></div>
    ${hasInventoryContent ? `
      ${renderInventoryHero(summary)}
      ${renderInventoryToolbar()}
      ${renderInventoryFilters()}
      <div class="core-list inventory-slot-grid" id="inventory-list" data-current-filter="${currentInventoryFilter}" data-current-rarity="${currentInventoryRarity}" data-search-mode="all">${itemCards}${fairyCards}<p class="core-empty core-search-empty" id="inventory-search-empty" hidden>沒有符合目前條件的物品。</p></div>
    ` : renderEmptyInventoryState()}
  `;
  sortInventoryCards(page);
}

export function initInventoryPage() {
  bindInventoryEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-inventory');
    if (page?.classList.contains('active')) renderInventory();
  });
}
