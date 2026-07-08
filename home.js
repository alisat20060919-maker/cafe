import { GameDB } from '@db';
import { getState } from '@state';
import { canGatherAt, canEnterGatherArea, gatherAt, getGatherStatus, getLocationHint, getGatherDropPreview } from '@actions/gather';
import { canCraft, craftRecipe } from '@actions/craft';
import { showModal } from '@ui';

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

function itemView(itemId) {
  const item = GameDB.items?.[itemId];
  return {
    itemId,
    name: item?.name || itemId,
    icon: item?.icon || '◇',
    rarity: item?.rarity || 'N',
    typeLabel: GameDB.getItemTypeLabel(item?.type),
  };
}

function getStationRecipes(stationId) {
  return Object.values(GameDB.recipes || {}).filter((recipe) => recipe.station === stationId);
}

function renderRecipeCost(cost = {}) {
  const state = getState();
  const entries = Object.entries(cost || {});
  if (!entries.length) return '<span>不需素材</span>';

  return entries.map(([itemId, qty]) => {
    const item = itemView(itemId);
    const owned = Number(state.inventory?.[itemId] || 0);
    const lackClass = owned < qty ? ' class="is-lacking"' : '';
    return `<span${lackClass}>${item.icon} ${item.name} ${owned}/${qty}</span>`;
  }).join('、');
}

function renderRecipeOutput(output = {}) {
  const item = itemView(output.itemId);
  return `${item.icon} ${item.name} ×${output.qty || 1}`;
}

function renderRecipeButton(recipe) {
  const craftStatus = canCraft(recipe.id);
  if (!craftStatus.ok) {
    return `<button type="button" disabled>${craftStatus.status === 'not_enough_items' ? '素材不足' : '無法製作'}</button>`;
  }

  return `<button type="button" data-craft-recipe="${recipe.id}">製作</button>`;
}

function renderRecipeCards(stationId) {
  const recipes = getStationRecipes(stationId);
  if (!recipes.length) {
    return '<p>這裡還沒有登錄配方。之後可以從 GameDB.recipes 新增。</p>';
  }

  return `
    <div class="core-quest-list recipe-list">
      ${recipes.map((recipe) => `
        <article class="core-quest-card recipe-card">
          <div class="core-quest-top">
            <span>${recipe.category || 'recipe'}</span>
            <strong>${GameDB.stations?.[recipe.station]?.label || recipe.station}</strong>
          </div>
          <h3>${recipe.name}</h3>
          <p>${recipe.description || '尚未撰寫配方說明。'}</p>
          <div class="core-recipe"><b>需要：</b>${renderRecipeCost(recipe.cost)}</div>
          <div class="core-reward"><b>產出：</b>${renderRecipeOutput(recipe.output)}</div>
          ${renderRecipeButton(recipe)}
        </article>
      `).join('')}
    </div>
  `;
}

function renderPreviewText(locationId) {
  const preview = getGatherDropPreview(locationId).slice(0, 4);
  if (!preview.length) return '';
  return preview.map((drop) => `${drop.icon}${drop.name}`).join('、');
}

function renderPreviewList(preview = []) {
  if (!preview.length) return '';

  return `
    <div class="gather-preview-list">
      <b>可能掉落</b>
      ${preview.map((drop) => `
        <span>${drop.icon} ${drop.name} ×${drop.qty}｜${drop.chance}%</span>
      `).join('')}
    </div>
  `;
}

function renderSpecialEvent(event) {
  if (!event) return '';

  return `
    <div class="gather-preview-list gather-special-event">
      <b>${event.icon || '✨'} ${event.title}</b>
      <span>${event.message}</span>
      ${(event.rewards || []).map((drop) => `
        <span>額外獲得：${drop.icon} ${drop.name} ×${drop.qty}</span>
      `).join('')}
    </div>
  `;
}

function renderGatherStatusBadges() {
  $all('.scene-card').forEach((scene) => {
    scene.querySelector('.gather-status-badge')?.remove();
    scene.querySelector('.gather-preview-line')?.remove();

    const status = getGatherStatus(scene.id);
    if (!status) return;

    const badge = document.createElement('div');
    badge.className = 'gather-status-badge';
    badge.dataset.depleted = status.isDepleted ? 'true' : 'false';
    badge.textContent = status.label;

    const previewLine = document.createElement('div');
    previewLine.className = 'gather-preview-line';
    previewLine.textContent = `可能掉落：${renderPreviewText(scene.id)}`;

    const info = scene.querySelector('.scene-info');
    info?.appendChild(badge);
    info?.appendChild(previewLine);
  });
}

function showGatherResultModal(result) {
  const previewHtml = renderPreviewList(result.preview || []);
  const eventHtml = renderSpecialEvent(result.specialEvent);

  if (!result.ok) {
    showModal(`
      <div class="core-modal-card compact gather-result-modal is-empty">
        <button type="button" class="core-modal-close" data-close-modal>×</button>
        <span class="core-modal-kicker">GATHER RESULT</span>
        <div class="gather-result-icon">🧺</div>
        <h2>${result.title || '今天採集完成'}</h2>
        <p>${result.message}</p>
        <div class="gather-result-status">剩餘 ${result.remaining || 0}/${result.limit || 0}</div>
        ${previewHtml}
      </div>
    `);
    return;
  }

  const drop = result.dropView;
  showModal(`
    <div class="core-modal-card compact gather-result-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">GATHER RESULT</span>
      <div class="gather-result-icon">${drop.icon}</div>
      <h2>${result.title}</h2>
      <p>你找到了 <b>${drop.name}</b> ×${drop.qty}</p>
      <div class="gather-result-meta">
        <span>${drop.rarity}</span>
        <span>${drop.typeLabel}</span>
        <span>${drop.chance}%</span>
      </div>
      ${eventHtml}
      <div class="gather-result-status">今日剩餘 ${result.remaining}/${result.limit}</div>
      ${previewHtml}
    </div>
  `);
}

function showLocationHintModal(scene) {
  const hint = getLocationHint(scene.id);
  const icon = hint.kind === 'station' ? '🔒' : '🗺️';

  showModal(`
    <div class="core-modal-card compact location-hint-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">AREA INFO</span>
      <div class="gather-result-icon">${icon}</div>
      <h2>${hint.title}</h2>
      <p>${hint.message}</p>
    </div>
  `);

  setDialogue(scene.dataset.speaker || '小店長', scene.dataset.title, hint.message);
}

function showCraftResultModal(result, scene) {
  const icon = result.ok ? result.output?.icon || '🍳' : '🧺';

  showModal(`
    <div class="core-modal-card compact location-hint-modal recipe-list-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">CRAFT RESULT</span>
      <div class="gather-result-icon">${icon}</div>
      <h2>${result.title}</h2>
      <p>${result.message}</p>
      <button type="button" data-open-recipes="${scene.id}">返回配方列表</button>
    </div>
  `);

  document.querySelector('[data-open-recipes]')?.addEventListener('click', () => showRecipeListModal(scene));
  setDialogue(scene.dataset.speaker || '甜點精靈', scene.dataset.title, result.message);
}

function bindRecipeCraftButtons(scene) {
  [...document.querySelectorAll('[data-craft-recipe]')].forEach((button) => {
    button.addEventListener('click', () => {
      button.disabled = true;
      const result = craftRecipe(button.dataset.craftRecipe);
      showCraftResultModal(result, scene);
    });
  });
}

function showRecipeListModal(scene) {
  const station = GameDB.stations?.[scene.id];
  const recipes = getStationRecipes(scene.id);
  const title = station?.label ? `${station.label}配方` : `${scene.dataset.title}配方`;
  const message = recipes.length
    ? `目前可以查看 ${recipes.length} 份配方；素材足夠時可以製作成品。`
    : '這裡之後會開放製作配方，目前還沒有可顯示的資料。';

  showModal(`
    <div class="core-modal-card compact location-hint-modal recipe-list-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">RECIPE LIST</span>
      <div class="gather-result-icon">🍳</div>
      <h2>${title}</h2>
      <p>${message}</p>
      ${renderRecipeCards(scene.id)}
    </div>
  `);

  bindRecipeCraftButtons(scene);
  setDialogue(scene.dataset.speaker || '甜點精靈', scene.dataset.title, message);
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

  renderGatherStatusBadges();
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
  renderGatherStatusBadges();
  showGatherResultModal(result);
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

      if (getStationRecipes(scene.id).length) {
        showRecipeListModal(scene);
        return;
      }

      if (canEnterGatherArea(scene.id)) {
        handleGatherScene(scene);
        return;
      }

      if (canGatherAt(scene.id)) {
        showLocationHintModal(scene);
        return;
      }

      showLocationHintModal(scene);
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
  renderGatherStatusBadges();
  bindHomeEvents();
  setActiveScene(0);
}

export function renderHome() {
  homeRoot?.classList.remove('inside-mode');
  renderGatherStatusBadges();
  setActiveScene(activeIndex);
}
