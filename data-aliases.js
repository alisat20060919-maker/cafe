export const ITEM_ID_ALIASES = Object.freeze({
  desert_oasis_dew: 'oasis_dew',
});

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function migrateQuantityMap(map = {}) {
  if (!isRecord(map)) return map;
  Object.entries(ITEM_ID_ALIASES).forEach(([legacyId, canonicalId]) => {
    if (!Object.prototype.hasOwnProperty.call(map, legacyId)) return;
    const legacyValue = Number(map[legacyId] || 0);
    const canonicalValue = Number(map[canonicalId] || 0);
    map[canonicalId] = Math.max(0, canonicalValue + legacyValue);
    delete map[legacyId];
  });
  return map;
}

function migrateBooleanMap(map = {}) {
  if (!isRecord(map)) return map;
  Object.entries(ITEM_ID_ALIASES).forEach(([legacyId, canonicalId]) => {
    if (!Object.prototype.hasOwnProperty.call(map, legacyId)) return;
    map[canonicalId] = Boolean(map[canonicalId] || map[legacyId]);
    delete map[legacyId];
  });
  return map;
}

function canonicalItemId(itemId) {
  return ITEM_ID_ALIASES[itemId] || itemId;
}

export function migrateLegacySaveIds(save) {
  if (!isRecord(save)) return save;
  migrateQuantityMap(save.inventory);
  if (isRecord(save.collection)) migrateBooleanMap(save.collection.discoveredItems);

  if (Array.isArray(save.gachaHistory)) {
    save.gachaHistory = save.gachaHistory.map((record) => {
      if (!isRecord(record) || record.kind !== 'item') return record;
      return { ...record, id: canonicalItemId(record.id) };
    });
  }

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
      if (!Object.prototype.hasOwnProperty.call(recipe.cost, legacyId)) return;
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
