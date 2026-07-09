import { GameDB } from '@db';
import { getState, isItemDiscovered, isFairyDiscovered } from '@state';
import { showModal } from '@ui';

function $all(selector, root = document) { return [...root.querySelectorAll(selector)]; }

function pageHeader(kicker, title, body) {
  return `<div class="core-page-head"><span>${kicker}</span><h2>${title}</h2><p>${body}</p></div>`;
}

function escapeAttr(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hiddenSearchText(kind, rarity, typeId = '') {
  return GameDB.buildSearchText([
    kind === 'fairy' ? 'fairy' : typeId,
    kind === 'fairy' ? GameDB.getItemTypeLabel('fairy') : GameDB.getItemTypeLabel(typeId),
    rarity,
    GameDB.getRarityLabel(rarity),
    '未發現',
    '???',
  ]);
}

function getCollectionStats() {
  const items = Object.values(GameDB.items || {});
  const fairies = Object.values(GameDB.fairies || {});
  const itemFound = items.filter((item) => isItemDiscovered(item.id)).length;
  const fairyFound = fairies.filter((fairy) => isFairyDiscovered(fairy.id)).length;
  return {
    itemFound,
    itemTotal: items.length,
    fairyFound,
    fairyTotal: fairies.length,
    totalFound: itemFound + fairyFound,
    total: items.length + fairies.length,
  };
}

function renderCollectionStats() {
  const stats = getCollectionStats();
  return `
    <section class="inventory-hero-card collection-summary-card">
      <div class="inventory-hero-copy">
        <span>DISCOVERY</span>
        <h3>探索進度 ${stats.totalFound}/${stats.total}</h3>
        <p>目前圖鑑採用文字清單模式，避免素材與精靈變多後畫面太擠。</p>
      </div>
      <div class="inventory-hero-stats"><b>物品 ${stats.itemTotal}</b><b>精靈 ${stats.fairyTotal}</b><b>已發現 ${stats.totalFound}</b></div>
    </section>`;
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
    const isVisible = searchMatch && categoryMatch && rarityMatch;
    card.dataset.searchMatch = searchMatch ? 'true' : 'false';
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  if (empty) empty.hidden = cardCount === 0 || visibleCount > 0;
}

function renderLockedDetail(kind, rarity, typeLabel) {
  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">LOCKED COLLECTION</span>
      <div class="core-detail-head"><div class="core-detail-icon">❔</div><div><h2>???</h2><p>${GameDB.getRarityLabel(rarity)} / ${typeLabel}</p></div></div>
      <p class="core-detail-quote">尚未發現。取得一次後會解鎖完整圖鑑資料。</p>
      <dl class="core-detail-list"><div><dt>狀態</dt><dd>未發現</dd></div><div><dt>類型</dt><dd>${kind === 'fairy' ? '精靈' : '素材 / 商品'}</dd></div></dl>
    </div>`);
}

function openCollectionItemDetail(itemId) {
  const item = GameDB.items[itemId];
  if (!item) return;
  if (!isItemDiscovered(item.id)) return renderLockedDetail('item', item.rarity, GameDB.getItemTypeLabel(item.type));

  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">COLLECTION ITEM</span>
      <div class="core-detail-head"><div class="core-detail-icon">${item.icon}</div><div><h2>${item.name}</h2><p>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</p></div></div>
      <dl class="core-detail-list"><div><dt>來源</dt><dd>${GameDB.getItemSourceText(item)}</dd></div><div><dt>用途</dt><dd>${item.use}</dd></div><div><dt>說明</dt><dd>${item.description}</dd></div><div><dt>ID</dt><dd>${item.id}</dd></div></dl>
    </div>`);
}

function openCollectionFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId];
  if (!fairy) return;
  if (!isFairyDiscovered(fairy.id)) return renderLockedDetail('fairy', fairy.rarity, GameDB.getItemTypeLabel('fairy'));

  showModal(`
    <div class="core-modal-card core-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">COLLECTION FAIRY</span>
      <div class="core-detail-head"><div class="core-detail-icon">${fairy.icon}</div><div><h2>${fairy.name}</h2><p>${GameDB.getRarityLabel(fairy.rarity)} / ${GameDB.getItemTypeLabel('fairy')}</p></div></div>
      <p class="core-detail-quote">「${fairy.quote}」</p>
      <dl class="core-detail-list"><div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div><div><dt>喜歡</dt><dd>${(fairy.favoriteSweets || []).map((id) => GameDB.items?.[id]?.name || id).join('、') || '未知'}</dd></div><div><dt>被動</dt><dd>${fairy.passiveBuff?.label || '無'}</dd></div><div><dt>說明</dt><dd>${fairy.description}</dd></div><div><dt>ID</dt><dd>${fairy.id}</dd></div></dl>
    </div>`);
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
      if (button.dataset.collectionKind === 'fairy') return openCollectionFairyDetail(button.dataset.collectionId);
      openCollectionItemDetail(button.dataset.collectionId);
    });
  });
}

function renderItemCard(item) {
  const discovered = isItemDiscovered(item.id);
  const typeLabel = GameDB.getItemTypeLabel(item.type);
  const name = discovered ? item.name : '???';
  const note = discovered ? `${GameDB.getItemSourceText(item)}｜${item.use || '用途未設定'}` : `未發現｜${typeLabel}`;
  return `
    <button type="button" class="collection-card collection-text-row rarity-${item.rarity.toLowerCase()} ${discovered ? '' : 'is-undiscovered'}" data-category="${item.type}" data-rarity="${item.rarity}" data-search="${escapeAttr(discovered ? GameDB.getItemSearchText(item) : hiddenSearchText('item', item.rarity, item.type))}" data-search-match="true" data-discovered="${discovered ? 'true' : 'false'}" data-collection-kind="item" data-collection-id="${item.id}" title="${escapeAttr(name)}">
      <span class="collection-row-rarity">${item.rarity}</span>
      <span class="collection-row-type">${typeLabel}</span>
      <strong>${discovered ? `${item.icon} ${item.name}` : '❔ ???'}</strong>
      <small>${escapeAttr(note)}</small>
    </button>`;
}

function renderFairyCard(fairy) {
  const discovered = isFairyDiscovered(fairy.id);
  const name = discovered ? fairy.name : '???';
  const note = discovered ? `${GameDB.getFairySourceText(fairy)}｜${fairy.passiveBuff?.label || '無被動'}` : '未發現｜精靈';
  return `
    <button type="button" class="collection-card collection-text-row collection-fairy-row rarity-${fairy.rarity.toLowerCase()} ${discovered ? '' : 'is-undiscovered'}" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(discovered ? GameDB.getFairySearchText(fairy) : hiddenSearchText('fairy', fairy.rarity))}" data-search-match="true" data-discovered="${discovered ? 'true' : 'false'}" data-collection-kind="fairy" data-collection-id="${fairy.id}" title="${escapeAttr(name)}">
      <span class="collection-row-rarity">${fairy.rarity}</span>
      <span class="collection-row-type">精靈</span>
      <strong>${discovered ? `${fairy.icon} ${fairy.name}` : '❔ ???'}</strong>
      <small>${escapeAttr(note)}</small>
    </button>`;
}

function renderCollectionStyle() {
  return `
    <style>
      #page-collection .collection-list.collection-text-list { display: flex; flex-direction: column; gap: 8px; }
      #page-collection .collection-text-row { width: 100%; display: grid; grid-template-columns: 54px 78px minmax(120px, 1fr); gap: 8px 10px; align-items: center; text-align: left; padding: 12px 14px; border: 1px solid rgba(116, 82, 46, .14); border-radius: 16px; background: rgba(255, 252, 245, .76); color: inherit; }
      #page-collection .collection-text-row strong { font-size: .95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #page-collection .collection-text-row small { grid-column: 3 / 4; opacity: .68; line-height: 1.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #page-collection .collection-row-rarity, #page-collection .collection-row-type { font-size: .72rem; font-weight: 800; opacity: .78; }
      #page-collection .collection-row-type { opacity: .62; }
      #page-collection .collection-text-row.is-undiscovered { filter: grayscale(.2); opacity: .72; }
      @media (max-width: 520px) { #page-collection .collection-text-row { grid-template-columns: 46px 64px minmax(0, 1fr); padding: 11px 12px; } }
    </style>`;
}

export function renderCollection() {
  const page = document.querySelector('#page-collection');
  if (!page) return;

  getState();
  const itemCards = Object.values(GameDB.items || {}).map(renderItemCard).join('');
  const fairyCards = Object.values(GameDB.fairies || {}).map(renderFairyCard).join('');

  page.innerHTML = `
    ${renderCollectionStyle()}
    ${pageHeader('COLLECTION', '圖鑑', '素材與精靈改成文字清單。想看完整說明再點開，不把全部內容塞在主畫面。')}
    ${renderCollectionStats()}
    <div class="core-actions-row collection-actions"><button type="button" data-route="inventory">返回背包</button><button type="button" data-route="home">回到店鋪</button></div>
    <div class="core-search-box"><label for="collection-search">搜尋圖鑑</label><input id="collection-search" type="search" placeholder="輸入素材、精靈、稀有度、來源或用途" autocomplete="off" /></div>
    <div class="core-filter-group"><p>分類</p><div class="core-filter-tabs" aria-label="圖鑑分類篩選">${renderCollectionCategories()}</div></div>
    <div class="core-filter-group"><p>稀有度</p><div class="core-filter-tabs" aria-label="圖鑑稀有度篩選">${renderCollectionRarities()}</div></div>
    <div class="core-list collection-list collection-text-list" id="collection-list" data-current-filter="all" data-current-rarity="all" data-search-mode="all">
      ${itemCards}${fairyCards}
      <p class="core-empty core-search-empty" id="collection-search-empty" hidden>沒有符合目前條件的圖鑑資料。</p>
    </div>`;

  bindCollectionPage(page);
  updateCollectionSearch(page);
}
