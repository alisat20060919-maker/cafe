import { GameDB } from '@db';
import { loadSave, saveSave, clearSave } from '@save';
import { emitStateChanged } from '@eventBus';

export const SAVE_VERSION = 14;

function createDefaultState() {
  return {
    saveVersion: SAVE_VERSION,
    player: {
      level: 1,
      exp: 0,
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
      kitchen: true,
      alchemy: false,
    },
    gachaHistory: [],
    commissions: {},
    dailyCommissions: {
      date: null,
      ids: [],
      freeRefreshUsed: false,
      paidRefreshCount: 0,
    },
    story: {
      seenOpening: false,
    },
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

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyCommissionPoolIds() {
  return Object.values(GameDB.commissions || {})
    .filter((commission) => commission.category === 'daily')
    .map((commission) => commission.id)
    .filter(Boolean);
}

function getDailyCommissionLimit() {
  return Math.max(1, Number(GameDB.commissionConfig?.dailyCount || 3));
}

function pickDailyCommissionIds(poolIds = []) {
  const shuffled = [...poolIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(getDailyCommissionLimit(), shuffled.length));
}

function normalizeFairyState(nextState) {
  const normalized = {};

  Object.entries(nextState.fairies || {}).forEach(([fairyId, data]) => {
    if (!GameDB.fairies?.[fairyId]) return;
    if (!isPlainObject(data)) return;

    const owned = Boolean(data.owned);
    normalized[fairyId] = {
      ...data,
      owned,
      affection: owned ? Math.max(0, Number(data.affection || 0)) : 0,
    };
  });

  nextState.fairies = normalized;
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
  nextState.unlockedScenes.kitchen = true;
}

function normalizePlayerProgress(nextState, saved) {
  const savedVersion = Number(saved?.saveVersion || 0);
  const wasDemoDefault = savedVersion < SAVE_VERSION
    && Number(saved?.player?.level || 0) === 5
    && Number(saved?.player?.exp || 0) === 120;

  if (wasDemoDefault) {
    nextState.player.level = 1;
    nextState.player.exp = 0;
    return;
  }

  const exp = Math.max(0, Number(nextState.player?.exp || 0));
  nextState.player.exp = exp;
  nextState.player.level = GameDB.getLevelByExp?.(exp) || 1;
}

function applyLevelUnlocksToState(nextState) {
  const unlocked = [];
  const level = Math.max(1, Number(nextState.player?.level || 1));

  for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
    const unlocks = GameDB.getLevelUnlocksFor?.(currentLevel) || {};
    (unlocks.scenes || []).forEach((sceneId) => {
      if (!GameDB.scenes?.[sceneId]) return;
      const wasUnlocked = Boolean(nextState.unlockedScenes?.[sceneId]);
      nextState.unlockedScenes[sceneId] = true;
      if (!wasUnlocked) unlocked.push({
        type: 'scene',
        id: sceneId,
        label: GameDB.scenes[sceneId].label || sceneId,
        level: currentLevel,
      });
    });
  }

  return unlocked;
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

function applyCommissionUnlocksToState(nextState, commissionId) {
  const commission = GameDB.commissions?.[commissionId];
  const unlocked = [];

  (commission?.unlocks?.scenes || []).forEach((sceneId) => {
    if (!GameDB.scenes?.[sceneId]) return;
    const wasUnlocked = Boolean(nextState.unlockedScenes?.[sceneId]);
    nextState.unlockedScenes[sceneId] = true;
    if (!wasUnlocked) unlocked.push({ type: 'scene', id: sceneId, label: GameDB.scenes[sceneId].label || sceneId });
  });

  return unlocked;
}

function syncCompletedCommissionUnlocks(nextState) {
  Object.entries(nextState.commissions || {}).forEach(([commissionId, record]) => {
    if (record?.status === 'completed') applyCommissionUnlocksToState(nextState, commissionId);
  });
}

function resetDailyCommissionRecords(nextState, poolIds = []) {
  poolIds.forEach((commissionId) => {
    if (GameDB.commissions?.[commissionId]?.category === 'daily') {
      delete nextState.commissions[commissionId];
    }
  });
}

function ensureDailyCommissions(nextState, { force = false, markFreeUsed = false, incrementPaid = false } = {}) {
  const today = getLocalDateKey();
  const poolIds = getDailyCommissionPoolIds();
  const current = isPlainObject(nextState.dailyCommissions) ? nextState.dailyCommissions : {};
  const rawIds = Array.isArray(current.ids) ? current.ids : [];
  const currentIds = rawIds.filter((id) => poolIds.includes(id));
  const hasInvalidIds = rawIds.length !== currentIds.length;
  const sameDay = current.date === today;
  const shouldRefresh = force || !sameDay || !currentIds.length || hasInvalidIds;
  const freeRefreshUsed = sameDay ? Boolean(current.freeRefreshUsed) : false;
  const paidRefreshCount = sameDay ? Number(current.paidRefreshCount || 0) : 0;

  if (!shouldRefresh) {
    nextState.dailyCommissions = {
      date: today,
      ids: currentIds,
      freeRefreshUsed,
      paidRefreshCount,
    };
    return { changed: false, date: today, ids: currentIds, freeRefreshUsed, paidRefreshCount };
  }

  resetDailyCommissionRecords(nextState, poolIds);

  const nextFreeRefreshUsed = markFreeUsed ? true : freeRefreshUsed;
  const nextPaidRefreshCount = incrementPaid ? paidRefreshCount + 1 : paidRefreshCount;
  const ids = pickDailyCommissionIds(poolIds);

  nextState.dailyCommissions = {
    date: today,
    ids,
    freeRefreshUsed: sameDay ? nextFreeRefreshUsed : Boolean(markFreeUsed),
    paidRefreshCount: sameDay ? nextPaidRefreshCount : Number(incrementPaid ? 1 : 0),
  };

  return {
    changed: true,
    date: today,
    ids,
    freeRefreshUsed: nextState.dailyCommissions.freeRefreshUsed,
    paidRefreshCount: nextState.dailyCommissions.paidRefreshCount,
  };
}

function migrateSave(saved) {
  const fresh = createDefaultState();
  if (!saved) {
    normalizePlayerProgress(fresh, null);
    normalizeFairyState(fresh);
    syncCollectionFromOwned(fresh);
    syncUnlockedScenes(fresh);
    applyLevelUnlocksToState(fresh);
    normalizeCommissionState(fresh);
    syncCompletedCommissionUnlocks(fresh);
    ensureDailyCommissions(fresh);
    return fresh;
  }

  const migrated = mergeDeep(fresh, saved);
  normalizePlayerProgress(migrated, saved);
  normalizeFairyState(migrated);
  syncCollectionFromOwned(migrated);
  syncUnlockedScenes(migrated);
  applyLevelUnlocksToState(migrated);
  normalizeCommissionState(migrated);
  syncCompletedCommissionUnlocks(migrated);
  ensureDailyCommissions(migrated);
  migrated.saveVersion = SAVE_VERSION;
  return migrated;
}

function getRequirementEntries(req = {}) {
  const entries = [];

  if (Number.isFinite(Number(req.level))) entries.push({ type: 'level', id: Number(req.level) });
  if (req.scene) entries.push({ type: 'scene', id: req.scene });
  if (Array.isArray(req.scenes)) req.scenes.forEach((id) => entries.push({ type: 'scene', id }));
  if (req.station) entries.push({ type: 'station', id: req.station });
  if (Array.isArray(req.stations)) req.stations.forEach((id) => entries.push({ type: 'station', id }));
  if (req.recipe) entries.push({ type: 'recipe', id: req.recipe });
  if (Array.isArray(req.recipes)) req.recipes.forEach((id) => entries.push({ type: 'recipe', id }));
  if (req.item) entries.push({ type: 'item', id: req.item, qty: Number(req.qty || 1) });
  if (req.fairy) entries.push({ type: 'fairy', id: req.fairy });

  return entries;
}

function isRequirementEntryUnlocked(entry, currentState = state) {
  if (!entry?.type) return true;

  if (entry.type === 'level') return Number(currentState.player?.level || 1) >= Number(entry.id || 1);
  if (entry.type === 'scene') return Boolean(currentState.unlockedScenes?.[entry.id]);
  if (entry.type === 'station') {
    if (!GameDB.stations?.[entry.id]) return false;
    return isUnlocked({ scene: entry.id }, currentState);
  }
  if (entry.type === 'recipe') {
    const recipe = GameDB.recipes?.[entry.id];
    if (!recipe) return false;
    return recipe.station ? isUnlocked({ station: recipe.station }, currentState) : true;
  }
  if (entry.type === 'item') return Number(currentState.inventory?.[entry.id] || 0) >= Math.max(1, Number(entry.qty || 1));
  if (entry.type === 'fairy') return Boolean(currentState.fairies?.[entry.id]?.owned);

  return false;
}

function getRequirementEntryText(entry = {}) {
  if (entry.type === 'level') return `需要 Lv.${entry.id}`;
  if (entry.type === 'scene') return `解鎖${GameDB.scenes?.[entry.id]?.label || entry.id}`;
  if (entry.type === 'station') return `解鎖${GameDB.stations?.[entry.id]?.label || entry.id}`;
  if (entry.type === 'recipe') return `解鎖配方：${GameDB.recipes?.[entry.id]?.name || entry.id}`;
  if (entry.type === 'item') return `持有${GameDB.items?.[entry.id]?.name || entry.id} ×${Math.max(1, Number(entry.qty || 1))}`;
  if (entry.type === 'fairy') return `契約${GameDB.fairies?.[entry.id]?.name || entry.id}`;
  return '未知條件';
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

export function refreshDailyCommissions(options = {}) {
  const result = ensureDailyCommissions(state, options);
  if (result.changed) persistState('daily-commissions');
  return result;
}

export function useFreeDailyCommissionRefresh() {
  ensureDailyCommissions(state);
  if (state.dailyCommissions?.freeRefreshUsed) {
    return { ok: false, changed: false, reason: 'free-used', message: '今天的免費刷新已經用過了。' };
  }

  const result = ensureDailyCommissions(state, { force: true, markFreeUsed: true });
  if (result.changed) persistState('daily-commissions:free');
  return { ok: true, ...result };
}

export function usePaidDailyCommissionRefresh() {
  ensureDailyCommissions(state);
  const result = ensureDailyCommissions(state, { force: true, incrementPaid: true });
  if (result.changed) persistState('daily-commissions:paid');
  return { ok: true, ...result };
}

export function getActiveCommissionIds() {
  const result = ensureDailyCommissions(state);
  if (result.changed) persistState('daily-commissions');
  return result.ids;
}

export function resetState() {
  clearSave();
  state = createDefaultState();
  normalizePlayerProgress(state, null);
  normalizeFairyState(state);
  syncCollectionFromOwned(state);
  syncUnlockedScenes(state);
  applyLevelUnlocksToState(state);
  normalizeCommissionState(state);
  syncCompletedCommissionUnlocks(state);
  ensureDailyCommissions(state);
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

export function addPlayerExp(amount = 0) {
  const expGained = Math.max(0, Number(amount || 0));
  const oldLevel = GameDB.getLevelByExp?.(state.player.exp || 0) || Number(state.player.level || 1);
  if (expGained <= 0) return { expGained: 0, oldLevel, newLevel: oldLevel, levelUps: [], unlocked: [] };

  state.player.exp = Math.max(0, Number(state.player.exp || 0) + expGained);
  const newLevel = GameDB.getLevelByExp?.(state.player.exp) || oldLevel;
  state.player.level = newLevel;

  const levelUps = [];
  for (let level = oldLevel + 1; level <= newLevel; level += 1) levelUps.push(level);

  const unlocked = applyLevelUnlocksToState(state);
  return { expGained, oldLevel, newLevel, levelUps, unlocked };
}

export function isUnlocked(req = {}, currentState = state) {
  if (!req) return true;
  if (Array.isArray(req)) return req.every((entry) => isUnlocked(entry, currentState));
  if (!isPlainObject(req)) return true;

  if (Array.isArray(req.all)) return req.all.every((entry) => isUnlocked(entry, currentState));
  if (Array.isArray(req.any)) return req.any.some((entry) => isUnlocked(entry, currentState));

  const entries = getRequirementEntries(req);
  if (!entries.length) return true;
  return entries.every((entry) => isRequirementEntryUnlocked(entry, currentState));
}

export function getUnlockRequirementText(req = {}) {
  if (!req) return '';
  if (Array.isArray(req)) return req.map(getUnlockRequirementText).filter(Boolean).join('、');
  if (!isPlainObject(req)) return '';

  if (Array.isArray(req.all)) return req.all.map(getUnlockRequirementText).filter(Boolean).join('、');
  if (Array.isArray(req.any)) return req.any.map(getUnlockRequirementText).filter(Boolean).join(' 或 ');

  return getRequirementEntries(req).map(getRequirementEntryText).join('、');
}

export function isSceneUnlocked(sceneId) {
  return isUnlocked({ scene: sceneId });
}

export function unlockScene(sceneId) {
  if (!GameDB.scenes?.[sceneId]) return false;
  state.unlockedScenes[sceneId] = true;
  return true;
}

export function applyCommissionUnlocks(commissionId) {
  return applyCommissionUnlocksToState(state, commissionId);
}

export function markOpeningStorySeen() {
  if (!state.story) state.story = {};
  state.story.seenOpening = true;
  persistState('story:opening');
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

export function addFairyAffection(fairyId, amount = 0) {
  if (!GameDB.fairies[fairyId]) return null;
  const gained = Math.max(0, Number(amount || 0));
  if (gained <= 0) return null;

  const current = state.fairies[fairyId];
  if (!current?.owned) return null;

  state.fairies[fairyId] = {
    ...current,
    owned: true,
    affection: Math.max(0, Number(current.affection || 0) + gained),
  };

  return {
    fairyId,
    amount: gained,
    total: state.fairies[fairyId].affection,
  };
}

export function addReward(reward = {}) {
  const growth = addPlayerExp(reward.exp || 0);
  const affection = [];
  Object.entries(reward.currencies || {}).forEach(([currencyId, amount]) => addCurrency(currencyId, amount));
  Object.entries(reward.items || {}).forEach(([itemId, qty]) => addItem(itemId, qty));
  Object.keys(reward.fairies || {}).forEach((fairyId) => addFairy(fairyId));
  Object.entries(reward.affection || {}).forEach(([fairyId, amount]) => {
    const result = addFairyAffection(fairyId, amount);
    if (result) affection.push(result);
  });
  return { ...growth, affection };
}
