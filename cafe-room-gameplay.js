import { getState, persistState } from '@state';
import { closeModal } from '@ui';
import { CHAPTER_ONE_STORY } from './data-chapter-one.js?v=story001';

let roomRoot = null;
let pageHome = null;
let gameWindow = null;
let storyLayer = null;
let observer = null;
let eventsBound = false;
let activeStory = null;
let activeNodeId = null;
let activeCompleteHandler = null;
let previousFocus = null;

function ensureStylesheet() {
  if (document.querySelector('link[data-cafe-room-gameplay]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './cafe-room-gameplay.css?v=room007';
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

function renderPortraitMarkup(characterId) {
  if (characterId === 'milo') {
    return `
      <div class="cafe-story-portrait cafe-story-portrait--milo" aria-hidden="true">
        <span class="cafe-story-milo-ear ear-left"></span>
        <span class="cafe-story-milo-ear ear-right"></span>
        <span class="cafe-story-milo-hair"></span>
        <span class="cafe-story-milo-face">
          <i class="cafe-story-eye eye-left"></i><i class="cafe-story-eye eye-right"></i>
          <i class="cafe-story-brow brow-left"></i><i class="cafe-story-brow brow-right"></i>
          <i class="cafe-story-mouth"></i>
        </span>
        <span class="cafe-story-milo-shirt"></span>
        <span class="cafe-story-milo-apron"></span>
      </div>`;
  }

  return `
    <div class="cafe-story-portrait cafe-story-portrait--rowan" aria-hidden="true">
      <span class="cafe-story-rowan-hair-back"></span>
      <span class="cafe-story-rowan-ear ear-left"></span>
      <span class="cafe-story-rowan-ear ear-right"></span>
      <span class="cafe-story-rowan-face">
        <i class="cafe-story-eye eye-left"></i><i class="cafe-story-eye eye-right"></i>
        <i class="cafe-story-brow brow-left"></i><i class="cafe-story-brow brow-right"></i>
        <i class="cafe-story-mouth"></i>
      </span>
      <span class="cafe-story-rowan-fringe"></span>
      <span class="cafe-story-rowan-hair-front hair-left"></span>
      <span class="cafe-story-rowan-hair-front hair-right"></span>
      <span class="cafe-story-rowan-shirt"></span>
      <span class="cafe-story-rowan-vest"></span>
    </div>`;
}

function ensureStoryLayer() {
  if (storyLayer?.isConnected) return storyLayer;
  const playfield = roomRoot?.querySelector('.cafe-room-playfield');
  if (!playfield) return null;

  storyLayer = document.createElement('section');
  storyLayer.className = 'cafe-story-layer';
  storyLayer.dataset.cafeStoryLayer = 'true';
  storyLayer.hidden = true;
  storyLayer.setAttribute('role', 'dialog');
  storyLayer.setAttribute('aria-modal', 'true');
  storyLayer.setAttribute('aria-labelledby', 'cafeStorySpeaker');
  storyLayer.setAttribute('aria-describedby', 'cafeStoryText');
  storyLayer.innerHTML = `
    <div class="cafe-story-backdrop"></div>
    <div class="cafe-story-chapter" aria-hidden="true">
      <span data-cafe-story-chapter></span><b data-cafe-story-title></b>
    </div>
    <div class="cafe-story-characters" aria-hidden="true">
      <div class="cafe-story-character cafe-story-character--left" data-cafe-story-character="milo">
        ${renderPortraitMarkup('milo')}
      </div>
      <div class="cafe-story-character cafe-story-character--right" data-cafe-story-character="rowan">
        ${renderPortraitMarkup('rowan')}
      </div>
    </div>
    <div class="cafe-story-choice-list" data-cafe-story-choices hidden></div>
    <article class="cafe-story-dialogue" data-cafe-story-advance>
      <div class="cafe-story-name-row">
        <span class="cafe-story-name" id="cafeStorySpeaker" data-cafe-story-speaker></span>
        <span class="cafe-story-place" data-cafe-story-place></span>
      </div>
      <p class="cafe-story-line-title" data-cafe-story-line-title></p>
      <p class="cafe-story-text" id="cafeStoryText" data-cafe-story-text></p>
      <div class="cafe-story-rewards" data-cafe-story-rewards hidden></div>
      <button class="cafe-story-next" type="button" data-cafe-story-next>
        <span data-cafe-story-next-label>繼續</span><i aria-hidden="true">›</i>
      </button>
    </article>`;
  playfield.appendChild(storyLayer);
  return storyLayer;
}

function getCurrentNode() {
  return activeStory?.nodes?.[activeNodeId] || null;
}

function setStoryActive(isActive) {
  roomRoot?.classList.toggle('cafe-room-story-active', isActive);
  pageHome?.classList.toggle('cafe-story-active', isActive);
  gameWindow?.classList.toggle('cafe-story-active', isActive);
  document.documentElement.classList.toggle('cafe-story-active', isActive);
  document.dispatchEvent(new CustomEvent('cafe-story-state', { detail: { active: isActive, storyId: activeStory?.id || null } }));
}

function closeInteractionDrawer() {
  const drawer = roomRoot?.querySelector('[data-cafe-drawer]');
  if (!drawer) return;
  drawer.classList.remove('is-open');
  drawer.hidden = true;
  delete drawer.dataset.cafeTarget;
  roomRoot?.querySelectorAll('[data-cafe-object].is-selected').forEach((element) => element.classList.remove('is-selected'));
}

function syncCharacterPresentation(node) {
  const activeSpeaker = node?.speaker;
  storyLayer?.querySelectorAll('[data-cafe-story-character]').forEach((character) => {
    const characterId = character.dataset.cafeStoryCharacter;
    const isSpeaker = characterId === activeSpeaker;
    character.classList.toggle('is-speaking', isSpeaker);
    character.classList.toggle('is-listening', Boolean(activeSpeaker && activeSpeaker !== 'system' && !isSpeaker));
    character.classList.toggle('is-hidden-for-system', activeSpeaker === 'system');
    character.dataset.expression = isSpeaker ? (node.expression || 'neutral') : 'neutral';
  });
}

function renderChoices(node) {
  const choiceList = storyLayer?.querySelector('[data-cafe-story-choices]');
  const nextButton = storyLayer?.querySelector('[data-cafe-story-next]');
  if (!choiceList || !nextButton) return;
  const choices = Array.isArray(node?.choices) ? node.choices : [];
  choiceList.hidden = choices.length === 0;
  nextButton.hidden = choices.length > 0;
  choiceList.innerHTML = '';

  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.cafeStoryChoice = choice.id;
    button.dataset.cafeStoryNextNode = choice.next;
    button.innerHTML = `<span>${index + 1}</span><b></b>`;
    button.querySelector('b').textContent = choice.label;
    choiceList.appendChild(button);
  });
}

function renderRewards(node) {
  const rewardBox = storyLayer?.querySelector('[data-cafe-story-rewards]');
  if (!rewardBox) return;
  const rewards = Array.isArray(node?.rewards) ? node.rewards : [];
  rewardBox.hidden = rewards.length === 0;
  rewardBox.innerHTML = '';
  rewards.forEach((reward) => {
    const item = document.createElement('span');
    item.textContent = reward;
    rewardBox.appendChild(item);
  });
}

function renderStoryNode(nodeId) {
  if (!activeStory || !storyLayer) return;
  const node = activeStory.nodes?.[nodeId];
  if (!node) {
    endStory();
    return;
  }

  activeNodeId = nodeId;
  storyLayer.dataset.mode = node.mode || 'dialogue';
  storyLayer.querySelector('[data-cafe-story-chapter]').textContent = activeStory.chapterLabel || '';
  storyLayer.querySelector('[data-cafe-story-title]').textContent = activeStory.title || '';
  storyLayer.querySelector('[data-cafe-story-speaker]').textContent = node.speaker === 'system'
    ? node.title || '新的紀錄'
    : activeStory.characters?.[node.speaker]?.name || node.speaker || '';
  storyLayer.querySelector('[data-cafe-story-place]').textContent = activeStory.location || '';
  storyLayer.querySelector('[data-cafe-story-line-title]').textContent = node.mode === 'reward' ? '' : (node.title || '');
  storyLayer.querySelector('[data-cafe-story-text]').textContent = node.text || '';
  storyLayer.querySelector('[data-cafe-story-next-label]').textContent = node.continueLabel || (node.complete ? '完成' : '繼續');

  syncCharacterPresentation(node);
  renderChoices(node);
  renderRewards(node);

  const focusTarget = storyLayer.querySelector('[data-cafe-story-choice]') || storyLayer.querySelector('[data-cafe-story-next]');
  window.requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
}

function finishActiveStory() {
  const completeHandler = activeCompleteHandler;
  endStory({ restoreFocus: false });
  completeHandler?.();
}

function advanceStory() {
  const node = getCurrentNode();
  if (!node || Array.isArray(node.choices)) return;
  if (node.complete) {
    finishActiveStory();
    return;
  }
  if (node.next) renderStoryNode(node.next);
}

function chooseStoryOption(button) {
  const node = getCurrentNode();
  if (!node || !button) return;
  const choiceId = button.dataset.cafeStoryChoice;
  const choice = node.choices?.find((item) => item.id === choiceId);
  if (!choice) return;

  const state = getState();
  state.story ||= {};
  if (activeStory?.id === CHAPTER_ONE_STORY.id) state.story.chapter1Choice = choice.id;
  persistState(`story:${activeStory.id}:choice`);
  renderStoryNode(choice.next);
}

export function playCafeStory(story, { onComplete } = {}) {
  if (!story?.nodes || !story.startNode || activeStory) return false;
  const layer = ensureStoryLayer();
  if (!layer) return false;

  closeModal();
  closeInteractionDrawer();
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.activeElement?.blur?.();
  activeStory = story;
  activeCompleteHandler = onComplete || null;
  activeNodeId = story.startNode;
  layer.hidden = false;
  layer.classList.remove('is-entering');
  window.requestAnimationFrame(() => layer.classList.add('is-entering'));
  setStoryActive(true);
  renderStoryNode(story.startNode);
  return true;
}

function endStory({ restoreFocus = true } = {}) {
  if (!activeStory && storyLayer?.hidden) return;
  const focusTarget = previousFocus;
  activeStory = null;
  activeNodeId = null;
  activeCompleteHandler = null;
  previousFocus = null;
  setStoryActive(false);
  if (storyLayer) {
    storyLayer.classList.remove('is-entering');
    storyLayer.hidden = true;
  }
  if (restoreFocus) focusTarget?.focus?.({ preventScroll: true });
}

function isChapterComplete() {
  return Boolean(getState().story?.chapter1Completed);
}

function isChapterPresentationSeen() {
  return Boolean(getState().story?.chapter1PresentationV1Seen);
}

function startChapterOne() {
  if (isChapterPresentationSeen() || activeStory) return false;
  const state = getState();
  state.story ||= {};
  state.story.chapter1Started = true;
  state.story.talkedToRowan = true;
  persistState('story:chapter1-start');
  return playCafeStory(CHAPTER_ONE_STORY, { onComplete: finishChapterOne });
}

function finishChapterOne() {
  const state = getState();
  state.story ||= {};
  state.story.chapter1Started = true;
  state.story.talkedToRowan = true;
  state.story.chapter1Completed = true;
  state.story.chapter1PresentationV1Seen = true;
  state.story.miloRoomUnlocked = true;
  persistState('story:chapter1-complete');
  syncChapterPresentation();
  document.dispatchEvent(new CustomEvent('cafe-story-updated', { detail: { chapter: 1, completed: true } }));
  setDialogue('洛溫', '半月琥珀・店內', '「房間在二樓。累了就去休息；想要抱一下，也可以直接來找我。」');
}

function syncChapterPresentation() {
  if (!roomRoot) return;
  const completed = isChapterComplete();
  const presentationSeen = isChapterPresentationSeen();
  roomRoot.classList.toggle('chapter-one-complete', completed);
  roomRoot.classList.toggle('chapter-one-presentation-seen', presentationSeen);
  const rowan = roomRoot.querySelector('[data-cafe-object="rowan"]');
  rowan?.classList.toggle('is-story-target', !presentationSeen);

  let quest = roomRoot.querySelector('[data-cafe-chapter-quest]');
  if (!presentationSeen && !quest) {
    quest = document.createElement('div');
    quest.className = 'cafe-chapter-quest';
    quest.dataset.cafeChapterQuest = '1';
    quest.innerHTML = '<span>主線任務</span><b>走到洛溫身邊並和他說話</b>';
    roomRoot.querySelector('.cafe-room-playfield')?.appendChild(quest);
  }
  if (presentationSeen) quest?.remove();
}

function isRowanTalkAction(element) {
  if (!element) return false;
  const drawer = element.closest('[data-cafe-drawer]');
  return !drawer || drawer.dataset.cafeTarget === 'rowan';
}

function handleDocumentClick(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target) return;

  const choiceButton = target.closest('[data-cafe-story-choice]');
  if (choiceButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    chooseStoryOption(choiceButton);
    return;
  }

  const nextButton = target.closest('[data-cafe-story-next]');
  const advanceSurface = target.closest('[data-cafe-story-advance]');
  if (activeStory && (nextButton || advanceSurface)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    advanceStory();
    return;
  }

  if (activeStory || isChapterPresentationSeen()) return;

  const interactButton = target.closest('[data-cafe-interact][data-target-id="rowan"]');
  const talkButton = target.closest('[data-cafe-action="talk"]');
  if (!interactButton && !isRowanTalkAction(talkButton)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  startChapterOne();
}

function handleDocumentKeydown(event) {
  if (!activeStory) return;
  const movementKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'W', 'a', 'A', 's', 'S', 'e', 'E', 'Escape']);
  if (movementKeys.has(event.key)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  if (event.target instanceof Element && event.target.closest('button')) return;
  if ((event.key === 'Enter' || event.key === ' ') && !getCurrentNode()?.choices) {
    event.preventDefault();
    event.stopImmediatePropagation();
    advanceStory();
  }
}

function watchRoomVisibility() {
  if (!pageHome) return;
  const sync = () => {
    if (!pageHome.classList.contains('inside-mode')) {
      if (activeStory) endStory({ restoreFocus: false });
      return;
    }
    syncChapterPresentation();
    if (!isChapterPresentationSeen() && !activeStory) {
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
  gameWindow = document.querySelector('.game-window');
  if (!roomRoot || roomRoot.dataset.gameplayReady === 'true') return;
  roomRoot.dataset.gameplayReady = 'true';
  ensureStylesheet();
  ensureStoryLayer();
  if (!eventsBound) {
    eventsBound = true;
    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('keydown', handleDocumentKeydown, true);
  }
  watchRoomVisibility();
  window.setTimeout(syncChapterPresentation, 0);
}
