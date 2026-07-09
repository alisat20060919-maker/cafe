import { GameDB } from '@db';
import { getState, isItemDiscovered, isFairyDiscovered } from '@state';
import { showModal } from '@ui';

let currentCategory = 'material';
let selectedKind = 'item';
let selectedId = null;

function $all(selector, root = document) { return [...root.querySelectorAll(selector)]; }
function esc(value = '') { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const albumCategories = [
  { id: 'material', label: '素材', icon: '🌿', itemTypes: ['material', 'rare_material', 'refined_material'] },
  { id: 'food', label: '甜點飲品', icon: '🍰', itemTypes: ['sweet', 'drink'] },
  { id: 'product', label: '商品', icon: '🎁', itemTypes: ['product'] },
  { id: 'usable', label: '道具', icon: '🧰', itemTypes: ['event_material'] },
  { id: 'fairy', label: '精靈', icon: '🧚', itemTypes: [] },
];

function getCategory() { return albumCategories.find((cat) => cat.id === currentCategory) || albumCategories[0]; }
function getStats() {
  const items = Object.values(GameDB.items || {});
  const fairies = Object.values(GameDB.fairies || {});
  return {
    itemFound: items.filter((item) => isItemDiscovered(item.id)).length,
    itemTotal: items.length,
    fairyFound: fairies.filter((fairy) => isFairyDiscovered(fairy.id)).length,
    fairyTotal: fairies.length,
  };
}

function getEntries() {
  const cat = getCategory();
  if (cat.id === 'fairy') {
    return Object.values(GameDB.fairies || {}).map((fairy) => ({ kind: 'fairy', data: fairy, discovered: isFairyDiscovered(fairy.id), rarity: fairy.rarity || 'R' }));
  }
  return Object.values(GameDB.items || {})
    .filter((item) => cat.itemTypes.includes(item.type))
    .map((item) => ({ kind: 'item', data: item, discovered: isItemDiscovered(item.id), rarity: item.rarity || 'N' }));
}

function getSelectedEntry(entries) {
  if (selectedId) {
    const found = entries.find((entry) => entry.kind === selectedKind && entry.data.id === selectedId);
    if (found) return found;
  }
  return entries[0] || null;
}

function rarityStars(rarity = 'N') {
  if (rarity === 'SSR') return '★★★★★';
  if (rarity === 'SR') return '★★★★';
  if (rarity === 'R') return '★★★';
  return '★★';
}

function renderStyle() {
  return `<style>
    #page-collection{--paper:#fffaf0;--ink:#654226;--line:rgba(107,68,36,.18)}
    #page-collection .album-shell{padding:14px;border-radius:28px;background:linear-gradient(180deg,#fff8e8,#f4e3c6);box-shadow:inset 0 0 0 2px rgba(132,84,43,.13),0 18px 38px rgba(70,42,20,.16);color:var(--ink)}
    #page-collection .album-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;padding:6px 4px 12px}.album-head span{font-size:.7rem;font-weight:900;letter-spacing:.18em;color:#a06c3b}.album-head h2{margin:.2rem 0 0;font-size:1.25rem}.album-progress{font-size:.74rem;font-weight:800;opacity:.7;text-align:right}
    #page-collection .album-tabs{display:flex;gap:7px;overflow:auto;padding:0 2px 12px}.album-tabs button{min-width:72px;border:0;border-radius:14px 14px 8px 8px;padding:9px 10px;background:#e5c894;color:#73461f;font-weight:900;box-shadow:inset 0 -4px 0 rgba(111,70,31,.12)}.album-tabs button.active{background:#fff8df;transform:translateY(2px)}
    #page-collection .album-book{border-radius:24px;background:var(--paper);border:1px solid var(--line);box-shadow:inset 0 0 28px rgba(97,61,31,.1);overflow:hidden}.album-grid-panel{padding:14px}.album-category-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.album-category-title h3{margin:0;font-size:1rem}.album-category-title small{font-weight:800;opacity:.55}
    #page-collection .album-icon-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.album-slot{position:relative;aspect-ratio:1;border:0;border-radius:12px;background:linear-gradient(135deg,#fffdf4,#ecd9b8);box-shadow:inset 0 0 0 2px rgba(117,76,35,.16),0 5px 10px rgba(72,43,19,.08);font-size:1.45rem;color:var(--ink)}.album-slot.active{outline:3px solid #f0b83b;box-shadow:inset 0 0 0 2px rgba(117,76,35,.18),0 0 0 5px rgba(240,184,59,.22)}.album-slot.locked{filter:grayscale(.5);opacity:.62}.album-slot .rarity-dot{position:absolute;right:4px;bottom:4px;font-size:.55rem;font-weight:900;background:rgba(97,61,31,.72);color:#fff;border-radius:999px;padding:2px 4px}.album-slot.rarity-ssr{background:linear-gradient(135deg,#fff1aa,#f6d6ff)}.album-slot.rarity-sr{background:linear-gradient(135deg,#dff5ff,#fff1c7)}
    #page-collection .album-detail{margin:0 14px 14px;padding:16px;border-radius:22px;background:rgba(255,255,255,.56);border:1px solid var(--line);text-align:center}.album-detail-icon{width:96px;height:96px;margin:4px auto 10px;border-radius:28px;display:grid;place-items:center;background:radial-gradient(circle,#fff 0,#fff8df 55%,#ead0a6 100%);font-size:3rem;box-shadow:inset 0 0 0 2px rgba(117,76,35,.15)}.album-detail h3{margin:0;font-size:1.18rem}.album-detail .stars{margin:4px 0 10px;color:#d49a17;font-weight:900;letter-spacing:.08em}.album-detail p{margin:0 auto 12px;max-width:32em;text-align:left;line-height:1.62;font-size:.88rem;opacity:.78}.album-info-list{display:grid;gap:7px;text-align:left}.album-info-list div{display:grid;grid-template-columns:72px 1fr;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(255,250,235,.72);font-size:.82rem}.album-info-list b{opacity:.58}.album-empty{padding:24px;text-align:center;opacity:.6}
    @media(max-width:430px){#page-collection .album-icon-grid{grid-template-columns:repeat(5,1fr);gap:7px}.album-slot{font-size:1.28rem;border-radius:10px}.album-detail-icon{width:82px;height:82px;font-size:2.5rem}.album-info-list div{grid-template-columns:64px 1fr}}
  </style>`;
}

function renderTabs() {
  return `<div class="album-tabs">${albumCategories.map((cat) => `<button type="button" data-album-category="${cat.id}" class="${cat.id === currentCategory ? 'active' : ''}">${cat.icon}<br>${cat.label}</button>`).join('')}</div>`;
}

function renderSlot(entry) {
  const data = entry.data;
  const active = selectedId === data.id && selectedKind === entry.kind;
  return `<button type="button" class="album-slot rarity-${String(entry.rarity).toLowerCase()} ${entry.discovered ? '' : 'locked'} ${active ? 'active' : ''}" data-entry-kind="${entry.kind}" data-entry-id="${data.id}" title="${entry.discovered ? esc(data.name) : '???'}"><span>${entry.discovered ? data.icon : '🔒'}</span><i class="rarity-dot">${entry.rarity}</i></button>`;
}

function renderDetail(entry) {
  if (!entry) return `<section class="album-detail"><div class="album-empty">這個分類目前沒有資料。</div></section>`;
  const data = entry.data;
  if (!entry.discovered) {
    return `<section class="album-detail"><div class="album-detail-icon">🔒</div><h3>？？？</h3><div class="stars">${rarityStars(entry.rarity)}</div><p>尚未發現。取得一次後，這裡會解鎖完整資料。</p><div class="album-info-list"><div><b>分類</b><span>${getCategory().label}</span></div><div><b>稀有度</b><span>${entry.rarity}</span></div></div></section>`;
  }
  if (entry.kind === 'fairy') {
    return `<section class="album-detail"><div class="album-detail-icon">${data.icon}</div><h3>${esc(data.name)}</h3><div class="stars">${rarityStars(data.rarity)}</div><p>「${esc(data.quote || data.description || '……')}」</p><div class="album-info-list"><div><b>來源</b><span>${GameDB.getFairySourceText(data)}</span></div><div><b>喜歡</b><span>${(data.favoriteSweets || []).map((id) => GameDB.items?.[id]?.name || id).join('、') || '未知'}</span></div><div><b>被動</b><span>${data.passiveBuff?.label || '無'}</span></div><div><b>說明</b><span>${esc(data.description || '—')}</span></div></div></section>`;
  }
  return `<section class="album-detail"><div class="album-detail-icon">${data.icon}</div><h3>${esc(data.name)}</h3><div class="stars">${rarityStars(data.rarity)}</div><p>${esc(data.description || data.use || '尚未設定說明。')}</p><div class="album-info-list"><div><b>來源</b><span>${GameDB.getItemSourceText(data)}</span></div><div><b>用途</b><span>${esc(data.use || '—')}</span></div><div><b>分類</b><span>${GameDB.getItemTypeLabel(data.type)}</span></div></div></section>`;
}

function renderAlbum() {
  const stats = getStats();
  const entries = getEntries();
  const selected = getSelectedEntry(entries);
  if (selected && selectedId !== selected.data.id) { selectedId = selected.data.id; selectedKind = selected.kind; }
  const cat = getCategory();
  return `<section class="album-shell"><div class="album-head"><div><span>MAGIC ALBUM</span><h2>精靈咖啡屋圖鑑</h2></div><div class="album-progress">物品 ${stats.itemFound}/${stats.itemTotal}<br>精靈 ${stats.fairyFound}/${stats.fairyTotal}</div></div>${renderTabs()}<div class="album-book"><div class="album-grid-panel"><div class="album-category-title"><h3>${cat.icon} ${cat.label}</h3><small>${entries.filter((e) => e.discovered).length}/${entries.length}</small></div><div class="album-icon-grid">${entries.map(renderSlot).join('')}</div></div>${renderDetail(selected)}</div></section>`;
}

function bindAlbum(page) {
  page.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-album-category]');
    if (tab) {
      currentCategory = tab.dataset.albumCategory || 'material';
      selectedId = null;
      selectedKind = currentCategory === 'fairy' ? 'fairy' : 'item';
      renderCollection();
      return;
    }
    const slot = event.target.closest('[data-entry-id]');
    if (slot) {
      selectedKind = slot.dataset.entryKind || 'item';
      selectedId = slot.dataset.entryId;
      renderCollection();
    }
  }, { once: true });
}

export function renderCollection() {
  const page = document.querySelector('#page-collection');
  if (!page) return;
  getState();
  page.innerHTML = `${renderStyle()}${renderAlbum()}`;
  bindAlbum(page);
}
