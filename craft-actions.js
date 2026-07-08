import { GameDB } from '@db';
import {
  getState,
  canAffordItems,
  spendItems,
  addItem,
  persistState,
  isUnlocked,
  getUnlockRequirementText,
} from '@state';

function getRecipe(recipeId) {
  return GameDB.recipes?.[recipeId] || null;
}

function getItemView(itemId) {
  const item = GameDB.items?.[itemId];
  return {
    itemId,
    name: item?.name || itemId,
    icon: item?.icon || '◇',
    rarity: item?.rarity || 'N',
    typeLabel: GameDB.getItemTypeLabel(item?.type),
  };
}

function getCostViews(cost = {}) {
  const state = getState();
  return Object.entries(cost || {}).map(([itemId, qty]) => {
    const owned = Number(state.inventory?.[itemId] || 0);
    return {
      ...getItemView(itemId),
      qty,
      owned,
      missing: Math.max(0, Number(qty || 0) - owned),
      enough: owned >= Number(qty || 0),
    };
  });
}

function getOutputView(output = {}) {
  return {
    ...getItemView(output.itemId),
    qty: Number(output.qty || 1),
  };
}

function getStationRequirement(recipe) {
  return recipe?.station ? { station: recipe.station } : {};
}

function getStationRequirementText(recipe) {
  return getUnlockRequirementText(getStationRequirement(recipe)) || '需要解鎖製作站';
}

export function canCraft(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) {
    return {
      ok: false,
      status: 'missing_recipe',
      message: '找不到這份配方。',
      missingItems: [],
    };
  }

  if (!isUnlocked(getStationRequirement(recipe))) {
    return {
      ok: false,
      status: 'locked_station',
      recipe,
      unlockRequirement: getStationRequirement(recipe),
      unlockRequirementText: getStationRequirementText(recipe),
      missingItems: [],
      message: `${GameDB.stations?.[recipe.station]?.label || recipe.station}尚未解鎖。${getStationRequirementText(recipe)}。`,
    };
  }

  const missingItems = getCostViews(recipe.cost).filter((item) => !item.enough);
  if (missingItems.length) {
    return {
      ok: false,
      status: 'not_enough_items',
      recipe,
      missingItems,
      message: `素材不足：${missingItems.map((item) => `${item.icon}${item.name} 缺 ${item.missing}`).join('、')}`,
    };
  }

  return {
    ok: true,
    status: 'ready',
    recipe,
    missingItems: [],
    message: '素材足夠，可以製作。',
  };
}

export function getRecipeCraftView(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return null;
  const craftStatus = canCraft(recipeId);

  return {
    id: recipe.id,
    name: recipe.name,
    station: recipe.station,
    stationLabel: GameDB.stations?.[recipe.station]?.label || recipe.station,
    category: recipe.category,
    description: recipe.description,
    costItems: getCostViews(recipe.cost),
    outputItem: getOutputView(recipe.output),
    canCraft: craftStatus.ok,
    status: craftStatus.status,
    message: craftStatus.message,
    unlockRequirementText: craftStatus.unlockRequirementText || '',
  };
}

export function craftRecipe(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) {
    return {
      ok: false,
      status: 'missing_recipe',
      title: '製作失敗',
      message: '找不到這份配方。',
    };
  }

  const craftStatus = canCraft(recipeId);
  if (craftStatus.status === 'locked_station') {
    return {
      ok: false,
      status: 'locked_station',
      title: '尚未解鎖',
      recipe,
      message: craftStatus.message,
    };
  }

  if (!canAffordItems(recipe.cost)) {
    return {
      ok: false,
      status: 'not_enough_items',
      title: '素材不足',
      recipe,
      missingItems: getCostViews(recipe.cost).filter((item) => !item.enough),
      message: canCraft(recipeId).message,
    };
  }

  if (!spendItems(recipe.cost)) {
    return {
      ok: false,
      status: 'spend_failed',
      title: '製作失敗',
      recipe,
      message: '扣除素材時失敗，請重新確認背包。',
    };
  }

  const output = getOutputView(recipe.output);
  addItem(recipe.output.itemId, output.qty);
  persistState(`craft:${recipeId}`);

  return {
    ok: true,
    status: 'crafted',
    title: '製作完成',
    recipe,
    output,
    message: `完成了 ${output.icon}${output.name} ×${output.qty}。`,
  };
}
