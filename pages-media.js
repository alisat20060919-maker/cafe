import { MediaAssets, MediaCategories, getMediaCategory, getMediaSearchText } from '@data/media';
import { showModal } from '@ui';

let currentMediaCategory = 'all';
let currentMediaQuery = '';

function escapeAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pageHeader(kicker, title, body) {
  return `<div class="core-page-head"><span>${kicker}</span><h2>${title}</h2><p>${body}</p></div>`;
}

function renderMediaTabs() {
  return MediaCategories.map((category) => `
    <button type="button" data-media-category="${category.id}" class="${currentMediaCategory === category.id ? 'active' : ''}">
      <span>${category.icon}</span>${category.label}
    </button>
  `).join('');
}

function getVisibleAssets() {
  const query = currentMediaQuery.trim().toLowerCase();
  return MediaAssets.filter((asset) => {
    const categoryMatch = currentMediaCategory === 'all' || asset.category === currentMediaCategory;
    const queryMatch = !query || getMediaSearchText(asset).includes(query);
    return categoryMatch && queryMatch;
  });
}

function renderMediaCard(asset) {
  const category = getMediaCategory(asset.category);
  return `
    <article class="media-card" data-media-id="${asset.id}">
      <button type="button" class="media-thumb-button" data-open-media="${asset.id}" aria-label="打開 ${escapeAttr(asset.title)}">
        <img src="${asset.src}" alt="${escapeAttr(asset.title)}" loading="lazy" />
      </button>
      <div class="media-card-body">
        <span>${category.icon} ${category.label}</span>
        <h3>${asset.title}</h3>
        <p>${asset.usage}</p>
        <small>${asset.tags?.map((tag) => `#${tag}`).join(' ') || ''}</small>
      </div>
    </article>
  `;
}

function openMediaDetail(assetId) {
  const asset = MediaAssets.find((item) => item.id === assetId);
  if (!asset) return;
  const category = getMediaCategory(asset.category);
  showModal(`
    <div class="core-modal-card media-detail-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">MEDIA ASSET</span>
      <h2>${asset.title}</h2>
      <figure class="media-detail-figure"><img src="${asset.src}" alt="${escapeAttr(asset.title)}" /></figure>
      <dl class="core-detail-list">
        <div><dt>分類</dt><dd>${category.icon} ${category.label}</dd></div>
        <div><dt>用途</dt><dd>${asset.usage}</dd></div>
        <div><dt>路徑</dt><dd>${asset.src}</dd></div>
        <div><dt>標籤</dt><dd>${asset.tags?.map((tag) => `#${tag}`).join(' ') || '無'}</dd></div>
      </dl>
    </div>
  `);
}

function bindMediaEvents(page) {
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', (event) => {
    const categoryButton = event.target.closest('[data-media-category]');
    if (categoryButton && page.contains(categoryButton)) {
      currentMediaCategory = categoryButton.dataset.mediaCategory || 'all';
      renderMedia();
      return;
    }
    const mediaButton = event.target.closest('[data-open-media]');
    if (mediaButton && page.contains(mediaButton)) openMediaDetail(mediaButton.dataset.openMedia);
  });
  page.addEventListener('input', (event) => {
    if (!event.target.matches('#media-search')) return;
    currentMediaQuery = event.target.value || '';
    renderMedia();
  });
}

export function renderMedia() {
  const page = document.querySelector('#page-media');
  if (!page) return;
  const assets = getVisibleAssets();
  page.innerHTML = `
    ${pageHeader('MEDIA LIBRARY', '圖片庫', '圖片統一登記在 data-media.js；頁面只顯示索引，不把所有圖片塞進首頁。')}
    <div class="core-actions-row collection-actions">
      <button type="button" data-route="collection">回圖鑑</button>
      <button type="button" data-route="home">回店鋪</button>
    </div>
    <div class="core-search-box">
      <label for="media-search">搜尋圖片</label>
      <input id="media-search" type="search" value="${escapeAttr(currentMediaQuery)}" placeholder="輸入標題、用途或標籤" autocomplete="off" />
    </div>
    <div class="core-filter-group">
      <p>圖片分類</p>
      <div class="core-filter-tabs" aria-label="圖片分類篩選">${renderMediaTabs()}</div>
    </div>
    <div class="media-grid">
      ${assets.length ? assets.map(renderMediaCard).join('') : '<p class="core-empty">沒有符合條件的圖片。</p>'}
    </div>
  `;
  bindMediaEvents(page);
}

export function initMediaPage() {
  bindMediaEvents(document.querySelector('#page-media'));
}
