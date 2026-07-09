import { GameDB } from '@db';
import {
  getState,
  spendCurrency,
  addCurrency,
  addItem,
  getShopPurchaseCount,
  addShopPurchaseCount,
  ensureDailyShopPurchases,
  persistState,
} from '@state';

const extraShopItems = {
  shop_magic_fertilizer: {
    id: 'shop_magic_fertilizer',
    itemId: 'magic_fertilizer',
    qty: 1,
    price: { currency: 'leafCoin', amount: 150 },
    dailyLimit: 2,
    description: '使用後可恢復今日採集次數，適合素材卡關時補救。',
  },
};

export function getAllShopItems() {
  return {
    ...(GameDB.shopItems || {}),
    ...extraShopItems,
  };
}

function getShopItem(shopItemId) {
  return getAllShopItems()?.[shopItemId] || null;
}

function getStarSugarPack(packId) {
  return GameDB.starSugarPacks?.[packId] || null;
}

function getCurrencyText(price = {}) {
  const meta = GameDB.currencies?.[price.currency];
  return `${meta?.icon || ''}${meta?.name || price.currency} ×${price.amount}`;
}

export function getStarSugarPackView(packId) {
  const pack = getStarSugarPack(packId);
  if (!pack) return null;
  return {
    ...pack,
    currency: GameDB.currencies?.starSugar || { name: '星糖', icon: '✦' },
    priceText: pack.priceText || '免費測試',
  };
}

export function buyStarSugarPack(packId) {
  const pack = getStarSugarPackView(packId);
  if (!pack) return { ok: false, message: '找不到這個星糖包。' };

  const amount = Math.max(0, Number(pack.amount || 0));
  if (amount <= 0) return { ok: false, message: '這個星糖包目前沒有設定數量。' };

  addCurrency('starSugar', amount);
  persistState('shop:star-sugar-pack');

  return {
    ok: true,
    message: `免費測試領取完成：${pack.currency.icon} 星糖 +${amount}。`,
  };
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
  if (!view.item) return { ok: false, message: '商品資料不存在，請檢查 GameDB.items。' };
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
