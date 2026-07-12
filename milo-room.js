import { getState, persistState } from '@state';

let roomRoot = null;
let pageHome = null;
let cafeHead = null;
let cafeScene = null;
let roomView = null;
let roomScene = null;
let noteTitle = null;
let noteText = null;
let previousFocus = null;
let observer = null;

function ensureStylesheet() {
  if (document.querySelector('link[data-milo-room]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './milo-room.css?v=room001';
  link.dataset.miloRoom = 'true';
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
  if (portrait) portrait.textContent = speaker === '米洛' ? '🐾' : '🛏️';
}

function setRoomNote(title, text) {
  if (noteTitle) noteTitle.textContent = title;
  if (noteText) noteText.textContent = text;
}

function renderMiloRoomMarkup() {
  return `
    <section class="milo-room-view" data-milo-room-view hidden aria-label="米洛的房間">
      <div class="inside-head milo-room-head">
        <div>
          <p class="inside-label">HALFMOON AMBER · SECOND FLOOR</p>
          <h2 class="inside-title">米洛的房間</h2>
          <p class="inside-subtitle">第一章完成後解鎖。這裡是第一次真正屬於米洛的地方。</p>
        </div>
        <button class="inside-back" type="button" data-milo-room-back>返回咖啡廳</button>
      </div>

      <section class="milo-room-shell">
        <div class="milo-room-toolbar">
          <div><span>NEW PLACE</span><b>二樓的小房間</b></div>
          <p>點擊房間裡的物件，看看洛溫替米洛準備了什麼。</p>
        </div>

        <div class="milo-room-scene" data-milo-room-scene tabindex="0" aria-label="米洛房間場景">
          <div class="milo-room-wall-beam beam-left"></div>
          <div class="milo-room-wall-beam beam-right"></div>
          <div class="milo-room-window" aria-hidden="true">
            <span class="milo-room-sky"></span>
            <i class="milo-room-star star-one"></i>
            <i class="milo-room-star star-two"></i>
            <i class="milo-room-moon"></i>
            <b class="milo-room-curtain curtain-left"></b>
            <b class="milo-room-curtain curtain-right"></b>
          </div>

          <div class="milo-room-bed" aria-hidden="true">
            <span class="milo-room-headboard"></span>
            <span class="milo-room-mattress"></span>
            <span class="milo-room-pillow"></span>
            <span class="milo-room-blanket"></span>
            <span class="milo-room-bed-leg leg-left"></span>
            <span class="milo-room-bed-leg leg-right"></span>
          </div>

          <div class="milo-room-table" aria-hidden="true">
            <span class="milo-room-table-top"></span>
            <span class="milo-room-table-leg table-leg-left"></span>
            <span class="milo-room-table-leg table-leg-right"></span>
            <span class="milo-room-lamp"><i></i></span>
            <span class="milo-room-cup"></span>
          </div>

          <div class="milo-room-boxes" aria-hidden="true">
            <span class="milo-room-box box-one"></span>
            <span class="milo-room-box box-two"></span>
            <span class="milo-room-folded-cloth"></span>
          </div>

          <div class="milo-room-rug" aria-hidden="true"></div>
          <div class="milo-room-paw" aria-hidden="true">🐾</div>

          <button class="milo-room-hotspot hotspot-bed" type="button" data-milo-room-action="bed">
            <span>🛏️</span><b>坐到床邊</b>
          </button>
          <button class="milo-room-hotspot hotspot-window" type="button" data-milo-room-action="window">
            <span>🌙</span><b>看看窗外</b>
          </button>
          <button class="milo-room-hotspot hotspot-box" type="button" data-milo-room-action="box">
            <span>📦</span><b>整理行李</b>
          </button>
          <button class="milo-room-hotspot hotspot-lamp" type="button" data-milo-room-action="lamp">
            <span>🕯️</span><b>打開小燈</b>
          </button>
        </div>

        <aside class="milo-room-note" aria-live="polite">
          <span>ROOM NOTE</span>
          <h3 data-milo-room-note-title>新的房間</h3>
          <p data-milo-room-note-text>棉被帶著剛曬過的香氣，桌上放著乾淨衣服和一杯還溫著的水。</p>
        </aside>
      </section>
    </section>`;
}

function markStoryFlag(flag, reason) {
  const state = getState();
  state.story ||= {};
  if (state.story[flag]) return;
  state.story[flag] = true;
  persistState(reason);
}

function handleRoomAction(actionId) {
  switch (actionId) {
    case 'bed':
      markStoryFlag('miloRoomBedMomentSeen', 'story:milo-room-bed');
      setRoomNote('第一次屬於自己的床', '米洛慢慢坐到床邊，手指陷進柔軟的棉被裡。這一次，不會有人催他離開。');
      setGlobalDialogue('米洛', '米洛的房間', '「這是第一次，有一個地方真的屬於米洛。」');
      break;
    case 'window':
      setRoomNote('二樓的窗', '從這裡可以看見咖啡屋後方的森林。夜裡，樹梢之間會漂著很小的光。');
      setGlobalDialogue('米洛', '窗邊', '窗外的森林很安靜。就算關上窗，樓下杯盤碰撞的聲音還是讓人安心。');
      break;
    case 'box':
      setRoomNote('還沒整理完的行李', '箱子裡沒有多少東西。洛溫卻在旁邊多放了兩套乾淨衣服，尺寸剛剛好。');
      setGlobalDialogue('米洛', '行李箱旁', '米洛把自己的東西一件件放好。房間也因此一點點變成了「自己的」。');
      break;
    case 'lamp':
      roomView?.classList.toggle('lamp-on');
      setRoomNote('窗邊的小燈', '燈罩裡像是封著一小片黃昏。亮起來時，整個房間都變得很暖。');
      setGlobalDialogue('米洛', '床邊小桌', '小燈亮起後，床邊留下了一圈柔和的金色。');
      break;
    default:
      break;
  }
}

function closeCafeInteraction() {
  const drawer = roomRoot?.querySelector('[data-cafe-drawer]');
  drawer?.classList.remove('is-open');
  if (drawer) {
    drawer.hidden = true;
    delete drawer.dataset.cafeTarget;
  }
  roomRoot?.querySelectorAll('[data-cafe-object].is-selected').forEach((element) => element.classList.remove('is-selected'));
}

function openMiloRoom() {
  if (!roomView || !getState().story?.chapter1Completed) return false;
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  closeCafeInteraction();
  cafeHead = roomRoot?.querySelector('.cafe-room-head');
  cafeScene = roomRoot?.querySelector('.cafe-room-v2');
  if (cafeHead) cafeHead.hidden = true;
  if (cafeScene) cafeScene.hidden = true;
  roomView.hidden = false;
  roomView.classList.remove('is-entering');
  window.requestAnimationFrame(() => roomView.classList.add('is-entering'));
  pageHome?.classList.add('milo-room-mode');
  markStoryFlag('visitedMiloRoom', 'story:milo-room-visited');
  setRoomNote('新的房間', '棉被帶著剛曬過的香氣，桌上放著乾淨衣服和一杯還溫著的水。');
  setGlobalDialogue('米洛', '米洛的房間', '房間很小，卻沒有任何人要求米洛證明自己才可以留下。');
  document.dispatchEvent(new CustomEvent('cafe-milo-room-state', { detail: { active: true } }));
  window.requestAnimationFrame(() => roomScene?.focus({ preventScroll: true }));
  return true;
}

function closeMiloRoom({ restoreFocus = true, silent = false } = {}) {
  if (!roomView || roomView.hidden) return;
  roomView.classList.remove('is-entering');
  roomView.hidden = true;
  pageHome?.classList.remove('milo-room-mode');
  if (cafeHead) cafeHead.hidden = false;
  if (cafeScene) cafeScene.hidden = false;
  document.dispatchEvent(new CustomEvent('cafe-milo-room-state', { detail: { active: false } }));
  if (!silent) setGlobalDialogue('洛溫', '半月琥珀・店內', '「看過房間了？」洛溫抬起眼，像是早就知道米洛會回來找他。');
  if (restoreFocus) previousFocus?.focus?.({ preventScroll: true });
  previousFocus = null;
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const visitButton = target?.closest('[data-cafe-action="visit-milo-room"]');
    if (!visitButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openMiloRoom();
  }, true);

  document.addEventListener('cafe-open-milo-room', openMiloRoom);
  roomView?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    if (target.closest('[data-milo-room-back]')) {
      closeMiloRoom();
      return;
    }
    const action = target.closest('[data-milo-room-action]');
    if (action) handleRoomAction(action.dataset.miloRoomAction);
  });
  roomScene?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMiloRoom();
    }
  });
}

function watchPageVisibility() {
  if (!pageHome) return;
  const sync = () => {
    if (!pageHome.classList.contains('inside-mode') && !roomView?.hidden) {
      closeMiloRoom({ restoreFocus: false, silent: true });
    }
  };
  observer = new MutationObserver(sync);
  observer.observe(pageHome, { attributes: true, attributeFilter: ['class'] });
  sync();
}

export function initMiloRoom() {
  roomRoot = document.querySelector('#cafeInside');
  pageHome = document.querySelector('#page-home');
  if (!roomRoot || roomRoot.dataset.miloRoomReady === 'true') return;
  roomRoot.dataset.miloRoomReady = 'true';
  ensureStylesheet();
  roomRoot.insertAdjacentHTML('beforeend', renderMiloRoomMarkup());
  roomView = roomRoot.querySelector('[data-milo-room-view]');
  roomScene = roomRoot.querySelector('[data-milo-room-scene]');
  noteTitle = roomRoot.querySelector('[data-milo-room-note-title]');
  noteText = roomRoot.querySelector('[data-milo-room-note-text]');
  bindEvents();
  watchPageVisibility();
}
