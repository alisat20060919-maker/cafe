import { GameDB } from '@db';
import { getState, canAffordItems, spendItems, addReward, persistState } from '@state';
import { formatReward } from '@utils';

function getRequirements(commission) {
  return GameDB.getCommissionRequiredItems(commission);
}

function isCommissionCompleted(record) {
  return record?.status === 'completed' || record?.status === 'claimed';
}

export function canCompleteCommission(commissionId) {
  const state = getState();
  const commission = GameDB.commissions[commissionId];
  if (!commission) return false;
  if (isCommissionCompleted(state.commissions[commissionId])) return false;
  return canAffordItems(getRequirements(commission));
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
  persistState('commission');

  return { ok: true, message: `委託完成：${formatReward(commission.reward)}` };
}
