import { GameDB } from '@db';
import { addItem, persistState } from '@state';

const gatherTables = {
  backyard: {
    title: '後山採集完成',
    drops: [
      { itemId: 'star_berry', qty: 1, weight: 45 },
      { itemId: 'stardew_water', qty: 1, weight: 30 },
      { itemId: 'forest_cookie', qty: 1, weight: 20 },
      { itemId: 'star_berry', qty: 2, weight: 5 },
    ],
  },
};

function pickWeighted(drops) {
  const total = drops.reduce((sum, drop) => sum + Number(drop.weight || 0), 0);
  let roll = Math.random() * total;

  for (const drop of drops) {
    roll -= Number(drop.weight || 0);
    if (roll <= 0) return drop;
  }

  return drops[drops.length - 1];
}

function formatGatherDrop(drop) {
  const item = GameDB.items[drop.itemId];
  return `${item?.icon || ''}${item?.name || drop.itemId} ×${drop.qty || 1}`;
}

export function gatherAt(locationId = 'backyard') {
  const table = gatherTables[locationId];
  if (!table) return { ok: false, message: '這個地點還不能採集。' };

  const drop = pickWeighted(table.drops);
  addItem(drop.itemId, drop.qty || 1);
  persistState(`gather:${locationId}`);

  return {
    ok: true,
    title: table.title,
    drop,
    message: `你找到了 ${formatGatherDrop(drop)}。`,
  };
}
