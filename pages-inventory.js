import { GameDB } from '@db';
import { getState } from '@state';
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
}

export function renderInventory() {
  const page = document.querySelector('#page-inventory');
  if (!page) return;

  const state = getState();
  const itemCards = Object.values(GameDB.items)
    .map((item) => ({ item, count: Number(state.inventory[item.id] || 0) }))
    .filter(({ count }) => count > 0)
    .map(({ item, count }) => `
      <article class="core-item-card rarity-${item.rarity.toLowerCase()}" data-category="${item.type}" data-rarity="${item.rarity}" data-search="${escapeAttr(GameDB.getItemSearchText(item))}" data-search-match="true">
        <div class="core-item-icon">${item.icon}</div>
        <div>
          <b>${item.name}</b>
          <span>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</span>
          <p>${item.description}</p>
          <div class="core-item-meta">
            <small>來源：${GameDB.getItemSourceText(item)}</small>
            <small>用途：${item.use}</small>
          </div>
        </div>
        <strong>×${count}</strong>
      </article>
    `)
    .join('');

  const fairyCards = Object.entries(state.fairies)
    .filter(([, data]) => data?.owned)
    .map(([fairyId]) => {
      const fairy = GameDB.fairies[fairyId];
      return `
        <article class="core-item-card ssr" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(GameDB.getFairySearchText(fairy))}" data-search-match="true">
          <div class="core-item-icon">${fairy.icon}</div>
          <div>
            <b>${fairy.name}</b>
            <span>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')}</span>
            <p>「${fairy.quote}」</p>
            <div class="core-item-meta">
              <small>來源：${GameDB.getFairySourceText(fairy)}</small>
              <small>${fairy.description}</small>
            </div>
          </div>
          <strong>已契約</strong>
        </article>
      `;
    })
    .join('');

  page.innerHTML = `
    ${pageHeader('BAG / RENDER FROM STATE', '背包', '這裡讀取 gameState.inventory 和 gameState.fairies 動態生成，分類、稀有度、來源與搜尋資料由 GameDB 提供。')}
    <div class="core-search-box">
      <label for="inventory-search">搜尋背包</label>
      <input id="inventory-search" type="search" placeholder="輸入素材、甜點、稀有度、來源或用途" autocomplete="off" />
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
  updateInventorySearch(page);
}

export function initInventoryPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-inventory');
    if (page?.classList.contains('active')) renderInventory();
  });
}
