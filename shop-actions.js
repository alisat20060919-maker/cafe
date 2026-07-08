import { GameDB } from '@db';
import {
  getState,
  spendCurrency,
  addItem,
  getShopPurchaseCount,
  addShopPurchaseCount,
  ensureDailyShopPurchases,
  persistState,
} from '@state';

function getShopItem(shopItemId) {
  return GameDB.shopItems?.[shopItemId] || null;
}

function getCurrencyText(price = {}) {
  const meta = GameDB.currencies?.[price.currency];
  return `${meta?.icon || ''}${meta?.name || price.currency} ×${price.amount}`;
}

export function getShopItemView(shopItemId) {
  ensureDailyShopPurchases();
  const shopItem = getShopItem(shopItemId);
  if (!shopItem) return null;
  const item = GameDB.items?.[shopItem.itemId];
  const bought = getShopPurchaseCount(shopItem.id);
  const dailyLimit = Number(shopItem.dailyLimit || GameDB.shopConfig?.dailyLimitDefault || 1);
  const price = shopItem.price || { currency: 'leafCoin', amount: 0 };
  const ownedCurrency = Number(getState().player?.[price.currency] || 0);

  return {
    ...shopItem,
    item,
    bought,
    dailyLimit,
    remaining: Math.max(0, dailyLimit - bought),
    priceText: getCurrencyText(price),
    canAfford: ownedCurrency >= Number(price.amount || 0),
    isSoldOut: bought >= dailyLimit,
  };
}

export function buyShopItem(shopItemId) {
  const view = getShopItemView(shopItemId);
  if (!view) return { ok: false, message: '找不到這個商品。' };
  if (view.isSoldOut) return { ok: false, message: '今天已經買完了，明天再來吧。' };
  if (!view.canAfford) return { ok: false, message: `${view.priceText}不足。` };
  if (!spendCurrency(view.price.currency, view.price.amount)) return { ok: false, message: `${view.priceText}不足。` };

  addItem(view.itemId, view.qty || 1);
  addShopPurchaseCount(view.id, 1);
  persistState('shop:buy');

  return {
    ok: true,
    message: `購買完成：${view.item?.icon || '◇'} ${view.item?.name || view.itemId} ×${view.qty || 1}。`,
  };
}
