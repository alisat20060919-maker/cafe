import { canGatherAt, gatherAt } from '@actions/gather';
import { emitNotice } from '@eventBus';

let activeIndex = 0;
let homeRoot;

const interiorDialogue = {
  menu: {
    place: '今日菜單',
    text: '今天的推薦是月光花瓣拿鐵、星星莓奶油塔，還有一杯會發光的夜空碎片可可。',
  },
  quest: {
    place: '接委託',
    text: '想下訂的客人可以先選品項，也可以帶著預算來，讓店長幫你調成適合的魔法餐點。',
  },
  cabinet: {
    place: '商品櫃',
    text: '玻璃櫃裡放著 QQ 小甜點、亮晶晶郵票和驚喜包禮盒，靠近一點看會閃閃發光。',
  },
  order: {
    place: '客人訂單',
    text: '訂單會依照待確認、製作中、已完成分類。之後這裡可以變成真正的排單紀錄。',
  },
};

const gatherSpeakers = {
  backyard: '採集精靈',
  greenhouse: '花園精靈',
  alchemy: '煉金助手',
};

const hotspotPositions = {
  menu: { left: '198px', top: '220px' },
  cabinet: { left: '92px', top: '252px' },
  quest: { left: '438px', top: '232px' },
  order: { left: '640px', top: '150px' },
};

function $(selector, root = homeRoot) {
  return root?.querySelector(selector) || null;
}

function $all(selector, root = homeRoot) {
  return root ? [...root.querySelectorAll(selector)] : [];
}

function setDialogue(speaker, place, text) {
  const speakerName = $('#speakerName');
  const placeName = $('#placeName');
  const dialogueText = $('#dialogueText');
  if (speakerName) speakerName.textContent = speaker;
  if (placeName) placeName.textContent = place;
  if (dialogueText) dialogueText.textContent = text;
}

function applyHotspotPositions() {
  $all('.room-hotspot').forEach((hotspot) => {
    const pos = hotspotPositions[hotspot.dataset.panel];
    if (!pos) return;
    hotspot.style.left = pos.left;
    hotspot.style.top = pos.top;
    hotspot.style.right = 'auto';
    hotspot.style.bottom = 'auto';
  });
}

export function setActiveScene(index) {
  const scenes = $all('.scene-card');
  const tabs = $all('.tab');
  if (!scenes.length) return;

  activeIndex = Math.max(0, Math.min(index, scenes.length - 1));
  const scene = scenes[activeIndex];

  scenes.forEach((item, itemIndex) => {
    item.classList.toggle('active', itemIndex === activeIndex);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === scene.id);
  });

  setDialogue(scene.dataset.speaker, scene.dataset.title, scene.dataset.dialogue);
}

function setInteriorPanel(panelName = 'menu') {
  const dialogue = interiorDialogue[panelName] || interiorDialogue.menu;

  $all('.inside-action').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelName);
  });

  $all('.room-hotspot').forEach((hotspot) => {
    hotspot.classList.toggle('active', hotspot.dataset.panel === panelName);
  });

  $all('.inside-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === panelName);
  });

  setDialogue('小店長', dialogue.place, dialogue.text);
}

function closeInsidePage() {
  homeRoot?.classList.remove('inside-mode');
  setActiveScene(activeIndex);
}

function openCafeInside() {
  homeRoot?.classList.add('inside-mode');
  applyHotspotPositions();
  setInteriorPanel('menu');
}

function handleGatherScene(scene) {
  const result = gatherAt(scene.id);
  emitNotice(result.ok ? result.title : result.title || '採集失敗', result.message);
  setDialogue(gatherSpeakers[scene.id] || scene.dataset.speaker, scene.dataset.title, result.message);
}

function scrollToScene(index) {
  closeInsidePage();
  const viewport = $('#mapViewport');
  const scenes = $all('.scene-card');
  const scene = scenes[Math.max(0, Math.min(index, scenes.length - 1))];
  if (!viewport || !scene) return;

  viewport.scrollTo({
    left: scene.offsetLeft,
    behavior: 'smooth',
  });
  setActiveScene(scenes.indexOf(scene));
}

export function goToScene(sceneId = 'backyard') {
  const scenes = $all('.scene-card');
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  scrollToScene(index >= 0 ? index : 0);
}

function bindHomeEvents() {
  $('#prevScene')?.addEventListener('click', () => scrollToScene(activeIndex - 1));
  $('#nextScene')?.addEventListener('click', () => scrollToScene(activeIndex + 1));
  $('#backToMap')?.addEventListener('click', closeInsidePage);

  $all('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const scenes = $all('.scene-card');
      const index = scenes.findIndex((scene) => scene.id === tab.dataset.target);
      scrollToScene(index);
    });
  });

  $all('.inside-action').forEach((button) => {
    button.addEventListener('click', () => setInteriorPanel(button.dataset.panel));
  });

  $all('.room-hotspot').forEach((hotspot) => {
    hotspot.addEventListener('click', () => setInteriorPanel(hotspot.dataset.panel));
  });

  $all('.scene-card').forEach((scene, index) => {
    scene.querySelector('.enter-button')?.addEventListener('click', () => {
      setActiveScene(index);

      if (scene.id === 'cafe') {
        openCafeInside();
        return;
      }

      if (canGatherAt(scene.id)) {
        handleGatherScene(scene);
        return;
      }

      setDialogue('小店長', scene.dataset.title, `你選擇了「${scene.dataset.title}」。這裡之後可以做成獨立頁面或任務清單。`);
    });
  });

  const viewport = $('#mapViewport');
  let scrollTimer;
  viewport?.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      if (homeRoot?.classList.contains('inside-mode')) return;
      const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
      setActiveScene(index);
    }, 80);
  });

  viewport?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') scrollToScene(activeIndex - 1);
    if (event.key === 'ArrowRight') scrollToScene(activeIndex + 1);
  });
}

export function initHome() {
  homeRoot = document.querySelector('#page-home');
  if (!homeRoot || homeRoot.dataset.homeReady === 'true') return;
  homeRoot.dataset.homeReady = 'true';
  applyHotspotPositions();
  bindHomeEvents();
  setActiveScene(0);
}

export function renderHome() {
  homeRoot?.classList.remove('inside-mode');
  setActiveScene(activeIndex);
}
