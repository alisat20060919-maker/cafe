import { GameDB } from '@db';
import { getState, addItem, persistState } from '@state';

const DAILY_GATHER_LIMIT = 5;

const gatherTables = {
  backyard: {
    title: '後山採集完成',
    drops: [
      { itemId: 'star_berry', qty: 1, weight: 45 },
      { itemId: 'stardew_water', qty: 1, weight: 30 },
      { itemId: 'forest_cookie', qty: 1, weight: 20 },
      { itemId: 'star_berry', qty: 2, weight: 5 },
    ],
  },
};

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

function formatGatherDrop(drop) {
  const item = GameDB.items[drop.itemId];
  return `${item?.icon || ''}${item?.name || drop.itemId} ×${drop.qty || 1}`;
}

export function gatherAt(locationId = 'backyard') {
  const table = gatherTables[locationId];
  if (!table) return { ok: false, message: '這個地點還不能採集。' };

  const record = refreshDailyRecord(getGatherRecord(locationId));
  const currentCount = Number(record.count || 0);

  if (currentCount >= DAILY_GATHER_LIMIT) {
    persistState(`gather:${locationId}:limit`);
    return {
      ok: false,
      title: '今天採集完成',
      message: `今天這裡的素材已經採完了。明天再來吧。(${DAILY_GATHER_LIMIT}/${DAILY_GATHER_LIMIT})`,
      remaining: 0,
      limit: DAILY_GATHER_LIMIT,
    };
  }

  const drop = pickWeighted(table.drops);
  addItem(drop.itemId, drop.qty || 1);
  record.count = currentCount + 1;
  persistState(`gather:${locationId}`);

  const remaining = Math.max(0, DAILY_GATHER_LIMIT - record.count);

  return {
    ok: true,
    title: table.title,
    drop,
    remaining,
    limit: DAILY_GATHER_LIMIT,
    message: `你找到了 ${formatGatherDrop(drop)}。今日還能採集 ${remaining} 次。`,
  };
}
