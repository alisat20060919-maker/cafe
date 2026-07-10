import { GameDB } from '@db';
import { createStateDraft, commitStateDraft } from './state-transactions.js?v=core001';

function normalizeWorkingState(state) {
  state.player ||= {};
  state.inventory ||= {};
  state.fairies ||= {};
  state.collection ||= {};
  state.collection.discoveredItems ||= {};
  state.collection.discoveredFairies ||= {};
  state.gacha ||= { totalPulls: 0, pityCounter: 0 };
  state.gacha.totalPulls = Math.max(0, Number(state.gacha.totalPulls || 0));
  state.gacha.pityCounter = Math.max(0, Number(state.gacha.pityCounter || 0));
  if (!Array.isArray(state.gachaHistory)) state.gachaHistory = [];
  return state;
}

function getPoolDrops(pool) {
  const drops = [...(pool.drops || [])];
  const existingFairies = new Set(drops.filter((drop) => drop.kind === 'fairy').map((drop) => drop.id));

  Object.values(GameDB.fairies || {}).forEach((fairy) => {
    const sources = Array.isArray(fairy.source) ? fairy.source : [fairy.source].filter(Boolean);
    if (sources.includes('祈願') && !existingFairies.has(fairy.id)) {
      drops.push({ kind: 'fairy', id: fairy.id, qty: 1, weight: 1, autoIncluded: true });
    }
  });

  return drops.filter((drop) => Number(drop.weight || 0) > 0);
}

function pickWeighted(drops) {
  if (!drops.length) return null;
  const total = drops.reduce((sum, drop) => sum + Number(drop.weight || 0), 0);
  let roll = Math.random() * total;
  for (const drop of drops) {
    roll -= Number(drop.weight || 0);
    if (roll <= 0) return drop;
  }
  return drops[drops.length - 1] || null;
}

function isSsrDrop(drop) {
  if (!drop) return false;
  if (drop.kind === 'fairy') return GameDB.fairies?.[drop.id]?.rarity === 'SSR';
  if (drop.kind === 'item') return GameDB.items?.[drop.id]?.rarity === 'SSR';
  return false;
}

function pickPityDrop(drops) {
  const pityDrops = drops.filter(isSsrDrop);
  return pickWeighted(pityDrops.length ? pityDrops : drops);
}

function spendCurrencyFromState(state, currencyId, amount) {
  const cost = Math.max(0, Number(amount || 0));
  const current = Math.max(0, Number(state.player?.[currencyId] || 0));
  if (current < cost) return false;
  state.player[currencyId] = current - cost;
  return true;
}

function addItemToState(state, itemId, qty = 1) {
  if (!GameDB.items?.[itemId]) return false;
  const amount = Math.max(0, Number(qty || 0));
  state.inventory[itemId] = Math.max(0, Number(state.inventory[itemId] || 0) + amount);
  if (amount > 0) state.collection.discoveredItems[itemId] = true;
  return true;
}

function addFairyToState(state, fairyId) {
  if (!GameDB.fairies?.[fairyId]) return false;
  const current = state.fairies[fairyId] || {};
  state.fairies[fairyId] = {
    owned: true,
    affection: Math.max(0, Number(current.affection || 0)),
    obtainedAt: current.obtainedAt || new Date().toISOString(),
  };
  state.collection.discoveredFairies[fairyId] = true;
  return true;
}

function applyDropToState(state, drop) {
  if (drop.kind === 'fairy') return addFairyToState(state, drop.id);
  if (drop.kind === 'item') return addItemToState(state, drop.id, drop.qty || 1);
  return false;
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

function addGachaRecordToState(state, record) {
  const limit = Math.max(1, Number(GameDB.gachaConfig?.historyLimit || 20));
  state.gachaHistory = [record, ...(state.gachaHistory || [])].slice(0, limit);
}

function getPityStatusFromState(state) {
  const gacha = state.gacha || {};
  const hardPityAt = Math.max(1, Number(GameDB.gachaConfig?.hardPityAt || 20));
  const totalPulls = Math.max(0, Number(gacha.totalPulls || 0));
  const pityCounter = Math.max(0, Number(gacha.pityCounter || 0));
  return {
    totalPulls,
    pityCounter,
    hardPityAt,
    remaining: Math.max(0, hardPityAt - pityCounter),
  };
}

function drawOneFromState(state, poolId) {
  const pool = GameDB.gachaPools?.[poolId];
  if (!pool) return { ok: false, message: '找不到祈願池。' };

  if (!spendCurrencyFromState(state, pool.cost.currency, pool.cost.amount)) {
    const meta = GameDB.currencies?.[pool.cost.currency];
    return { ok: false, message: `${meta?.name || pool.cost.currency}不足。` };
  }

  const drops = getPoolDrops(pool);
  if (!drops.length) return { ok: false, message: '祈願池目前沒有可抽取內容。' };

  const hardPityAt = Math.max(1, Number(GameDB.gachaConfig?.hardPityAt || 20));
  const pityHit = state.gacha.pityCounter + 1 >= hardPityAt;
  const drop = pityHit ? pickPityDrop(drops) : pickWeighted(drops);
  if (!drop || !applyDropToState(state, drop)) return { ok: false, message: '祈願結果資料無效。' };

  state.gacha.totalPulls += 1;
  state.gacha.pityCounter = isSsrDrop(drop) ? 0 : state.gacha.pityCounter + 1;

  const record = createGachaRecord(poolId, drop, {
    pityHit,
    pityCounterAfter: state.gacha.pityCounter,
    totalPullsAfter: state.gacha.totalPulls,
  });
  addGachaRecordToState(state, record);

  return { ok: true, drop: record };
}

export function getGachaPityStatus() {
  const snapshot = normalizeWorkingState(createStateDraft());
  return getPityStatusFromState(snapshot);
}

export function drawGacha(poolId = 'standard') {
  const result = drawGachaMany(poolId, 1);
  if (!result.ok) return result;
  return {
    ok: true,
    drop: result.drops[0],
    pity: getGachaPityStatus(),
  };
}

export function drawGachaMany(poolId = 'standard', times = 1) {
  const count = Math.max(1, Math.floor(Number(times || 1)));
  const workingState = normalizeWorkingState(createStateDraft());
  const drops = [];
  let lastError = null;

  for (let i = 0; i < count; i += 1) {
    const result = drawOneFromState(workingState, poolId);
    if (!result.ok) {
      lastError = result;
      break;
    }
    drops.push(result.drop);
  }

  if (!drops.length && lastError) return lastError;
  if (drops.length) commitStateDraft(workingState);

  return {
    ok: true,
    drops,
    partial: Boolean(lastError),
    message: lastError?.message || '',
    pity: getPityStatusFromState(workingState),
  };
}
