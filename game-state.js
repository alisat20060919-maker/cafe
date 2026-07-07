import { GameDB } from './game-data.js';
import { loadSave, saveSave, clearSave } from './save.js';

export const SAVE_VERSION = 1;

function createDefaultState() {
  return {
    saveVersion: SAVE_VERSION,
    player: {
      level: 5,
      exp: 120,
      starSugar: 128,
      leafCoin: 320,
      tickets: 3,
    },
    inventory: {
      moon_petals: 1,
      star_berry: 1,
      night_sky_fragment: 0,
      forest_cookie: 0,
      stardew_water: 0,
    },
    fairies: {},
    gachaHistory: [],
    commissions: {},
    daily: {
      lastCheckIn: null,
      streak: 0,
    },
    settings: {
      animation: true,
      softMode: false,
      sound: false,
    },
  };
}

let state = createDefaultState();

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(base, saved) {
  const output = { ...base };
  if (!isPlainObject(saved)) return output;

  Object.entries(saved).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      output[key] = mergeDeep(base[key], value);
      return;
    }
    output[key] = value;
  });

  return output;
}

function migrateSave(saved) {
  const fresh = createDefaultState();
  if (!saved) return fresh;

  const migrated = mergeDeep(fresh, saved);
  migrated.saveVersion = SAVE_VERSION;
  return migrated;
}

export function initState() {
  state = migrateSave(loadSave());
  persistState();
  return state;
}

export function getState() {
  return state;
}

export function persistState() {
  saveSave(state);
}

export function resetState() {
  clearSave();
  state = createDefaultState();
  persistState();
  return state;
}

export function replaceState(nextState) {
  state = migrateSave(nextState);
  persistState();
  return state;
}

export function addCurrency(currencyId, amount) {
  state.player[currencyId] = Math.max(0, Number(state.player[currencyId] || 0) + amount);
}

export function spendCurrency(currencyId, amount) {
  const current = Number(state.player[currencyId] || 0);
  if (current < amount) return false;
  state.player[currencyId] = current - amount;
  return true;
}

export function addItem(itemId, qty = 1) {
  if (!GameDB.items[itemId]) return;
  state.inventory[itemId] = Number(state.inventory[itemId] || 0) + qty;
}

export function spendItems(cost = {}) {
  if (!canAffordItems(cost)) return false;
  Object.entries(cost).forEach(([itemId, qty]) => {
    state.inventory[itemId] = Math.max(0, Number(state.inventory[itemId] || 0) - qty);
  });
  return true;
}

export function canAffordItems(cost = {}) {
  return Object.entries(cost).every(([itemId, qty]) => Number(state.inventory[itemId] || 0) >= qty);
}

export function addFairy(fairyId) {
  if (!GameDB.fairies[fairyId]) return;
  state.fairies[fairyId] = {
    owned: true,
    affection: state.fairies[fairyId]?.affection || 0,
    obtainedAt: state.fairies[fairyId]?.obtainedAt || new Date().toISOString(),
  };
}

export function addReward(reward = {}) {
  Object.entries(reward.currencies || {}).forEach(([currencyId, amount]) => addCurrency(currencyId, amount));
  Object.entries(reward.items || {}).forEach(([itemId, qty]) => addItem(itemId, qty));
  Object.keys(reward.fairies || {}).forEach((fairyId) => addFairy(fairyId));
}

export function formatReward(reward = {}) {
  const parts = [];
  Object.entries(reward.currencies || {}).forEach(([currencyId, amount]) => {
    const meta = GameDB.currencies[currencyId];
    parts.push(`${meta?.icon || ''}${meta?.name || currencyId} +${amount}`);
  });
  Object.entries(reward.items || {}).forEach(([itemId, qty]) => {
    const item = GameDB.items[itemId];
    parts.push(`${item?.icon || ''}${item?.name || itemId} ×${qty}`);
  });
  Object.keys(reward.fairies || {}).forEach((fairyId) => {
    const fairy = GameDB.fairies[fairyId];
    parts.push(`${fairy?.icon || ''}${fairy?.name || fairyId}`);
  });
  return parts.join('、') || '無';
}

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayString() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateString(date);
}

export function claimDailyReward() {
  const today = localDateString();
  if (state.daily.lastCheckIn === today) {
    return { ok: false, reason: 'claimed', message: '今天已經簽到過了。' };
  }

  const nextStreak = state.daily.lastCheckIn === yesterdayString()
    ? Number(state.daily.streak || 0) + 1
    : 1;
  const reward = GameDB.dailyRewards[(nextStreak - 1) % GameDB.dailyRewards.length];

  addReward(reward);
  state.daily.lastCheckIn = today;
  state.daily.streak = nextStreak;
  persistState();

  return { ok: true, streak: nextStreak, reward, message: `簽到成功：${formatReward(reward)}` };
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

export function drawGacha(poolId = 'standard') {
  const pool = GameDB.gachaPools[poolId];
  if (!pool) return { ok: false, message: '找不到祈願池。' };

  if (!spendCurrency(pool.cost.currency, pool.cost.amount)) {
    const meta = GameDB.currencies[pool.cost.currency];
    return { ok: false, message: `${meta?.name || pool.cost.currency}不足。` };
  }

  const drop = pickWeighted(pool.drops);
  if (drop.kind === 'fairy') addFairy(drop.id);
  if (drop.kind === 'item') addItem(drop.id, drop.qty || 1);

  const record = {
    poolId,
    kind: drop.kind,
    id: drop.id,
    qty: drop.qty || 1,
    at: new Date().toISOString(),
  };
  state.gachaHistory.unshift(record);
  state.gachaHistory = state.gachaHistory.slice(0, 30);
  persistState();

  return { ok: true, drop: record };
}

export function canCompleteCommission(commissionId) {
  const commission = GameDB.commissions[commissionId];
  if (!commission) return false;
  if (state.commissions[commissionId]?.status === 'claimed') return false;
  return canAffordItems(commission.cost);
}

export function completeCommission(commissionId) {
  const commission = GameDB.commissions[commissionId];
  if (!commission) return { ok: false, message: '找不到委託。' };
  if (state.commissions[commissionId]?.status === 'claimed') {
    return { ok: false, message: '這份委託已經完成過了。' };
  }
  if (!spendItems(commission.cost)) {
    return { ok: false, message: '素材不足，還不能完成這份委託。' };
  }

  addReward(commission.reward);
  state.commissions[commissionId] = {
    status: 'claimed',
    completedAt: new Date().toISOString(),
  };
  persistState();

  return { ok: true, message: `委託完成：${formatReward(commission.reward)}` };
}
