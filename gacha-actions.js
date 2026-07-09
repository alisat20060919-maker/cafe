import { GameDB } from '@db';
import { getState, spendCurrency, addItem, addFairy, persistState } from '@state';

function getPoolDrops(pool) {
  const drops = [...(pool.drops || [])];
  const existingFairies = new Set(drops.filter((drop) => drop.kind === 'fairy').map((drop) => drop.id));

  Object.values(GameDB.fairies || {}).forEach((fairy) => {
    const sources = Array.isArray(fairy.source) ? fairy.source : [fairy.source].filter(Boolean);
    if (sources.includes('祈願') && !existingFairies.has(fairy.id)) {
      drops.push({ kind: 'fairy', id: fairy.id, qty: 1, weight: 1, autoIncluded: true });
    }
  });

  return drops;
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

function isSsrDrop(drop) {
  if (drop.kind === 'fairy') return GameDB.fairies?.[drop.id]?.rarity === 'SSR';
  if (drop.kind === 'item') return GameDB.items?.[drop.id]?.rarity === 'SSR';
  return false;
}

function pickPityDrop(drops) {
  const pityDrops = drops.filter(isSsrDrop);
  return pickWeighted(pityDrops.length ? pityDrops : drops);
}

function applyDrop(drop) {
  if (drop.kind === 'fairy') addFairy(drop.id);
  if (drop.kind === 'item') addItem(drop.id, drop.qty || 1);
}

function createGachaRecord(poolId, drop, meta = {}) {
  return {
    poolId,
    kind: drop.kind,
    id: drop.id,
    qty: drop.qty || 1,
    pityHit: Boolean(meta.pityHit),
    pityCounterAfter: Number(meta.pityCounterAfter || 0),
    totalPullsAfter: Number(meta.totalPullsAfter || 0),
    at: new Date().toISOString(),
  };
}

function ensureGachaState() {
  const state = getState();
  state.gacha ||= { totalPulls: 0, pityCounter: 0 };
  state.gacha.totalPulls = Math.max(0, Number(state.gacha.totalPulls || 0));
  state.gacha.pityCounter = Math.max(0, Number(state.gacha.pityCounter || 0));
  if (!Array.isArray(state.gachaHistory)) state.gachaHistory = [];
  return state.gacha;
}

function addGachaRecord(record) {
  const state = getState();
  state.gachaHistory.unshift(record);
  state.gachaHistory = state.gachaHistory.slice(0, Number(GameDB.gachaConfig?.historyLimit || 20));
}

export function getGachaPityStatus() {
  const gacha = ensureGachaState();
  const hardPityAt = Number(GameDB.gachaConfig?.hardPityAt || 20);
  return {
    totalPulls: gacha.totalPulls,
    pityCounter: gacha.pityCounter,
    hardPityAt,
    remaining: Math.max(0, hardPityAt - gacha.pityCounter),
  };
}

export function drawGacha(poolId = 'standard', options = {}) {
  const shouldPersist = options.persist !== false;
  const pool = GameDB.gachaPools[poolId];
  if (!pool) return { ok: false, message: '找不到祈願池。' };

  if (!spendCurrency(pool.cost.currency, pool.cost.amount)) {
    const meta = GameDB.currencies[pool.cost.currency];
    return { ok: false, message: `${meta?.name || pool.cost.currency}不足。` };
  }

  const drops = getPoolDrops(pool);
  const gacha = ensureGachaState();
  const hardPityAt = Number(GameDB.gachaConfig?.hardPityAt || 20);
  const pityHit = gacha.pityCounter + 1 >= hardPityAt;
  const drop = pityHit ? pickPityDrop(drops) : pickWeighted(drops);
  applyDrop(drop);

  gacha.totalPulls += 1;
  gacha.pityCounter = isSsrDrop(drop) ? 0 : gacha.pityCounter + 1;

  const record = createGachaRecord(poolId, drop, {
    pityHit,
    pityCounterAfter: gacha.pityCounter,
    totalPullsAfter: gacha.totalPulls,
  });
  addGachaRecord(record);
  if (shouldPersist) persistState('gacha');

  return { ok: true, drop: record, pity: getGachaPityStatus() };
}

export function drawGachaMany(poolId = 'standard', times = 1) {
  const count = Math.max(1, Math.floor(Number(times || 1)));
  const drops = [];
  let lastError = null;

  for (let i = 0; i < count; i += 1) {
    const result = drawGacha(poolId, { persist: false });
    if (!result.ok) {
      lastError = result;
      break;
    }
    drops.push(result.drop);
  }

  if (drops.length) persistState('gacha:batch');
  if (!drops.length && lastError) return lastError;
  return { ok: true, drops, partial: Boolean(lastError), message: lastError?.message || '' };
}
