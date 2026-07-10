import { GameDB } from '@db';
import { getState } from '@state';
import { canCraft, craftRecipe, getMaxCraftable } from '@actions/craft';
import { showModal } from '@ui';

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

export function showCraftStationModal(stationId) {
  const station = GameDB.stations?.[stationId];
  const recipes = getStationRecipes(stationId);
  const title = `${station?.label || stationId}配方`;

  showModal(`
    <div class="core-modal-card compact location-hint-modal recipe-list-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">RECIPE LIST</span>
      <div class="gather-result-icon">${stationId === 'alchemy' ? '🧪' : '🍳'}</div>
      <h2>${escapeHtml(title)}</h2>
      <p>${recipes.length ? `目前有 ${recipes.length} 份配方。素材足夠時可單次或全部製作。` : '目前沒有可製作配方。'}</p>
      <div class="core-quest-list recipe-list">
        ${recipes.map(renderRecipeCard).join('') || '<p>尚未登錄配方。</p>'}
      </div>
    </div>
  `);
}

function showCraftResultModal(result) {
  const stationId = result.recipe?.station || 'kitchen';
  const icon = result.ok
    ? result.output?.icon || (stationId === 'alchemy' ? '🧪' : '🍳')
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
      <button type="button" data-open-recipes="${escapeHtml(stationId)}">返回配方列表</button>
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
