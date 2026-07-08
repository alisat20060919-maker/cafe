import { GameDB } from '@db';
import { getState } from '@state';
import { buyShopItem, getShopItemView } from '@actions/shop';
import { emitNotice, Events, on } from '@eventBus';

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head shop-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
}

function renderShopItem(shopItemId) {
  const view = getShopItemView(shopItemId);
  if (!view) return '';
  const item = view.item || {};

  return `
    <article class="shop-item-card ${view.isSoldOut ? 'is-sold-out' : ''}">
      <div class="shop-item-icon">${item.icon || '◇'}</div>
      <div class="shop-item-body">
        <span>${GameDB.getRarityLabel(item.rarity)}</span>
        <h3>${item.name || view.itemId} ×${view.qty || 1}</h3>
        <p>${view.description || item.description || ''}</p>
        <div class="core-pills">
          <span>${view.priceText}</span>
          <span>今日 ${view.bought}/${view.dailyLimit}</span>
        </div>
      </div>
      <button type="button" data-buy-shop="${view.id}" ${view.isSoldOut ? 'disabled' : ''}>${view.isSoldOut ? '已售完' : '購買'}</button>
    </article>
  `;
}

function handleShopClick(event) {
  const button = event.target.closest('[data-buy-shop]');
  const page = document.querySelector('#page-shop');
  if (!button || !page?.contains(button)) return;
  button.disabled = true;
  const result = buyShopItem(button.dataset.buyShop);
  emitNotice(result.ok ? '購買完成' : '購買失敗', result.message);
  renderShop();
}

function bindShopEvents() {
  const page = document.querySelector('#page-shop');
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', handleShopClick);
}

export function renderShop() {
  const page = document.querySelector('#page-shop');
  if (!page) return;
  const state = getState();
  const cards = Object.keys(GameDB.shopItems || {}).map(renderShopItem).join('');

  page.innerHTML = `
    ${pageHeader('FAIRY SHOP / DAILY LIMIT', '精靈商鋪', '使用葉幣購買少量素材與點心。每項商品每日有購買上限，換日會自動重置。')}
    <div class="core-actions-row"><span>🪙 葉幣 ${state.player.leafCoin}</span><span>今日商店日期 ${state.daily?.shopDate || '—'}</span></div>
    <div class="shop-item-grid">${cards || '<div class="core-empty">目前沒有商店商品。</div>'}</div>
  `;
}

export function initShopPage() {
  bindShopEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-shop');
    if (page?.classList.contains('active')) renderShop();
  });
}
