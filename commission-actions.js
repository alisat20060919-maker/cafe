import { GameDB } from '@db';
import {
  getState,
  canAffordItems,
  spendItems,
  spendCurrency,
  addReward,
  applyCommissionUnlocks,
  persistState,
  refreshDailyCommissions,
  useFreeDailyCommissionRefresh,
  usePaidDailyCommissionRefresh,
} from '@state';
import { formatReward } from '@utils';

const PAID_REFRESH_COST = { currency: 'tickets', amount: 1 };

function getRequirements(commission) {
  return GameDB.getCommissionRequiredItems(commission);
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

export function getPaidRefreshCostText() {
  return `${currencyLabel(PAID_REFRESH_COST.currency)} ×${PAID_REFRESH_COST.amount}`;
}

export function canCompleteCommission(commissionId) {
  const state = getState();
  const commission = GameDB.commissions[commissionId];
  if (!commission) return false;
  if (isCommissionCompleted(state.commissions[commissionId])) return false;
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
  const current = Number(state.player?.[PAID_REFRESH_COST.currency] || 0);
  if (current < PAID_REFRESH_COST.amount) {
    return { ok: false, refreshed: false, message: `${getPaidRefreshCostText()}不足，不能付費刷新。` };
  }

  if (!spendCurrency(PAID_REFRESH_COST.currency, PAID_REFRESH_COST.amount)) {
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
  if (!spendItems(getRequirements(commission))) {
    return { ok: false, message: '需要的商品不足，還不能完成這份委託。' };
  }

  addReward(commission.reward);
  state.commissions[commissionId] = {
    status: 'completed',
    completedAt: new Date().toISOString(),
  };

  const unlocked = applyCommissionUnlocks(commissionId);
  persistState('commission');

  return { ok: true, message: `委託完成：${formatReward(commission.reward)}${formatUnlocks(unlocked)}` };
}
