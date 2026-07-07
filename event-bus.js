export const Events = {
  STATE_CHANGED: 'fairyCafe:stateChanged',
  ROUTE_CHANGED: 'fairyCafe:routeChanged',
  NOTICE: 'fairyCafe:notice',
  CONFIRM: 'fairyCafe:confirm',
};

export function emit(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function on(eventName, handler) {
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}

export function emitStateChanged(reason = 'unknown') {
  emit(Events.STATE_CHANGED, { reason });
}

export function emitNotice(title, body) {
  emit(Events.NOTICE, { title, body });
}
