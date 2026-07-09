import { GameDB } from '@db';
import { getState, getTodayKey, persistState } from '@state';

function getUsableGatherLocations() {
  return Object.keys(GameDB.gatherTables || {});
}

function resetGatheringCounts(effect = {}) {
  const state = getState();
  const today = getTodayKey();
  const locations = Array.isArray(effect.locations) && effect.locations.length
    ? effect.locations.filter((locationId) => GameDB.gatherTables?.[locationId])
    : getUsableGatherLocations();

  if (!locations.length) {
    return { ok: false, message: '目前沒有可以恢復次數的採集地點。' };
  }

  state.gathering ||= {};
  const usedLocations = locations.filter((locationId) => {
    const record = state.gathering?.[locationId];
    return record?.lastDate === today && Number(record.count || 0) > 0;
  });

  if (!usedLocations.length) {
    return { ok: false, message: '今天的採集次數目前是滿的，先不用消耗道具。' };
  }

  locations.forEach((locationId) => {
    state.gathering[locationId] ||= { lastDate: today, count: 0 };
    state.gathering[locationId].lastDate = today;
    state.gathering[locationId].count = 0;
  });

  const labels = usedLocations.map((locationId) => GameDB.scenes?.[locationId]?.label || locationId);
  return {
    ok: true,
    message: `魔法肥料生效了！${labels.join('、')}的今日採集次數已恢復。`,
  };
}

export function canUseItem(itemId) {
  const item = GameDB.items?.[itemId];
  return Boolean(item?.useEffect?.type);
}

export function getUseItemText(itemId) {
  const item = GameDB.items?.[itemId];
  return item?.useButtonText || '使用';
}

export function useItem(itemId) {
  const item = GameDB.items?.[itemId];
  if (!item) return { ok: false, message: '找不到這個道具。' };
  if (!canUseItem(itemId)) return { ok: false, message: '這個物品目前不能直接使用。' };

  const state = getState();
  const owned = Number(state.inventory?.[itemId] || 0);
  if (owned <= 0) return { ok: false, message: `沒有持有${item.name}。` };

  let result = { ok: false, message: '這個道具效果尚未實作。' };
  if (item.useEffect.type === 'resetGathering') {
    result = resetGatheringCounts(item.useEffect);
  }

  if (!result.ok) return result;

  state.inventory[itemId] = Math.max(0, owned - 1);
  persistState(`item:use:${itemId}`);

  return {
    ok: true,
    message: `${item.icon || '◇'} ${item.name}已使用。${result.message}`,
  };
}
