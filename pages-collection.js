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
    return Object.values(GameDB.fairies || {}).map((fairy) => ({
      kind: 'fairy',
      data: fairy,
      discovered: isFairyDiscovered(fairy.id),
      rarity: fairy.rarity || 'R',
    }));
  }
  return Object.values(GameDB.items || {})
    .filter((item) => cat.itemTypes.includes(item.type))
    .map((item) => ({
      kind: 'item',
      data: item,
      discovered: isItemDiscovered(item.id),
      rarity: item.rarity || 'N',
    }));
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
    #page-collection{--book:#fff7df;--paper:#fffdf4;--ink:#5f3c21;--line:rgba(96,58,24,.2);padding:10px 12px 92px;color:var(--ink)}
    #page-collection .album-shell{border-radius:26px;background:linear-gradient(180deg,#e8c78e,#9f6d37 52%,#73451f);padding:10px;box-shadow:inset 0 0 0 2px rgba(255,244,206,.45),0 14px 30px rgba(55,31,15,.22)}
    #page-collection .album-page{border-radius:20px;background:radial-gradient(circle at 50% 6%,rgba(255,255,255,.8),transparent 34%),linear-gradient(180deg,#fffdf2,#f3e1bb);box-shadow:inset 0 0 32px rgba(92,56,24,.16);border:1px solid rgba(92,56,24,.2);overflow:hidden}
    #page-collection .album-title{display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px;border-bottom:1px solid rgba(92,56,24,.12)}
    #page-collection .album-title h2{margin:0;font-size:1.05rem;letter-spacing:.04em}.album-title b{font-size:.72rem;opacity:.68}.album-tabs{display:flex;gap:0;padding:0 8px;border-bottom:1px solid rgba(92,56,24,.14);overflow:auto;background:rgba(99,65,31,.08)}
    #page-collection .album-tabs button{border:0;background:transparent;color:var(--ink);font-weight:900;font-size:.76rem;padding:10px 11px 8px;min-width:58px;white-space:nowrap;opacity:.72}.album-tabs button.active{opacity:1;background:var(--paper);border-radius:12px 12px 0 0;box-shadow:0 -1px 0 rgba(92,56,24,.1) inset}.album-tabs span{display:block;font-size:1rem;line-height:1}
    #page-collection .album-grid-wrap{padding:12px 12px 10px;background:linear-gradient(180deg,rgba(255,253,244,.72),rgba(255,253,244,.32))}.album-grid-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.album-grid-head h3{margin:0;font-size:.94rem}.album-grid-head small{font-weight:900;opacity:.55}
    #page-collection .album-icon-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.album-slot{position:relative;aspect-ratio:1;border:0;border-radius:9px;background:#f8e7bd;box-shadow:inset 0 0 0 2px #8a5a28,inset 0 0 0 4px rgba(255,255,255,.44),0 3px 0 rgba(92,56,24,.22);font-size:1.45rem;color:var(--ink);padding:0}.album-slot.active{outline:3px solid #f3c43e;outline-offset:2px;z-index:1}.album-slot.locked{filter:grayscale(.65);opacity:.62}.album-slot.rarity-ssr{background:linear-gradient(135deg,#fff3a6,#f2d2ff)}.album-slot.rarity-sr{background:linear-gradient(135deg,#dbf3ff,#fff0bd)}.album-slot.rarity-r{background:linear-gradient(135deg,#fff8cf,#f7dfb2)}.album-slot .rarity-dot{position:absolute;right:3px;bottom:3px;font-size:.48rem;font-style:normal;font-weight:900;background:#5f3c21;color:#fff;border-radius:999px;padding:1px 4px}
    #page-collection .album-detail{margin:0 10px 10px;border-radius:18px;background:rgba(255,253,244,.82);border:1px solid rgba(92,56,24,.18);padding:13px;display:grid;grid-template-columns:78px 1fr;gap:12px;align-items:start}.album-detail-icon{width:74px;height:74px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#fff,#f2d9a7);box-shadow:inset 0 0 0 2px rgba(92,56,24,.13);font-size:2.25rem}.album-detail h3{margin:0 0 2px;font-size:1.05rem}.album-detail .stars{color:#d39b18;font-size:.78rem;font-weight:900;letter-spacing:.05em;margin-bottom:7px}.album-detail p{margin:0 0 8px;font-size:.82rem;line-height:1.5;opacity:.78}.album-info-list{display:grid;gap:5px}.album-info-list div{display:grid;grid-template-columns:48px 1fr;gap:7px;font-size:.74rem;line-height:1.4}.album-info-list b{opacity:.55}.album-empty{padding:22px;text-align:center;opacity:.58}
    @media(max-width:430px){#page-collection{padding:8px 10px 92px}.album-slot{border-radius:8px;font-size:1.26rem}.album-detail{grid-template-columns:68px 1fr;padding:11px;gap:10px}.album-detail-icon{width:64px;height:64px;font-size:2rem}.album-tabs button{min-width:54px;padding-inline:8px}.album-icon-grid{gap:6px}}
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
