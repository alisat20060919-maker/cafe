import { GameDB } from '@db';
import { getState, isUnlocked, getUnlockRequirementText } from '@state';
import { canCraft, craftRecipe, getMaxCraftable } from './craft-actions.js?v=core101';
import { showModal, closeModal } from '@ui';
import { navigate } from '@router';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getStationRecipes(stationId) {
  return Object.values(GameDB.recipes || {}).filter((recipe) => recipe.station === stationId);
}

function getStationMeta(stationId) {
  const station = GameDB.stations?.[stationId] || {};
  const isAlchemy = stationId === 'alchemy';
  return {
    id: stationId,
    label: station.label || (isAlchemy ? '煉金室' : '廚房'),
    icon: isAlchemy ? '🧪' : '🍳',
    kicker: isAlchemy ? 'ALCHEMY LAB' : 'MAGIC KITCHEN',
    description: isAlchemy
      ? '把採集素材精煉成高階材料、藥劑與魔法商品。'
      : '把森林素材製作成甜點、飲品與可交付的委託商品。',
  };
}

function renderCost(recipe) {
  const state = getState();
  return Object.entries(recipe.cost || {}).map(([itemId, qty]) => {
    const item = GameDB.items?.[itemId];
    const owned = Number(state.inventory?.[itemId] || 0);
    const lacking = owned < Number(qty || 0);
    return `<span${lacking ? ' class="is-lacking"' : ''}>${escapeHtml(item?.icon || '◇')} ${escapeHtml(item?.name || itemId)} ${owned}/${qty}</span>`;
  }).join('、') || '<span>不需素材</span>';
}

function renderOutput(recipe) {
  const item = GameDB.items?.[recipe.output?.itemId];
  return `${escapeHtml(item?.icon || '◇')} ${escapeHtml(item?.name || recipe.output?.itemId || '成品')} ×${Number(recipe.output?.qty || 1)}`;
}

function renderRecipeCard(recipe) {
  const status = canCraft(recipe.id, 1);
  const maxCraftable = getMaxCraftable(recipe.id);
  const stationLabel = GameDB.stations?.[recipe.station]?.label || recipe.station;

  let actions = '';
  if (!status.ok) {
    const label = status.status === 'locked_station' || status.status === 'locked_recipe'
      ? status.unlockRequirementText || '尚未解鎖'
      : status.status === 'not_enough_items'
        ? '素材不足'
        : '無法製作';
    actions = `<button type="button" disabled>${escapeHtml(label)}</button>`;
  } else {
    actions = `
      <div class="recipe-action-row">
        <button type="button" data-craft-recipe="${escapeHtml(recipe.id)}" data-craft-quantity="1">製作 1 次</button>
        ${maxCraftable > 1 ? `<button type="button" data-craft-recipe="${escapeHtml(recipe.id)}" data-craft-quantity="max">全部製作 ×${maxCraftable}</button>` : ''}
      </div>
    `;
  }

  return `
    <article class="core-quest-card recipe-card">
      <div class="core-quest-top">
        <span>${escapeHtml(recipe.category || 'recipe')}</span>
        <strong>${escapeHtml(stationLabel)}</strong>
      </div>
      <h3>${escapeHtml(recipe.name)}</h3>
      <p>${escapeHtml(recipe.description || '尚未撰寫配方說明。')}</p>
      <div class="core-recipe"><b>需要：</b>${renderCost(recipe)}</div>
      <div class="core-reward"><b>產出：</b>${renderOutput(recipe)}</div>
      <div class="core-muted">目前最多可製作 ${maxCraftable} 次</div>
      ${actions}
    </article>
  `;
}

function renderLockedStation(stationId) {
  const meta = getStationMeta(stationId);
  const requirementText = getUnlockRequirementText({ station: stationId }) || `解鎖${meta.label}`;
  return `
    <article class="craft-station-locked">
      <div class="craft-station-large-icon">🔒</div>
      <h2>${escapeHtml(meta.label)}尚未解鎖</h2>
      <p>${escapeHtml(requirementText)}後即可使用這個工作站。</p>
      <button type="button" data-route="home">返回地圖</button>
    </article>
  `;
}

function renderStationBody(stationId) {
  const recipes = getStationRecipes(stationId);
  return `
    <div class="craft-station-summary">
      <span>已登錄配方 <b>${recipes.length}</b></span>
      <span>目前可製作 <b>${recipes.filter((recipe) => canCraft(recipe.id).ok).length}</b></span>
    </div>
    <div class="core-quest-list recipe-list craft-station-recipes">
      ${recipes.map(renderRecipeCard).join('') || '<p class="core-muted">目前還沒有登錄配方。</p>'}
    </div>
  `;
}

export function renderCraftStationPage(stationId) {
  const root = document.querySelector(`#page-${stationId}`);
  if (!root) return;
  const meta = getStationMeta(stationId);
  const unlocked = isUnlocked({ station: stationId });

  root.innerHTML = `
    <section class="craft-station-page" data-station-page="${escapeHtml(stationId)}">
      <header class="craft-station-header">
        <button type="button" class="craft-station-back" data-route="home">← 返回地圖</button>
        <div class="craft-station-title-wrap">
          <span class="craft-station-kicker">${escapeHtml(meta.kicker)}</span>
          <h2>${escapeHtml(meta.icon)} ${escapeHtml(meta.label)}</h2>
          <p>${escapeHtml(meta.description)}</p>
        </div>
        <button type="button" class="craft-station-inventory" data-route="inventory">查看背包</button>
      </header>
      ${unlocked ? renderStationBody(stationId) : renderLockedStation(stationId)}
    </section>
  `;
}

export function showCraftStationModal(stationId) {
  const meta = getStationMeta(stationId);
  const recipes = getStationRecipes(stationId);

  showModal(`
    <div class="core-modal-card compact location-hint-modal recipe-list-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">RECIPE LIST</span>
      <div class="gather-result-icon">${meta.icon}</div>
      <h2>${escapeHtml(meta.label)}配方</h2>
      <p>${recipes.length ? `目前有 ${recipes.length} 份配方。素材足夠時可單次或全部製作。` : '目前沒有可製作配方。'}</p>
      <div class="core-quest-list recipe-list">
        ${recipes.map(renderRecipeCard).join('') || '<p>尚未登錄配方。</p>'}
      </div>
    </div>
  `);
}

function showCraftResultModal(result) {
  const stationId = result.recipe?.station || 'kitchen';
  const meta = getStationMeta(stationId);
  const icon = result.ok
    ? result.output?.icon || meta.icon
    : result.status?.startsWith('locked')
      ? '🔒'
      : '🧺';

  showModal(`
    <div class="core-modal-card compact location-hint-modal recipe-list-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">CRAFT RESULT</span>
      <div class="gather-result-icon">${escapeHtml(icon)}</div>
      <h2>${escapeHtml(result.title || '製作結果')}</h2>
      <p>${escapeHtml(result.message || '')}</p>
      <button type="button" data-return-station="${escapeHtml(stationId)}">返回${escapeHtml(meta.label)}</button>
    </div>
  `);
}

function handleCraftClick(event) {
  const recipeButton = event.target.closest('[data-craft-recipe]');
  if (recipeButton) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const recipeId = recipeButton.dataset.craftRecipe;
    const requested = recipeButton.dataset.craftQuantity;
    const quantity = requested === 'max' ? getMaxCraftable(recipeId) : Math.max(1, Number(requested || 1));
    recipeButton.disabled = true;
    showCraftResultModal(craftRecipe(recipeId, quantity));
    return;
  }

  const returnButton = event.target.closest('[data-return-station]');
  if (returnButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const stationId = returnButton.dataset.returnStation;
    closeModal();
    navigate(stationId);
    return;
  }

  const backButton = event.target.closest('[data-open-recipes]');
  if (backButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showCraftStationModal(backButton.dataset.openRecipes);
  }
}

export function initCraftUI() {
  if (document.documentElement.dataset.craftUiReady === 'true') return;
  document.documentElement.dataset.craftUiReady = 'true';
  document.addEventListener('click', handleCraftClick, true);
}
