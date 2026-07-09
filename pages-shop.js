import { GameDB } from '@db';
import { getState } from '@state';
import {
  buyShopItem,
  buyStarSugarPack,
  getAllShopItems,
  getShopItemView,
  getStarSugarPackView,
} from '@actions/shop';
import { emitNotice, Events, on } from '@eventBus';
import { navigate } from '@router';

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head shop-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
}

function getStarSugarPackIds() {
  return Object.keys(GameDB.starSugarPacks || {});
}

function getShopItemIds() {
  return Object.keys(getAllShopItems());
}

function getShopItemType(shopItemId) {
  const view = getShopItemView(shopItemId);
  return view?.item?.type || 'material';
}

function getDailyMaterialIds() {
  return getShopItemIds().filter((shopItemId) => {
    const type = getShopItemType(shopItemId);
    return type === 'material' || type === 'refined_material';
  });
}

function getGiftItemIds() {
  return getShopItemIds().filter((shopItemId) => !getDailyMaterialIds().includes(shopItemId));
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
        <span>${GameDB.getRarityLabel(item.rarity)}｜${item.typeName || GameDB.getItemTypeLabel(item.type)}</span>
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

function renderShopHero(state) {
  return `
    <section class="shop-hero-card">
      <div class="shop-hero-copy">
        <span>LIMITED TEST STORE</span>
        <h3>星糖補給開放中</h3>
        <p>目前是免費測試商店。領取星糖後可以直接到祈願頁測抽卡流程。</p>
        <div class="shop-hero-currencies"><b>✦ 星糖 ${state.player.starSugar}</b><b>🪙 葉幣 ${state.player.leafCoin}</b></div>
      </div>
      <div class="shop-hero-visual" aria-hidden="true"><span>✦</span></div>
    </section>
  `;
}

function renderShopNav() {
  return `
    <nav class="shop-section-tabs" aria-label="商店分區">
      <a href="#shop-star-section">星糖補給</a>
      <a href="#shop-daily-section">每日素材</a>
      <a href="#shop-gift-section">精靈禮物</a>
    </nav>
  `;
}

function renderSection(sectionId, kicker, title, body, content, emptyText) {
  return `
    <section class="shop-section" id="${sectionId}">
      <div class="shop-section-head"><span>${kicker}</span><h3>${title}</h3><p>${body}</p></div>
      ${content || `<div class="core-empty">${emptyText}</div>`}
    </section>
  `;
}

function handleShopClick(event) {
  const page = document.querySelector('#page-shop');
  if (!page?.contains(event.target)) return;

  const routeButton = event.target.closest('[data-shop-route]');
  if (routeButton) {
    navigate(routeButton.dataset.shopRoute || 'gacha');
    return;
  }

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
  const starPacks = getStarSugarPackIds().map(renderStarSugarPack).join('');
  const dailyItems = getDailyMaterialIds().map(renderShopItem).join('');
  const giftItems = getGiftItemIds().map(renderShopItem).join('');

  page.innerHTML = `
    ${pageHeader('SHOP', '精靈商鋪', '補給星糖、每日素材與精靈禮物。正式版再接真正付款。')}
    ${renderShopHero(state)}
    ${renderShopNav()}
    ${renderSection('shop-star-section', 'STAR SUGAR', '星糖補給', '祈願用貨幣。現在全部是免費測試包。', `<div class="shop-star-pack-grid">${starPacks}</div>`, '目前沒有星糖包。')}
    ${renderSection('shop-daily-section', 'DAILY ITEMS', '每日素材', `使用葉幣購買少量素材。今日商店日期 ${state.daily?.shopDate || '—'}。`, `<div class="shop-item-grid">${dailyItems}</div>`, '今天沒有素材商品。')}
    ${renderSection('shop-gift-section', 'FAIRY GIFTS', '精靈禮物', '適合送禮、委託或料理基底的小物。', `<div class="shop-item-grid shop-gift-grid">${giftItems}</div>`, '目前沒有禮物商品。')}
  `;
}

export function initShopPage() {
  bindShopEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-shop');
    if (page?.classList.contains('active')) renderShop();
  });
}
