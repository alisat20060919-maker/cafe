export const Events = {
  STATE_UPDATED: 'state:updated',
  STATE_CHANGED: 'state:updated',
  ROUTE_CHANGED: 'route:changed',
  GACHA_ROLLED: 'gacha:rolled',
  GACHA_FAILED: 'gacha:failed',
  LEVEL_UP: 'player:level-up',
  NOTICE: 'ui:notice',
  CONFIRM: 'ui:confirm',
};

export function emit(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function on(eventName, handler) {
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}

export function emitStateChanged(reason = 'unknown') {
  emit(Events.STATE_UPDATED, { reason, at: new Date().toISOString() });
}

export function emitNotice(title, body) {
  emit(Events.NOTICE, { title, body });
}

export function emitLevelUp(detail = {}) {
  emit(Events.LEVEL_UP, { ...detail, at: new Date().toISOString() });
}
