import { GameDB } from '@db';
import { getState } from '@state';
import {
  buyShopItem,
  buyStarSugarPack,
  getShopItemView,
  getStarSugarPackView,
} from '@actions/shop';
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

function renderStarSugarPack(packId) {
  const pack = getStarSugarPackView(packId);
  if (!pack) return '';

  return `
    <article class="shop-star-pack-card">
      <div class="shop-star-pack-icon">${pack.icon || pack.currency.icon}</div>
      <div class="shop-star-pack-body">
        <span>${pack.badge || 'TEST'}｜${pack.priceText}</span>
        <h3>${pack.title}</h3>
        <p>${pack.description || '星糖補給包。'}</p>
        <strong>${pack.currency.icon} 星糖 +${pack.amount}</strong>
      </div>
      <button type="button" data-buy-star-pack="${pack.id}">免費領取</button>
    </article>
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
  const page = document.querySelector('#page-shop');
  if (!page?.contains(event.target)) return;

  const starPackButton = event.target.closest('[data-buy-star-pack]');
  if (starPackButton) {
    starPackButton.disabled = true;
    const result = buyStarSugarPack(starPackButton.dataset.buyStarPack);
    emitNotice(result.ok ? '星糖補給完成' : '領取失敗', result.message);
    renderShop();
    return;
  }

  const button = event.target.closest('[data-buy-shop]');
  if (!button) return;
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
  const starPacks = Object.keys(GameDB.starSugarPacks || {}).map(renderStarSugarPack).join('');
  const cards = Object.keys(GameDB.shopItems || {}).map(renderShopItem).join('');

  page.innerHTML = `
    ${pageHeader('SHOP / TEST IAP', '精靈商鋪', '星糖補給目前是免費測試；正式版再接真正課金。')}
    <div class="core-actions-row"><span>✦ 星糖 ${state.player.starSugar}</span><span>🪙 葉幣 ${state.player.leafCoin}</span></div>
    <section class="shop-section shop-star-section">
      <div class="shop-section-head"><span>STAR SUGAR</span><h3>星糖補給</h3><p>先做成免費測試包，方便驗證祈願流程。</p></div>
      <div class="shop-star-pack-grid">${starPacks || '<div class="core-empty">目前沒有星糖包。</div>'}</div>
    </section>
    <section class="shop-section">
      <div class="shop-section-head"><span>DAILY ITEMS</span><h3>每日素材</h3><p>使用葉幣購買少量素材與點心。今日商店日期 ${state.daily?.shopDate || '—'}。</p></div>
      <div class="shop-item-grid">${cards || '<div class="core-empty">目前沒有商店商品。</div>'}</div>
    </section>
  `;
}

export function initShopPage() {
  bindShopEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-shop');
    if (page?.classList.contains('active')) renderShop();
  });
}
