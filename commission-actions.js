import { GameDB } from '@db';
import {
  getState,
  canAffordItems,
  spendItems,
  spendCurrency,
  applyCommissionUnlocks,
  persistState,
  refreshDailyCommissions,
  useFreeDailyCommissionRefresh,
  usePaidDailyCommissionRefresh,
  isUnlocked,
  getUnlockRequirementText,
} from '@state';
import { applyReward } from '@actions/player';
import { formatReward } from '@utils';

function getPaidRefreshCost() {
  return GameDB.commissionConfig?.refreshCost || { currency: 'tickets', amount: 1 };
}

function getRequirements(commission) {
  return GameDB.getCommissionRequiredItems(commission);
}

function getRecipeForOutputItem(itemId) {
  return Object.values(GameDB.recipes || {}).find((recipe) => recipe.output?.itemId === itemId) || null;
}

function getCommissionUnlockRequirement(commission) {
  const recipeRequirements = Object.keys(getRequirements(commission))
    .map((itemId) => getRecipeForOutputItem(itemId))
    .filter(Boolean)
    .map((recipe) => recipe.unlockRequirement || (recipe.station ? { station: recipe.station } : {}));

  return {
    all: [
      commission?.unlockRequirement || {},
      ...recipeRequirements,
    ],
  };
}

function getEffectiveReward(commission) {
  if (commission?.category === 'fairy') return commission.reward || {};
  const { affection, ...reward } = commission?.reward || {};
  return reward;
}

function isCommissionCompleted(record) {
  return record?.status === 'completed' || record?.status === 'claimed';
}

function currencyLabel(currencyId) {
  return GameDB.currencies?.[currencyId]?.name || currencyId;
}

function formatUnlocks(unlocks = []) {
  if (!unlocks.length) return '';
  return `｜新解鎖：${unlocks.map((entry) => entry.label).join('、')}`;
}

function formatLevelUps(growth = {}) {
  if (!growth.levelUps?.length) return '';
  return `｜升到 Lv.${growth.newLevel}`;
}

function mergeUnlocks(...groups) {
  const seen = new Set();
  return groups.flat().filter((entry) => {
    const key = `${entry.type}:${entry.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getPaidRefreshCostText() {
  const cost = getPaidRefreshCost();
  return `${currencyLabel(cost.currency)} ×${cost.amount}`;
}

export function getCommissionDisplayReward(commission) {
  return getEffectiveReward(commission);
}

export function isCommissionUnlocked(commissionId) {
  const commission = GameDB.commissions[commissionId];
  if (!commission) return false;
  return isUnlocked(getCommissionUnlockRequirement(commission));
}

export function getCommissionUnlockText(commissionId) {
  const commission = GameDB.commissions[commissionId];
  if (!commission) return '找不到委託';
  return getUnlockRequirementText(getCommissionUnlockRequirement(commission)) || '需要解鎖前置內容';
}

export function canCompleteCommission(commissionId) {
  const state = getState();
  const commission = GameDB.commissions[commissionId];
  if (!commission) return false;
  if (isCommissionCompleted(state.commissions[commissionId])) return false;
  if (!isCommissionUnlocked(commissionId)) return false;
  return canAffordItems(getRequirements(commission));
}

export function refreshDailyCommissionList() {
  const result = refreshDailyCommissions();
  if (result.changed) {
    return { ok: true, refreshed: true, message: `今日委託已刷新：${result.ids.length} 件。` };
  }

  return { ok: true, refreshed: false, message: '今天的委託已經是最新的。' };
}

export function refreshDailyCommissionFree() {
  const result = useFreeDailyCommissionRefresh();
  if (!result.ok) return { ok: false, refreshed: false, message: result.message || '免費刷新失敗。' };

  return { ok: true, refreshed: true, message: `已使用今日免費刷新：${result.ids.length} 件委託。` };
}

export function refreshDailyCommissionPaid() {
  const state = getState();
  const cost = getPaidRefreshCost();
  const current = Number(state.player?.[cost.currency] || 0);
  if (current < cost.amount) {
    return { ok: false, refreshed: false, message: `${getPaidRefreshCostText()}不足，不能付費刷新。` };
  }

  if (!spendCurrency(cost.currency, cost.amount)) {
    return { ok: false, refreshed: false, message: `${getPaidRefreshCostText()}不足，不能付費刷新。` };
  }

  const result = usePaidDailyCommissionRefresh();
  return {
    ok: true,
    refreshed: true,
    message: `已花費${getPaidRefreshCostText()}刷新今日委託：${result.ids.length} 件。`,
  };
}

export function completeCommission(commissionId) {
  const state = getState();
  const commission = GameDB.commissions[commissionId];

  if (!commission) return { ok: false, message: '找不到委託。' };
  if (isCommissionCompleted(state.commissions[commissionId])) {
    return { ok: false, message: '這份委託已經完成過了。' };
  }
  if (!isCommissionUnlocked(commissionId)) {
    return { ok: false, message: `這份委託尚未解鎖：${getCommissionUnlockText(commissionId)}。` };
  }
  if (!spendItems(getRequirements(commission))) {
    return { ok: false, message: '需要的商品不足，還不能完成這份委託。' };
  }

  const reward = getEffectiveReward(commission);
  const growth = applyReward(reward);
  state.commissions[commissionId] = {
    status: 'completed',
    completedAt: new Date().toISOString(),
  };

  const directUnlocks = applyCommissionUnlocks(commissionId);
  const unlocked = mergeUnlocks(growth.unlocked || [], directUnlocks);
  persistState('commission');

  return {
    ok: true,
    message: `委託完成：${formatReward(reward)}${formatLevelUps(growth)}${formatUnlocks(unlocked)}`,
  };
}
