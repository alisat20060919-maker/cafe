import { GameDB } from '@db';
import { showModal } from '@ui';

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

function renderCollectionCategories() {
  return GameDB.getInventoryCategories()
    .map((category, index) => `
      <button type="button" data-collection-filter="${category.id}" class="${index === 0 ? 'active' : ''}">
        <span>${category.icon}</span>${category.label}
      </button>
    `)
    .join('');
}

function renderCollectionRarities() {
  return GameDB.getInventoryRarities()
    .map((rarity, index) => `
      <button type="button" data-collection-rarity="${rarity.id}" class="${index === 0 ? 'active' : ''}">
        <span>${rarity.icon}</span>${rarity.label}
      </button>
    `)
    .join('');
}

function updateCollectionSearch(page) {
  const list = page.querySelector('#collection-list');
  const input = page.querySelector('#collection-search');
  const empty = page.querySelector('#collection-search-empty');
  if (!list) return;

  const query = GameDB.normalizeSearchText(input?.value || '');
  const currentFilter = list.dataset.currentFilter || 'all';
  const currentRarity = list.dataset.currentRarity || 'all';
  let visibleCount = 0;
  let cardCount = 0;

  list.dataset.searchMode = query ? 'filtered' : 'all';

  $all('.collection-card', list).forEach((card) => {
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

function openCollectionItemDetail(itemId) {
  const item = GameDB.items[itemId];
  if (!item) return;

  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">COLLECTION ITEM</span>
      <div class="core-detail-head">
        <div class="core-detail-icon">${item.icon}</div>
        <div>
          <h2>${item.name}</h2>
          <p>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</p>
        </div>
      </div>
      <dl class="core-detail-list">
        <div><dt>來源</dt><dd>${GameDB.getItemSourceText(item)}</dd></div>
        <div><dt>用途</dt><dd>${item.use}</dd></div>
        <div><dt>說明</dt><dd>${item.description}</dd></div>
        <div><dt>ID</dt><dd>${item.id}</dd></div>
      </dl>
    </div>
  `);
}

function openCollectionFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;

  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">COLLECTION FAIRY</span>
      <div class="core-detail-head">
        <div class="core-detail-icon">${fairy.icon}</div>
        <div>
          <h2>${fairy.name}</h2>
          <p>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')}</p>
        </div>
      </div>
      <p class="core-detail-quote">「${fairy.quote}」</p>
      <dl class="core-detail-list">
        <div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div>
        <div><dt>說明</dt><dd>${fairy.description}</dd></div>
        <div><dt>ID</dt><dd>${fairy.id}</dd></div>
      </dl>
    </div>
  `);
}

function bindCollectionPage(page) {
  const list = page.querySelector('#collection-list');

  $all('[data-collection-filter]', page).forEach((button) => {
    button.addEventListener('click', () => {
      $all('[data-collection-filter]', page).forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      if (list) list.dataset.currentFilter = button.dataset.collectionFilter || 'all';
      updateCollectionSearch(page);
    });
  });

  $all('[data-collection-rarity]', page).forEach((button) => {
    button.addEventListener('click', () => {
      $all('[data-collection-rarity]', page).forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      if (list) list.dataset.currentRarity = button.dataset.collectionRarity || 'all';
      updateCollectionSearch(page);
    });
  });

  page.querySelector('#collection-search')?.addEventListener('input', () => updateCollectionSearch(page));

  $all('[data-collection-kind]', page).forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.collectionKind === 'fairy') {
        openCollectionFairyDetail(button.dataset.collectionId);
        return;
      }
      openCollectionItemDetail(button.dataset.collectionId);
    });
  });
}

export function renderCollection() {
  const page = document.querySelector('#page-collection');
  if (!page) return;

  const itemCards = Object.values(GameDB.items)
    .map((item) => `
      <article class="core-item-card rarity-${item.rarity.toLowerCase()} collection-card" data-category="${item.type}" data-rarity="${item.rarity}" data-search="${escapeAttr(GameDB.getItemSearchText(item))}" data-search-match="true">
        <div class="core-item-icon">${item.icon}</div>
        <div>
          <b>${item.name}</b>
          <span>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</span>
          <p>${item.description}</p>
          <div class="core-item-meta">
            <small>來源：${GameDB.getItemSourceText(item)}</small>
            <small>用途：${item.use}</small>
          </div>
          <button type="button" class="core-detail-button" data-collection-kind="item" data-collection-id="${item.id}">查看資料</button>
        </div>
        <strong>圖鑑</strong>
      </article>
    `)
    .join('');

  const fairyCards = Object.values(GameDB.fairies)
    .map((fairy) => `
      <article class="core-item-card ssr collection-card" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(GameDB.getFairySearchText(fairy))}" data-search-match="true">
        <div class="core-item-icon">${fairy.icon}</div>
        <div>
          <b>${fairy.name}</b>
          <span>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')}</span>
          <p>「${fairy.quote}」</p>
          <div class="core-item-meta">
            <small>來源：${GameDB.getFairySourceText(fairy)}</small>
            <small>${fairy.description}</small>
          </div>
          <button type="button" class="core-detail-button" data-collection-kind="fairy" data-collection-id="${fairy.id}">查看資料</button>
        </div>
        <strong>圖鑑</strong>
      </article>
    `)
    .join('');

  page.innerHTML = `
    ${pageHeader('COLLECTION / READ ONLY GAME DB', '圖鑑', '這裡是獨立圖鑑頁，只讀取 GameDB 的世界資料；搜尋與篩選都不讀取背包、不改存檔。')}
    <div class="core-actions-row collection-actions">
      <button type="button" data-route="inventory">返回背包</button>
      <button type="button" data-route="home">回到店鋪</button>
    </div>
    <div class="core-search-box">
      <label for="collection-search">搜尋圖鑑</label>
      <input id="collection-search" type="search" placeholder="輸入素材、精靈、稀有度、來源或用途" autocomplete="off" />
    </div>
    <div class="core-filter-group">
      <p>分類</p>
      <div class="core-filter-tabs" aria-label="圖鑑分類篩選">
        ${renderCollectionCategories()}
      </div>
    </div>
    <div class="core-filter-group">
      <p>稀有度</p>
      <div class="core-filter-tabs" aria-label="圖鑑稀有度篩選">
        ${renderCollectionRarities()}
      </div>
    </div>
    <div class="core-list collection-list" id="collection-list" data-current-filter="all" data-current-rarity="all" data-search-mode="all">
      ${itemCards}
      ${fairyCards}
      <p class="core-empty core-search-empty" id="collection-search-empty" hidden>沒有符合目前條件的圖鑑資料。</p>
    </div>
  `;

  bindCollectionPage(page);
  updateCollectionSearch(page);
}
