import { GameDB } from '@db';

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record || {}, key);
}

function pushIssue(list, scope, message) {
  list.push(`[${scope}] ${message}`);
}

function validateEnum(errors, values = [], scope = 'enum') {
  if (!Array.isArray(values) || !values.length) {
    pushIssue(errors, scope, '必須是非空陣列。');
    return;
  }

  values.forEach((value, index) => {
    if (typeof value !== 'string' || !value.trim()) pushIssue(errors, `${scope}[${index}]`, '必須是非空字串。');
  });
}

function validateItemTypeMeta(errors) {
  [...(GameDB.itemTypes || []), 'fairy'].forEach((typeId) => {
    const meta = GameDB.itemTypeMeta?.[typeId];
    const scope = `itemTypeMeta.${typeId}`;

    if (!meta || typeof meta !== 'object') {
      pushIssue(errors, scope, '缺少分類 meta。');
      return;
    }

    if (meta.id !== typeId) pushIssue(errors, scope, `id 應為 ${typeId}，目前是 ${meta.id || '空值'}。`);
    if (!meta.label) pushIssue(errors, scope, '缺少 label。');
  });
}

function validateRegistry(errors, registry = {}, scope = 'registry') {
  Object.entries(registry || {}).forEach(([id, entry]) => {
    if (!entry || typeof entry !== 'object') {
      pushIssue(errors, `${scope}.${id}`, '登錄資料必須是物件。');
      return;
    }

    if (entry.id !== id) pushIssue(errors, `${scope}.${id}`, `id 應為 ${id}，目前是 ${entry.id || '空值'}。`);
    if (!entry.label) pushIssue(errors, `${scope}.${id}`, '缺少 label。');
  });
}

function getSourceRegistry(sourceType) {
  return GameDB.getSourceRegistry?.(sourceType) || null;
}

function validateItems(errors) {
  Object.entries(GameDB.items || {}).forEach(([itemId, item]) => {
    if (!item || typeof item !== 'object') {
      pushIssue(errors, `items.${itemId}`, 'item 必須是物件。');
      return;
    }

    if (item.id !== itemId) pushIssue(errors, `items.${itemId}`, `item.id 應為 ${itemId}，目前是 ${item.id || '空值'}。`);
    if (!item.name) pushIssue(errors, `items.${itemId}`, '缺少 name。');
    if (!item.type) {
      pushIssue(errors, `items.${itemId}`, '缺少 type。');
    } else if (!GameDB.itemTypes?.includes(item.type)) {
      pushIssue(errors, `items.${itemId}`, `未知 type：${item.type}。請先登錄到 GameDB.itemTypes。`);
    }

    if (!item.rarity) {
      pushIssue(errors, `items.${itemId}`, '缺少 rarity。');
    } else if (!GameDB.rarities?.includes(item.rarity)) {
      pushIssue(errors, `items.${itemId}`, `未知 rarity：${item.rarity}。請先登錄到 GameDB.rarities。`);
    }
  });
}

function validateFairies(errors) {
  Object.entries(GameDB.fairies || {}).forEach(([fairyId, fairy]) => {
    if (!fairy || typeof fairy !== 'object') {
      pushIssue(errors, `fairies.${fairyId}`, 'fairy 必須是物件。');
      return;
    }

    if (fairy.id !== fairyId) pushIssue(errors, `fairies.${fairyId}`, `fairy.id 應為 ${fairyId}，目前是 ${fairy.id || '空值'}。`);
    if (!fairy.name) pushIssue(errors, `fairies.${fairyId}`, '缺少 name。');
    if (!fairy.rarity) {
      pushIssue(errors, `fairies.${fairyId}`, '缺少 rarity。');
    } else if (!GameDB.rarities?.includes(fairy.rarity)) {
      pushIssue(errors, `fairies.${fairyId}`, `未知 rarity：${fairy.rarity}。請先登錄到 GameDB.rarities。`);
    }
  });
}

function validateItemSources(errors, warnings) {
  Object.entries(GameDB.itemSources || {}).forEach(([itemId, source]) => {
    if (!hasOwn(GameDB.items, itemId)) pushIssue(errors, `itemSources.${itemId}`, '來源規則指向不存在的 item。');
    if (!source || typeof source !== 'object') {
      pushIssue(errors, `itemSources.${itemId}`, 'source 必須是物件。');
      return;
    }

    if (!source.type) pushIssue(errors, `itemSources.${itemId}`, '缺少 type。');
    if (!source.id) pushIssue(errors, `itemSources.${itemId}`, '缺少 id。');

    const registry = getSourceRegistry(source.type);
    if (!registry) {
      pushIssue(errors, `itemSources.${itemId}`, `未知的來源 type：${source.type}。`);
      return;
    }

    if (!hasOwn(registry, source.id)) {
      pushIssue(errors, `itemSources.${itemId}`, `${source.type}:${source.id} 沒有登錄在 GameDB。`);
    }

    if (source.type === 'scene' && !hasOwn(GameDB.gatherTables, source.id)) {
      pushIssue(warnings, `itemSources.${itemId}`, `指向 scene:${source.id}，但 GameDB.gatherTables 沒有對應採集表；若這是製作站，請改成 station。`);
    }
  });
}

function validateDrops(errors, drops = [], scope = 'drops') {
  if (!Array.isArray(drops) || !drops.length) {
    pushIssue(errors, scope, 'drops 不可為空。');
    return;
  }

  const totalWeight = drops.reduce((sum, drop) => sum + Number(drop.weight || 0), 0);
  if (totalWeight <= 0) pushIssue(errors, scope, '掉落權重總和必須大於 0。');

  drops.forEach((drop, index) => {
    const dropScope = `${scope}[${index}]`;
    if (!drop || typeof drop !== 'object') {
      pushIssue(errors, dropScope, 'drop 必須是物件。');
      return;
    }

    if (Number(drop.weight || 0) <= 0) pushIssue(errors, dropScope, 'weight 必須大於 0。');
    if (Number(drop.qty || 0) <= 0) pushIssue(errors, dropScope, 'qty 必須大於 0。');

    const itemId = drop.itemId || (drop.kind === 'item' ? drop.id : null);
    const fairyId = drop.kind === 'fairy' ? drop.id : null;

    if (itemId && !hasOwn(GameDB.items, itemId)) pushIssue(errors, dropScope, `itemId ${itemId} 不存在。`);
    if (fairyId && !hasOwn(GameDB.fairies, fairyId)) pushIssue(errors, dropScope, `fairyId ${fairyId} 不存在。`);
    if (!itemId && !fairyId) pushIssue(errors, dropScope, '缺少 itemId，或缺少有效 kind/id。');
  });
}

function validateGatherTables(errors) {
  Object.entries(GameDB.gatherTables || {}).forEach(([locationId, table]) => {
    const scope = `gatherTables.${locationId}`;
    if (!hasOwn(GameDB.scenes, locationId)) pushIssue(errors, scope, '採集地點沒有登錄在 GameDB.scenes。');
    if (!table || typeof table !== 'object') {
      pushIssue(errors, scope, '採集表必須是物件。');
      return;
    }
    validateDrops(errors, table.drops, `${scope}.drops`);
  });
}

function validateGachaPools(errors) {
  Object.entries(GameDB.gachaPools || {}).forEach(([poolId, pool]) => {
    const scope = `gachaPools.${poolId}`;
    if (!pool || typeof pool !== 'object') {
      pushIssue(errors, scope, '祈願池必須是物件。');
      return;
    }
    validateDrops(errors, pool.drops, `${scope}.drops`);
  });
}

function validateItemMap(errors, map = {}, scope = 'itemMap') {
  Object.entries(map || {}).forEach(([itemId, qty]) => {
    if (!hasOwn(GameDB.items, itemId)) pushIssue(errors, scope, `item ${itemId} 不存在。`);
    if (Number(qty || 0) <= 0) pushIssue(errors, scope, `item ${itemId} 的數量必須大於 0。`);
  });
}

function validateCurrencyMap(errors, map = {}, scope = 'currencyMap') {
  Object.entries(map || {}).forEach(([currencyId, amount]) => {
    if (!hasOwn(GameDB.currencies, currencyId)) pushIssue(errors, scope, `currency ${currencyId} 不存在。`);
    if (Number(amount || 0) <= 0) pushIssue(errors, scope, `currency ${currencyId} 的數量必須大於 0。`);
  });
}

function validateFairyMap(errors, map = {}, scope = 'fairyMap') {
  Object.keys(map || {}).forEach((fairyId) => {
    if (!hasOwn(GameDB.fairies, fairyId)) pushIssue(errors, scope, `fairy ${fairyId} 不存在。`);
  });
}

function validateCommissions(errors) {
  Object.entries(GameDB.commissions || {}).forEach(([questId, quest]) => {
    const scope = `commissions.${questId}`;
    if (!quest || typeof quest !== 'object') {
      pushIssue(errors, scope, '委託必須是物件。');
      return;
    }

    if (quest.id !== questId) pushIssue(errors, scope, `quest.id 應為 ${questId}，目前是 ${quest.id || '空值'}。`);
    validateItemMap(errors, quest.cost || quest.requiredItems || {}, `${scope}.requirements`);
    validateCurrencyMap(errors, quest.reward?.currencies, `${scope}.reward.currencies`);
    validateItemMap(errors, quest.reward?.items, `${scope}.reward.items`);
    validateFairyMap(errors, quest.reward?.fairies, `${scope}.reward.fairies`);
  });
}

function validateDailyRewards(errors) {
  (GameDB.dailyRewards || []).forEach((reward, index) => {
    const scope = `dailyRewards[${index}]`;
    validateCurrencyMap(errors, reward.currencies, `${scope}.currencies`);
    validateItemMap(errors, reward.items, `${scope}.items`);
    validateFairyMap(errors, reward.fairies, `${scope}.fairies`);
  });
}

export function validateGameDB() {
  const errors = [];
  const warnings = [];

  validateEnum(errors, GameDB.itemTypes, 'itemTypes');
  validateEnum(errors, GameDB.rarities, 'rarities');
  validateItemTypeMeta(errors);
  validateRegistry(errors, GameDB.routes, 'routes');
  validateRegistry(errors, GameDB.scenes, 'scenes');
  validateRegistry(errors, GameDB.stations, 'stations');
  validateItems(errors);
  validateFairies(errors);
  validateItemSources(errors, warnings);
  validateGatherTables(errors);
  validateGachaPools(errors);
  validateCommissions(errors);
  validateDailyRewards(errors);

  const result = {
    ok: errors.length === 0,
    errors,
    warnings,
  };

  if (!result.ok || warnings.length) {
    console.groupCollapsed(`[GameDB Validator] ${errors.length} errors, ${warnings.length} warnings`);
    errors.forEach((message) => console.error(message));
    warnings.forEach((message) => console.warn(message));
    console.groupEnd();
  }

  return result;
}
