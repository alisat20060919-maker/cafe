import { GameDB } from './game-data.js?v=core06';
import { getState, canAffordItems, spendItems, addReward, persistState } from './game-state.js?v=core06';
import { formatReward } from './utils.js?v=core06';

export function canCompleteCommission(commissionId) {
  const state = getState();
  const commission = GameDB.commissions[commissionId];
  if (!commission) return false;
  if (state.commissions[commissionId]?.status === 'claimed') return false;
  return canAffordItems(commission.cost);
}

export function completeCommission(commissionId) {
  const state = getState();
  const commission = GameDB.commissions[commissionId];

  if (!commission) return { ok: false, message: '找不到委託。' };
  if (state.commissions[commissionId]?.status === 'claimed') {
    return { ok: false, message: '這份委託已經完成過了。' };
  }
  if (!spendItems(commission.cost)) {
    return { ok: false, message: '素材不足，還不能完成這份委託。' };
  }

  addReward(commission.reward);
  state.commissions[commissionId] = {
    status: 'claimed',
    completedAt: new Date().toISOString(),
  };
  persistState('commission');

  return { ok: true, message: `委託完成：${formatReward(commission.reward)}` };
}
