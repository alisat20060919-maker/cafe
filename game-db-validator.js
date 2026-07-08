import { GameDB } from '@db';

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record || {}, key);
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
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

    if (!isRecord(meta)) {
      pushIssue(errors, scope, '缺少分類 meta。');
      return;
    }

    if (meta.id !== typeId) pushIssue(errors, scope, `id 應為 ${typeId}，目前是 ${meta.id || '空值'}。`);
    if (!meta.label) pushIssue(errors, scope, '缺少 label。');
  });
}

function validateItemRoleTypes(errors) {
  const checkTypes = (values = [], scope) => {
    validateEnum(errors, values, scope);
    values.forEach((typeId) => {
      if (!GameDB.itemTypes?.includes(typeId)) pushIssue(errors, scope, `${typeId} 必須先登錄在 GameDB.itemTypes。`);
    });
  };

  checkTypes(GameDB.materialTypes, 'materialTypes');
  checkTypes(GameDB.productTypes, 'productTypes');

  const overlap = (GameDB.materialTypes || []).filter((typeId) => (GameDB.productTypes || []).includes(typeId));
  if (overlap.length) pushIssue(errors, 'itemRoles', `原料分類與產品分類不可重疊：${overlap.join(', ')}。`);

  Object.entries(GameDB.items || {}).forEach(([itemId, item]) => {
    const role = GameDB.getItemRole?.(item);
    if (!['material', 'product'].includes(role)) {
      pushIssue(errors, `items.${itemId}`, `item.type ${item?.type || '空值'} 未被歸類為 material 或 product。`);
    }
  });
}

function validateRarityMeta(errors) {
  (GameDB.rarities || []).forEach((rarityId) => {
    const meta = GameDB.rarityMeta?.[rarityId];
    const scope = `rarityMeta.${rarityId}`;

    if (!isRecord(meta)) {
      pushIssue(errors, scope, '缺少稀有度 meta。');
      return;
    }

    if (meta.id !== rarityId) pushIssue(errors, scope, `id 應為 ${rarityId}，目前是 ${meta.id || '空值'}。`);
    if (!meta.label) pushIssue(errors, scope, '缺少 label。');
  });
}

function validateRegistry(errors, registry = {}, scope = 'registry') {
  Object.entries(registry || {}).forEach(([id, entry]) => {
    if (!isRecord(entry)) {
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
    if (!isRecord(item)) {
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

    if (item.tier !== undefined) {
      const tier = Number(item.tier);
      if (!Number.isInteger(tier) || tier <= 0) pushIssue(errors, `items.${itemId}`, 'tier 必須是正整數。');
    }
  });
}

function validateFairies(errors) {
  Object.entries(GameDB.fairies || {}).forEach(([fairyId, fairy]) => {
    if (!isRecord(fairy)) {
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
    if (!isRecord(source)) {
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
    if (!isRecord(drop)) {
      pushIssue(errors, dropScope, 'drop 必須是物件。');
      return;
    }

    if (Number(drop.weight || 0) <= 0) pushIssue(errors, dropScope, 'weight 必須大於 0。');
    if (Number(drop.qty || 0) <= 0) pushIssue(errors, dropScope, 'qty 必須大於 0。');

    const itemId = drop.itemId || (drop.kind === 'item' ? drop.id : null);
    const fairyId = drop.kind === 'fairy' ? drop.id : null;

    if (itemId && !hasOwn(GameDB.items, itemId)) {
      pushIssue(errors, dropScope, `itemId ${itemId} 不存在。`);
    } else if (itemId && scope.startsWith('gatherTables.') && Number(GameDB.items[itemId]?.tier || 0) >= 3) {
      pushIssue(errors, dropScope, `三階素材 ${itemId} 不可放進普通採集掉落。`);
    }

    if (fairyId && !hasOwn(GameDB.fairies, fairyId)) pushIssue(errors, dropScope, `fairyId ${fairyId} 不存在。`);
    if (!itemId && !fairyId) pushIssue(errors, dropScope, '缺少 itemId，或缺少有效 kind/id。');
  });
}

function validateSpecialEvents(errors, events = [], scope = 'specialEvents') {
  if (!Array.isArray(events)) {
    pushIssue(errors, scope, 'specialEvents 必須是陣列。');
    return;
  }

  if (!events.length) return;

  const totalWeight = events.reduce((sum, event) => sum + Number(event.weight || 0), 0);
  if (totalWeight <= 0) pushIssue(errors, scope, '特殊事件權重總和必須大於 0。');

  events.forEach((event, index) => {
    const eventScope = `${scope}[${index}]`;
    if (!isRecord(event)) {
      pushIssue(errors, eventScope, 'event 必須是物件。');
      return;
    }

    if (!event.id) pushIssue(errors, eventScope, '缺少 id。');
    if (!event.title) pushIssue(errors, eventScope, '缺少 title。');
    if (!event.message) pushIssue(errors, eventScope, '缺少 message。');
    if (Number(event.weight || 0) <= 0) pushIssue(errors, eventScope, 'weight 必須大於 0。');
    validateItemMap(errors, event.bonus?.items || {}, `${eventScope}.bonus.items`);
  });
}

function validateGatherTables(errors) {
  Object.entries(GameDB.gatherTables || {}).forEach(([locationId, table]) => {
    const scope = `gatherTables.${locationId}`;
    if (!hasOwn(GameDB.scenes, locationId)) pushIssue(errors, scope, '採集地點沒有登錄在 GameDB.scenes。');
    if (!isRecord(table)) {
      pushIssue(errors, scope, '採集表必須是物件。');
      return;
    }
    validateDrops(errors, table.drops, `${scope}.drops`);
    validateSpecialEvents(errors, table.specialEvents || [], `${scope}.specialEvents`);
  });
}

function validateGachaPools(errors) {
  Object.entries(GameDB.gachaPools || {}).forEach(([poolId, pool]) => {
    const scope = `gachaPools.${poolId}`;
    if (!isRecord(pool)) {
      pushIssue(errors, scope, '祈願池必須是物件。');
      return;
    }
    validateDrops(errors, pool.drops, `${scope}.drops`);
  });
}

function validateObjectMap(errors, map, scope) {
  if (map === undefined || map === null) return false;
  if (!isRecord(map)) {
    pushIssue(errors, scope, '必須是物件。');
    return false;
  }
  return true;
}

function validateItemMap(errors, map = {}, scope = 'itemMap') {
  if (!validateObjectMap(errors, map, scope)) return;
  Object.entries(map || {}).forEach(([itemId, qty]) => {
    if (!hasOwn(GameDB.items, itemId)) pushIssue(errors, scope, `item ${itemId} 不存在。`);
    if (Number(qty || 0) <= 0) pushIssue(errors, scope, `item ${itemId} 的數量必須大於 0。`);
  });
}

function validateCurrencyMap(errors, map = {}, scope = 'currencyMap') {
  if (!validateObjectMap(errors, map, scope)) return;
  Object.entries(map || {}).forEach(([currencyId, amount]) => {
    if (!hasOwn(GameDB.currencies, currencyId)) pushIssue(errors, scope, `currency ${currencyId} 不存在。`);
    if (Number(amount || 0) <= 0) pushIssue(errors, scope, `currency ${currencyId} 的數量必須大於 0。`);
  });
}

function validateExpReward(errors, exp, scope = 'reward.exp') {
  if (exp === undefined || exp === null) return false;
  const value = Number(exp);
  if (!Number.isFinite(value) || value <= 0) {
    pushIssue(errors, scope, 'exp 必須是大於 0 的數字。');
    return false;
  }
  return true;
}

function validateFairyMap(errors, map = {}, scope = 'fairyMap') {
  if (!validateObjectMap(errors, map, scope)) return;
  Object.entries(map || {}).forEach(([fairyId, value]) => {
    if (!hasOwn(GameDB.fairies, fairyId)) pushIssue(errors, scope, `fairy ${fairyId} 不存在。`);
    if (![true, 1, 'owned'].includes(value) && !isRecord(value)) {
      pushIssue(errors, scope, `fairy ${fairyId} 的值必須是 true、1、'owned' 或物件。`);
    }
  });
}

function validateRewardObject(errors, reward, scope = 'reward') {
  if (!isRecord(reward)) {
    pushIssue(errors, scope, 'reward 必須是物件。');
    return;
  }

  const allowedKeys = ['exp', 'currencies', 'items', 'fairies'];
  Object.keys(reward).forEach((key) => {
    if (!allowedKeys.includes(key)) pushIssue(errors, scope, `未知 reward 欄位：${key}。`);
  });

  const hasExp = Number(reward.exp || 0) > 0;
  const hasCurrencies = isRecord(reward.currencies) && Object.keys(reward.currencies).length > 0;
  const hasItems = isRecord(reward.items) && Object.keys(reward.items).length > 0;
  const hasFairies = isRecord(reward.fairies) && Object.keys(reward.fairies).length > 0;
  if (!hasExp && !hasCurrencies && !hasItems && !hasFairies) pushIssue(errors, scope, 'reward 至少需要 exp、currencies、items 或 fairies 其中一種獎勵。');

  validateExpReward(errors, reward.exp, `${scope}.exp`);
  validateCurrencyMap(errors, reward.currencies, `${scope}.currencies`);
  validateItemMap(errors, reward.items, `${scope}.items`);
  validateFairyMap(errors, reward.fairies, `${scope}.fairies`);
}

function validateRewardFields(errors, reward = {}, scope = 'reward') {
  const hasExp = Number(reward.exp || 0) > 0;
  const hasCurrencies = isRecord(reward.currencies) && Object.keys(reward.currencies).length > 0;
  const hasItems = isRecord(reward.items) && Object.keys(reward.items).length > 0;
  const hasFairies = isRecord(reward.fairies) && Object.keys(reward.fairies).length > 0;
  if (!hasExp && !hasCurrencies && !hasItems && !hasFairies) pushIssue(errors, scope, '至少需要 exp、currencies、items 或 fairies 其中一種獎勵。');
  validateExpReward(errors, reward.exp, `${scope}.exp`);
  validateCurrencyMap(errors, reward.currencies, `${scope}.currencies`);
  validateItemMap(errors, reward.items, `${scope}.items`);
  validateFairyMap(errors, reward.fairies, `${scope}.fairies`);
}

function validateRangeRule(errors, range, scope) {
  if (!isRecord(range)) {
    pushIssue(errors, scope, '必須是 { min, max } 物件。');
    return;
  }

  const min = Number(range.min);
  const max = Number(range.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) pushIssue(errors, scope, 'min / max 必須是數字。');
  if (min < 0 || max < 0) pushIssue(errors, scope, 'min / max 不可小於 0。');
  if (max < min) pushIssue(errors, scope, 'max 不可小於 min。');
}

function validateLevelConfig(errors) {
  const config = GameDB.levelConfig;
  const scope = 'levelConfig';
  if (!isRecord(config)) {
    pushIssue(errors, scope, '缺少等級設定。');
    return;
  }

  if (!Number.isInteger(Number(config.maxLevel)) || Number(config.maxLevel) <= 0) {
    pushIssue(errors, `${scope}.maxLevel`, 'maxLevel 必須是正整數。');
  }

  if (!isRecord(config.thresholds)) {
    pushIssue(errors, `${scope}.thresholds`, 'thresholds 必須是物件。');
  } else {
    Object.entries(config.thresholds).forEach(([level, exp]) => {
      if (!Number.isInteger(Number(level)) || Number(level) <= 0) pushIssue(errors, `${scope}.thresholds`, `level ${level} 必須是正整數。`);
      if (!Number.isFinite(Number(exp)) || Number(exp) < 0) pushIssue(errors, `${scope}.thresholds.${level}`, '門檻 EXP 必須是大於等於 0 的數字。');
    });
  }

  Object.entries(config.unlocks || {}).forEach(([level, unlocks]) => {
    const unlockScope = `${scope}.unlocks.${level}`;
    if (!Number.isInteger(Number(level)) || Number(level) <= 0) pushIssue(errors, unlockScope, '解鎖等級必須是正整數。');
    if (!isRecord(unlocks)) {
      pushIssue(errors, unlockScope, '解鎖資料必須是物件。');
      return;
    }
    if (unlocks.scenes !== undefined && !Array.isArray(unlocks.scenes)) pushIssue(errors, `${unlockScope}.scenes`, 'scenes 必須是陣列。');
    (unlocks.scenes || []).forEach((sceneId) => {
      if (!hasOwn(GameDB.scenes, sceneId)) pushIssue(errors, `${unlockScope}.scenes`, `scene ${sceneId} 不存在。`);
    });
  });
}

function validateCommissionBalanceConfig(errors) {
  const config = GameDB.commissionConfig;
  const scope = 'commissionConfig';
  if (!isRecord(config)) {
    pushIssue(errors, scope, '缺少委託平衡設定。');
    return;
  }

  const dailyCount = Number(config.dailyCount);
  if (!Number.isInteger(dailyCount) || dailyCount <= 0) pushIssue(errors, `${scope}.dailyCount`, '每日委託數量必須是正整數。');

  if (!isRecord(config.difficultyRules)) {
    pushIssue(errors, `${scope}.difficultyRules`, '難度規則必須是物件。');
    return;
  }

  Object.entries(config.difficultyRules).forEach(([difficulty, rule]) => {
    const ruleScope = `${scope}.difficultyRules.${difficulty}`;
    if (!isRecord(rule)) {
      pushIssue(errors, ruleScope, '難度規則必須是物件。');
      return;
    }

    if (!difficulty.includes('★')) pushIssue(errors, ruleScope, 'difficulty key 應使用星級字串。');
    if (!Number.isInteger(Number(rule.rank)) || Number(rule.rank) <= 0) pushIssue(errors, `${ruleScope}.rank`, 'rank 必須是正整數。');
    if (!rule.label) pushIssue(errors, `${ruleScope}.label`, '缺少 label。');
    validateRangeRule(errors, rule.requiredProductQty, `${ruleScope}.requiredProductQty`);

    if (!isRecord(rule.reward)) {
      pushIssue(errors, `${ruleScope}.reward`, 'reward 區間必須是物件。');
      return;
    }

    Object.entries(rule.reward).forEach(([rewardId, range]) => {
      if (rewardId !== 'exp' && !hasOwn(GameDB.currencies, rewardId)) pushIssue(errors, `${ruleScope}.reward`, `currency ${rewardId} 不存在。`);
      validateRangeRule(errors, range, `${ruleScope}.reward.${rewardId}`);
    });
  });
}

function validateRecipeOutput(errors, output = {}, scope = 'recipe.output') {
  if (!isRecord(output)) {
    pushIssue(errors, scope, 'output 必須是物件。');
    return;
  }

  if (!output.itemId) {
    pushIssue(errors, scope, '缺少 itemId。');
  } else if (!hasOwn(GameDB.items, output.itemId)) {
    pushIssue(errors, scope, `output.itemId ${output.itemId} 不存在。`);
  }

  if (Number(output.qty || 0) <= 0) pushIssue(errors, scope, 'output.qty 必須大於 0。');
}

function validateRecipes(errors) {
  Object.entries(GameDB.recipes || {}).forEach(([recipeId, recipe]) => {
    const scope = `recipes.${recipeId}`;
    if (!isRecord(recipe)) {
      pushIssue(errors, scope, 'recipe 必須是物件。');
      return;
    }

    if (recipe.id !== recipeId) pushIssue(errors, scope, `recipe.id 應為 ${recipeId}，目前是 ${recipe.id || '空值'}。`);
    if (!recipe.name) pushIssue(errors, scope, '缺少 name。');
    if (!recipe.station) {
      pushIssue(errors, scope, '缺少 station。');
    } else if (!hasOwn(GameDB.stations, recipe.station)) {
      pushIssue(errors, scope, `station ${recipe.station} 不存在。`);
    }

    if (!recipe.category) pushIssue(errors, scope, '缺少 category。');
    validateItemMap(errors, recipe.cost || {}, `${scope}.cost`);
    validateRecipeOutput(errors, recipe.output, `${scope}.output`);
  });
}

function getRecipeOutputId(recipe) {
  return recipe?.output?.itemId || null;
}

function validateKitchenProductWorkflow(errors) {
  const kitchenRecipes = Object.values(GameDB.recipes || {}).filter((recipe) => recipe.station === 'kitchen');
  const kitchenOutputIds = new Set(kitchenRecipes.map(getRecipeOutputId).filter(Boolean));

  if (!kitchenRecipes.length) {
    pushIssue(errors, 'recipes.kitchen', '廚房至少需要一個產品配方。');
    return;
  }

  kitchenRecipes.forEach((recipe) => {
    const scope = `recipes.${recipe.id || 'unknown'}`;
    const outputId = getRecipeOutputId(recipe);
    if (!outputId || !hasOwn(GameDB.items, outputId)) return;

    if (!GameDB.isProductItem(outputId)) {
      pushIssue(errors, `${scope}.output`, `廚房配方必須產出產品類 item，目前 ${outputId} 不是產品。`);
    }

    if (recipe.category && !GameDB.productTypes?.includes(recipe.category)) {
      pushIssue(errors, `${scope}.category`, `廚房配方 category 必須是產品分類，目前是 ${recipe.category}。`);
    }

    const source = GameDB.getItemSource?.(outputId);
    if (!source || source.type !== 'station' || source.id !== 'kitchen') {
      pushIssue(errors, `${scope}.output`, `廚房產品 ${outputId} 的 itemSources 必須指向 station:kitchen。`);
    }
  });

  Object.entries(GameDB.commissions || {}).forEach(([questId, quest]) => {
    Object.keys(GameDB.getCommissionRequiredItems?.(quest) || {}).forEach((itemId) => {
      const source = GameDB.getItemSource?.(itemId);
      if (source?.type === 'station' && source.id === 'kitchen' && !kitchenOutputIds.has(itemId)) {
        pushIssue(errors, `commissions.${questId}.requiredItems`, `委託需要的廚房產品 ${itemId} 沒有對應的 kitchen recipe。`);
      }
    });
  });
}

function validateCommissionProductSource(errors, itemId, scope) {
  const source = GameDB.getItemSource?.(itemId);
  if (!source || source.type !== 'station') {
    pushIssue(errors, scope, `${itemId} 是委託要求的產品，來源必須指向製作站 station。`);
    return;
  }

  if (!hasOwn(GameDB.stations, source.id)) {
    pushIssue(errors, scope, `${itemId} 指向的製作站 ${source.id || '空值'} 沒有登錄在 GameDB.stations。`);
  }
}

function getRequirementTotal(requirements = {}) {
  return Object.values(requirements).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function validateCommissionBalance(errors, quest, scope) {
  const rule = GameDB.getCommissionDifficultyRule?.(quest);
  if (!rule) {
    pushIssue(errors, `${scope}.difficulty`, `未知委託難度：${quest.difficulty || '空值'}。`);
    return;
  }

  const totalRequired = getRequirementTotal(GameDB.getCommissionRequiredItems?.(quest) || {});
  const minRequired = Number(rule.requiredProductQty?.min ?? 0);
  const maxRequired = Number(rule.requiredProductQty?.max ?? Number.POSITIVE_INFINITY);
  if (totalRequired < minRequired || totalRequired > maxRequired) {
    pushIssue(errors, `${scope}.requiredItems`, `${quest.difficulty} 需求總數應在 ${minRequired}～${maxRequired} 之間，目前是 ${totalRequired}。`);
  }

  Object.entries(rule.reward || {}).forEach(([rewardId, range]) => {
    const amount = rewardId === 'exp'
      ? Number(quest.reward?.exp || 0)
      : Number(quest.reward?.currencies?.[rewardId] || 0);
    const min = Number(range.min ?? 0);
    const max = Number(range.max ?? 0);
    if (amount < min || amount > max) {
      pushIssue(errors, `${scope}.reward`, `${quest.difficulty} 的 ${rewardId} 獎勵應在 ${min}～${max} 之間，目前是 ${amount}。`);
    }
  });
}

function validateCommissionRequirements(errors, warnings, quest, scope) {
  const requirements = GameDB.getCommissionRequiredItems?.(quest) || {};
  if (!Object.keys(requirements).length) {
    pushIssue(errors, scope, '缺少 requiredItems 或舊 cost 需求。');
    return;
  }

  if (!quest.requiredItems && quest.cost) {
    pushIssue(warnings, scope, '仍使用舊 cost 欄位；建議改用 requiredItems。');
  }

  validateItemMap(errors, requirements, `${scope}.requiredItems`);

  if (quest.requiredItems) {
    Object.keys(quest.requiredItems).forEach((itemId) => {
      if (hasOwn(GameDB.items, itemId) && !GameDB.isProductItem(itemId)) {
        pushIssue(errors, `${scope}.requiredItems`, `requiredItems 只能要求產品類 item，目前 ${itemId} 不是產品。`);
      }

      if (hasOwn(GameDB.items, itemId) && GameDB.isProductItem(itemId)) {
        validateCommissionProductSource(errors, itemId, `${scope}.requiredItems`);
      }
    });
  }
}

function validateCommissions(errors, warnings) {
  Object.entries(GameDB.commissions || {}).forEach(([questId, quest]) => {
    const scope = `commissions.${questId}`;
    if (!isRecord(quest)) {
      pushIssue(errors, scope, '委託必須是物件。');
      return;
    }

    if (quest.id !== questId) pushIssue(errors, scope, `quest.id 應為 ${questId}，目前是 ${quest.id || '空值'}。`);
    validateCommissionRequirements(errors, warnings, quest, scope);
    validateRewardObject(errors, quest.reward, `${scope}.reward`);
    validateCommissionBalance(errors, quest, scope);
  });
}

function validateDailyRewards(errors) {
  (GameDB.dailyRewards || []).forEach((reward, index) => {
    validateRewardFields(errors, reward, `dailyRewards[${index}]`);
  });
}

export function validateGameDB() {
  const errors = [];
  const warnings = [];

  validateEnum(errors, GameDB.itemTypes, 'itemTypes');
  validateEnum(errors, GameDB.rarities, 'rarities');
  validateItemTypeMeta(errors);
  validateItemRoleTypes(errors);
  validateRarityMeta(errors);
  validateRegistry(errors, GameDB.routes, 'routes');
  validateRegistry(errors, GameDB.scenes, 'scenes');
  validateRegistry(errors, GameDB.stations, 'stations');
  validateItems(errors);
  validateFairies(errors);
  validateItemSources(errors, warnings);
  validateGatherTables(errors);
  validateGachaPools(errors);
  validateRecipes(errors);
  validateLevelConfig(errors);
  validateCommissionBalanceConfig(errors);
  validateCommissions(errors, warnings);
  validateKitchenProductWorkflow(errors);
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
