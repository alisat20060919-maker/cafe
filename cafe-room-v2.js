import { navigate } from '@router';
import { showModal } from '@ui';
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
let overlayInteract = null;
let moveMarker = null;
let joystick = null;
let joystickStick = null;
let nearbyTarget = null;
let movementTimer = null;
let playerPosition = { ...ROOM_DEFAULTS.player };
let joystickPointerId = null;
let joystickVector = { x: 0, y: 0 };
let joystickFrame = null;
let joystickLastTime = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}

function ensureStylesheet() {
  const previous = document.querySelector('link[data-cafe-room-v2]');
  if (previous?.getAttribute('href')?.includes('cafe-room-v3.css')) return;
  previous?.remove();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './cafe-room-v3.css?v=room004';
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
  player.style.zIndex = String(80 + Math.round(next.y));
  player.style.setProperty('--milo-scale', scale.toFixed(3));
  player.classList.toggle('is-facing-left', direction < 0);
}

function keepPlayerInView(behavior = 'smooth') {
  if (!viewport || !stage || !player) return;
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  const targetX = (playerPosition.x / 100) * stageWidth;
  const targetY = (playerPosition.y / 100) * stageHeight;
  const left = clamp(targetX - viewport.clientWidth / 2, 0, Math.max(0, stageWidth - viewport.clientWidth));
  const top = clamp(targetY - viewport.clientHeight * 0.58, 0, Math.max(0, stageHeight - viewport.clientHeight));
  viewport.scrollTo({ left, top, behavior });
}

function findNearestObject(position = playerPosition) {
  return Object.entries(OBJECTS)
    .map(([id, object]) => ({ id, object, dist: distance(position, object.approach || object) }))
    .sort((a, b) => a.dist - b.dist)[0] || null;
}

function syncNearbyTarget() {
  const nearest = findNearestObject();
  nearbyTarget = nearest && nearest.dist <= 9.5 ? nearest.id : null;
  const object = nearbyTarget ? OBJECTS[nearbyTarget] : null;

  if (prompt) {
    prompt.hidden = !object;
    if (object) {
      prompt.textContent = object.prompt || `互動：${object.label}`;
      prompt.style.left = `${clamp(playerPosition.x + 1.5, 7, 92)}%`;
      prompt.style.top = `${clamp(playerPosition.y - 13, 39, 82)}%`;
    }
  }

  if (overlayInteract) {
    overlayInteract.hidden = !object;
    overlayInteract.textContent = object ? `互動｜${object.label}` : '互動';
  }
}

function stopAutomatedMovement() {
  window.clearTimeout(movementTimer);
  movementTimer = null;
  player?.classList.remove('is-walking');
}

function movePlayer(nextPosition, options = {}) {
  const bounds = ROOM_DEFAULTS.walkBounds;
  const next = {
    x: clamp(Number(nextPosition.x), bounds.minX, bounds.maxX),
    y: clamp(Number(nextPosition.y), bounds.minY, bounds.maxY),
  };
  const previous = { ...playerPosition };
  const duration = clamp(distance(previous, next) * 28, 140, 850);
  stopAutomatedMovement();
  playerPosition = next;
  if (player) {
    player.style.setProperty('--walk-duration', `${duration}ms`);
    player.classList.add('is-walking');
  }
  updatePlayerVisual(next, previous);
  setMarker(next);
  movementTimer = window.setTimeout(() => {
    player?.classList.remove('is-walking');
    syncNearbyTarget();
    keepPlayerInView();
    if (options.targetId) openInteraction(options.targetId);
  }, duration + 20);
}

function movePlayerImmediate(dx, dy, deltaSeconds) {
  const bounds = ROOM_DEFAULTS.walkBounds;
  const previous = { ...playerPosition };
  const speedX = 19;
  const speedY = 15;
  const next = {
    x: clamp(previous.x + dx * speedX * deltaSeconds, bounds.minX, bounds.maxX),
    y: clamp(previous.y + dy * speedY * deltaSeconds, bounds.minY, bounds.maxY),
  };
  playerPosition = next;
  if (player) {
    player.style.setProperty('--walk-duration', '0ms');
    player.classList.add('is-walking');
  }
  updatePlayerVisual(next, previous);
  syncNearbyTarget();
  keepPlayerInView('auto');
}

function renderActions(targetId) {
  if (!drawerActions) return;
  const object = OBJECTS[targetId];
  drawerActions.innerHTML = object.actions.map((action) => `
    <button type="button" data-cafe-action="${action.id}" ${action.locked ? 'disabled' : ''}>
      <span>${action.icon || '✦'}</span>
      <b>${action.label}</b>
      ${action.locked ? `<small>${action.lockText || '尚未解鎖'}</small>` : ''}
    </button>
  `).join('');
}

function openInteraction(targetId) {
  const object = OBJECTS[targetId];
  if (!object || !drawer) return;
  stopJoystick();
  document.querySelectorAll('[data-cafe-object]').forEach((element) => {
    element.classList.toggle('is-selected', element.dataset.cafeObject === targetId);
  });
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
  document.querySelectorAll('[data-cafe-object].is-selected').forEach((element) => element.classList.remove('is-selected'));
  window.setTimeout(() => {
    if (drawer && !drawer.classList.contains('is-open')) drawer.hidden = true;
  }, 160);
}

function showMenuModal() {
  showModal(`
    <div class="core-modal-card cafe-room-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">TODAY'S MENU</span>
      <h2>今日菜單</h2>
      <div class="cafe-room-menu-list">
        <article><span>🌙</span><div><b>月光花瓣拿鐵</b><p>溫和、安定，帶著很淡的花香。</p></div></article>
        <article><span>⭐</span><div><b>星星莓奶油塔</b><p>甜中帶酸，表面會閃著細小金光。</p></div></article>
        <article><span>🌌</span><div><b>夜空碎片可可</b><p>喝到最後一口時，杯底會浮出星點。</p></div></article>
      </div>
    </div>
  `);
}

function showOrderModal() {
  showModal(`
    <div class="core-modal-card cafe-room-modal compact">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">ORDERS</span>
      <h2>今天的客人訂單</h2>
      <p>目前沒有等待交付的特殊訂單。正式營業系統接上後，這裡會顯示待確認、製作中與已完成項目。</p>
    </div>
  `);
}

function handleAction(actionId) {
  const copy = (speaker, place, text, drawerText) => {
    setGlobalDialogue(speaker, place, text);
    if (drawerCopy && drawerText) drawerCopy.textContent = drawerText;
  };
  switch (actionId) {
    case 'talk':
      copy('洛溫', '櫃檯旁', '「怎麼了？今天想先做什麼？」金色長髮從肩後滑下，他把杯子放好，安靜等著米洛回答。', '洛溫今天看起來心情不錯，願意停下來陪米洛說話。');
      break;
    case 'status':
      copy('洛溫', '櫃檯旁', '「只是有些累，沒有大礙。」他說得很自然，卻沒有立刻移開視線。', '米洛總覺得店長把疲倦藏得太好了。');
      break;
    case 'help':
      copy('洛溫', '店內工作', '「那就幫我把桌上的杯子收回來。做完再來找我。」', '新的小目標：整理中央座位。');
      break;
    case 'view-menu':
      showMenuModal();
      break;
    case 'recommend':
      copy('洛溫', '今日推薦', '「今天適合你的是星星莓奶油塔。酸一點，剛好能讓你打起精神。」', '洛溫甚至沒有翻菜單，就選好了米洛今天適合吃的東西。');
      break;
    case 'browse-shop':
      closeInteraction();
      navigate('shop');
      break;
    case 'peek-dessert':
      copy('洛溫', '甜點展示櫃', '「只准看，不准趁我轉身時偷吃。」', '米洛明明還什麼都沒做，卻已經被店長看穿了。');
      break;
    case 'open-commissions':
      closeInteraction();
      navigate('commissions');
      break;
    case 'read-request':
      copy('米洛', '委託板', '其中一張委託想要「能讓做惡夢的人安心睡著的甜點」。', '這張委託似乎會和月光花瓣很合適。');
      break;
    case 'view-orders':
      showOrderModal();
      break;
    case 'wipe-counter':
      copy('洛溫', '櫃檯', '「很乾淨。做得好。」洛溫順手揉了一下米洛的頭。', '櫃檯被整理乾淨了，米洛也得到了一次摸頭。');
      break;
    case 'go-kitchen':
      closeInteraction();
      navigate('kitchen');
      break;
    case 'go-backyard':
      closeInteraction();
      navigate('backyard');
      break;
    case 'rest':
      copy('洛溫', '中央座位', '「累了就坐著。店裡不是每一刻都需要你忙。」', '米洛坐下休息，窗邊的光落在綠色圍裙上。');
      break;
    case 'inspect-table':
      copy('米洛', '中央座位', '桌角壓著一張洛溫寫的便條：記得吃午餐。', '字很簡短，但顯然是特別留給米洛的。');
      break;
    case 'pet-catlamp':
      copy('貓貓燈', '店內', '貓貓燈舒服地瞇起光點，在米洛掌心輕輕蹭了兩下。', '貓貓燈今天也很喜歡米洛。');
      break;
    case 'charge-catlamp':
      copy('米洛', '店內', '米洛把窗邊收集到的一點星光放進燈芯，貓貓燈立刻亮了起來。', '燈光變得更溫暖了。');
      break;
    default:
      break;
  }
}

function moveToObject(targetId) {
  const object = OBJECTS[targetId];
  if (!object) return;
  closeInteraction();
  movePlayer(object.approach || object, { targetId });
}

function stagePointFromEvent(event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function stepPlayer(direction) {
  const delta = direction === 'left' || direction === 'right' ? 4.5 : 3.6;
  const next = { ...playerPosition };
  if (direction === 'left') next.x -= delta;
  if (direction === 'right') next.x += delta;
  if (direction === 'up') next.y -= delta;
  if (direction === 'down') next.y += delta;
  closeInteraction();
  movePlayer(next);
}

function handleKeydown(event) {
  const keyMap = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
  };
  const direction = keyMap[event.key];
  if (direction) {
    event.preventDefault();
    stepPlayer(direction);
    return;
  }
  if ((event.key === 'Enter' || event.key === 'e' || event.key === 'E') && nearbyTarget) {
    event.preventDefault();
    openInteraction(nearbyTarget);
  }
  if (event.key === 'Escape') closeInteraction();
}

function joystickLoop(time) {
  if (joystickPointerId === null) return;
  const elapsed = Math.min(40, Math.max(0, time - (joystickLastTime || time)));
  joystickLastTime = time;
  if (Math.abs(joystickVector.x) > 0.05 || Math.abs(joystickVector.y) > 0.05) {
    movePlayerImmediate(joystickVector.x, joystickVector.y, elapsed / 1000);
  }
  joystickFrame = window.requestAnimationFrame(joystickLoop);
}

function updateJoystickFromPointer(event) {
  if (!joystick || !joystickStick) return;
  const base = joystick.querySelector('.cafe-joystick-base');
  const rect = base.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const radius = rect.width * 0.34;
  const length = Math.hypot(rawX, rawY) || 1;
  const limited = Math.min(length, radius);
  const x = (rawX / length) * limited;
  const y = (rawY / length) * limited;
  joystickStick.style.transform = `translate(${x}px, ${y}px)`;
  joystickVector = { x: clamp(rawX / radius, -1, 1), y: clamp(rawY / radius, -1, 1) };
}

function startJoystick(event) {
  if (!joystick || joystickPointerId !== null) return;
  event.preventDefault();
  stopAutomatedMovement();
  closeInteraction();
  joystickPointerId = event.pointerId;
  joystick.setPointerCapture?.(event.pointerId);
  joystick.classList.add('is-active');
  updateJoystickFromPointer(event);
  joystickLastTime = performance.now();
  joystickFrame = window.requestAnimationFrame(joystickLoop);
}

function stopJoystick(event) {
  if (event && joystickPointerId !== null && event.pointerId !== joystickPointerId) return;
  if (joystickFrame) window.cancelAnimationFrame(joystickFrame);
  joystickFrame = null;
  joystickPointerId = null;
  joystickVector = { x: 0, y: 0 };
  joystickLastTime = 0;
  joystick?.classList.remove('is-active');
  if (joystickStick) joystickStick.style.transform = 'translate(0, 0)';
  player?.classList.remove('is-walking');
  syncNearbyTarget();
  keepPlayerInView('smooth');
}

function bindJoystick() {
  if (!joystick || joystick.dataset.bound === 'true') return;
  joystick.dataset.bound = 'true';
  joystick.addEventListener('pointerdown', startJoystick);
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId === joystickPointerId) updateJoystickFromPointer(event);
  });
  joystick.addEventListener('pointerup', stopJoystick);
  joystick.addEventListener('pointercancel', stopJoystick);
  joystick.addEventListener('lostpointercapture', stopJoystick);
}

function observeRoomVisibility() {
  const pageHome = document.querySelector('#page-home');
  if (!pageHome || pageHome.dataset.cafeRoomObserved === 'true') return;
  pageHome.dataset.cafeRoomObserved = 'true';
  const sync = () => {
    if (pageHome.classList.contains('inside-mode')) {
      setGlobalDialogue('洛溫', '半月琥珀・店內', '「歡迎回來。想先在店裡走走，還是來找我？」');
      window.setTimeout(() => {
        keepPlayerInView('auto');
        viewport?.focus({ preventScroll: true });
      }, 40);
      return;
    }
    stopJoystick();
    closeInteraction();
  };
  new MutationObserver(sync).observe(pageHome, { attributes: true, attributeFilter: ['class'] });
  sync();
}

function bindRoomEvents() {
  stage?.addEventListener('click', (event) => {
    const objectButton = event.target.closest('[data-cafe-object]');
    if (objectButton) {
      event.preventDefault();
      event.stopPropagation();
      moveToObject(objectButton.dataset.cafeObject);
      return;
    }
    if (event.target.closest('[data-cafe-interact]')) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    closeInteraction();
    movePlayer(stagePointFromEvent(event));
  });

  viewport?.addEventListener('keydown', handleKeydown);

  roomRoot?.addEventListener('click', (event) => {
    const focusButton = event.target.closest('[data-cafe-focus]');
    if (focusButton) {
      moveToObject(focusButton.dataset.cafeFocus);
      return;
    }
    if (event.target.closest('[data-cafe-drawer-close]')) {
      closeInteraction();
      return;
    }
    if ((event.target.closest('[data-cafe-interact]') || event.target.closest('[data-cafe-interact-overlay]')) && nearbyTarget) {
      openInteraction(nearbyTarget);
      return;
    }
    const actionButton = event.target.closest('[data-cafe-action]');
    if (actionButton && !actionButton.disabled) handleAction(actionButton.dataset.cafeAction);
  });
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
  overlayInteract = roomRoot.querySelector('[data-cafe-interact-overlay]');
  moveMarker = roomRoot.querySelector('[data-cafe-move-marker]');
  joystick = roomRoot.querySelector('[data-cafe-joystick]');
  joystickStick = roomRoot.querySelector('[data-cafe-joystick-stick]');
  updatePlayerVisual(playerPosition, playerPosition);
  bindJoystick();
  bindRoomEvents();
  observeRoomVisibility();
  window.setTimeout(() => {
    keepPlayerInView('auto');
    viewport?.focus({ preventScroll: true });
  }, 60);
}
