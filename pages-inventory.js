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

function renderFilterTabs() {
  return GameDB.getInventoryCategories()
    .map((category, index) => `
      <button type="button" data-filter="${category.id}" class="${index === 0 ? 'active' : ''}">
        <span>${category.icon}</span>${category.label}
      </button>
    `)
    .join('');
}

function renderRarityTabs() {
  return GameDB.getInventoryRarities()
    .map((rarity, index) => `
      <button type="button" data-rarity-filter="${rarity.id}" class="${index === 0 ? 'active' : ''}">
        <span>${rarity.icon}</span>${rarity.label}
      </button>
    `)
    .join('');
}

function renderSortOptions() {
  return GameDB.getInventorySortOptions()
    .map((sort) => `<option value="${sort.id}">${sort.icon} ${sort.label}</option>`)
    .join('');
}

function getCardNumber(card, key) {
  return Number(card.dataset[key] || 0);
}

function getCardText(card, key) {
  return String(card.dataset[key] || '');
}

function compareDefault(a, b) {
  return getCardNumber(a, 'sortDefault') - getCardNumber(b, 'sortDefault');
}

function sortInventoryCards(page) {
  const list = page.querySelector('#inventory-list');
  const select = page.querySelector('#inventory-sort');
  if (!list) return;

  const mode = select?.value || 'default';
  const empty = page.querySelector('#inventory-search-empty');
  const cards = $all('.core-item-card', list);

  const sorted = cards.sort((a, b) => {
    if (mode === 'rarity_desc') {
      return getCardNumber(b, 'sortRarity') - getCardNumber(a, 'sortRarity') || compareDefault(a, b);
    }

    if (mode === 'rarity_asc') {
      return getCardNumber(a, 'sortRarity') - getCardNumber(b, 'sortRarity') || compareDefault(a, b);
    }

    if (mode === 'count_desc') {
      return getCardNumber(b, 'sortCount') - getCardNumber(a, 'sortCount') || compareDefault(a, b);
    }

    if (mode === 'type_asc') {
      return getCardNumber(a, 'sortType') - getCardNumber(b, 'sortType') || compareDefault(a, b);
    }

    if (mode === 'name_asc') {
      return getCardText(a, 'sortName').localeCompare(getCardText(b, 'sortName'), 'zh-Hant') || compareDefault(a, b);
    }

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

  const query = GameDB.normalizeSearchText(input?.value || '');
  const currentFilter = list.dataset.currentFilter || 'all';
  const currentRarity = list.dataset.currentRarity || 'all';
  let visibleCount = 0;
  let cardCount = 0;

  list.dataset.searchMode = query ? 'filtered' : 'all';

  $all('.core-item-card', list).forEach((card) => {
    cardCount += 1;
    const searchText = card.dataset.search || '';
    const searchMatch = !query || searchText.includes(query);
    const categoryMatch = currentFilter === 'all' || card.dataset.category === currentFilter;
    const rarityMatch = currentRarity === 'all' || card.dataset.rarity === currentRarity;

    card.dataset.searchMatch = searchMatch ? 'true' : 'false';
    if (searchMatch && categoryMatch && rarityMatch) visibleCount += 1;
  });

  if (empty) empty.hidden = cardCount === 0 || visibleCount > 0;
}

function openItemDetail(itemId) {
  const item = GameDB.items[itemId];
  if (!item) return;

  const state = getState();
  const owned = Number(state.inventory[item.id] || 0);

  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">ITEM DETAIL</span>
      <div class="core-detail-head">
        <div class="core-detail-icon">${item.icon}</div>
        <div>
          <h2>${item.name}</h2>
          <p>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</p>
        </div>
      </div>
      <dl class="core-detail-list">
        <div><dt>持有數量</dt><dd>×${owned}</dd></div>
        <div><dt>來源</dt><dd>${GameDB.getItemSourceText(item)}</dd></div>
        <div><dt>用途</dt><dd>${item.use}</dd></div>
        <div><dt>說明</dt><dd>${item.description}</dd></div>
        <div><dt>ID</dt><dd>${item.id}</dd></div>
      </dl>
    </div>
  `);
}

function openFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;

  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">FAIRY DETAIL</span>
      <div class="core-detail-head">
        <div class="core-detail-icon">${fairy.icon}</div>
        <div>
          <h2>${fairy.name}</h2>
          <p>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')}</p>
        </div>
      </div>
      <p class="core-detail-quote">「${fairy.quote}」</p>
      <dl class="core-detail-list">
        <div><dt>契約狀態</dt><dd>已契約</dd></div>
        <div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div>
        <div><dt>說明</dt><dd>${fairy.description}</dd></div>
        <div><dt>ID</dt><dd>${fairy.id}</dd></div>
      </dl>
    </div>
  `);
}

function bindInventoryFilters(page) {
  const list = page.querySelector('#inventory-list');
  if (!list) return;

  $all('[data-filter]', page).forEach((button) => {
    button.addEventListener('click', () => {
      $all('[data-filter]', page).forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      list.dataset.currentFilter = button.dataset.filter || 'all';
      updateInventorySearch(page);
    });
  });

  $all('[data-rarity-filter]', page).forEach((button) => {
    button.addEventListener('click', () => {
      $all('[data-rarity-filter]', page).forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      list.dataset.currentRarity = button.dataset.rarityFilter || 'all';
      updateInventorySearch(page);
    });
  });

  page.querySelector('#inventory-search')?.addEventListener('input', () => updateInventorySearch(page));
  page.querySelector('#inventory-sort')?.addEventListener('change', () => sortInventoryCards(page));

  $all('[data-detail-kind]', page).forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.detailKind === 'fairy') {
        openFairyDetail(button.dataset.detailId);
        return;
      }
      openItemDetail(button.dataset.detailId);
    });
  });
}

export function renderInventory() {
  const page = document.querySelector('#page-inventory');
  if (!page) return;

  const state = getState();
  const itemCards = Object.values(GameDB.items)
    .map((item, index) => ({ item, count: Number(state.inventory[item.id] || 0), index }))
    .filter(({ count }) => count > 0)
    .map(({ item, count, index }) => `
      <article class="core-item-card rarity-${item.rarity.toLowerCase()}" data-category="${item.type}" data-rarity="${item.rarity}" data-search="${escapeAttr(GameDB.getItemSearchText(item))}" data-search-match="true" data-sort-default="${index}" data-sort-rarity="${GameDB.getRarityRank(item.rarity)}" data-sort-type="${GameDB.getItemTypeRank(item.type)}" data-sort-count="${count}" data-sort-name="${escapeAttr(item.name)}">
        <div class="core-item-icon">${item.icon}</div>
        <div>
          <b>${item.name}</b>
          <span>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</span>
          <p>${item.description}</p>
          <div class="core-item-meta">
            <small>來源：${GameDB.getItemSourceText(item)}</small>
            <small>用途：${item.use}</small>
          </div>
          <button type="button" class="core-detail-button" data-detail-kind="item" data-detail-id="${item.id}">查看詳情</button>
        </div>
        <strong>×${count}</strong>
      </article>
    `)
    .join('');

  const fairyDefaultOffset = Object.values(GameDB.items).length;
  const fairyCards = Object.entries(state.fairies)
    .filter(([, data]) => data?.owned)
    .map(([fairyId], index) => {
      const fairy = GameDB.fairies[fairyId];
      return `
        <article class="core-item-card ssr" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(GameDB.getFairySearchText(fairy))}" data-search-match="true" data-sort-default="${fairyDefaultOffset + index}" data-sort-rarity="${GameDB.getRarityRank(fairy.rarity)}" data-sort-type="${GameDB.getItemTypeRank('fairy')}" data-sort-count="1" data-sort-name="${escapeAttr(fairy.name)}">
          <div class="core-item-icon">${fairy.icon}</div>
          <div>
            <b>${fairy.name}</b>
            <span>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')}</span>
            <p>「${fairy.quote}」</p>
            <div class="core-item-meta">
              <small>來源：${GameDB.getFairySourceText(fairy)}</small>
              <small>${fairy.description}</small>
            </div>
            <button type="button" class="core-detail-button" data-detail-kind="fairy" data-detail-id="${fairy.id}">查看詳情</button>
          </div>
          <strong>已契約</strong>
        </article>
      `;
    })
    .join('');

  page.innerHTML = `
    ${pageHeader('BAG / RENDER FROM STATE', '背包', '這裡讀取 gameState.inventory 和 gameState.fairies 動態生成，排序只調整畫面順序，不改存檔。')}
    <div class="core-actions-row collection-entry-actions">
      <button type="button" data-route="collection">打開圖鑑</button>
    </div>
    <div class="core-search-box">
      <label for="inventory-search">搜尋背包</label>
      <input id="inventory-search" type="search" placeholder="輸入素材、甜點、稀有度、來源或用途" autocomplete="off" />
    </div>
    <div class="core-sort-box">
      <label for="inventory-sort">排序</label>
      <select id="inventory-sort">${renderSortOptions()}</select>
    </div>
    <div class="core-filter-group">
      <p>分類</p>
      <div class="core-filter-tabs" aria-label="背包分類篩選">
        ${renderFilterTabs()}
      </div>
    </div>
    <div class="core-filter-group">
      <p>稀有度</p>
      <div class="core-filter-tabs" aria-label="背包稀有度篩選">
        ${renderRarityTabs()}
      </div>
    </div>
    <div class="core-list" id="inventory-list" data-current-filter="all" data-current-rarity="all" data-search-mode="all">
      ${itemCards || '<p class="core-empty" data-category="empty" data-rarity="empty">背包還是空的。去祈願或簽到拿一點素材吧。</p>'}
      ${fairyCards}
      <p class="core-empty core-search-empty" id="inventory-search-empty" hidden>沒有符合目前條件的物品。</p>
    </div>
  `;

  bindInventoryFilters(page);
  sortInventoryCards(page);
}

export function initInventoryPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-inventory');
    if (page?.classList.contains('active')) renderInventory();
  });
}
