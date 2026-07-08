import { GameDB } from '@db';
import { validateGameDB } from '@validator';

function shouldRunDevChecks() {
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === '1'
    || params.get('checks') === '1'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function addMvpIssue(issues, scope, message) {
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
    if (!GameDB.scenes?.[sceneId]) addMvpIssue(issues, `gather.${sceneId}`, `缺少場景：${sceneId}`);
    if (!Array.isArray(table?.drops) || !table.drops.length) addMvpIssue(issues, `gather.${sceneId}`, '採集表沒有 drops。');
  });

  const commissions = getMvpCommissions();
  if (!commissions.length) addMvpIssue(issues, 'commissions', 'MVP 至少需要一個 daily 或 mvp 委託。');

  commissions.forEach((commission) => {
    Object.keys(GameDB.getCommissionRequiredItems?.(commission) || {}).forEach((itemId) => {
      const scope = `commissions.${commission.id}.requiredItems.${itemId}`;
      if (!GameDB.items?.[itemId]) addMvpIssue(issues, scope, '委託要求的產品不存在。');
      if (!GameDB.isProductItem?.(itemId)) addMvpIssue(issues, scope, '委託要求必須是產品類 item。');

      const recipe = getRecipeForOutput(itemId);
      if (!recipe) {
        addMvpIssue(issues, scope, '委託要求的產品沒有對應配方。');
        return;
      }

      if (!GameDB.stations?.[recipe.station]) addMvpIssue(issues, `recipes.${recipe.id}.station`, `配方製作站不存在：${recipe.station}`);
      Object.keys(recipe.cost || {}).forEach((costItemId) => {
        if (!GameDB.items?.[costItemId]) addMvpIssue(issues, `recipes.${recipe.id}.cost.${costItemId}`, '配方素材不存在。');
      });
    });

    if (Number(commission.reward?.exp || 0) <= 0) addMvpIssue(issues, `commissions.${commission.id}.reward`, 'MVP 委託應提供 EXP。');
    if (!commission.reward?.currencies || !Object.keys(commission.reward.currencies).length) addMvpIssue(issues, `commissions.${commission.id}.reward`, 'MVP 委託應提供貨幣獎勵。');
  });

  const lv2Unlocks = GameDB.getLevelUnlocksFor?.(2) || {};
  if (!Array.isArray(lv2Unlocks.scenes) || !lv2Unlocks.scenes.includes('alchemy')) {
    addMvpIssue(issues, 'levelConfig.unlocks.2', 'Lv.2 必須解鎖 alchemy。');
  }
  if (GameDB.getLevelByExp?.(60) < 2) addMvpIssue(issues, 'levelConfig.thresholds', '60 EXP 應至少到 Lv.2。');

  if (issues.length) {
    console.groupCollapsed(`[MVP Smoke Test] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }

  console.info('[MVP Smoke Test] ok');
  return { ok: true, issues: [] };
}

export function runDevChecks() {
  if (!shouldRunDevChecks()) return { skipped: true };
  const db = validateGameDB();
  const mvp = validateMvpSmokeTest();
  return { skipped: false, db, mvp };
}
