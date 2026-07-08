import { GameDB } from '@db';
import {
  getState,
  addPlayerExp,
  addReward as addStateReward,
  persistState,
} from '@state';
import { emitLevelUp } from '@eventBus';

function buildPlayerProgressPayload(growth = {}) {
  const state = getState();
  return {
    ...growth,
    player: {
      level: state.player.level,
      exp: state.player.exp,
    },
    progress: GameDB.getLevelProgress(state.player),
  };
}

function emitLevelUpsIfNeeded(growth = {}) {
  if (!growth.levelUps?.length) return;
  emitLevelUp(buildPlayerProgressPayload(growth));
}

export function addExp(amount = 0, options = {}) {
  const { persist = true, reason = 'player:exp' } = options;
  const growth = addPlayerExp(amount);
  emitLevelUpsIfNeeded(growth);
  if (persist && growth.expGained > 0) persistState(reason);
  return growth;
}

export function applyReward(reward = {}, options = {}) {
  const { persist = false, reason = 'reward' } = options;
  const result = addStateReward(reward);
  emitLevelUpsIfNeeded(result);
  if (persist) persistState(reason);
  return result;
}

export function getPlayerProgress(player = getState().player) {
  return GameDB.getLevelProgress(player);
}
