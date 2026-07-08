import { GameDB } from '@db';

function addIssue(issues, scope, message) {
  issues.push(`[${scope}] ${message}`);
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getRecipeForOutput(itemId) {
  return Object.values(GameDB.recipes || {}).find((recipe) => recipe.output?.itemId === itemId) || null;
}

function assertSceneExists(issues, sceneId, scope) {
  if (!GameDB.scenes?.[sceneId]) addIssue(issues, scope, `缺少場景：${sceneId}`);
}

function assertStationExists(issues, stationId, scope) {
  if (!GameDB.stations?.[stationId]) addIssue(issues, scope, `缺少製作站：${stationId}`);
}

function validateGatherInputs(issues) {
  ['backyard', 'greenhouse'].forEach((sceneId) => {
    const table = GameDB.gatherTables?.[sceneId];
    assertSceneExists(issues, sceneId, `gather.${sceneId}`);
    if (!isRecord(table)) {
      addIssue(issues, `gather.${sceneId}`, '缺少採集表。');
      return;
    }

    if (!Array.isArray(table.drops) || !table.drops.length) {
      addIssue(issues, `gather.${sceneId}`, '採集表沒有 drops。');
      return;
    }

    table.drops.forEach((drop, index) => {
      if (!GameDB.items?.[drop.itemId]) addIssue(issues, `gather.${sceneId}.drops[${index}]`, `掉落 item 不存在：${drop.itemId}`);
    });
  });
}

function validateKitchenProducts(issues) {
  assertStationExists(issues, 'kitchen', 'stations.kitchen');

  Object.values(GameDB.commissions || {}).forEach((commission) => {
    Object.keys(GameDB.getCommissionRequiredItems?.(commission) || {}).forEach((itemId) => {
      const item = GameDB.items?.[itemId];
      const scope = `commissions.${commission.id}.requiredItems.${itemId}`;
      if (!item) {
        addIssue(issues, scope, '委託要求的產品不存在。');
        return;
      }

      if (!GameDB.isProductItem?.(itemId)) addIssue(issues, scope, '委託要求必須是產品類 item。');

      const recipe = getRecipeForOutput(itemId);
      if (!recipe) {
        addIssue(issues, scope, '委託要求的產品沒有對應配方。');
        return;
      }

      if (!GameDB.stations?.[recipe.station]) addIssue(issues, `recipes.${recipe.id}.station`, `配方製作站不存在：${recipe.station}`);
      if (recipe.station === 'kitchen' && !GameDB.productTypes?.includes(recipe.category)) {
        addIssue(issues, `recipes.${recipe.id}.category`, '廚房配方 category 應該是產品分類。');
      }

      Object.keys(recipe.cost || {}).forEach((costItemId) => {
        if (!GameDB.items?.[costItemId]) addIssue(issues, `recipes.${recipe.id}.cost.${costItemId}`, '配方素材不存在。');
      });
    });
  });
}

function validateCommissionRewards(issues) {
  Object.values(GameDB.commissions || {}).forEach((commission) => {
    const reward = commission.reward || {};
    const scope = `commissions.${commission.id}.reward`;
    if (Number(reward.exp || 0) <= 0) addIssue(issues, scope, 'MVP 委託應提供 EXP，才能推進升等解鎖。');
    if (!isRecord(reward.currencies) || !Object.keys(reward.currencies).length) addIssue(issues, scope, 'MVP 委託應提供貨幣獎勵。');
  });
}

function validateLevelUnlocks(issues) {
  const lv2Unlocks = GameDB.getLevelUnlocksFor?.(2) || {};
  if (!Array.isArray(lv2Unlocks.scenes) || !lv2Unlocks.scenes.includes('alchemy')) {
    addIssue(issues, 'levelConfig.unlocks.2', 'Lv.2 必須解鎖 alchemy，才能完成 MVP 解鎖循環。');
  }

  if (GameDB.getLevelByExp?.(60) < 2) addIssue(issues, 'levelConfig.thresholds', '60 EXP 應至少到 Lv.2。');
}

export function runMvpSmokeTest() {
  const issues = [];

  validateGatherInputs(issues);
  validateKitchenProducts(issues);
  validateCommissionRewards(issues);
  validateLevelUnlocks(issues);

  const result = {
    ok: issues.length === 0,
    issues,
  };

  if (!result.ok) {
    console.groupCollapsed(`[MVP Smoke Test] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
  } else {
    console.info('[MVP Smoke Test] ok');
  }

  return result;
}
