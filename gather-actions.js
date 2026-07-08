import { GameDB } from '@db';
import { getState, addItem, persistState, isSceneUnlocked } from '@state';
import { getTotalFairyBuffValue, getOwnedFairyBuffs } from '@actions/fairy';

const locationHints = {
  cafe: {
    kind: 'home',
    title: '咖啡廳',
    message: '這裡是店鋪主區，可以查看菜單、委託和商品櫃。採集請前往後山或溫室。',
  },
  kitchen: {
    kind: 'station',
    title: '廚房尚未開放',
    message: '廚房之後會用來把素材製作成甜點、飲品和正式商品。現在還不能製作。',
  },
  alchemy: {
    kind: 'station',
    title: '煉金室尚未開放',
    message: '煉金室之後會用來把一階素材煉成二階、三階素材，或製作魔法產品。現在還不能煉成。',
  },
};

function getDailyGatherLimit() {
  return Number(GameDB.gatherConfig?.dailyLimit || 5);
}

function getSpecialEventChance(locationId = 'all') {
  const configuredChance = Number(GameDB.gatherConfig?.specialEventChance ?? 0.05);
  if (!Number.isFinite(configuredChance) || configuredChance <= 0) return 0;
  const buffBonus = getTotalFairyBuffValue('rareDropBonus', locationId);
  return Math.min(configuredChance + buffBonus, 0.25);
}

function getGatherQtyBonus(locationId = 'backyard') {
  return Math.max(0, getTotalFairyBuffValue('gatherQtyBonus', locationId));
}

function getAppliedBuffLabels(locationId = 'backyard') {
  return [
    ...getOwnedFairyBuffs('gatherQtyBonus', locationId),
    ...getOwnedFairyBuffs('rareDropBonus', locationId),
  ].map((buff) => `${buff.fairyName}：${buff.label}`);
}

function getBuffedQty(qty = 1, locationId = 'backyard') {
  const base = Math.max(1, Number(qty || 1));
  const bonus = getGatherQtyBonus(locationId);
  const guaranteedBonus = Math.floor(bonus);
  const fractionalBonus = bonus - guaranteedBonus;
  const extra = Math.random() < fractionalBonus ? 1 : 0;
  return base + guaranteedBonus + extra;
}

function getGatherTable(locationId) {
  return GameDB.gatherTables?.[locationId] || null;
}

function getSceneLabel(locationId) {
  return GameDB.scenes?.[locationId]?.label || locationId;
}

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getGatherRecord(locationId) {
  const state = getState();
  state.gathering ||= {};
  state.gathering[locationId] ||= { lastDate: null, count: 0 };
  return state.gathering[locationId];
}

function refreshDailyRecord(record) {
  const today = localDateString();
  if (record.lastDate !== today) {
    record.lastDate = today;
    record.count = 0;
  }
  return record;
}

function pickWeighted(drops) {
  const total = drops.reduce((sum, drop) => sum + Number(drop.weight || 0), 0);
  let roll = Math.random() * total;
  for (const drop of drops) {
    roll -= Number(drop.weight || 0);
    if (roll <= 0) return drop;
  }
  return drops[drops.length - 1];
}

function getDropView(drop, totalWeight = 0) {
  const item = GameDB.items[drop.itemId];
  const weight = Number(drop.weight || 0);
  const chance = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
  return {
    itemId: drop.itemId,
    name: item?.name || drop.itemId,
    icon: item?.icon || '◇',
    rarity: item?.rarity || 'N',
    typeLabel: GameDB.getItemTypeLabel(item?.type),
    qty: drop.qty || 1,
    weight,
    chance,
  };
}

function getBonusRewardViews(bonus = {}) {
  return Object.entries(bonus.items || {}).map(([itemId, qty]) => getDropView({ itemId, qty, weight: 0 }));
}

function formatGatherDrop(drop) {
  const view = getDropView(drop);
  return `${view.icon}${view.name} ×${drop.qty || view.qty}`;
}

function rollSpecialEvent(table, locationId) {
  const events = table.specialEvents || [];
  if (!events.length) return null;
  if (Math.random() >= getSpecialEventChance(locationId)) return null;

  const event = pickWeighted(events);
  Object.entries(event.bonus?.items || {}).forEach(([itemId, qty]) => {
    const amount = Number(qty || 0);
    if (amount > 0) addItem(itemId, amount);
  });

  const bonusItems = getBonusRewardViews(event.bonus);
  return {
    id: event.id,
    type: event.type || (bonusItems.length ? 'bonus_drop' : 'flavor_text'),
    title: event.title,
    icon: event.icon || '✨',
    message: event.message,
    bonusItems,
    rewards: bonusItems,
  };
}

export function canGatherAt(locationId = 'backyard') {
  return Boolean(getGatherTable(locationId));
}

export function canEnterGatherArea(locationId = 'backyard') {
  return canGatherAt(locationId) && isSceneUnlocked(locationId);
}

export function getLocationHint(locationId) {
  const table = getGatherTable(locationId);
  if (table && isSceneUnlocked(locationId)) {
    return { kind: 'gather', isOpen: true, title: table.title, message: '這裡可以採集素材。每日採集次數會在地圖上顯示。' };
  }
  if (table && !isSceneUnlocked(locationId)) {
    const label = getSceneLabel(locationId);
    return { kind: 'locked', isOpen: false, title: `${label}尚未解鎖`, message: `這裡之後會開放採集，目前還不能進入${label}。` };
  }
  const scene = GameDB.scenes?.[locationId];
  const fallbackTitle = scene?.label ? `${scene.label}尚未開放` : '地點尚未開放';
  return locationHints[locationId] || { kind: 'locked', isOpen: false, title: fallbackTitle, message: '這個地點之後會開放更多互動功能，目前還不能採集或製作。' };
}

export function getGatherDropPreview(locationId = 'backyard') {
  const table = getGatherTable(locationId);
  if (!table || !isSceneUnlocked(locationId)) return [];
  const totalWeight = table.drops.reduce((sum, drop) => sum + Number(drop.weight || 0), 0);
  return table.drops.map((drop) => getDropView(drop, totalWeight));
}

export function getGatherStatus(locationId = 'backyard') {
  const table = getGatherTable(locationId);
  if (!table || !isSceneUnlocked(locationId)) return null;
  const limit = getDailyGatherLimit();
  const record = getState().gathering?.[locationId] || { lastDate: null, count: 0 };
  const today = localDateString();
  const used = record.lastDate === today ? Number(record.count || 0) : 0;
  const remaining = Math.max(0, limit - used);
  const buffLabels = getAppliedBuffLabels(locationId);
  return { locationId, title: table.title, used, remaining, limit, isDepleted: remaining <= 0, buffLabels, label: remaining > 0 ? `今日剩餘 ${remaining}/${limit}` : '今日已採完' };
}

export function gatherAt(locationId = 'backyard') {
  const table = getGatherTable(locationId);
  if (!table || !isSceneUnlocked(locationId)) {
    const hint = getLocationHint(locationId);
    return { ok: false, title: hint.title, message: hint.message, remaining: 0, limit: 0, isLocked: true };
  }

  const limit = getDailyGatherLimit();
  const record = refreshDailyRecord(getGatherRecord(locationId));
  const currentCount = Number(record.count || 0);
  if (currentCount >= limit) {
    persistState(`gather:${locationId}:limit`);
    return { ok: false, title: table.emptyTitle || '今天採集完成', message: `今天這裡的素材已經採完了。明天再來吧。(${limit}/${limit})`, remaining: 0, limit, used: limit, isDepleted: true, preview: getGatherDropPreview(locationId) };
  }

  const drop = { ...pickWeighted(table.drops) };
  drop.qty = getBuffedQty(drop.qty || 1, locationId);
  const totalWeight = table.drops.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const dropView = { ...getDropView(drop, totalWeight), qty: drop.qty };
  addItem(drop.itemId, drop.qty || 1);
  const specialEvent = rollSpecialEvent(table, locationId);
  const buffLabels = getAppliedBuffLabels(locationId);
  record.count = currentCount + 1;
  persistState(`gather:${locationId}`);
  const remaining = Math.max(0, limit - record.count);

  return {
    ok: true,
    status: 'success',
    title: table.title,
    drop,
    dropView,
    specialEvent,
    buffLabels,
    remaining,
    limit,
    used: record.count,
    isDepleted: remaining <= 0,
    preview: getGatherDropPreview(locationId),
    message: `你找到了 ${formatGatherDrop(drop)}。${specialEvent ? ` ${specialEvent.title}！` : ''}${buffLabels.length ? ` Buff：${buffLabels.join('、')}。` : ''}今日還能採集 ${remaining} 次。`,
  };
}
