import { GameDB } from '@db';
import { showModal } from '@ui';

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
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
  [...page.querySelectorAll('[data-collection-kind]')].forEach((button) => {
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
      <article class="core-item-card rarity-${item.rarity.toLowerCase()} collection-card">
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
      <article class="core-item-card ssr collection-card">
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
    ${pageHeader('COLLECTION / READ ONLY GAME DB', '圖鑑', '這裡是獨立圖鑑頁，只讀取 GameDB 的世界資料；不讀取背包、不改存檔。')}
    <div class="core-actions-row collection-actions">
      <button type="button" data-route="inventory">返回背包</button>
      <button type="button" data-route="home">回到店鋪</button>
    </div>
    <section class="collection-section">
      <h3>素材與商品</h3>
      <div class="core-list collection-list">${itemCards}</div>
    </section>
    <section class="collection-section">
      <h3>精靈</h3>
      <div class="core-list collection-list">${fairyCards}</div>
    </section>
  `;

  bindCollectionPage(page);
}
