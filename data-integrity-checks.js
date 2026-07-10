import { GameDB } from '@db';
import { getState } from '@state';

function shouldRunChecks() {
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === '1'
    || params.get('checks') === '1'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function addIssue(issues, scope, message, severity = 'error') {
  issues.push({ scope, message, severity });
}

function hasEntry(registry, id) {
  return Boolean(id) && Object.prototype.hasOwnProperty.call(registry || {}, id);
}

function validateItemMap(issues, map, scope) {
  if (map === undefined || map === null) return;
  if (!isRecord(map)) {
    addIssue(issues, scope, '必須是 itemId 對數量的物件。');
    return;
  }
  Object.entries(map).forEach(([itemId, qty]) => {
    if (!hasEntry(GameDB.items, itemId)) addIssue(issues, `${scope}.${itemId}`, '引用了不存在的物品。');
    if (!Number.isFinite(Number(qty)) || Number(qty) <= 0) addIssue(issues, `${scope}.${itemId}`, '數量必須大於 0。');
  });
}

function validateCurrencyMap(issues, map, scope) {
  if (map === undefined || map === null) return;
  if (!isRecord(map)) {
    addIssue(issues, scope, '必須是 currencyId 對數量的物件。');
    return;
  }
  Object.entries(map).forEach(([currencyId, amount]) => {
    if (!hasEntry(GameDB.currencies, currencyId)) addIssue(issues, `${scope}.${currencyId}`, '引用了不存在的貨幣。');
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) addIssue(issues, `${scope}.${currencyId}`, '數量必須大於 0。');
  });
}

function validateFairyMap(issues, map, scope) {
  if (map === undefined || map === null) return;
  if (!isRecord(map)) {
    addIssue(issues, scope, '必須是 fairyId 對資料的物件。');
    return;
  }
  Object.keys(map).forEach((fairyId) => {
    if (!hasEntry(GameDB.fairies, fairyId)) addIssue(issues, `${scope}.${fairyId}`, '引用了不存在的精靈。');
  });
}

function validateItems(issues) {
  const names = new Map();
  Object.entries(GameDB.items || {}).forEach(([itemId, item]) => {
    if (!isRecord(item)) {
      addIssue(issues, `items.${itemId}`, '物品資料不是物件。');
      return;
    }
    if (item.id !== itemId) addIssue(issues, `items.${itemId}.id`, `內部 id 必須是 ${itemId}。`);
    if (!item.name) addIssue(issues, `items.${itemId}.name`, '缺少名稱。');
    if (item.name) {
      const prior = names.get(item.name);
      if (prior && prior !== itemId) addIssue(issues, `items.${itemId}.name`, `與 ${prior} 使用相同名稱「${item.name}」。`, 'warning');
      names.set(item.name, itemId);
    }
  });
}

function validateRecipes(issues) {
  Object.entries(GameDB.recipes || {}).forEach(([recipeId, recipe]) => {
    if (!isRecord(recipe)) {
      addIssue(issues, `recipes.${recipeId}`, '配方資料不是物件。');
      return;
    }
    if (recipe.id && recipe.id !== recipeId) addIssue(issues, `recipes.${recipeId}.id`, `內部 id 必須是 ${recipeId}。`);
    validateItemMap(issues, recipe.cost || recipe.ingredients, `recipes.${recipeId}.cost`);
    const outputId = recipe.output?.itemId || recipe.outputId;
    if (!outputId) addIssue(issues, `recipes.${recipeId}.output`, '缺少輸出物品 ID。');
    else if (!hasEntry(GameDB.items, outputId)) addIssue(issues, `recipes.${recipeId}.output.${outputId}`, '輸出物品不存在。');
    const outputQty = Number(recipe.output?.qty ?? recipe.outputQty ?? 1);
    if (!Number.isFinite(outputQty) || outputQty <= 0) addIssue(issues, `recipes.${recipeId}.output.qty`, '輸出數量必須大於 0。');
    if (recipe.station && !hasEntry(GameDB.stations, recipe.station)) addIssue(issues, `recipes.${recipeId}.station`, `製作站 ${recipe.station} 不存在。`);
  });
}

function validateGatherTables(issues) {
  Object.entries(GameDB.gatherTables || {}).forEach(([locationId, table]) => {
    if (!hasEntry(GameDB.scenes, locationId)) addIssue(issues, `gatherTables.${locationId}`, '沒有對應場景。');
    if (!Array.isArray(table?.drops) || !table.drops.length) {
      addIssue(issues, `gatherTables.${locationId}.drops`, '採集表至少要有一個掉落。');
    } else {
      table.drops.forEach((drop, index) => {
        const scope = `gatherTables.${locationId}.drops[${index}]`;
        if (!hasEntry(GameDB.items, drop?.itemId)) addIssue(issues, `${scope}.itemId`, `物品 ${drop?.itemId || '空值'} 不存在。`);
        if (!Number.isFinite(Number(drop?.weight)) || Number(drop.weight) <= 0) addIssue(issues, `${scope}.weight`, '權重必須大於 0。');
        if (drop?.qty !== undefined && (!Number.isFinite(Number(drop.qty)) || Number(drop.qty) <= 0)) addIssue(issues, `${scope}.qty`, '數量必須大於 0。');
      });
    }
    (table?.specialEvents || []).forEach((event, index) => {
      validateItemMap(issues, event?.bonus?.items, `gatherTables.${locationId}.specialEvents[${index}].bonus.items`);
    });
  });
}

function getCommissionRequirements(commission) {
  return GameDB.getCommissionRequiredItems?.(commission)
    || commission.requiredItems
    || commission.requirements
    || {};
}

function validateCommissions(issues) {
  Object.entries(GameDB.commissions || {}).forEach(([commissionId, commission]) => {
    if (!isRecord(commission)) {
      addIssue(issues, `commissions.${commissionId}`, '委託資料不是物件。');
      return;
    }
    if (commission.id && commission.id !== commissionId) addIssue(issues, `commissions.${commissionId}.id`, `內部 id 必須是 ${commissionId}。`);
    validateItemMap(issues, getCommissionRequirements(commission), `commissions.${commissionId}.requirements`);
    validateItemMap(issues, commission.reward?.items, `commissions.${commissionId}.reward.items`);
    validateCurrencyMap(issues, commission.reward?.currencies, `commissions.${commissionId}.reward.currencies`);
    validateFairyMap(issues, commission.reward?.fairies, `commissions.${commissionId}.reward.fairies`);
    validateFairyMap(issues, commission.reward?.affection, `commissions.${commissionId}.reward.affection`);
    if (commission.fairyId && !hasEntry(GameDB.fairies, commission.fairyId)) addIssue(issues, `commissions.${commissionId}.fairyId`, `精靈 ${commission.fairyId} 不存在。`);
  });
}

function validateFairies(issues) {
  Object.entries(GameDB.fairies || {}).forEach(([fairyId, fairy]) => {
    if (!isRecord(fairy)) {
      addIssue(issues, `fairies.${fairyId}`, '精靈資料不是物件。');
      return;
    }
    if (fairy.id !== fairyId) addIssue(issues, `fairies.${fairyId}.id`, `內部 id 必須是 ${fairyId}。`);
    if (!Array.isArray(fairy.favoriteSweets)) {
      addIssue(issues, `fairies.${fairyId}.favoriteSweets`, '必須是物品 ID 陣列。');
    } else {
      fairy.favoriteSweets.forEach((itemId, index) => {
        if (!hasEntry(GameDB.items, itemId)) addIssue(issues, `fairies.${fairyId}.favoriteSweets[${index}]`, `物品 ${itemId} 不存在。`);
        else if (GameDB.isGiftableItem && !GameDB.isGiftableItem(itemId)) addIssue(issues, `fairies.${fairyId}.favoriteSweets[${index}]`, `${itemId} 目前不可送禮。`, 'warning');
      });
    }
  });
}

function validateGacha(issues) {
  const hardPityAt = Number(GameDB.gachaConfig?.hardPityAt || 0);
  if (!Number.isFinite(hardPityAt) || hardPityAt <= 0) addIssue(issues, 'gachaConfig.hardPityAt', '保底抽數必須大於 0。');
  Object.entries(GameDB.gachaPools || {}).forEach(([poolId, pool]) => {
    if (!Array.isArray(pool?.drops) || !pool.drops.length) addIssue(issues, `gachaPools.${poolId}.drops`, '祈願池不能是空的。');
    if (!hasEntry(GameDB.currencies, pool?.cost?.currency)) addIssue(issues, `gachaPools.${poolId}.cost.currency`, `貨幣 ${pool?.cost?.currency || '空值'} 不存在。`);
    if (!Number.isFinite(Number(pool?.cost?.amount)) || Number(pool.cost.amount) <= 0) addIssue(issues, `gachaPools.${poolId}.cost.amount`, '抽卡成本必須大於 0。');
    (pool?.drops || []).forEach((drop, index) => {
      const scope = `gachaPools.${poolId}.drops[${index}]`;
      if (!['item', 'fairy'].includes(drop?.kind)) addIssue(issues, `${scope}.kind`, `未知類型 ${drop?.kind || '空值'}。`);
      if (drop?.kind === 'item' && !hasEntry(GameDB.items, drop.id)) addIssue(issues, `${scope}.id`, `物品 ${drop.id} 不存在。`);
      if (drop?.kind === 'fairy' && !hasEntry(GameDB.fairies, drop.id)) addIssue(issues, `${scope}.id`, `精靈 ${drop.id} 不存在。`);
      if (!Number.isFinite(Number(drop?.weight)) || Number(drop.weight) <= 0) addIssue(issues, `${scope}.weight`, '權重必須大於 0。');
    });
  });
}

function validateShop(issues) {
  const shopItems = GameDB.shopItems || GameDB.shops?.items || {};
  Object.entries(shopItems).forEach(([shopItemId, shopItem]) => {
    const itemId = shopItem?.itemId || shopItemId;
    if (!hasEntry(GameDB.items, itemId)) addIssue(issues, `shopItems.${shopItemId}.itemId`, `物品 ${itemId} 不存在。`);
    if (!hasEntry(GameDB.currencies, shopItem?.price?.currency)) addIssue(issues, `shopItems.${shopItemId}.price.currency`, `貨幣 ${shopItem?.price?.currency || '空值'} 不存在。`);
    if (!Number.isFinite(Number(shopItem?.price?.amount)) || Number(shopItem.price.amount) <= 0) addIssue(issues, `shopItems.${shopItemId}.price.amount`, '價格必須大於 0。');
  });
}

function validateStateShape(issues) {
  const state = getState();
  if (!isRecord(state)) {
    addIssue(issues, 'state', '目前狀態不是物件。');
    return;
  }

  Object.entries(state.inventory || {}).forEach(([itemId, qty]) => {
    if (!hasEntry(GameDB.items, itemId)) addIssue(issues, `state.inventory.${itemId}`, '存檔含有不存在的物品 ID。', 'warning');
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0) addIssue(issues, `state.inventory.${itemId}`, '背包只能儲存非負數量，不可存整個物品物件。');
  });

  Object.entries(state.fairies || {}).forEach(([fairyId, record]) => {
    if (!hasEntry(GameDB.fairies, fairyId)) addIssue(issues, `state.fairies.${fairyId}`, '存檔含有不存在的精靈 ID。', 'warning');
    if (!isRecord(record)) {
      addIssue(issues, `state.fairies.${fairyId}`, '精靈狀態必須是簡單紀錄物件。');
      return;
    }
    const allowed = new Set(['owned', 'affection', 'obtainedAt']);
    Object.keys(record).forEach((key) => {
      if (!allowed.has(key)) addIssue(issues, `state.fairies.${fairyId}.${key}`, '疑似把 GameDB 精靈物件存進 state。');
    });
  });

  Object.entries(state.gathering || {}).forEach(([locationId, record]) => {
    if (!isRecord(record)) addIssue(issues, `state.gathering.${locationId}`, '採集紀錄必須是物件。');
    else if (typeof record.count !== 'number' || record.count < 0) addIssue(issues, `state.gathering.${locationId}.count`, '採集次數必須是非負數字。');
  });

  if (!Array.isArray(state.gachaHistory)) addIssue(issues, 'state.gachaHistory', '抽卡紀錄必須是陣列。');
  else {
    const allowed = new Set(['poolId', 'kind', 'id', 'qty', 'pityHit', 'pityCounterAfter', 'totalPullsAfter', 'at']);
    state.gachaHistory.forEach((record, index) => {
      if (!isRecord(record)) {
        addIssue(issues, `state.gachaHistory[${index}]`, '抽卡紀錄必須是簡單物件。');
        return;
      }
      Object.keys(record).forEach((key) => {
        if (!allowed.has(key)) addIssue(issues, `state.gachaHistory[${index}].${key}`, '抽卡紀錄只能存 ID 與基本型別。');
      });
    });
  }
}

function printResult(issues) {
  const errors = issues.filter((issue) => issue.severity !== 'warning');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  if (!issues.length) {
    console.info('[Data Integrity Check] ok');
    return { ok: true, errors: [], warnings: [] };
  }

  console.groupCollapsed(`[Data Integrity Check] ${errors.length} errors / ${warnings.length} warnings`);
  errors.forEach((issue) => console.error(`[${issue.scope}] ${issue.message}`));
  warnings.forEach((issue) => console.warn(`[${issue.scope}] ${issue.message}`));
  console.groupEnd();
  return { ok: errors.length === 0, errors, warnings };
}

export function runDataIntegrityChecks() {
  if (!shouldRunChecks()) return { skipped: true };
  const issues = [];
  validateItems(issues);
  validateRecipes(issues);
  validateGatherTables(issues);
  validateCommissions(issues);
  validateFairies(issues);
  validateGacha(issues);
  validateShop(issues);
  validateStateShape(issues);
  return { skipped: false, ...printResult(issues) };
}
