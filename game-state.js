import { GameDB } from '@db';
import { loadSave, saveSave, clearSave } from '@save';
import { emitStateChanged } from '@eventBus';

export const SAVE_VERSION = 7;

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
    collection: {
      discoveredItems: {},
      discoveredFairies: {},
    },
    unlockedScenes: {
      cafe: true,
      backyard: true,
      greenhouse: true,
      kitchen: false,
      alchemy: false,
    },
    gachaHistory: [],
    commissions: {},
    daily: {
      lastCheckIn: null,
      streak: 0,
    },
    gathering: {
      backyard: {
        lastDate: null,
        count: 0,
      },
      greenhouse: {
        lastDate: null,
        count: 0,
      },
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

function syncCollectionFromOwned(nextState) {
  if (!nextState.collection) nextState.collection = {};
  if (!nextState.collection.discoveredItems) nextState.collection.discoveredItems = {};
  if (!nextState.collection.discoveredFairies) nextState.collection.discoveredFairies = {};

  Object.entries(nextState.inventory || {}).forEach(([itemId, qty]) => {
    if (GameDB.items[itemId] && Number(qty || 0) > 0) {
      nextState.collection.discoveredItems[itemId] = true;
    }
  });

  Object.entries(nextState.fairies || {}).forEach(([fairyId, data]) => {
    if (GameDB.fairies[fairyId] && data?.owned) {
      nextState.collection.discoveredFairies[fairyId] = true;
    }
  });
}

function syncUnlockedScenes(nextState) {
  const fresh = createDefaultState();
  nextState.unlockedScenes = mergeDeep(fresh.unlockedScenes, nextState.unlockedScenes || {});
}

function normalizeCommissionState(nextState) {
  const normalized = {};

  Object.entries(nextState.commissions || {}).forEach(([commissionId, record]) => {
    if (!GameDB.commissions?.[commissionId] || !isPlainObject(record)) return;

    const status = record.status === 'claimed' ? 'completed' : record.status;
    if (!['completed', 'in_progress'].includes(status)) return;

    normalized[commissionId] = {
      ...record,
      status,
    };
  });

  nextState.commissions = normalized;
}

function migrateSave(saved) {
  const fresh = createDefaultState();
  if (!saved) {
    syncCollectionFromOwned(fresh);
    syncUnlockedScenes(fresh);
    normalizeCommissionState(fresh);
    return fresh;
  }

  const migrated = mergeDeep(fresh, saved);
  syncCollectionFromOwned(migrated);
  syncUnlockedScenes(migrated);
  normalizeCommissionState(migrated);
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
  syncCollectionFromOwned(state);
  syncUnlockedScenes(state);
  normalizeCommissionState(state);
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

export function isSceneUnlocked(sceneId) {
  return Boolean(state.unlockedScenes?.[sceneId]);
}

export function unlockScene(sceneId) {
  if (!GameDB.scenes?.[sceneId]) return false;
  state.unlockedScenes[sceneId] = true;
  return true;
}

export function markItemDiscovered(itemId) {
  if (!GameDB.items[itemId]) return;
  state.collection.discoveredItems[itemId] = true;
}

export function markFairyDiscovered(fairyId) {
  if (!GameDB.fairies[fairyId]) return;
  state.collection.discoveredFairies[fairyId] = true;
}

export function isItemDiscovered(itemId) {
  return Boolean(state.collection?.discoveredItems?.[itemId]);
}

export function isFairyDiscovered(fairyId) {
  return Boolean(state.collection?.discoveredFairies?.[fairyId]);
}

export function addItem(itemId, qty = 1) {
  if (!GameDB.items[itemId]) return;
  state.inventory[itemId] = Number(state.inventory[itemId] || 0) + qty;
  if (qty > 0) markItemDiscovered(itemId);
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
  markFairyDiscovered(fairyId);
}

export function addReward(reward = {}) {
  Object.entries(reward.currencies || {}).forEach(([currencyId, amount]) => addCurrency(currencyId, amount));
  Object.entries(reward.items || {}).forEach(([itemId, qty]) => addItem(itemId, qty));
  Object.keys(reward.fairies || {}).forEach((fairyId) => addFairy(fairyId));
}
