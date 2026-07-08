import { GameDB } from '@db';

export function formatReward(reward = {}) {
  const parts = [];

  if (Number(reward.exp || 0) > 0) {
    parts.push(`EXP +${Number(reward.exp)}`);
  }

  Object.entries(reward.currencies || {}).forEach(([currencyId, amount]) => {
    const meta = GameDB.currencies[currencyId];
    parts.push(`${meta?.icon || ''}${meta?.name || currencyId} +${amount}`);
  });

  Object.entries(reward.items || {}).forEach(([itemId, qty]) => {
    const item = GameDB.items[itemId];
    parts.push(`${item?.icon || ''}${item?.name || itemId} ×${qty}`);
  });

  Object.keys(reward.fairies || {}).forEach((fairyId) => {
    const fairy = GameDB.fairies[fairyId];
    parts.push(`${fairy?.icon || ''}${fairy?.name || fairyId}`);
  });

  Object.entries(reward.affection || {}).forEach(([fairyId, amount]) => {
    const fairy = GameDB.fairies[fairyId];
    parts.push(`${fairy?.icon || '🧚'}${fairy?.name || fairyId} 好感 +${amount}`);
  });

  return parts.join('、') || '無';
}
