import { GameDB } from '@db';
import { SAVE_VERSION, getState, isUnlocked, getUnlockRequirementText } from '@state';
import { canCraft } from '@actions/craft';
import { isCommissionUnlocked, getCommissionUnlockText, getRerollCostText } from '@actions/commission';
import { getGachaPityStatus } from '@actions/gacha';
import { getTotalFairyBuffValue } from '@actions/fairy';
import { getAllShopItems, getShopItemView } from '@actions/shop';
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

function finishCheck(label, issues) {
  if (issues.length) {
    console.groupCollapsed(`[${label}] ${issues.length} issues`);
    issues.forEach((message) => console.error(message));
    console.groupEnd();
    return { ok: false, issues };
  }
  console.info(`[${label}] ok`);
  return { ok: true, issues: [] };
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
      if (!recipe) addIssue(issues, scope, '委託要求的產品沒有對應配方。');
      Object.keys(recipe?.cost || {}).forEach((costItemId) => {
        if (!GameDB.items?.[costItemId]) addIssue(issues, `recipes.${recipe.id}.cost.${costItemId}`, '配方素材不存在。');
      });
    });
    if (Number(commission.reward?.exp || 0) <= 0) addIssue(issues, `commissions.${commission.id}.reward`, 'MVP 委託應提供 EXP。');
    if (!commission.reward?.currencies || !Object.keys(commission.reward.currencies).length) addIssue(issues, `commissions.${commission.id}.reward`, 'MVP 委託應提供貨幣獎勵。');
  });

  const lv2Unlocks = GameDB.getLevelUnlocksFor?.(2) || {};
  if (!Array.isArray(lv2Unlocks.scenes) || !lv2Unlocks.scenes.includes('alchemy')) addIssue(issues, 'levelConfig.unlocks.2', 'Lv.2 必須解鎖 alchemy。');
  if (GameDB.getLevelByExp?.(60) < 2) addIssue(issues, 'levelConfig.thresholds', '60 EXP 應至少到 Lv.2。');
  return finishCheck('MVP Smoke Test', issues);
}

function validatePlayerProgressCheck() {
  const issues = [];
  const thresholds = GameDB.levelConfig?.thresholds || {};
  if (Number(thresholds[1]) !== 0) addIssue(issues, 'levelConfig.thresholds.1', 'Lv.1 EXP 門檻必須是 0。');
  if (Number(thresholds[2]) <= Number(thresholds[1] ?? -1)) addIssue(issues, 'levelConfig.thresholds.2', 'Lv.2 EXP 門檻必須大於 Lv.1。');
  if (GameDB.getLevelByExp?.(0) !== 1) addIssue(issues, 'getLevelByExp(0)', '0 EXP 應該是 Lv.1。');
  const freshProgress = GameDB.getLevelProgress?.({ level: 1, exp: 0 });
  if (!freshProgress || freshProgress.level !== 1) addIssue(issues, 'getLevelProgress', '新玩家進度應顯示 Lv.1。');
  if (Number(freshProgress?.neededForNext || 0) <= 0) addIssue(issues, 'getLevelProgress.neededForNext', '新玩家必須有下一級需求。');
  return finishCheck('Player Progress Check', issues);
}

function validateCommissionExpCheck() {
  const issues = [];
  const commissions = getMvpCommissions();
  if (!commissions.length) addIssue(issues, 'commissions.exp', '沒有可驗收 EXP 的 daily 或 mvp 委託。');
  commissions.forEach((commission) => {
    if (!Object.keys(GameDB.getCommissionRequiredItems?.(commission) || {}).length) addIssue(issues, `commissions.${commission.id}.requiredItems`, '可獲得 EXP 的委託應該有產品需求。');
    if (Number(commission.reward?.exp || 0) <= 0) addIssue(issues, `commissions.${commission.id}.reward.exp`, 'daily / mvp 委託必須提供正數 EXP。');
  });
  return finishCheck('Commission EXP Check', issues);
}

function validateUnlockRequirementCheck() {
  const issues = [];
  if (!isUnlocked({ level: 1 })) addIssue(issues, 'unlock.level.1', '新玩家應符合 Lv.1 條件。');
  if (!isUnlocked({ scene: 'cafe' })) addIssue(issues, 'unlock.scene.cafe', '咖啡廳應預設解鎖。');
  if (!isUnlocked({ station: 'kitchen' })) addIssue(issues, 'unlock.station.kitchen', '廚房製作站應預設解鎖。');
  if (!isUnlocked({ recipe: 'recipe_moon_latte' })) addIssue(issues, 'unlock.recipe_moon_latte', '月光花瓣拿鐵配方應因廚房解鎖而可用。');
  if (isUnlocked({ station: 'alchemy' })) addIssue(issues, 'unlock.station.alchemy', '新玩家 Lv.1 不應預設解鎖煉金室。');
  if (!getUnlockRequirementText({ all: [{ level: 2 }, { station: 'alchemy' }] })) addIssue(issues, 'unlock.text', '解鎖條件應可輸出提示文字。');
  return finishCheck('Unlock Requirement Check', issues);
}

function validateStationLockCheck() {
  const issues = [];
  const kitchenCraft = canCraft('recipe_moon_latte');
  const alchemyCraft = canCraft('recipe_moon_dew');
  if (kitchenCraft.status === 'locked_station') addIssue(issues, 'stationLock.kitchen', '新玩家不應被鎖在廚房製作站外。');
  if (alchemyCraft.status !== 'locked_station') addIssue(issues, 'stationLock.alchemy', '新玩家不應可製作煉金室配方。');
  if (!alchemyCraft.unlockRequirementText) addIssue(issues, 'stationLock.alchemyText', '鎖定製作站應提供解鎖條件文字。');
  return finishCheck('Station Lock Check', issues);
}

function validateRecipeCommissionLockCheck() {
  const issues = [];
  const moonLatte = canCraft('recipe_moon_latte');
  const dreamCocoa = canCraft('recipe_dream_cocoa');
  if (moonLatte.status === 'locked_recipe') addIssue(issues, 'recipeLock.moonLatte', 'Lv.1 廚房基礎配方不應被配方等級鎖擋住。');
  if (dreamCocoa.status !== 'locked_recipe') addIssue(issues, 'recipeLock.dreamCocoa', 'Lv.1 不應可製作 Lv.2 夜空碎片可可配方。');
  if (isCommissionUnlocked('quest_dream_cocoa')) addIssue(issues, 'commissionLock.dreamCocoa', 'Lv.1 不應解鎖夜空碎片可可委託。');
  if (!getCommissionUnlockText('quest_dream_cocoa')) addIssue(issues, 'commissionLock.text', '鎖定委託應提供解鎖條件文字。');
  return finishCheck('Recipe Commission Lock Check', issues);
}

function validateStageSixCheck() {
  const issues = [];
  if (SAVE_VERSION < 16) addIssue(issues, 'saveVersion', '第 59～75 批次後 SAVE_VERSION 至少應為 16。');
  if (!GameDB.levelConfig?.unlocks?.[2]?.scenes?.includes('alchemy')) addIssue(issues, 'stage6.unlock', 'Lv.2 應自動解鎖煉金室。');
  if (!GameDB.commissionConfig?.rerollCost) addIssue(issues, 'commissionConfig.rerollCost', '第 75 步需要星糖重抽成本。');
  return finishCheck('Stage Six Check', issues);
}

function validateFairyGachaCheck() {
  const issues = [];
  Object.values(GameDB.fairies || {}).forEach((fairy) => {
    if (!fairy.passiveBuff) addIssue(issues, `fairies.${fairy.id}.passiveBuff`, '精靈缺少被動 Buff。');
    if (!Array.isArray(fairy.favoriteSweets)) addIssue(issues, `fairies.${fairy.id}.favoriteSweets`, '精靈缺少 favoriteSweets。');
    if (!fairy.dialogues) addIssue(issues, `fairies.${fairy.id}.dialogues`, '精靈缺少台詞資料。');
  });
  const pity = getGachaPityStatus();
  if (Number(pity.hardPityAt || 0) <= 0) addIssue(issues, 'gacha.pity', '祈願缺少 hard pity 設定。');
  if (!Array.isArray(getState().gachaHistory)) addIssue(issues, 'gachaHistory', '祈願歷史必須是陣列。');
  if (getTotalFairyBuffValue('gatherQtyBonus', 'backyard') < 0) addIssue(issues, 'fairyBuff', 'Buff 計算結果不可為負。');
  return finishCheck('Fairy Gacha Check', issues);
}

function validateShopCheck() {
  const issues = [];
  const allShopItems = getAllShopItems();
  if (!Object.keys(allShopItems || {}).length) addIssue(issues, 'shopItems', '商店至少需要一個商品。');
  Object.keys(allShopItems || {}).forEach((shopItemId) => {
    const view = getShopItemView(shopItemId);
    if (!view?.item) addIssue(issues, `shopItems.${shopItemId}.item`, '商店商品指向不存在 item。');
    if (!view?.price?.currency || !GameDB.currencies?.[view.price.currency]) addIssue(issues, `shopItems.${shopItemId}.price`, '商店價格貨幣不存在。');
    if (Number(view?.dailyLimit || 0) <= 0) addIssue(issues, `shopItems.${shopItemId}.dailyLimit`, '每日限購必須大於 0。');
  });
  return finishCheck('Shop Check', issues);
}

function buildLeafCoinUnitPriceMap() {
  const priceMap = {};
  Object.values(getAllShopItems() || {}).forEach((shopItem) => {
    if (!shopItem?.itemId || shopItem.price?.currency !== 'leafCoin') return;
    const qty = Math.max(1, Number(shopItem.qty || 1));
    const unitPrice = Number(shopItem.price.amount || 0) / qty;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;
    priceMap[shopItem.itemId] = Math.min(priceMap[shopItem.itemId] ?? Number.POSITIVE_INFINITY, unitPrice);
  });
  return priceMap;
}

function getRecipeLeafCoinCost(recipe, priceMap, visiting = new Set()) {
  if (!recipe || !recipe.cost) return null;
  if (visiting.has(recipe.id)) return null;
  visiting.add(recipe.id);

  let total = 0;
  for (const [itemId, qty] of Object.entries(recipe.cost || {})) {
    const amount = Math.max(1, Number(qty || 1));
    let unitPrice = priceMap[itemId];
    if (unitPrice === undefined) {
      const nestedRecipe = getRecipeForOutput(itemId);
      const nestedCost = getRecipeLeafCoinCost(nestedRecipe, priceMap, visiting);
      if (nestedCost === null) return null;
      const outputQty = Math.max(1, Number(nestedRecipe.output?.qty || 1));
      unitPrice = nestedCost / outputQty;
    }
    total += unitPrice * amount;
  }

  return total;
}

function validateEconomyBalanceCheck() {
  const issues = [];
  const priceMap = buildLeafCoinUnitPriceMap();

  getMvpCommissions().forEach((commission) => {
    const rewardLeafCoin = Number(commission.reward?.currencies?.leafCoin || 0);
    Object.entries(GameDB.getCommissionRequiredItems?.(commission) || {}).forEach(([itemId, qty]) => {
      const recipe = getRecipeForOutput(itemId);
      if (!recipe) return;
      const recipeCost = getRecipeLeafCoinCost(recipe, priceMap);
      if (recipeCost === null) return;
      const outputQty = Math.max(1, Number(recipe.output?.qty || 1));
      const requiredQty = Math.max(1, Number(qty || 1));
      const totalCost = (recipeCost / outputQty) * requiredQty;
      if (rewardLeafCoin > totalCost) {
        addIssue(
          issues,
          `economy.${commission.id}`,
          `可用商店素材製作 ${itemId} 後交委託套利：成本約 ${Math.ceil(totalCost)} 葉幣，獎勵 ${rewardLeafCoin} 葉幣。`,
        );
      }
    });
  });

  return finishCheck('Economy Balance Check', issues);
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
  const stageSix = validateStageSixCheck();
  const fairyGacha = validateFairyGachaCheck();
  const shop = validateShopCheck();
  const economy = validateEconomyBalanceCheck();
  return { skipped: false, db, mvp, playerProgress, commissionExp, unlockRequirement, stationLock, recipeCommissionLock, stageSix, fairyGacha, shop, economy };
}
