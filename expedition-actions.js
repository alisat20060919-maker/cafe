import { GameDB } from '@db';
import { getState } from '@state';
import { runStateTransaction } from './state-transactions.js?v=core001';
import { expeditionConfig, expeditionRegions } from './data-expeditions.js?v=demo001';

function getNowMs(now = Date.now()) {
  const value = now instanceof Date ? now.getTime() : Number(now);
  return Number.isFinite(value) ? value : Date.now();
}

function getExpeditionState(currentState = getState()) {
  return currentState.expeditions && typeof currentState.expeditions === 'object'
    ? currentState.expeditions
    : { active: null, history: [] };
}

function weightedPick(entries = [], random = Math.random) {
  const valid = entries.filter((entry) => GameDB.items?.[entry.itemId] && Number(entry.weight || 0) > 0);
  if (!valid.length) return null;
  const total = valid.reduce((sum, entry) => sum + Number(entry.weight || 0), 0);
  let cursor = Math.max(0, Math.min(0.999999, Number(random()) || 0)) * total;
  for (const entry of valid) {
    cursor -= Number(entry.weight || 0);
    if (cursor < 0) return entry;
  }
  return valid[valid.length - 1];
}

function makeRewardView(rewards = {}) {
  return Object.entries(rewards).map(([itemId, qty]) => {
    const item = GameDB.items?.[itemId];
    return {
      itemId,
      qty: Number(qty || 0),
      name: item?.name || itemId,
      icon: item?.icon || '◇',
      rarity: item?.rarity || 'N',
    };
  });
}

export function getExpeditionRegion(regionId) {
  return expeditionRegions[regionId] || null;
}

export function getExpeditionRegions() {
  return Object.values(expeditionRegions).map((region) => ({
    ...region,
    preview: (region.drops || []).map((drop) => {
      const item = GameDB.items?.[drop.itemId];
      return {
        itemId: drop.itemId,
        qty: Number(drop.qty || 1),
        name: item?.name || drop.itemId,
        icon: item?.icon || '◇',
        rarity: item?.rarity || 'N',
      };
    }),
  }));
}

export function getOwnedExpeditionFairies(currentState = getState()) {
  return Object.entries(currentState.fairies || {})
    .filter(([fairyId, record]) => record?.owned && GameDB.fairies?.[fairyId])
    .map(([fairyId, record]) => ({
      fairyId,
      affection: Math.max(0, Number(record.affection || 0)),
      ...GameDB.fairies[fairyId],
    }));
}

export function getActiveExpedition(now = Date.now(), currentState = getState()) {
  const active = getExpeditionState(currentState).active;
  if (!active?.regionId || !active?.fairyId) return null;
  const region = getExpeditionRegion(active.regionId);
  const fairy = GameDB.fairies?.[active.fairyId];
  if (!region || !fairy) return null;

  const nowMs = getNowMs(now);
  const completesAtMs = Date.parse(active.completesAt || '') || 0;
  return {
    ...active,
    region,
    fairy,
    completesAtMs,
    remainingMs: Math.max(0, completesAtMs - nowMs),
    isComplete: completesAtMs > 0 && nowMs >= completesAtMs,
  };
}

export function startExpedition(regionId, fairyId, options = {}) {
  const region = getExpeditionRegion(regionId);
  if (!region) return { ok: false, status: 'unknown_region', message: '找不到這個遠征區域。' };

  const currentState = getState();
  const fairyRecord = currentState.fairies?.[fairyId];
  const fairy = GameDB.fairies?.[fairyId];
  if (!fairy || !fairyRecord?.owned) return { ok: false, status: 'fairy_not_owned', message: '請先選擇已契約的精靈。' };
  if (getActiveExpedition(options.now, currentState)) return { ok: false, status: 'already_active', message: '目前已有精靈正在遠征，請先等待她回來。' };

  const startedAtMs = getNowMs(options.now);
  const durationMs = Math.max(1, Number(options.durationMs ?? region.durationMinutes * 60_000));
  const active = {
    id: `expedition_${startedAtMs}`,
    regionId,
    fairyId,
    startedAt: new Date(startedAtMs).toISOString(),
    completesAt: new Date(startedAtMs + durationMs).toISOString(),
  };

  runStateTransaction((draft) => {
    draft.expeditions ||= { active: null, history: [] };
    draft.expeditions.active = active;
    if (!Array.isArray(draft.expeditions.history)) draft.expeditions.history = [];
    return active;
  });

  return {
    ok: true,
    status: 'started',
    active: getActiveExpedition(startedAtMs),
    title: `${fairy.name}出發了`,
    message: `${fairy.name}已前往${region.name}，完成後記得回到後山領取素材。`,
  };
}

export function claimExpedition(options = {}) {
  const nowMs = getNowMs(options.now);
  const currentState = getState();
  const activeView = getActiveExpedition(nowMs, currentState);
  if (!activeView) return { ok: false, status: 'no_active', message: '目前沒有進行中的遠征。' };
  if (!activeView.isComplete) return { ok: false, status: 'not_complete', message: '精靈還在遠征途中。', active: activeView };

  const random = typeof options.random === 'function' ? options.random : Math.random;
  const rewards = {};
  const configuredRolls = options.rewardRolls ?? expeditionConfig.rewardRolls ?? 1;
  const rolls = Math.max(1, Number(configuredRolls));
  for (let index = 0; index < rolls; index += 1) {
    const drop = weightedPick(activeView.region.drops, random);
    if (!drop) continue;
    const qty = Math.max(1, Number(drop.qty || 1));
    rewards[drop.itemId] = Number(rewards[drop.itemId] || 0) + qty;
  }

  if (!Object.keys(rewards).length) return { ok: false, status: 'empty_table', message: '遠征資料暫時沒有可領取的素材。' };

  const claimedAt = new Date(nowMs).toISOString();
  runStateTransaction((draft) => {
    draft.inventory ||= {};
    draft.collection ||= {};
    draft.collection.discoveredItems ||= {};
    Object.entries(rewards).forEach(([itemId, qty]) => {
      draft.inventory[itemId] = Number(draft.inventory[itemId] || 0) + Number(qty || 0);
      draft.collection.discoveredItems[itemId] = true;
    });

    draft.expeditions ||= { active: null, history: [] };
    if (!Array.isArray(draft.expeditions.history)) draft.expeditions.history = [];
    draft.expeditions.history.unshift({
      id: activeView.id,
      regionId: activeView.regionId,
      fairyId: activeView.fairyId,
      startedAt: activeView.startedAt,
      completesAt: activeView.completesAt,
      claimedAt,
      rewards,
    });
    draft.expeditions.history = draft.expeditions.history.slice(0, Math.max(1, Number(expeditionConfig.historyLimit || 12)));
    draft.expeditions.active = null;
  });

  return {
    ok: true,
    status: 'claimed',
    title: `${activeView.fairy.name}遠征歸來`,
    message: `${activeView.fairy.name}從${activeView.region.name}帶回了素材。`,
    region: activeView.region,
    fairy: activeView.fairy,
    rewards,
    rewardView: makeRewardView(rewards),
  };
}

export function getExpeditionHistory(currentState = getState()) {
  const history = Array.isArray(getExpeditionState(currentState).history)
    ? getExpeditionState(currentState).history
    : [];
  return history.map((record) => ({
    ...record,
    region: getExpeditionRegion(record.regionId),
    fairy: GameDB.fairies?.[record.fairyId] || null,
    rewardView: makeRewardView(record.rewards || {}),
  }));
}
