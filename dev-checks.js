import { GameDB } from '@db';
import { isUnlocked, getUnlockRequirementText } from '@state';
import { canCraft } from '@actions/craft';
import { isCommissionUnlocked, getCommissionUnlockText } from '@actions/commission';
import { validateGameDB } from '@validator';

function shouldRunDevChecks() {
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === '1'
    || params.get('checks') === '1'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function addIssue(issues, scope, message) {
  issues.push(`[${scope}] ${message}`);
}

function getRecipeForOutput(itemId) {
  return Object.values(GameDB.recipes || {}).find((recipe) => recipe.output?.itemId === itemId) || null;
}

function getMvpCommissions() {
  return Object.values(GameDB.commissions || {}).filter((commission) => ['daily', 'mvp'].includes(commission.category));
}

function validateMvpSmokeTest() {
  const issues = [];

  ['backyard', 'greenhouse'].forEach((sceneId) => {
    const table = GameDB.gatherTables?.[sceneId];
    if (!GameDB.scenes?.[sceneId]) addIssue(issues, `gather.${sceneId}`, `缺少場景：${sceneId}`);
    if (!Array.isArray(table?.drops) || !table.drops.length) addIssue(issues, `gather.${sceneId}`, '採集表沒有 drops。');
  });

  const commissions = getMvpCommissions();
  if (!commissions.length) addIssue(issues, 'commissions', 'MVP 至少需要一個 daily 或 mvp 委託。');

  commissions.forEach((commission) => {
    Object.keys(GameDB.getCommissionRequiredItems?.(commission) || {}).forEach((itemId) => {
      const scope = `commissions.${commission.id}.requiredItems.${itemId}`;
      if (!GameDB.items?.[itemId]) addIssue(issues, scope, '委託要求的產品不存在。');
      if (!GameDB.isProductItem?.(itemId)) addIssue(issues, scope, '委託要求必須是產品類 item。');

      const recipe = getRecipeForOutput(itemId);
      if (!recipe) {
        addIssue(issues, scope, '委託要求的產品沒有對應配方。');
        return;
      }

      if (!GameDB.stations?.[recipe.station]) addIssue(issues, `recipes.${recipe.id}.station`, `配方製作站不存在：${recipe.station}`);
      Object.keys(recipe.cost || {}).forEach((costItemId) => {
        if (!GameDB.items?.[costItemId]) addIssue(issues, `recipes.${recipe.id}.cost.${costItemId}`, '配方素材不存在。');
      });
    });

    if (Number(commission.reward?.exp || 0) <= 0) addIssue(issues, `commissions.${commission.id}.reward`, 'MVP 委託應提供 EXP。');
    if (!commission.reward?.currencies || !Object.keys(commission.reward.currencies).length) addIssue(issues, `commissions.${commission.id}.reward`, 'MVP 委託應提供貨幣獎勵。');
  });

  const lv2Unlocks = GameDB.getLevelUnlocksFor?.(2) || {};
  if (!Array.isArray(lv2Unlocks.scenes) || !lv2Unlocks.scenes.includes('alchemy')) {
    addIssue(issues, 'levelConfig.unlocks.2', 'Lv.2 必須解鎖 alchemy。');
  }
  if (GameDB.getLevelByExp?.(60) < 2) addIssue(issues, 'levelConfig.thresholds', '60 EXP 應至少到 Lv.2。');

  if (issues.length) {
    console.groupCollapsed(`[MVP Smoke Test] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }

  console.info('[MVP Smoke Test] ok');
  return { ok: true, issues: [] };
}

function validatePlayerProgressCheck() {
  const issues = [];
  const thresholds = GameDB.levelConfig?.thresholds || {};

  if (!GameDB.levelConfig || typeof GameDB.levelConfig !== 'object') addIssue(issues, 'levelConfig', '缺少等級設定。');
  if (Number(thresholds[1]) !== 0) addIssue(issues, 'levelConfig.thresholds.1', 'Lv.1 EXP 門檻必須是 0。');
  if (Number(thresholds[2]) <= Number(thresholds[1] ?? -1)) addIssue(issues, 'levelConfig.thresholds.2', 'Lv.2 EXP 門檻必須大於 Lv.1。');
  if (GameDB.getLevelByExp?.(0) !== 1) addIssue(issues, 'getLevelByExp(0)', '0 EXP 應該是 Lv.1。');
  if (GameDB.getLevelByExp?.(Number(thresholds[2] || 0)) < 2) addIssue(issues, 'getLevelByExp(Lv2 threshold)', '達到 Lv.2 門檻時應至少是 Lv.2。');

  const freshProgress = GameDB.getLevelProgress?.({ level: 1, exp: 0 });
  if (!freshProgress || freshProgress.level !== 1) addIssue(issues, 'getLevelProgress', '新玩家進度應顯示 Lv.1。');
  if (Number(freshProgress?.currentLevelExp || 0) !== 0) addIssue(issues, 'getLevelProgress.currentLevelExp', '新玩家當前等級 EXP 應為 0。');
  if (Number(freshProgress?.neededForNext || 0) <= 0) addIssue(issues, 'getLevelProgress.neededForNext', '新玩家必須有下一級需求。');

  const lv2Unlocks = GameDB.getLevelUnlocksFor?.(2) || {};
  if (!Array.isArray(lv2Unlocks.scenes) || !lv2Unlocks.scenes.includes('alchemy')) {
    addIssue(issues, 'levelConfig.unlocks.2.scenes', 'Lv.2 應解鎖 alchemy。');
  }

  if (issues.length) {
    console.groupCollapsed(`[Player Progress Check] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }

  console.info('[Player Progress Check] ok');
  return { ok: true, issues: [] };
}

function validateCommissionExpCheck() {
  const issues = [];
  const commissions = getMvpCommissions();

  if (!commissions.length) addIssue(issues, 'commissions.exp', '沒有可驗收 EXP 的 daily 或 mvp 委託。');

  commissions.forEach((commission) => {
    const requiredItems = GameDB.getCommissionRequiredItems?.(commission) || {};
    const exp = Number(commission.reward?.exp || 0);

    if (!Object.keys(requiredItems).length) {
      addIssue(issues, `commissions.${commission.id}.requiredItems`, '可獲得 EXP 的委託應該有產品需求。');
    }

    if (exp <= 0) {
      addIssue(issues, `commissions.${commission.id}.reward.exp`, 'daily / mvp 委託必須提供正數 EXP。');
    }
  });

  if (issues.length) {
    console.groupCollapsed(`[Commission EXP Check] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }

  console.info('[Commission EXP Check] ok');
  return { ok: true, issues: [] };
}

function validateUnlockRequirementCheck() {
  const issues = [];

  if (!isUnlocked({ level: 1 })) addIssue(issues, 'unlock.level.1', '新玩家應符合 Lv.1 條件。');
  if (!isUnlocked({ scene: 'cafe' })) addIssue(issues, 'unlock.scene.cafe', '咖啡廳應預設解鎖。');
  if (!isUnlocked({ station: 'kitchen' })) addIssue(issues, 'unlock.station.kitchen', '廚房製作站應預設解鎖。');
  if (!isUnlocked({ recipe: 'recipe_moon_latte' })) addIssue(issues, 'unlock.recipe_moon_latte', '月光花瓣拿鐵配方應因廚房解鎖而可用。');
  if (isUnlocked({ station: 'alchemy' })) addIssue(issues, 'unlock.station.alchemy', '新玩家 Lv.1 不應預設解鎖煉金室。');
  if (!isUnlocked({ any: [{ station: 'alchemy' }, { station: 'kitchen' }] })) addIssue(issues, 'unlock.any', 'any 條件應在廚房解鎖時通過。');
  if (isUnlocked({ all: [{ station: 'kitchen' }, { station: 'alchemy' }] })) addIssue(issues, 'unlock.all', 'all 條件應在煉金室未解鎖時失敗。');
  if (!getUnlockRequirementText({ all: [{ level: 2 }, { station: 'alchemy' }] })) addIssue(issues, 'unlock.text', '解鎖條件應可輸出提示文字。');

  if (issues.length) {
    console.groupCollapsed(`[Unlock Requirement Check] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }

  console.info('[Unlock Requirement Check] ok');
  return { ok: true, issues: [] };
}

function validateStationLockCheck() {
  const issues = [];
  const kitchenCraft = canCraft('recipe_moon_latte');
  const alchemyCraft = canCraft('recipe_moon_dew');

  if (kitchenCraft.status === 'locked_station') addIssue(issues, 'stationLock.kitchen', '新玩家不應被鎖在廚房製作站外。');
  if (alchemyCraft.status !== 'locked_station') addIssue(issues, 'stationLock.alchemy', '新玩家不應可製作煉金室配方。');
  if (!alchemyCraft.unlockRequirementText) addIssue(issues, 'stationLock.alchemyText', '鎖定製作站應提供解鎖條件文字。');

  if (issues.length) {
    console.groupCollapsed(`[Station Lock Check] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }

  console.info('[Station Lock Check] ok');
  return { ok: true, issues: [] };
}

function validateRecipeCommissionLockCheck() {
  const issues = [];
  const moonLatte = canCraft('recipe_moon_latte');
  const dreamCocoa = canCraft('recipe_dream_cocoa');

  if (moonLatte.status === 'locked_recipe') addIssue(issues, 'recipeLock.moonLatte', 'Lv.1 廚房基礎配方不應被配方等級鎖擋住。');
  if (dreamCocoa.status !== 'locked_recipe') addIssue(issues, 'recipeLock.dreamCocoa', 'Lv.1 不應可製作 Lv.2 夜空碎片可可配方。');
  if (isCommissionUnlocked('quest_dream_cocoa')) addIssue(issues, 'commissionLock.dreamCocoa', 'Lv.1 不應解鎖夜空碎片可可委託。');
  if (!getCommissionUnlockText('quest_dream_cocoa')) addIssue(issues, 'commissionLock.text', '鎖定委託應提供解鎖條件文字。');

  if (issues.length) {
    console.groupCollapsed(`[Recipe Commission Lock Check] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }

  console.info('[Recipe Commission Lock Check] ok');
  return { ok: true, issues: [] };
}

export function runDevChecks() {
  if (!shouldRunDevChecks()) return { skipped: true };
  const db = validateGameDB();
  const mvp = validateMvpSmokeTest();
  const playerProgress = validatePlayerProgressCheck();
  const commissionExp = validateCommissionExpCheck();
  const unlockRequirement = validateUnlockRequirementCheck();
  const stationLock = validateStationLockCheck();
  const recipeCommissionLock = validateRecipeCommissionLockCheck();
  return { skipped: false, db, mvp, playerProgress, commissionExp, unlockRequirement, stationLock, recipeCommissionLock };
}
