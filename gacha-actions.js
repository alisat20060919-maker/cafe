import { GameDB } from './game-data.js?v=core04';
import { getState, spendCurrency, addItem, addFairy, persistState } from './game-state.js?v=core04';

function pickWeighted(drops) {
  const total = drops.reduce((sum, drop) => sum + Number(drop.weight || 0), 0);
  let roll = Math.random() * total;

  for (const drop of drops) {
    roll -= Number(drop.weight || 0);
    if (roll <= 0) return drop;
  }

  return drops[drops.length - 1];
}

function applyDrop(drop) {
  if (drop.kind === 'fairy') addFairy(drop.id);
  if (drop.kind === 'item') addItem(drop.id, drop.qty || 1);
}

function createGachaRecord(poolId, drop) {
  return {
    poolId,
    kind: drop.kind,
    id: drop.id,
    qty: drop.qty || 1,
    at: new Date().toISOString(),
  };
}

function addGachaRecord(record) {
  const state = getState();
  state.gachaHistory.unshift(record);
  state.gachaHistory = state.gachaHistory.slice(0, 30);
}

export function drawGacha(poolId = 'standard') {
  const pool = GameDB.gachaPools[poolId];
  if (!pool) return { ok: false, message: '找不到祈願池。' };

  if (!spendCurrency(pool.cost.currency, pool.cost.amount)) {
    const meta = GameDB.currencies[pool.cost.currency];
    return { ok: false, message: `${meta?.name || pool.cost.currency}不足。` };
  }

  const drop = pickWeighted(pool.drops);
  applyDrop(drop);

  const record = createGachaRecord(poolId, drop);
  addGachaRecord(record);
  persistState('gacha');

  return { ok: true, drop: record };
}
