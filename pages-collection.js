import { GameDB } from '@db';
import { getState, isItemDiscovered, isFairyDiscovered } from '@state';
import { showModal } from '@ui';

let currentKind = 'items';
let currentFilter = 'all';
let currentRarity = 'all';

function $all(selector, root = document) { return [...root.querySelectorAll(selector)]; }
function escapeAttr(value = '') { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function getCollectionStats() {
  const items = Object.values(GameDB.items || {});
  const fairies = Object.values(GameDB.fairies || {});
  const itemFound = items.filter((item) => isItemDiscovered(item.id)).length;
  const fairyFound = fairies.filter((fairy) => isFairyDiscovered(fairy.id)).length;
  return { itemFound, itemTotal: items.length, fairyFound, fairyTotal: fairies.length, totalFound: itemFound + fairyFound, total: items.length + fairies.length };
}

function hiddenSearchText(kind, rarity, typeId = '') {
  return GameDB.buildSearchText([kind, typeId, GameDB.getItemTypeLabel(typeId), rarity, GameDB.getRarityLabel(rarity), '未發現', '???']);
}

function renderStyle() {
  return `<style>
    #page-collection .collection-cover{position:relative;overflow:hidden;padding:18px;border-radius:24px;background:linear-gradient(135deg,rgba(255,248,231,.95),rgba(240,226,255,.78));border:1px solid rgba(116,82,46,.14);box-shadow:0 14px 34px rgba(84,52,28,.12)}
    #page-collection .collection-cover:after{content:'✦';position:absolute;right:22px;top:8px;font-size:4rem;opacity:.16}.collection-cover span{font-size:.72rem;font-weight:900;letter-spacing:.18em;color:#9c6b3c}.collection-cover h2{margin:.25rem 0 .35rem;font-size:1.35rem}.collection-cover p{margin:0;opacity:.72;line-height:1.55}.collection-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.collection-progress b{display:block;padding:10px;border-radius:16px;background:rgba(255,255,255,.58);font-size:.82rem;text-align:center}
    #page-collection .collection-kind-tabs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 10px}.collection-kind-tabs button{border:0;border-radius:18px;padding:13px 12px;background:rgba(255,252,245,.72);box-shadow:inset 0 0 0 1px rgba(116,82,46,.12);font-weight:900;color:#7a4c28}.collection-kind-tabs button.active{background:linear-gradient(135deg,#fff4ca,#ffe2f0);box-shadow:0 10px 22px rgba(84,52,28,.14)}
    #page-collection .collection-toolbox{position:sticky;top:0;z-index:4;padding:10px 0 8px;background:linear-gradient(to bottom,rgba(255,250,240,.96),rgba(255,250,240,.78),transparent);backdrop-filter:blur(8px)}.collection-search{display:flex;gap:8px;align-items:center;padding:10px 12px;border-radius:18px;background:rgba(255,255,255,.72);border:1px solid rgba(116,82,46,.1)}.collection-search input{width:100%;border:0;background:transparent;outline:none;font:inherit}.collection-chip-row{display:flex;gap:7px;overflow:auto;padding:9px 2px 0}.collection-chip-row button{white-space:nowrap;border:0;border-radius:999px;padding:8px 11px;background:rgba(255,255,255,.66);box-shadow:inset 0 0 0 1px rgba(116,82,46,.1);font-size:.78rem;font-weight:800;color:#7a4c28}.collection-chip-row button.active{background:#7a4c28;color:#fff}
    #page-collection .collection-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:10px;padding-bottom:12px}.collection-card{position:relative;min-height:150px;border:0;border-radius:20px;padding:12px;text-align:left;background:rgba(255,252,245,.82);box-shadow:inset 0 0 0 1px rgba(116,82,46,.11),0 10px 22px rgba(84,52,28,.08);color:inherit;overflow:hidden}.collection-card:before{content:'';position:absolute;inset:auto -28px -32px auto;width:82px;height:82px;border-radius:50%;background:rgba(255,214,135,.22)}.collection-card.is-undiscovered{filter:grayscale(.35);opacity:.72}.collection-card-icon{position:relative;display:grid;place-items:center;width:54px;height:54px;border-radius:18px;background:rgba(255,255,255,.72);font-size:1.8rem;margin-bottom:9px}.collection-card-rarity{position:absolute;right:10px;top:10px;padding:4px 7px;border-radius:999px;background:rgba(122,76,40,.1);font-size:.68rem;font-weight:900}.collection-card h3{position:relative;margin:0 0 5px;font-size:.92rem;line-height:1.25}.collection-card p{position:relative;margin:0;color:rgba(80,50,30,.66);font-size:.74rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.collection-card small{position:absolute;left:12px;right:12px;bottom:10px;font-size:.68rem;font-weight:800;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.collection-card.rarity-ssr{background:linear-gradient(135deg,rgba(255,248,214,.95),rgba(240,226,255,.9))}.collection-card.rarity-sr{background:linear-gradient(135deg,rgba(238,248,255,.94),rgba(255,244,226,.9))}.collection-card.rarity-r{background:rgba(255,252,245,.86)}.collection-card.rarity-n{background:rgba(250,247,239,.82)}
    @media(max-width:520px){#page-collection .collection-gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.collection-progress{grid-template-columns:1fr 1fr}.collection-card{min-height:146px;padding:11px}.collection-card-icon{width:48px;height:48px;font-size:1.55rem}}
  </style>`;
}

function getVisibleCategories() {
  if (currentKind === 'fairies') return [{ id: 'all', label: '全部精靈', icon: '🧚' }];
  return GameDB.getInventoryCategories().filter((category) => category.id !== 'fairy');
}

function getVisibleRarities() { return GameDB.getInventoryRarities(); }

function renderCover() {
  const stats = getCollectionStats();
  return `<section class="collection-cover"><span>COMPENDIUM</span><h2>精靈咖啡屋圖鑑</h2><p>收集過的素材、商品與精靈會在這裡解鎖。主頁保持清爽，完整故事點卡片查看。</p><div class="collection-progress"><b>總進度 ${stats.totalFound}/${stats.total}</b><b>物品 ${stats.itemFound}/${stats.itemTotal}</b><b>精靈 ${stats.fairyFound}/${stats.fairyTotal}</b></div></section>`;
}

function renderKindTabs() {
  return `<div class="collection-kind-tabs"><button type="button" data-kind="items" class="${currentKind === 'items' ? 'active' : ''}">🧺 物品圖鑑</button><button type="button" data-kind="fairies" class="${currentKind === 'fairies' ? 'active' : ''}">🧚 精靈圖鑑</button></div>`;
}

function renderTools() {
  const cats = getVisibleCategories().map((cat) => `<button type="button" data-filter="${cat.id}" class="${currentFilter === cat.id ? 'active' : ''}">${cat.icon || ''} ${cat.label}</button>`).join('');
  const rarities = getVisibleRarities().map((rarity) => `<button type="button" data-rarity="${rarity.id}" class="${currentRarity === rarity.id ? 'active' : ''}">${rarity.icon || ''} ${rarity.label}</button>`).join('');
  return `<section class="collection-toolbox"><label class="collection-search">🔎<input id="collection-search" type="search" placeholder="搜尋名稱、來源、用途、稀有度" autocomplete="off" /></label><div class="collection-chip-row">${cats}</div><div class="collection-chip-row">${rarities}</div></section>`;
}

function getItemCardText(item, discovered) {
  if (!discovered) return { title: '???', desc: '尚未發現，取得一次後解鎖。', foot: `${GameDB.getRarityLabel(item.rarity)}｜${GameDB.getItemTypeLabel(item.type)}` };
  return { title: item.name, desc: item.description || item.use || '尚未設定說明。', foot: `${GameDB.getItemTypeLabel(item.type)}｜${GameDB.getItemSourceText(item)}` };
}

function getFairyCardText(fairy, discovered) {
  if (!discovered) return { title: '???', desc: '尚未契約，取得一次後解鎖。', foot: `${GameDB.getRarityLabel(fairy.rarity)}｜精靈` };
  return { title: fairy.name, desc: fairy.quote || fairy.description || '尚未設定說明。', foot: `精靈｜${fairy.passiveBuff?.label || '無被動'}` };
}

function renderItemCard(item) {
  const discovered = isItemDiscovered(item.id);
  const text = getItemCardText(item, discovered);
  return `<button type="button" class="collection-card rarity-${String(item.rarity || 'N').toLowerCase()} ${discovered ? '' : 'is-undiscovered'}" data-card-kind="item" data-id="${item.id}" data-category="${item.type}" data-rarity="${item.rarity}" data-search="${escapeAttr(discovered ? GameDB.getItemSearchText(item) : hiddenSearchText('item', item.rarity, item.type))}"><span class="collection-card-rarity">${item.rarity}</span><span class="collection-card-icon">${discovered ? item.icon : '🔒'}</span><h3>${escapeAttr(text.title)}</h3><p>${escapeAttr(text.desc)}</p><small>${escapeAttr(text.foot)}</small></button>`;
}

function renderFairyCard(fairy) {
  const discovered = isFairyDiscovered(fairy.id);
  const text = getFairyCardText(fairy, discovered);
  return `<button type="button" class="collection-card rarity-${String(fairy.rarity || 'R').toLowerCase()} ${discovered ? '' : 'is-undiscovered'}" data-card-kind="fairy" data-id="${fairy.id}" data-category="fairy" data-rarity="${fairy.rarity}" data-search="${escapeAttr(discovered ? GameDB.getFairySearchText(fairy) : hiddenSearchText('fairy', fairy.rarity))}"><span class="collection-card-rarity">${fairy.rarity}</span><span class="collection-card-icon">${discovered ? fairy.icon : '🔒'}</span><h3>${escapeAttr(text.title)}</h3><p>${escapeAttr(text.desc)}</p><small>${escapeAttr(text.foot)}</small></button>`;
}

function renderLockedDetail(kind, rarity, typeLabel) { showModal(`<div class="core-modal-card core-detail-modal"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">LOCKED</span><div class="core-detail-head"><div class="core-detail-icon">🔒</div><div><h2>尚未發現</h2><p>${GameDB.getRarityLabel(rarity)} / ${typeLabel}</p></div></div><p class="core-detail-quote">取得一次後會解鎖完整圖鑑資料。</p></div>`); }

function openItemDetail(itemId) {
  const item = GameDB.items[itemId]; if (!item) return;
  if (!isItemDiscovered(item.id)) return renderLockedDetail('item', item.rarity, GameDB.getItemTypeLabel(item.type));
  showModal(`<div class="core-modal-card core-detail-modal"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">ITEM</span><div class="core-detail-head"><div class="core-detail-icon">${item.icon}</div><div><h2>${item.name}</h2><p>${GameDB.getRarityLabel(item.rarity)} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars || 1)}</p></div></div><dl class="core-detail-list"><div><dt>來源</dt><dd>${GameDB.getItemSourceText(item)}</dd></div><div><dt>用途</dt><dd>${item.use || '—'}</dd></div><div><dt>說明</dt><dd>${item.description || '—'}</dd></div><div><dt>ID</dt><dd>${item.id}</dd></div></dl></div>`);
}

function openFairyDetail(fairyId) {
  const fairy = GameDB.fairies[fairyId]; if (!fairy) return;
  if (!isFairyDiscovered(fairy.id)) return renderLockedDetail('fairy', fairy.rarity, GameDB.getItemTypeLabel('fairy'));
  showModal(`<div class="core-modal-card core-detail-modal"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">FAIRY</span><div class="core-detail-head"><div class="core-detail-icon">${fairy.icon}</div><div><h2>${fairy.name}</h2><p>${GameDB.getRarityLabel(fairy.rarity)} / 精靈</p></div></div><p class="core-detail-quote">「${fairy.quote || '……'}」</p><dl class="core-detail-list"><div><dt>來源</dt><dd>${GameDB.getFairySourceText(fairy)}</dd></div><div><dt>喜歡</dt><dd>${(fairy.favoriteSweets || []).map((id) => GameDB.items?.[id]?.name || id).join('、') || '未知'}</dd></div><div><dt>被動</dt><dd>${fairy.passiveBuff?.label || '無'}</dd></div><div><dt>說明</dt><dd>${fairy.description || '—'}</dd></div><div><dt>ID</dt><dd>${fairy.id}</dd></div></dl></div>`);
}

function applyFilters(page) {
  const query = GameDB.normalizeSearchText(page.querySelector('#collection-search')?.value || '');
  let visible = 0;
  $all('.collection-card', page).forEach((card) => {
    const kindMatch = currentKind === 'fairies' ? card.dataset.cardKind === 'fairy' : card.dataset.cardKind === 'item';
    const filterMatch = currentFilter === 'all' || card.dataset.category === currentFilter;
    const rarityMatch = currentRarity === 'all' || card.dataset.rarity === currentRarity;
    const searchMatch = !query || (card.dataset.search || '').includes(query);
    const show = kindMatch && filterMatch && rarityMatch && searchMatch;
    card.hidden = !show;
    if (show) visible += 1;
  });
  const empty = page.querySelector('#collection-search-empty');
  if (empty) empty.hidden = visible > 0;
}

function bind(page) {
  page.addEventListener('click', (event) => {
    const kindBtn = event.target.closest('[data-kind]');
    if (kindBtn) { currentKind = kindBtn.dataset.kind || 'items'; currentFilter = 'all'; renderCollection(); return; }
    const filterBtn = event.target.closest('[data-filter]');
    if (filterBtn) { currentFilter = filterBtn.dataset.filter || 'all'; renderCollection(); return; }
    const rarityBtn = event.target.closest('[data-rarity]');
    if (rarityBtn) { currentRarity = rarityBtn.dataset.rarity || 'all'; renderCollection(); return; }
    const card = event.target.closest('[data-card-kind]');
    if (card?.dataset.cardKind === 'fairy') return openFairyDetail(card.dataset.id);
    if (card?.dataset.cardKind === 'item') return openItemDetail(card.dataset.id);
  }, { once: true });
  page.querySelector('#collection-search')?.addEventListener('input', () => applyFilters(page));
}

export function renderCollection() {
  const page = document.querySelector('#page-collection'); if (!page) return;
  getState();
  const cards = [...Object.values(GameDB.items || {}).map(renderItemCard), ...Object.values(GameDB.fairies || {}).map(renderFairyCard)].join('');
  page.innerHTML = `${renderStyle()}${renderCover()}${renderKindTabs()}${renderTools()}<div class="collection-gallery" id="collection-list">${cards}<p class="core-empty" id="collection-search-empty" hidden>沒有符合條件的圖鑑資料。</p></div>`;
  bind(page);
  applyFilters(page);
}
