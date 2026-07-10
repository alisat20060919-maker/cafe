export const ITEM_ID_ALIASES = Object.freeze({
  desert_oasis_dew: 'oasis_dew',
});

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record || {}, key);
}

function toNonNegativeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function toNullableString(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function migrateQuantityMap(map = {}) {
  if (!isRecord(map)) return map;
  Object.entries(ITEM_ID_ALIASES).forEach(([legacyId, canonicalId]) => {
    if (!hasOwn(map, legacyId)) return;
    const legacyValue = toNonNegativeNumber(map[legacyId]);
    const canonicalValue = toNonNegativeNumber(map[canonicalId]);
    map[canonicalId] = canonicalValue + legacyValue;
    delete map[legacyId];
  });
  return map;
}

function migrateBooleanMap(map = {}) {
  if (!isRecord(map)) return map;
  Object.entries(ITEM_ID_ALIASES).forEach(([legacyId, canonicalId]) => {
    if (!hasOwn(map, legacyId)) return;
    map[canonicalId] = Boolean(map[canonicalId] || map[legacyId]);
    delete map[legacyId];
  });
  return map;
}

function canonicalItemId(itemId) {
  return ITEM_ID_ALIASES[itemId] || itemId;
}

function sanitizeNumberMap(map = {}) {
  if (!isRecord(map)) return {};
  return Object.fromEntries(
    Object.entries(map)
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([id, value]) => [id, toNonNegativeNumber(value)]),
  );
}

function sanitizeBooleanMap(map = {}) {
  if (!isRecord(map)) return {};
  return Object.fromEntries(
    Object.entries(map)
      .filter(([, value]) => Boolean(value))
      .map(([id]) => [id, true]),
  );
}

function sanitizePlayerState(player = {}) {
  if (!isRecord(player)) return {};
  const normalized = {};
  const numberFields = ['level', 'exp', 'starSugar', 'leafCoin', 'tickets'];

  numberFields.forEach((key) => {
    if (!hasOwn(player, key) || !Number.isFinite(Number(player[key]))) return;
    normalized[key] = key === 'level'
      ? Math.max(1, Math.floor(toNonNegativeNumber(player[key], 1)))
      : toNonNegativeNumber(player[key]);
  });

  return normalized;
}

function sanitizeFairyState(fairies = {}) {
  if (!isRecord(fairies)) return {};
  return Object.fromEntries(
    Object.entries(fairies)
      .filter(([, record]) => isRecord(record))
      .map(([fairyId, record]) => [fairyId, {
        owned: Boolean(record.owned),
        affection: Boolean(record.owned) ? toNonNegativeNumber(record.affection) : 0,
        obtainedAt: toNullableString(record.obtainedAt),
      }]),
  );
}

function sanitizeCommissionState(commissions = {}) {
  if (!isRecord(commissions)) return {};
  const normalized = {};

  Object.entries(commissions).forEach(([commissionId, record]) => {
    if (!isRecord(record)) return;
    const status = record.status === 'claimed' ? 'completed' : record.status;
    if (!['completed', 'in_progress'].includes(status)) return;
    normalized[commissionId] = {
      status,
      completedAt: status === 'completed' ? toNullableString(record.completedAt) : null,
    };
  });

  return normalized;
}

function sanitizeGatheringState(gathering = {}) {
  if (!isRecord(gathering)) return {};
  return Object.fromEntries(
    Object.entries(gathering)
      .filter(([, record]) => isRecord(record))
      .map(([locationId, record]) => [locationId, {
        lastDate: toNullableString(record.lastDate),
        count: toNonNegativeNumber(record.count),
      }]),
  );
}

function sanitizeGachaHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((record) => isRecord(record) && ['item', 'fairy'].includes(record.kind) && typeof record.id === 'string')
    .slice(0, 30)
    .map((record) => ({
      poolId: typeof record.poolId === 'string' ? record.poolId : 'standard',
      kind: record.kind,
      id: record.kind === 'item' ? canonicalItemId(record.id) : record.id,
      qty: Math.max(1, Math.floor(toNonNegativeNumber(record.qty, 1))),
      pityHit: Boolean(record.pityHit),
      pityCounterAfter: toNonNegativeNumber(record.pityCounterAfter),
      totalPullsAfter: toNonNegativeNumber(record.totalPullsAfter),
      at: toNullableString(record.at),
    }));
}

function sanitizeSaveShape(save) {
  save.player = sanitizePlayerState(save.player);
  save.inventory = sanitizeNumberMap(save.inventory);
  save.fairies = sanitizeFairyState(save.fairies);
  save.commissions = sanitizeCommissionState(save.commissions);
  save.gathering = sanitizeGatheringState(save.gathering);
  save.gachaHistory = sanitizeGachaHistory(save.gachaHistory);

  save.gacha = isRecord(save.gacha) ? {
    totalPulls: toNonNegativeNumber(save.gacha.totalPulls),
    pityCounter: toNonNegativeNumber(save.gacha.pityCounter),
  } : {};

  save.collection = isRecord(save.collection) ? {
    discoveredItems: sanitizeBooleanMap(save.collection.discoveredItems),
    discoveredFairies: sanitizeBooleanMap(save.collection.discoveredFairies),
  } : {};

  save.unlockedScenes = sanitizeBooleanMap(save.unlockedScenes);

  save.story = isRecord(save.story) ? {
    seenOpening: Boolean(save.story.seenOpening),
  } : {};

  save.settings = isRecord(save.settings) ? {
    animation: save.settings.animation !== false,
    softMode: Boolean(save.settings.softMode),
    sound: Boolean(save.settings.sound),
  } : {};

  save.daily = isRecord(save.daily) ? {
    lastCheckIn: toNullableString(save.daily.lastCheckIn),
    streak: toNonNegativeNumber(save.daily.streak),
    shopDate: toNullableString(save.daily.shopDate),
    shopPurchases: sanitizeNumberMap(save.daily.shopPurchases),
  } : {};

  save.dailyCommissions = isRecord(save.dailyCommissions) ? {
    date: toNullableString(save.dailyCommissions.date),
    ids: Array.isArray(save.dailyCommissions.ids)
      ? save.dailyCommissions.ids.filter((id) => typeof id === 'string')
      : [],
    freeRefreshUsed: Boolean(save.dailyCommissions.freeRefreshUsed),
    paidRefreshCount: toNonNegativeNumber(save.dailyCommissions.paidRefreshCount),
    rerollCount: toNonNegativeNumber(save.dailyCommissions.rerollCount),
  } : {};

  return save;
}

export function migrateLegacySaveIds(save) {
  if (!isRecord(save)) return save;
  sanitizeSaveShape(save);
  migrateQuantityMap(save.inventory);
  if (isRecord(save.collection)) migrateBooleanMap(save.collection.discoveredItems);
  save.gachaHistory = sanitizeGachaHistory(save.gachaHistory);
  return save;
}

export function applyLegacyGameDataAliases(GameDB) {
  if (!GameDB || !isRecord(GameDB.items)) return;

  Object.entries(ITEM_ID_ALIASES).forEach(([legacyId, canonicalId]) => {
    if (!GameDB.items[canonicalId] && GameDB.items[legacyId]) {
      GameDB.items[canonicalId] = { ...GameDB.items[legacyId], id: canonicalId };
    }
    delete GameDB.items[legacyId];
    if (isRecord(GameDB.itemSources)) delete GameDB.itemSources[legacyId];
  });

  Object.values(GameDB.recipes || {}).forEach((recipe) => {
    if (!isRecord(recipe?.cost)) return;
    Object.entries(ITEM_ID_ALIASES).forEach(([legacyId, canonicalId]) => {
      if (!hasOwn(recipe.cost, legacyId)) return;
      recipe.cost[canonicalId] = Number(recipe.cost[canonicalId] || 0) + Number(recipe.cost[legacyId] || 0);
      delete recipe.cost[legacyId];
    });
  });

  Object.values(GameDB.gatherTables || {}).forEach((table) => {
    (table?.drops || []).forEach((drop) => { drop.itemId = canonicalItemId(drop.itemId); });
    (table?.specialEvents || []).forEach((event) => migrateQuantityMap(event?.bonus?.items));
  });

  Object.values(GameDB.commissions || {}).forEach((commission) => {
    migrateQuantityMap(commission?.requiredItems);
    migrateQuantityMap(commission?.cost);
    migrateQuantityMap(commission?.reward?.items);
  });

  Object.values(GameDB.gachaPools || {}).forEach((pool) => {
    (pool?.drops || []).forEach((drop) => {
      if (drop.kind === 'item') drop.id = canonicalItemId(drop.id);
    });
  });

  Object.values(GameDB.fairies || {}).forEach((fairy) => {
    if (!Array.isArray(fairy.favoriteSweets)) return;
    fairy.favoriteSweets = fairy.favoriteSweets.map(canonicalItemId);
  });
}
