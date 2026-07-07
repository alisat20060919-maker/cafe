const gameWindow = document.querySelector('.game-window');
const viewport = document.querySelector('#mapViewport');
const scenes = [...document.querySelectorAll('.scene-card')];
const tabs = [...document.querySelectorAll('.tab')];
const prevButton = document.querySelector('#prevScene');
const nextButton = document.querySelector('#nextScene');
const speakerName = document.querySelector('#speakerName');
const placeName = document.querySelector('#placeName');
const dialogueText = document.querySelector('#dialogueText');
const backToMapButton = document.querySelector('#backToMap');
const insideActions = [...document.querySelectorAll('.inside-action')];
const roomHotspots = [...document.querySelectorAll('.room-hotspot')];
const insidePanels = [...document.querySelectorAll('.inside-panel')];

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

let activeIndex = 0;

function setActiveScene(index) {
  activeIndex = Math.max(0, Math.min(index, scenes.length - 1));
  const scene = scenes[activeIndex];

  scenes.forEach((item, itemIndex) => {
    item.classList.toggle('active', itemIndex === activeIndex);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === scene.id);
  });

  speakerName.textContent = scene.dataset.speaker;
  placeName.textContent = scene.dataset.title;
  dialogueText.textContent = scene.dataset.dialogue;
}

function setInteriorPanel(panelName = 'menu') {
  const dialogue = interiorDialogue[panelName] || interiorDialogue.menu;

  insideActions.forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelName);
  });

  roomHotspots.forEach((hotspot) => {
    hotspot.classList.toggle('active', hotspot.dataset.panel === panelName);
  });

  insidePanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === panelName);
  });

  speakerName.textContent = '小店長';
  placeName.textContent = dialogue.place;
  dialogueText.textContent = dialogue.text;
}

function closeInsidePage() {
  gameWindow?.classList.remove('inside-mode');
  setActiveScene(activeIndex);
}

function openCafeInside() {
  gameWindow?.classList.add('inside-mode');
  setInteriorPanel('menu');
}

function scrollToScene(index) {
  closeInsidePage();
  const scene = scenes[Math.max(0, Math.min(index, scenes.length - 1))];
  viewport.scrollTo({
    left: scene.offsetLeft,
    behavior: 'smooth',
  });
  setActiveScene(scenes.indexOf(scene));
}

prevButton.addEventListener('click', () => scrollToScene(activeIndex - 1));
nextButton.addEventListener('click', () => scrollToScene(activeIndex + 1));

backToMapButton?.addEventListener('click', closeInsidePage);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const index = scenes.findIndex((scene) => scene.id === tab.dataset.target);
    scrollToScene(index);
  });
});

insideActions.forEach((button) => {
  button.addEventListener('click', () => {
    setInteriorPanel(button.dataset.panel);
  });
});

roomHotspots.forEach((hotspot) => {
  hotspot.addEventListener('click', () => {
    setInteriorPanel(hotspot.dataset.panel);
  });
});

scenes.forEach((scene, index) => {
  scene.querySelector('.enter-button').addEventListener('click', () => {
    setActiveScene(index);

    if (scene.id === 'cafe') {
      openCafeInside();
      return;
    }

    dialogueText.textContent = `你選擇了「${scene.dataset.title}」。這裡之後可以做成獨立頁面或任務清單。`;
  });
});

let scrollTimer;
viewport.addEventListener('scroll', () => {
  window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    if (gameWindow?.classList.contains('inside-mode')) return;
    const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
    setActiveScene(index);
  }, 80);
});

viewport.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') scrollToScene(activeIndex - 1);
  if (event.key === 'ArrowRight') scrollToScene(activeIndex + 1);
});

setActiveScene(0);