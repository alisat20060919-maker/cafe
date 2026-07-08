import { GameDB } from '@db';
import { getState, addItem, persistState } from '@state';

function getDailyGatherLimit() {
  return Number(GameDB.gatherConfig?.dailyLimit || 5);
}

function getGatherTable(locationId) {
  return GameDB.gatherTables?.[locationId] || null;
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

function getDropView(drop) {
  const item = GameDB.items[drop.itemId];
  return {
    itemId: drop.itemId,
    name: item?.name || drop.itemId,
    icon: item?.icon || '◇',
    rarity: item?.rarity || 'N',
    typeLabel: GameDB.getItemTypeLabel(item?.type),
    qty: drop.qty || 1,
  };
}

function formatGatherDrop(drop) {
  const view = getDropView(drop);
  return `${view.icon}${view.name} ×${view.qty}`;
}

export function canGatherAt(locationId = 'backyard') {
  return Boolean(getGatherTable(locationId));
}

export function getGatherStatus(locationId = 'backyard') {
  const table = getGatherTable(locationId);
  if (!table) return null;

  const limit = getDailyGatherLimit();
  const record = getState().gathering?.[locationId] || { lastDate: null, count: 0 };
  const today = localDateString();
  const used = record.lastDate === today ? Number(record.count || 0) : 0;
  const remaining = Math.max(0, limit - used);

  return {
    locationId,
    title: table.title,
    used,
    remaining,
    limit,
    isDepleted: remaining <= 0,
    label: remaining > 0 ? `今日剩餘 ${remaining}/${limit}` : '今日已採完',
  };
}

export function gatherAt(locationId = 'backyard') {
  const table = getGatherTable(locationId);
  if (!table) return { ok: false, message: '這個地點還不能採集。' };

  const limit = getDailyGatherLimit();
  const record = refreshDailyRecord(getGatherRecord(locationId));
  const currentCount = Number(record.count || 0);

  if (currentCount >= limit) {
    persistState(`gather:${locationId}:limit`);
    return {
      ok: false,
      title: table.emptyTitle || '今天採集完成',
      message: `今天這裡的素材已經採完了。明天再來吧。(${limit}/${limit})`,
      remaining: 0,
      limit,
      used: limit,
      isDepleted: true,
    };
  }

  const drop = pickWeighted(table.drops);
  const dropView = getDropView(drop);
  addItem(drop.itemId, drop.qty || 1);
  record.count = currentCount + 1;
  persistState(`gather:${locationId}`);

  const remaining = Math.max(0, limit - record.count);

  return {
    ok: true,
    title: table.title,
    drop,
    dropView,
    remaining,
    limit,
    used: record.count,
    isDepleted: remaining <= 0,
    message: `你找到了 ${formatGatherDrop(drop)}。今日還能採集 ${remaining} 次。`,
  };
}
