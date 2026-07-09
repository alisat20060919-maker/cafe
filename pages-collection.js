import { GameDB } from '@db';
import { getState, isItemDiscovered, isFairyDiscovered } from '@state';

let currentCategory = 'material';
let selectedKind = 'item';
let selectedId = null;

function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const albumCategories = [
  { id: 'material', label: '素材', icon: '🌿', itemTypes: ['material', 'rare_material', 'refined_material'] },
  { id: 'food', label: '甜點', icon: '🍰', itemTypes: ['sweet', 'drink'] },
  { id: 'product', label: '商品', icon: '🎁', itemTypes: ['product'] },
  { id: 'usable', label: '道具', icon: '🧰', itemTypes: ['event_material'] },
  { id: 'fairy', label: '精靈', icon: '🧚', itemTypes: [] },
];

function getCategory() {
  return albumCategories.find((cat) => cat.id === currentCategory) || albumCategories[0];
}

function getStats() {
  const items = Object.values(GameDB.items || {});
  const fairies = Object.values(GameDB.fairies || {});
  return {
    found: items.filter((item) => isItemDiscovered(item.id)).length + fairies.filter((fairy) => isFairyDiscovered(fairy.id)).length,
    total: items.length + fairies.length,
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
    #page-collection{--book:#fff7df;--paper:#fffdf4;--ink:#5f3c21;--line:rgba(96,58,24,.2);height:calc(100dvh - 86px);padding:8px 10px 0;color:var(--ink);overflow:hidden;touch-action:pan-y}
    #page-collection .album-shell{height:100%;border-radius:24px;background:linear-gradient(180deg,#e8c78e,#9f6d37 52%,#73451f);padding:9px;box-shadow:inset 0 0 0 2px rgba(255,244,206,.45),0 14px 30px rgba(55,31,15,.22);overflow:hidden}
    #page-collection .album-page{height:100%;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;border-radius:19px;background:radial-gradient(circle at 50% 6%,rgba(255,255,255,.8),transparent 34%),linear-gradient(180deg,#fffdf2,#f3e1bb);box-shadow:inset 0 0 32px rgba(92,56,24,.16);border:1px solid rgba(92,56,24,.2);overflow:hidden}
    #page-collection .album-title{display:flex;justify-content:space-between;align-items:center;padding:10px 13px 7px;border-bottom:1px solid rgba(92,56,24,.12)}
    #page-collection .album-title h2{margin:0;font-size:1rem;letter-spacing:.04em}.album-title b{font-size:.72rem;opacity:.68}.album-tabs{display:flex;gap:0;padding:0 8px;border-bottom:1px solid rgba(92,56,24,.14);overflow-x:auto;overflow-y:hidden;background:rgba(99,65,31,.08);-webkit-overflow-scrolling:touch}
    #page-collection .album-tabs button{border:0;background:transparent;color:var(--ink);font-weight:900;font-size:.74rem;padding:8px 9px 7px;min-width:54px;white-space:nowrap;opacity:.72}.album-tabs button.active{opacity:1;background:var(--paper);border-radius:11px 11px 0 0;box-shadow:0 -1px 0 rgba(92,56,24,.1) inset}.album-tabs span{display:block;font-size:.95rem;line-height:1}
    #page-collection .album-grid-wrap{min-height:0;height:100%;padding:10px 11px;background:linear-gradient(180deg,rgba(255,253,244,.72),rgba(255,253,244,.32));overflow-y:scroll;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}.album-grid-head{position:sticky;top:-10px;z-index:2;display:flex;justify-content:space-between;align-items:center;margin:-10px -11px 8px;padding:10px 11px 8px;background:rgba(255,253,244,.92);backdrop-filter:blur(8px);border-bottom:1px solid rgba(92,56,24,.08)}.album-grid-head h3{margin:0;font-size:.9rem}.album-grid-head small{font-weight:900;opacity:.55}
    #page-collection .album-icon-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;padding-bottom:18px}.album-slot{position:relative;aspect-ratio:1;border:0;border-radius:9px;background:#f8e7bd;box-shadow:inset 0 0 0 2px #8a5a28,inset 0 0 0 4px rgba(255,255,255,.44),0 3px 0 rgba(92,56,24,.22);font-size:1.32rem;color:var(--ink);padding:0}.album-slot.active{outline:3px solid #f3c43e;outline-offset:1px;z-index:1}.album-slot.locked{filter:grayscale(.65);opacity:.62}.album-slot.rarity-ssr{background:linear-gradient(135deg,#fff3a6,#f2d2ff)}.album-slot.rarity-sr{background:linear-gradient(135deg,#dbf3ff,#fff0bd)}.album-slot.rarity-r{background:linear-gradient(135deg,#fff8cf,#f7dfb2)}.album-slot .rarity-dot{position:absolute;right:3px;bottom:3px;font-size:.46rem;font-style:normal;font-weight:900;background:#5f3c21;color:#fff;border-radius:999px;padding:1px 4px}
    #page-collection .album-detail{min-height:138px;max-height:168px;margin:0 10px 10px;border-radius:17px;background:rgba(255,253,244,.88);border:1px solid rgba(92,56,24,.18);padding:10px;display:grid;grid-template-columns:62px 1fr;gap:10px;align-items:start;overflow:hidden}.album-detail-icon{width:60px;height:60px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#fff,#f2d9a7);box-shadow:inset 0 0 0 2px rgba(92,56,24,.13);font-size:1.9rem}.album-detail h3{margin:0 0 2px;font-size:.96rem}.album-detail .stars{color:#d39b18;font-size:.72rem;font-weight:900;letter-spacing:.05em;margin-bottom:5px}.album-detail p{margin:0 0 6px;font-size:.76rem;line-height:1.42;opacity:.78;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.album-info-list{display:grid;gap:3px}.album-info-list div{display:grid;grid-template-columns:42px 1fr;gap:6px;font-size:.7rem;line-height:1.3}.album-info-list span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.album-info-list b{opacity:.55}.album-empty{padding:18px;text-align:center;opacity:.58}
    @media(max-width:430px){#page-collection{height:calc(100dvh - 78px);padding:7px 9px 0}.album-shell{padding:8px}.album-slot{border-radius:8px;font-size:1.18rem}.album-icon-grid{gap:6px}.album-detail{min-height:128px;max-height:150px;grid-template-columns:56px 1fr}.album-detail-icon{width:54px;height:54px;font-size:1.75rem}.album-tabs button{min-width:50px;padding-inline:7px}.album-grid-wrap{padding:9px 10px!important}.album-grid-head{margin:-9px -10px 7px!important;padding:9px 10px 7px!important}}
  </style>`;
}

function renderTabs() {
  return `<div class="album-tabs">${albumCategories.map((cat) => `<button type="button" data-album-category="${cat.id}" class="${cat.id === currentCategory ? 'active' : ''}"><span>${cat.icon}</span>${cat.label}</button>`).join('')}</div>`;
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
    return `<section class="album-detail"><div class="album-detail-icon">🔒</div><div><h3>？？？</h3><div class="stars">${rarityStars(entry.rarity)}</div><p>尚未發現。取得一次後會解鎖完整資料。</p><div class="album-info-list"><div><b>分類</b><span>${getCategory().label}</span></div><div><b>稀有</b><span>${entry.rarity}</span></div></div></div></section>`;
  }
  if (entry.kind === 'fairy') {
    return `<section class="album-detail"><div class="album-detail-icon">${data.icon}</div><div><h3>${esc(data.name)}</h3><div class="stars">${rarityStars(data.rarity)}</div><p>「${esc(data.quote || data.description || '……')}」</p><div class="album-info-list"><div><b>來源</b><span>${GameDB.getFairySourceText(data)}</span></div><div><b>喜歡</b><span>${(data.favoriteSweets || []).map((id) => GameDB.items?.[id]?.name || id).join('、') || '未知'}</span></div><div><b>被動</b><span>${data.passiveBuff?.label || '無'}</span></div></div></div></section>`;
  }
  return `<section class="album-detail"><div class="album-detail-icon">${data.icon}</div><div><h3>${esc(data.name)}</h3><div class="stars">${rarityStars(data.rarity)}</div><p>${esc(data.description || data.use || '尚未設定說明。')}</p><div class="album-info-list"><div><b>來源</b><span>${GameDB.getItemSourceText(data)}</span></div><div><b>用途</b><span>${esc(data.use || '—')}</span></div><div><b>分類</b><span>${GameDB.getItemTypeLabel(data.type)}</span></div></div></div></section>`;
}

function renderAlbum() {
  const stats = getStats();
  const entries = getEntries();
  const selected = getSelectedEntry(entries);
  if (selected && selectedId !== selected.data.id) {
    selectedId = selected.data.id;
    selectedKind = selected.kind;
  }
  const cat = getCategory();
  return `<section class="album-shell"><div class="album-page"><div class="album-title"><h2>精靈咖啡屋圖鑑</h2><b>${stats.found}/${stats.total}</b></div>${renderTabs()}<div class="album-grid-wrap"><div class="album-grid-head"><h3>${cat.icon} ${cat.label}</h3><small>${entries.filter((e) => e.discovered).length}/${entries.length}</small></div><div class="album-icon-grid">${entries.map(renderSlot).join('')}</div></div>${renderDetail(selected)}</div></section>`;
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
