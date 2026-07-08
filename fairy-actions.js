import { GameDB } from '@db';
import { getState, spendItems, addFairyAffection, persistState } from '@state';

function getFairy(fairyId) {
  return GameDB.fairies?.[fairyId] || null;
}

function getFairyState(fairyId) {
  return getState().fairies?.[fairyId] || { owned: false, affection: 0 };
}

function getAffectionTier(affection = 0) {
  const value = Number(affection || 0);
  if (value >= 80) return 'high';
  if (value >= 30) return 'mid';
  return 'low';
}

function isFavoriteGift(fairy, itemId) {
  return Array.isArray(fairy?.favoriteSweets) && fairy.favoriteSweets.includes(itemId);
}

export function getFairyDialogue(fairyId) {
  const fairy = getFairy(fairyId);
  if (!fairy) return '';
  const affection = getFairyState(fairyId).affection || 0;
  const tier = getAffectionTier(affection);
  const lines = fairy.dialogues?.[tier] || fairy.dialogues?.low || [fairy.quote].filter(Boolean);
  if (!lines.length) return fairy.quote || '';
  return lines[Math.floor(Math.random() * lines.length)];
}

export function feedFairy(fairyId, itemId) {
  const fairy = getFairy(fairyId);
  const item = GameDB.items?.[itemId];
  const fairyState = getFairyState(fairyId);

  if (!fairy) return { ok: false, message: '找不到這位精靈。' };
  if (!fairyState.owned) return { ok: false, message: '尚未契約的精靈還不能送禮。' };
  if (!item) return { ok: false, message: '找不到這份禮物。' };
  if (!GameDB.isGiftableItem(item)) return { ok: false, message: '這個物品不能作為精靈禮物。' };
  if (!spendItems({ [itemId]: 1 })) return { ok: false, message: `${item.name}數量不足，不能送禮。` };

  const favorite = isFavoriteGift(fairy, itemId);
  const baseAffection = Number(GameDB.fairyConfig?.giftAffection || 5);
  const multiplier = favorite ? Number(GameDB.fairyConfig?.favoriteMultiplier || 2) : 1;
  const gained = Math.max(1, Math.round(baseAffection * multiplier));
  const result = addFairyAffection(fairyId, gained);
  persistState('fairy:gift');

  return {
    ok: true,
    fairyId,
    itemId,
    favorite,
    affectionGained: gained,
    totalAffection: result?.total || getFairyState(fairyId).affection || 0,
    dialogue: getFairyDialogue(fairyId),
    message: `${fairy.name}收下了${item.icon}${item.name}，好感 +${gained}${favorite ? '（最愛加倍）' : ''}。`,
  };
}

export function getOwnedFairyBuffs(type = null, target = null) {
  const state = getState();
  return Object.entries(state.fairies || {})
    .filter(([, record]) => record?.owned)
    .map(([fairyId]) => GameDB.fairies?.[fairyId])
    .filter((fairy) => fairy?.passiveBuff)
    .map((fairy) => ({ fairyId: fairy.id, fairyName: fairy.name, ...fairy.passiveBuff }))
    .filter((buff) => !type || buff.type === type)
    .filter((buff) => !target || buff.target === 'all' || buff.target === target);
}

export function getTotalFairyBuffValue(type, target) {
  return getOwnedFairyBuffs(type, target)
    .reduce((sum, buff) => sum + Number(buff.value || 0), 0);
}
