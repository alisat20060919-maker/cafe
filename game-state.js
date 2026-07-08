import { GameDB } from './game-data.js';
import { loadSave, saveSave, clearSave } from './save.js';
import { emitStateChanged } from './event-bus.js';

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

export function persistState(reason = 'manual') {
  saveSave(state);
  emitStateChanged(reason);
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
