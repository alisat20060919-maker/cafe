import { getState, replaceState } from '@state';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createStateDraft() {
  const current = getState();
  if (typeof structuredClone === 'function') return structuredClone(current);
  return JSON.parse(JSON.stringify(current));
}

export function commitStateDraft(draft) {
  if (!isRecord(draft)) throw new Error('無效的 state draft');
  return replaceState(draft);
}

export function runStateTransaction(mutator) {
  if (typeof mutator !== 'function') throw new Error('transaction mutator 必須是函式');
  const draft = createStateDraft();
  const result = mutator(draft);
  commitStateDraft(draft);
  return result;
}

export function setDailyCheckIn(lastCheckIn, streak) {
  return runStateTransaction((draft) => {
    draft.daily ||= {};
    draft.daily.lastCheckIn = lastCheckIn || null;
    draft.daily.streak = Math.max(0, Number(streak || 0));
    return { lastCheckIn: draft.daily.lastCheckIn, streak: draft.daily.streak };
  });
}

export function setGatheringRecord(locationId, record = {}) {
  if (!locationId) throw new Error('缺少採集地點 ID');
  return runStateTransaction((draft) => {
    draft.gathering ||= {};
    draft.gathering[locationId] = {
      lastDate: record.lastDate || null,
      count: Math.max(0, Number(record.count || 0)),
    };
    return draft.gathering[locationId];
  });
}

export function markCommissionCompleted(commissionId, completedAt = new Date().toISOString()) {
  if (!commissionId) throw new Error('缺少委託 ID');
  return runStateTransaction((draft) => {
    draft.commissions ||= {};
    draft.commissions[commissionId] = {
      status: 'completed',
      completedAt,
    };
    return draft.commissions[commissionId];
  });
}

export function toggleSetting(settingKey) {
  const allowed = new Set(['animation', 'softMode', 'sound']);
  if (!allowed.has(settingKey)) throw new Error(`不支援的設定：${settingKey}`);
  return runStateTransaction((draft) => {
    draft.settings ||= {};
    draft.settings[settingKey] = !Boolean(draft.settings[settingKey]);
    return draft.settings[settingKey];
  });
}
