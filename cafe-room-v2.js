import { navigate } from '@router';
import { showModal } from '@ui';
import { getState } from '@state';
import { ROOM_DEFAULTS, OBJECTS, renderRoomMarkup } from './cafe-room-config.js?v=room004';

let roomRoot = null;
let viewport = null;
let stage = null;
let player = null;
let drawer = null;
let drawerTitle = null;
let drawerCopy = null;
let drawerActions = null;
let prompt = null;
let moveMarker = null;
let joystick = null;
let joystickKnob = null;
let nearbyTarget = null;
let movementTimer = null;
let playerPosition = { ...ROOM_DEFAULTS.player };
let joystickPointerId = null;
let joystickVector = { x: 0, y: 0 };
let joystickFrame = null;
let joystickLastStep = 0;
let bumpTimer = null;

const COLLISION_ZONES = [
  { id: 'dessert-cabinet', minX: 13, maxX: 39, minY: 44, maxY: 67 },
  { id: 'counter', minX: 54, maxX: 77, minY: 43, maxY: 68 },
  { id: 'central-table', minX: 38, maxX: 57, minY: 57, maxY: 77 },
  { id: 'lower-shelf', minX: 72, maxX: 92, minY: 71, maxY: 90 },
];

const SAFE_APPROACHES = {
  rowan: { x: 61, y: 73 },
  menu: { x: 28, y: 71 },
  cabinet: { x: 31, y: 72 },
  quest: { x: 49, y: 52 },
  order: { x: 61, y: 72 },
  kitchen: { x: 16, y: 57 },
  backyard: { x: 87, y: 58 },
  table: { x: 47, y: 82 },
  catlamp: { x: 52, y: 84 },
  stairs: { x: 77, y: 56 },
};

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function distance(a, b) { return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y)); }
function getApproach(targetId, object = OBJECTS[targetId]) { return SAFE_APPROACHES[targetId] || object?.approach || object; }

function ensureStylesheet() {
  if (document.querySelector('link[data-cafe-room-v2]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './cafe-room-v2.css?v=room004';
  link.dataset.cafeRoomV2 = 'true';
  document.head.appendChild(link);
}

function setGlobalDialogue(speaker, place, text) {
  const speakerName = document.querySelector('#speakerName');
  const placeName = document.querySelector('#placeName');
  const dialogueText = document.querySelector('#dialogueText');
  const portrait = document.querySelector('.npc-portrait');
  if (speakerName) speakerName.textContent = speaker;
  if (placeName) placeName.textContent = place;
  if (dialogueText) dialogueText.textContent = text;
  if (portrait) portrait.textContent = speaker === '米洛' ? '🐾' : speaker === '貓貓燈' ? '✨' : '☕';
}

function setMarker(position) {
  if (!moveMarker) return;
  moveMarker.style.left = `${position.x}%`;
  moveMarker.style.top = `${position.y}%`;
  moveMarker.classList.remove('is-active');
  window.requestAnimationFrame(() => moveMarker.classList.add('is-active'));
}

function updatePlayerVisual(next, previous = playerPosition) {
  if (!player) return;
  const range = ROOM_DEFAULTS.walkBounds.maxY - ROOM_DEFAULTS.walkBounds.minY;
  const scale = 0.78 + ((next.y - ROOM_DEFAULTS.walkBounds.minY) / range) * 0.28;
  const direction = next.x < previous.x ? -1 : next.x > previous.x ? 1 : Number(player.dataset.facing || 1);
  player.dataset.facing = String(direction || 1);
  player.style.left = `${next.x}%`;
  player.style.top = `${next.y}%`;
  player.style.zIndex = String(70 + Math.round(next.y));
  player.style.setProperty('--milo-scale', scale.toFixed(3));
  player.classList.toggle('is-facing-left', direction < 0);
}

function keepPlayerInView() {
  if (!viewport || !stage || !player) return;
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  const desiredLeft = clamp((playerPosition.x / 100) * stageWidth - viewport.clientWidth / 2, 0, Math.max(0, stageWidth - viewport.clientWidth));
  const desiredTop = clamp((playerPosition.y / 100) * stageHeight - viewport.clientHeight * .62, 0, Math.max(0, stageHeight - viewport.clientHeight));
  viewport.scrollTo({ left: desiredLeft, top: desiredTop, behavior: 'smooth' });
}

function isBlocked(position) {
  return COLLISION_ZONES.some((zone) => (
    position.x >= zone.minX
    && position.x <= zone.maxX
    && position.y >= zone.minY
    && position.y <= zone.maxY
  ));
}

function resolveCollision(previous, desired) {
  if (!isBlocked(desired)) return desired;
  const xOnly = { x: desired.x, y: previous.y };
  if (!isBlocked(xOnly)) return xOnly;
  const yOnly = { x: previous.x, y: desired.y };
  if (!isBlocked(yOnly)) return yOnly;
  return previous;
}

function traceReachablePosition(previous, desired) {
  const totalDistance = distance(previous, desired);
  const steps = Math.max(1, Math.ceil(totalDistance / 1.15));
  let current = { ...previous };

  for (let index = 1; index <= steps; index += 1) {
    const ratio = index / steps;
    const candidate = {
      x: previous.x + (desired.x - previous.x) * ratio,
      y: previous.y + (desired.y - previous.y) * ratio,
    };
    const resolved = resolveCollision(current, candidate);
    if (distance(current, resolved) < 0.01 && isBlocked(candidate)) break;
    current = resolved;
  }

  return current;
}

function bumpPlayer() {
  if (!player) return;
  window.clearTimeout(bumpTimer);
  player.classList.remove('is-bumped');
  window.requestAnimationFrame(() => player.classList.add('is-bumped'));
  bumpTimer = window.setTimeout(() => player?.classList.remove('is-bumped'), 220);
}

function findNearestObject(position = playerPosition) {
  return Object.entries(OBJECTS)
    .map(([id, object]) => ({ id, object, dist: distance(position, getApproach(id, object)) }))
    .sort((a, b) => a.dist - b.dist)[0] || null;
}

function syncNearbyTarget() {
  const nearest = findNearestObject();
  nearbyTarget = nearest && nearest.dist <= 9.5 ? nearest.id : null;
  if (!prompt) return;
  if (!nearbyTarget) {
    prompt.hidden = true;
    prompt.removeAttribute('data-target-kind');
    prompt.removeAttribute('data-target-id');
    return;
  }
  const object = OBJECTS[nearbyTarget];
  prompt.hidden = false;
  prompt.dataset.targetKind = object.kind || 'fixture';
  prompt.dataset.targetId = nearbyTarget;
  prompt.innerHTML = `<span>${object.kind === 'npc' ? '💬' : object.kind === 'door' ? '🚪' : '✦'}</span><b>${object.prompt || `互動：${object.label}`}</b>`;
  if (!prompt.parentElement?.classList.contains('cafe-room-playfield')) {
    prompt.style.left = `${clamp(playerPosition.x + 1.5, 7, 92)}%`;
    prompt.style.top = `${clamp(playerPosition.y - 12, 34, 84)}%`;
  } else {
    prompt.style.removeProperty('left');
    prompt.style.removeProperty('top');
  }
}

function movePlayer(nextPosition, options = {}) {
  const bounds = ROOM_DEFAULTS.walkBounds;
  const previous = { ...playerPosition };
  const desired = {
    x: clamp(Number(nextPosition.x), bounds.minX, bounds.maxX),
    y: clamp(Number(nextPosition.y), bounds.minY, bounds.maxY),
  };
  const next = traceReachablePosition(previous, desired);
  const wasBlocked = distance(next, desired) > 0.12;
  const travelled = distance(previous, next);
  const duration = Number(options.duration || clamp(travelled * 25, 90, 720));

  window.clearTimeout(movementTimer);

  if (travelled < 0.01) {
    if (wasBlocked) bumpPlayer();
    syncNearbyTarget();
    return false;
  }

  playerPosition = next;
  if (player) {
    player.style.setProperty('--walk-duration', `${duration}ms`);
    player.classList.add('is-walking');
  }
  updatePlayerVisual(next, previous);
  if (options.showMarker !== false) setMarker(next);
  if (wasBlocked) bumpPlayer();

  movementTimer = window.setTimeout(() => {
    player?.classList.remove('is-walking');
    syncNearbyTarget();
    if (options.keepInView !== false) keepPlayerInView();
    if (options.targetId) {
      const object = OBJECTS[options.targetId];
      if (object && distance(playerPosition, getApproach(options.targetId, object)) <= 10.5) openInteraction(options.targetId);
    }
  }, duration + 18);

  return true;
}

function getResolvedActions(targetId) {
  const object = OBJECTS[targetId];
  if (!object) return [];
  const chapterComplete = Boolean(getState().story?.chapter1Completed);
  return object.actions.map((action) => {
    if (action.id === 'hug' && chapterComplete) return { ...action, locked: false, lockText: '' };
    if (action.id === 'locked-upstairs' && chapterComplete) {
      return { ...action, id: 'visit-milo-room', label: '米洛的房間', icon: '🛏️', locked: false, lockText: '' };
    }
    return action;
  });
}

function renderActions(targetId) {
  if (!drawerActions) return;
  drawerActions.innerHTML = getResolvedActions(targetId).map((action) => `
    <button type="button" data-cafe-action="${action.id}" ${action.locked ? 'disabled' : ''}>
      <span>${action.icon || '✦'}</span><b>${action.label}</b>${action.locked ? `<small>${action.lockText || '尚未解鎖'}</small>` : ''}
    </button>`).join('');
}

function openInteraction(targetId) {
  const object = OBJECTS[targetId];
  if (!object || !drawer) return;
  document.querySelectorAll('[data-cafe-object]').forEach((element) => element.classList.toggle('is-selected', element.dataset.cafeObject === targetId));
  drawer.dataset.cafeTarget = targetId;
  if (drawerTitle) drawerTitle.textContent = object.label;
  if (drawerCopy) drawerCopy.textContent = object.intro;
  renderActions(targetId);
  drawer.hidden = false;
  drawer.classList.remove('is-open');
  window.requestAnimationFrame(() => drawer.classList.add('is-open'));
  setGlobalDialogue(object.kind === 'npc' ? object.label : '米洛', object.label, object.intro);
}

function closeInteraction() {
  drawer?.classList.remove('is-open');
  if (drawer) delete drawer.dataset.cafeTarget;
  document.querySelectorAll('[data-cafe-object].is-selected').forEach((element) => element.classList.remove('is-selected'));
  window.setTimeout(() => { if (drawer && !drawer.classList.contains('is-open')) drawer.hidden = true; }, 160);
}

function showMenuModal() {
  showModal(`<div class="core-modal-card cafe-room-modal"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">TODAY'S MENU</span><h2>今日菜單</h2><div class="cafe-room-menu-list"><article><span>🌙</span><div><b>月光花瓣拿鐵</b><p>溫和、安定，帶著很淡的花香。</p></div></article><article><span>⭐</span><div><b>星星莓奶油塔</b><p>甜中帶酸，表面會閃著細小金光。</p></div></article><article><span>🌌</span><div><b>夜空碎片可可</b><p>喝到最後一口時，杯底會浮出星點。</p></div></article></div></div>`);
}

function showOrderModal() {
  showModal(`<div class="core-modal-card cafe-room-modal compact"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">ORDERS</span><h2>今天的客人訂單</h2><p>目前沒有等待交付的特殊訂單。正式營業系統接上後，這裡會顯示待確認、製作中與已完成項目。</p></div>`);
}

function showMiloRoomModal() {
  showModal(`<div class="core-modal-card cafe-room-modal compact milo-room-preview"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">NEW PLACE</span><div class="gather-result-icon">🛏️</div><h2>米洛的房間</h2><p>房間還留著新曬過的棉被香氣。窗邊放著一盞小燈，桌上則有洛溫準備好的乾淨衣服與熱水。</p><p class="core-modal-note">正式房間場景會在後續版本加入；現在已經記錄為米洛的新歸處。</p><button type="button" data-close-modal>回到咖啡廳</button></div>`);
}

function handleAction(actionId) {
  const copy = (speaker, place, text, drawerText) => {
    setGlobalDialogue(speaker, place, text);
    if (drawerCopy && drawerText) drawerCopy.textContent = drawerText;
  };
  switch (actionId) {
    case 'talk': copy('洛溫', '櫃檯旁', '「怎麼了？今天想先做什麼？」金色長髮隨著他的動作滑過肩後。', '店長今天看起來心情不錯，願意停下來陪米洛說話。'); break;
    case 'status': copy('洛溫', '櫃檯旁', '「只是有些累，沒有大礙。」他說得很自然，卻沒有立刻移開視線。', '米洛總覺得店長把疲倦藏得太好了。'); break;
    case 'help': copy('洛溫', '店內工作', '「那就幫我把桌上的杯子收回來。做完再來找我。」', '新的小目標：整理中央座位。'); break;
    case 'hug': copy('洛溫', '店內', '「過來。」洛溫張開手，讓米洛整個埋進自己懷裡。', '抱抱已解鎖。米洛隨時都可以來找店長。'); break;
    case 'view-menu': showMenuModal(); break;
    case 'recommend': copy('洛溫', '今日推薦', '「今天適合你的是星星莓奶油塔。酸一點，剛好能讓你打起精神。」', '洛溫甚至沒有翻菜單，就選好了米洛今天適合吃的東西。'); break;
    case 'browse-shop': closeInteraction(); navigate('shop'); break;
    case 'peek-dessert': copy('洛溫', '甜點展示櫃', '「只准看，不准趁我轉身時偷吃。」', '米洛明明還什麼都沒做，卻已經被店長看穿了。'); break;
    case 'open-commissions': closeInteraction(); navigate('commissions'); break;
    case 'read-request': copy('米洛', '委託板', '其中一張委託想要「能讓做惡夢的人安心睡著的甜點」。', '這張委託似乎會和月光花瓣很合適。'); break;
    case 'view-orders': showOrderModal(); break;
    case 'wipe-counter': copy('洛溫', '櫃檯', '「很乾淨。做得好。」洛溫順手揉了一下米洛的頭。', '櫃檯被整理乾淨了，米洛也得到了一次摸頭。'); break;
    case 'go-kitchen': closeInteraction(); navigate('kitchen'); break;
    case 'go-backyard': closeInteraction(); navigate('backyard'); break;
    case 'rest': copy('洛溫', '中央座位', '「累了就坐著。店裡不是每一刻都需要你忙。」', '米洛坐下休息，午後的光落在綠色圍裙上。'); break;
    case 'inspect-table': copy('米洛', '中央座位', '桌角壓著一張洛溫寫的便條：記得吃午餐。', '字很簡短，但顯然是特別留給米洛的。'); break;
    case 'pet-catlamp': copy('貓貓燈', '店內', '貓貓燈舒服地瞇起光點，在米洛掌心輕輕蹭了兩下。', '貓貓燈今天也很喜歡米洛。'); break;
    case 'charge-catlamp': copy('米洛', '店內', '米洛把窗邊收集到的一點星光放進燈芯，貓貓燈立刻亮了起來。', '燈光變得更溫暖了。'); break;
    case 'visit-milo-room': showMiloRoomModal(); break;
    default: break;
  }
}

function moveToObject(targetId) {
  const object = OBJECTS[targetId];
  if (!object) return;
  closeInteraction();
  movePlayer(getApproach(targetId, object), { targetId });
}

function stagePointFromEvent(event) {
  const rect = stage.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
}

function stepPlayer(direction, amount = 3.8) {
  const next = { ...playerPosition };
  if (direction === 'left') next.x -= amount;
  if (direction === 'right') next.x += amount;
  if (direction === 'up') next.y -= amount * .8;
  if (direction === 'down') next.y += amount * .8;
  closeInteraction();
  movePlayer(next, { showMarker: false, duration: 110 });
}

function handleKeydown(event) {
  const keyMap = { ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down' };
  const direction = keyMap[event.key];
  if (direction) { event.preventDefault(); stepPlayer(direction); return; }
  if ((event.key === 'Enter' || event.key === 'e' || event.key === 'E') && nearbyTarget) { event.preventDefault(); openInteraction(nearbyTarget); }
  if (event.key === 'Escape') closeInteraction();
}

function resetJoystick() {
  joystickPointerId = null;
  joystickVector = { x: 0, y: 0 };
  if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
  if (joystickFrame) window.cancelAnimationFrame(joystickFrame);
  joystickFrame = null;
  player?.classList.remove('is-walking');
  syncNearbyTarget();
}

function updateJoystick(event) {
  const ring = joystick?.querySelector('.cafe-joystick-ring');
  if (!ring || !joystickKnob) return;
  const rect = ring.getBoundingClientRect();
  const maxRadius = rect.width * .31;
  let dx = event.clientX - (rect.left + rect.width / 2);
  let dy = event.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(dx, dy) || 1;
  if (length > maxRadius) { dx = (dx / length) * maxRadius; dy = (dy / length) * maxRadius; }
  joystickVector = { x: dx / maxRadius, y: dy / maxRadius };
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function joystickTick(timestamp) {
  if (joystickPointerId === null) return;
  if (timestamp - joystickLastStep > 46) {
    joystickLastStep = timestamp;
    const strength = Math.min(1, Math.hypot(joystickVector.x, joystickVector.y));
    if (strength > .12) {
      closeInteraction();
      movePlayer({ x: playerPosition.x + joystickVector.x * 1.25, y: playerPosition.y + joystickVector.y * 1.05 }, { showMarker: false, duration: 80 });
      syncNearbyTarget();
    }
  }
  joystickFrame = window.requestAnimationFrame(joystickTick);
}

function bindJoystick() {
  if (!joystick || !joystickKnob) return;
  joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    joystickPointerId = event.pointerId;
    joystick.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
    joystickLastStep = 0;
    if (!joystickFrame) joystickFrame = window.requestAnimationFrame(joystickTick);
  });
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== joystickPointerId) return;
    event.preventDefault();
    updateJoystick(event);
  });
  const end = (event) => { if (event.pointerId === joystickPointerId) resetJoystick(); };
  joystick.addEventListener('pointerup', end);
  joystick.addEventListener('pointercancel', end);
  joystick.addEventListener('lostpointercapture', resetJoystick);
}

function observeRoomVisibility() {
  const pageHome = document.querySelector('#page-home');
  if (!pageHome || pageHome.dataset.cafeRoomObserved === 'true') return;
  pageHome.dataset.cafeRoomObserved = 'true';
  const sync = () => {
    if (pageHome.classList.contains('inside-mode')) {
      const chapterComplete = Boolean(getState().story?.chapter1Completed);
      setGlobalDialogue(
        chapterComplete ? '洛溫' : '任務',
        '半月琥珀・店內',
        chapterComplete ? '「歡迎回來。想先在店裡走走，還是來找我？」' : '先走到金色長髮的店長身邊，和洛溫說話。',
      );
      window.setTimeout(() => { keepPlayerInView(); viewport?.focus({ preventScroll:true }); syncNearbyTarget(); }, 40);
      return;
    }
    closeInteraction();
    resetJoystick();
  };
  new MutationObserver(sync).observe(pageHome, { attributes:true, attributeFilter:['class'] });
  sync();
}

function bindRoomEvents() {
  stage?.addEventListener('click', (event) => {
    const objectButton = event.target.closest('[data-cafe-object]');
    if (objectButton) { event.preventDefault(); event.stopPropagation(); moveToObject(objectButton.dataset.cafeObject); return; }
    if (event.target.closest('[data-cafe-interact]')) return;
    closeInteraction();
    movePlayer(stagePointFromEvent(event));
  });
  viewport?.addEventListener('keydown', handleKeydown);
  roomRoot?.addEventListener('click', (event) => {
    const focusButton = event.target.closest('[data-cafe-focus]');
    if (focusButton) { moveToObject(focusButton.dataset.cafeFocus); return; }
    if (event.target.closest('[data-cafe-drawer-close]')) { closeInteraction(); return; }
    if (event.target.closest('[data-cafe-interact]') && nearbyTarget) { openInteraction(nearbyTarget); return; }
    const actionButton = event.target.closest('[data-cafe-action]');
    if (actionButton && !actionButton.disabled) handleAction(actionButton.dataset.cafeAction);
  });
  document.addEventListener('cafe-story-updated', () => {
    const targetId = drawer?.dataset.cafeTarget;
    if (targetId) renderActions(targetId);
  });
  bindJoystick();
}

export function initCafeRoomV2() {
  roomRoot = document.querySelector('#cafeInside');
  if (!roomRoot || roomRoot.dataset.roomV2Ready === 'true') return;
  roomRoot.dataset.roomV2Ready = 'true';
  ensureStylesheet();
  roomRoot.innerHTML = renderRoomMarkup();
  viewport = roomRoot.querySelector('[data-cafe-viewport]');
  stage = roomRoot.querySelector('[data-cafe-stage]');
  player = roomRoot.querySelector('[data-cafe-player]');
  drawer = roomRoot.querySelector('[data-cafe-drawer]');
  drawerTitle = roomRoot.querySelector('[data-cafe-drawer-title]');
  drawerCopy = roomRoot.querySelector('[data-cafe-drawer-copy]');
  drawerActions = roomRoot.querySelector('[data-cafe-drawer-actions]');
  prompt = roomRoot.querySelector('[data-cafe-interact]');
  moveMarker = roomRoot.querySelector('[data-cafe-move-marker]');
  joystick = roomRoot.querySelector('[data-cafe-joystick]');
  joystickKnob = roomRoot.querySelector('[data-cafe-joystick-knob]');
  updatePlayerVisual(playerPosition, playerPosition);
  bindRoomEvents();
  observeRoomVisibility();
  window.setTimeout(() => { keepPlayerInView(); viewport?.focus({ preventScroll:true }); }, 60);
}
