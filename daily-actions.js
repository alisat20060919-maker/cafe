import { GameDB } from '@db';
import { getState, replaceState, addReward } from '@state';
import { formatReward } from '@utils';

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayString() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateString(date);
}

function cloneStateForWrite() {
  return JSON.parse(JSON.stringify(getState()));
}

export function claimDailyReward() {
  const state = getState();
  const today = localDateString();

  if (state.daily.lastCheckIn === today) {
    return { ok: false, reason: 'claimed', message: '今天已經簽到過了。' };
  }

  const nextStreak = state.daily.lastCheckIn === yesterdayString()
    ? Number(state.daily.streak || 0) + 1
    : 1;
  const reward = GameDB.dailyRewards[(nextStreak - 1) % GameDB.dailyRewards.length];

  addReward(reward);
  const nextState = cloneStateForWrite();
  nextState.daily ||= {};
  nextState.daily.lastCheckIn = today;
  nextState.daily.streak = nextStreak;
  replaceState(nextState);

  return { ok: true, streak: nextStreak, reward, message: `簽到成功：${formatReward(reward)}` };
}
