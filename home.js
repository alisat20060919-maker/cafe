import { navigate } from '@router';

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

function openCafeInside() {
  homeRoot?.classList.add('inside-mode');
  applyHotspotPositions();
  setInteriorPanel('menu');
}

function closeCafeInside() {
  homeRoot?.classList.remove('inside-mode');
  setDialogue('小店長', '咖啡廳', '歡迎回來！要先進店裡看看，還是打開世界地圖出發呢？');
}

function bindHomeEvents() {
  $('#enterCafe')?.addEventListener('click', openCafeInside);
  $('#backToMap')?.addEventListener('click', closeCafeInside);

  $all('.inside-action').forEach((button) => {
    button.addEventListener('click', () => setInteriorPanel(button.dataset.panel));
  });

  $all('.room-hotspot').forEach((hotspot) => {
    hotspot.addEventListener('click', () => setInteriorPanel(hotspot.dataset.panel));
  });
}

export function goToScene(sceneId = 'cafe') {
  if (sceneId === 'cafe') {
    navigate('home');
    return;
  }
  navigate('world');
}

export function initHome() {
  homeRoot = document.querySelector('#page-home');
  if (!homeRoot || homeRoot.dataset.homeReady === 'true') return;
  homeRoot.dataset.homeReady = 'true';
  applyHotspotPositions();
  bindHomeEvents();
  closeCafeInside();
}

export function renderHome() {
  closeCafeInside();
}
