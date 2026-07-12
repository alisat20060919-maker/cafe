import { getState, persistState } from '@state';
import { showModal, closeModal } from '@ui';

const CHAPTER_ONE = [
  {
    speaker: '米洛',
    title: '第一章・先住下吧',
    body: '木門在身後闔上時，米洛仍不敢往店裡走得太深。他抱緊懷裡的衣服，像是在等一句命令。',
  },
  {
    speaker: '洛溫',
    title: '不用站那麼遠',
    body: '「過來吧。」金色長髮落在肩後，洛溫把一杯溫熱的飲料推到桌邊。「這裡沒有誰會因為你靠近就責罵你。」',
  },
  {
    speaker: '米洛',
    title: '米洛會工作',
    body: '「米洛會擦桌子、會整理材料，也可以學做甜點……」他急急地說著，彷彿只有先證明自己有用，才有資格留下。',
  },
  {
    speaker: '洛溫',
    title: '不是交換',
    body: '洛溫安靜地看了他一會兒。「我沒有要你用工作換一個晚上，也沒有要你現在就相信我。」',
  },
  {
    speaker: '洛溫',
    title: '先住下吧',
    body: '「房間已經整理好了。先住下吧。」他的聲音很輕，卻沒有留下一點需要討價還價的餘地。「其他事情，等你願意說了再說。」',
  },
  {
    speaker: '系統',
    title: '新的歸處',
    body: '米洛的房間與「抱抱」互動已解鎖。從今天開始，半月琥珀不只是工作的地方。',
  },
];

let roomRoot = null;
let pageHome = null;
let observer = null;
let eventsBound = false;

function ensureStylesheet() {
  if (document.querySelector('link[data-cafe-room-gameplay]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './cafe-room-gameplay.css?v=room006';
  link.dataset.cafeRoomGameplay = 'true';
  document.head.appendChild(link);
}

function setDialogue(speaker, place, text) {
  const speakerName = document.querySelector('#speakerName');
  const placeName = document.querySelector('#placeName');
  const dialogueText = document.querySelector('#dialogueText');
  const portrait = document.querySelector('.npc-portrait');
  if (speakerName) speakerName.textContent = speaker;
  if (placeName) placeName.textContent = place;
  if (dialogueText) dialogueText.textContent = text;
  if (portrait) portrait.textContent = speaker === '米洛' ? '🐾' : speaker === '任務' ? '📜' : '☕';
}

function isChapterComplete() {
  return Boolean(getState().story?.chapter1Completed);
}

function renderChapterStep(index = 0) {
  const step = CHAPTER_ONE[index] || CHAPTER_ONE[0];
  const isLast = index >= CHAPTER_ONE.length - 1;
  const icon = step.speaker === '洛溫' ? '☕' : step.speaker === '米洛' ? '🐾' : '✦';
  showModal(`
    <div class="core-modal-card cafe-story-modal">
      <span class="core-modal-kicker">CHAPTER 01 · ${index + 1}/${CHAPTER_ONE.length}</span>
      <div class="cafe-story-icon">${icon}</div>
      <p class="cafe-story-speaker">${step.speaker}</p>
      <h2>${step.title}</h2>
      <p class="cafe-story-body">${step.body}</p>
      <button type="button" data-cafe-story-next="${isLast ? 'finish' : String(index + 1)}">${isLast ? '留在半月琥珀' : '繼續'}</button>
    </div>
  `);
}

function startChapterOne() {
  if (isChapterComplete()) return false;
  const state = getState();
  state.story ||= {};
  state.story.chapter1Started = true;
  state.story.talkedToRowan = true;
  persistState('story:chapter1-start');
  renderChapterStep(0);
  return true;
}

function finishChapterOne() {
  const state = getState();
  state.story ||= {};
  state.story.chapter1Started = true;
  state.story.talkedToRowan = true;
  state.story.chapter1Completed = true;
  state.story.miloRoomUnlocked = true;
  persistState('story:chapter1-complete');
  closeModal();
  syncChapterPresentation();
  document.dispatchEvent(new CustomEvent('cafe-story-updated', { detail: { chapter: 1, completed: true } }));
  setDialogue('洛溫', '半月琥珀・店內', '「房間在二樓。累了就去休息；想要抱一下，也可以直接來找我。」');
}

function syncChapterPresentation() {
  if (!roomRoot) return;
  const completed = isChapterComplete();
  roomRoot.classList.toggle('chapter-one-complete', completed);
  const rowan = roomRoot.querySelector('[data-cafe-object="rowan"]');
  rowan?.classList.toggle('is-story-target', !completed);

  let quest = roomRoot.querySelector('[data-cafe-chapter-quest]');
  if (!completed && !quest) {
    quest = document.createElement('div');
    quest.className = 'cafe-chapter-quest';
    quest.dataset.cafeChapterQuest = '1';
    quest.innerHTML = '<span>主線任務</span><b>走到洛溫身邊並和他說話</b>';
    roomRoot.querySelector('.cafe-room-playfield')?.appendChild(quest);
  }
  if (completed) quest?.remove();
}

function handleDocumentClick(event) {
  const nextButton = event.target.closest('[data-cafe-story-next]');
  if (nextButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = nextButton.dataset.cafeStoryNext;
    if (next === 'finish') finishChapterOne();
    else renderChapterStep(Number(next || 0));
    return;
  }

  if (isChapterComplete()) return;

  const interactButton = event.target.closest('[data-cafe-interact][data-target-id="rowan"]');
  const talkButton = event.target.closest('[data-cafe-action="talk"]');
  if (!interactButton && !talkButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  startChapterOne();
}

function watchRoomVisibility() {
  if (!pageHome) return;
  const sync = () => {
    if (!pageHome.classList.contains('inside-mode')) return;
    syncChapterPresentation();
    if (!isChapterComplete()) {
      setDialogue('任務', '第一章・先住下吧', '使用左下角搖桿走到洛溫身邊，再按右下角的互動鍵。');
    }
  };
  observer = new MutationObserver(sync);
  observer.observe(pageHome, { attributes: true, attributeFilter: ['class'] });
  sync();
}

export function initCafeRoomGameplay() {
  roomRoot = document.querySelector('#cafeInside');
  pageHome = document.querySelector('#page-home');
  if (!roomRoot || roomRoot.dataset.gameplayReady === 'true') return;
  roomRoot.dataset.gameplayReady = 'true';
  ensureStylesheet();
  if (!eventsBound) {
    eventsBound = true;
    document.addEventListener('click', handleDocumentClick, true);
  }
  watchRoomVisibility();
  window.setTimeout(syncChapterPresentation, 0);
}
