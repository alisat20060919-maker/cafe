import { GameDB } from '@db';
import { getState, isUnlocked, getUnlockRequirementText } from '@state';
import { runStateTransaction } from './state-transactions.js?v=core001';

function getRecipe(recipeId) {
  return GameDB.recipes?.[recipeId] || null;
}

function normalizeQuantity(value = 1) {
  const quantity = Math.floor(Number(value || 1));
  return Number.isFinite(quantity) ? Math.max(1, quantity) : 1;
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

function getCostViews(cost = {}, quantity = 1, currentState = getState()) {
  const craftQuantity = normalizeQuantity(quantity);
  return Object.entries(cost || {}).map(([itemId, qty]) => {
    const unitQty = Math.max(0, Number(qty || 0));
    const required = unitQty * craftQuantity;
    const owned = Number(currentState.inventory?.[itemId] || 0);
    return {
      ...getItemView(itemId),
      unitQty,
      qty: required,
      owned,
      missing: Math.max(0, required - owned),
      enough: owned >= required,
    };
  });
}

function getOutputView(output = {}, quantity = 1) {
  const craftQuantity = normalizeQuantity(quantity);
  return {
    ...getItemView(output.itemId),
    unitQty: Math.max(1, Number(output.qty || 1)),
    qty: Math.max(1, Number(output.qty || 1)) * craftQuantity,
  };
}

function getStationRequirement(recipe) {
  return recipe?.station ? { station: recipe.station } : {};
}

function getRecipeRequirement(recipe) {
  if (!recipe) return {};
  return {
    all: [
      getStationRequirement(recipe),
      recipe.unlockRequirement || {},
    ],
  };
}

function getStationRequirementText(recipe) {
  return getUnlockRequirementText(getStationRequirement(recipe)) || '需要解鎖製作站';
}

function getRecipeRequirementText(recipe) {
  return getUnlockRequirementText(getRecipeRequirement(recipe)) || '需要解鎖配方';
}

export function getMaxCraftable(recipeId, currentState = getState()) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return 0;
  if (!isUnlocked(getRecipeRequirement(recipe), currentState)) return 0;

  const entries = Object.entries(recipe.cost || {}).filter(([, qty]) => Number(qty || 0) > 0);
  if (!entries.length) return 1;

  return Math.max(0, Math.min(...entries.map(([itemId, qty]) => (
    Math.floor(Number(currentState.inventory?.[itemId] || 0) / Number(qty || 1))
  ))));
}

export function canCraft(recipeId, quantity = 1) {
  const recipe = getRecipe(recipeId);
  const craftQuantity = normalizeQuantity(quantity);
  if (!recipe) {
    return {
      ok: false,
      status: 'missing_recipe',
      message: '找不到這份配方。',
      missingItems: [],
      quantity: craftQuantity,
    };
  }

  if (!isUnlocked(getStationRequirement(recipe))) {
    return {
      ok: false,
      status: 'locked_station',
      recipe,
      quantity: craftQuantity,
      unlockRequirement: getStationRequirement(recipe),
      unlockRequirementText: getStationRequirementText(recipe),
      missingItems: [],
      message: `${GameDB.stations?.[recipe.station]?.label || recipe.station}尚未解鎖。${getStationRequirementText(recipe)}。`,
    };
  }

  if (!isUnlocked(getRecipeRequirement(recipe))) {
    return {
      ok: false,
      status: 'locked_recipe',
      recipe,
      quantity: craftQuantity,
      unlockRequirement: getRecipeRequirement(recipe),
      unlockRequirementText: getRecipeRequirementText(recipe),
      missingItems: [],
      message: `${recipe.name}尚未解鎖。${getRecipeRequirementText(recipe)}。`,
    };
  }

  const missingItems = getCostViews(recipe.cost, craftQuantity).filter((item) => !item.enough);
  if (missingItems.length) {
    return {
      ok: false,
      status: 'not_enough_items',
      recipe,
      quantity: craftQuantity,
      missingItems,
      message: `素材不足：${missingItems.map((item) => `${item.icon}${item.name} 缺 ${item.missing}`).join('、')}`,
    };
  }

  return {
    ok: true,
    status: 'ready',
    recipe,
    quantity: craftQuantity,
    missingItems: [],
    message: craftQuantity > 1 ? `素材足夠，可以製作 ${craftQuantity} 次。` : '素材足夠，可以製作。',
  };
}

export function getRecipeCraftView(recipeId, quantity = 1) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return null;
  const craftQuantity = normalizeQuantity(quantity);
  const craftStatus = canCraft(recipeId, craftQuantity);

  return {
    id: recipe.id,
    name: recipe.name,
    station: recipe.station,
    stationLabel: GameDB.stations?.[recipe.station]?.label || recipe.station,
    category: recipe.category,
    description: recipe.description,
    quantity: craftQuantity,
    maxCraftable: getMaxCraftable(recipeId),
    costItems: getCostViews(recipe.cost, craftQuantity),
    outputItem: getOutputView(recipe.output, craftQuantity),
    canCraft: craftStatus.ok,
    status: craftStatus.status,
    message: craftStatus.message,
    unlockRequirementText: craftStatus.unlockRequirementText || '',
  };
}

export function craftRecipe(recipeId, quantity = 1) {
  const recipe = getRecipe(recipeId);
  const craftQuantity = normalizeQuantity(quantity);
  if (!recipe) {
    return {
      ok: false,
      status: 'missing_recipe',
      title: '製作失敗',
      message: '找不到這份配方。',
    };
  }

  const craftStatus = canCraft(recipeId, craftQuantity);
  if (!craftStatus.ok) {
    const locked = ['locked_station', 'locked_recipe'].includes(craftStatus.status);
    return {
      ok: false,
      status: craftStatus.status,
      title: locked ? '尚未解鎖' : craftStatus.status === 'not_enough_items' ? '素材不足' : '製作失敗',
      recipe,
      quantity: craftQuantity,
      missingItems: craftStatus.missingItems || [],
      message: craftStatus.message,
    };
  }

  const output = getOutputView(recipe.output, craftQuantity);

  try {
    runStateTransaction((draft) => {
      draft.inventory ||= {};
      draft.collection ||= {};
      draft.collection.discoveredItems ||= {};

      const missingItems = getCostViews(recipe.cost, craftQuantity, draft).filter((item) => !item.enough);
      if (missingItems.length) {
        throw new Error(`素材不足：${missingItems.map((item) => `${item.name} 缺 ${item.missing}`).join('、')}`);
      }

      Object.entries(recipe.cost || {}).forEach(([itemId, unitQty]) => {
        const required = Math.max(0, Number(unitQty || 0)) * craftQuantity;
        draft.inventory[itemId] = Math.max(0, Number(draft.inventory[itemId] || 0) - required);
      });

      draft.inventory[recipe.output.itemId] = Number(draft.inventory[recipe.output.itemId] || 0) + output.qty;
      draft.collection.discoveredItems[recipe.output.itemId] = true;
    });
  } catch (error) {
    return {
      ok: false,
      status: 'transaction_failed',
      title: '製作失敗',
      recipe,
      quantity: craftQuantity,
      message: error?.message || '製作交易失敗，背包沒有被變更。',
    };
  }

  return {
    ok: true,
    status: 'crafted',
    title: '製作完成',
    recipe,
    quantity: craftQuantity,
    output,
    message: `完成了 ${output.icon}${output.name} ×${output.qty}。`,
  };
}
