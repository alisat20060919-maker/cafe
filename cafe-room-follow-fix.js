let animationFrame = null;
let resizeObserver = null;
let playerObserver = null;
let followUntil = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ensureStylesheet() {
  if (document.querySelector('link[data-cafe-room-follow-fix]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './cafe-room-follow-fix.css?v=room006';
  link.dataset.cafeRoomFollowFix = 'true';
  document.head.appendChild(link);
}

function createPlayfield(viewport, joystick, prompt) {
  const existing = viewport.closest('.cafe-room-playfield');
  if (existing) {
    if (joystick && joystick.parentElement !== existing) existing.appendChild(joystick);
    if (prompt && prompt.parentElement !== existing) existing.appendChild(prompt);
    return existing;
  }

  const playfield = document.createElement('div');
  playfield.className = 'cafe-room-playfield';
  viewport.before(playfield);
  playfield.appendChild(viewport);
  if (joystick) playfield.appendChild(joystick);
  if (prompt) playfield.appendChild(prompt);
  return playfield;
}

function getRenderedPlayerPosition(player, stage) {
  const playerRect = player.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  return {
    x: playerRect.left - stageRect.left + playerRect.width / 2,
    y: playerRect.bottom - stageRect.top - Math.max(5, playerRect.height * 0.06),
  };
}

function centerCameraOnPlayer(viewport, stage, player, smoothing = 0.34) {
  if (!viewport.clientWidth || !viewport.clientHeight) return;
  const position = getRenderedPlayerPosition(player, stage);
  const maxLeft = Math.max(0, stage.scrollWidth - viewport.clientWidth);
  const maxTop = Math.max(0, stage.scrollHeight - viewport.clientHeight);
  const targetLeft = clamp(position.x - viewport.clientWidth * 0.5, 0, maxLeft);
  const targetTop = clamp(position.y - viewport.clientHeight * 0.62, 0, maxTop);
  const nextLeft = viewport.scrollLeft + (targetLeft - viewport.scrollLeft) * smoothing;
  const nextTop = viewport.scrollTop + (targetTop - viewport.scrollTop) * smoothing;

  viewport.scrollLeft = Math.abs(targetLeft - nextLeft) < 0.35 ? targetLeft : nextLeft;
  viewport.scrollTop = Math.abs(targetTop - nextTop) < 0.35 ? targetTop : nextTop;
}

export function initCafeRoomFollowFix() {
  const roomRoot = document.querySelector('#cafeInside');
  if (!roomRoot || roomRoot.dataset.followFixReady === 'true') return;

  const viewport = roomRoot.querySelector('[data-cafe-viewport]');
  const stage = roomRoot.querySelector('[data-cafe-stage]');
  const player = roomRoot.querySelector('[data-cafe-player]');
  const joystick = roomRoot.querySelector('[data-cafe-joystick]');
  const prompt = roomRoot.querySelector('[data-cafe-interact]');
  const pageHome = document.querySelector('#page-home');
  if (!viewport || !stage || !player) return;

  roomRoot.dataset.followFixReady = 'true';
  ensureStylesheet();
  createPlayfield(viewport, joystick, prompt);

  const requestFollow = (duration = 240) => {
    followUntil = Math.max(followUntil, performance.now() + duration);
  };

  playerObserver = new MutationObserver(() => requestFollow(260));
  playerObserver.observe(player, { attributes: true, attributeFilter: ['style', 'class'] });

  joystick?.addEventListener('pointerdown', () => requestFollow(600));
  joystick?.addEventListener('pointermove', () => requestFollow(260));
  joystick?.addEventListener('pointerup', () => requestFollow(180));
  joystick?.addEventListener('pointercancel', () => requestFollow(180));

  resizeObserver = new ResizeObserver(() => {
    requestFollow(220);
    centerCameraOnPlayer(viewport, stage, player, 1);
  });
  resizeObserver.observe(viewport);

  const tick = (timestamp) => {
    const roomVisible = pageHome?.classList.contains('inside-mode');
    const isMoving = player.classList.contains('is-walking');
    if (roomVisible && (isMoving || timestamp < followUntil)) {
      centerCameraOnPlayer(viewport, stage, player, isMoving ? 0.42 : 0.3);
    }
    animationFrame = window.requestAnimationFrame(tick);
  };

  requestFollow(500);
  animationFrame = window.requestAnimationFrame(tick);
}
