import { GameDB } from '@db';
import { fairies } from './data-fairies.js';

function getFairyWeight(fairy = {}) {
  if (fairy.rarity === 'SSR') return 1;
  if (fairy.rarity === 'SR') return 2;
  return 4;
}

export function applyFairyExpansion() {
  GameDB.fairies = {
    ...(GameDB.fairies || {}),
    ...fairies,
  };

  const standardPool = GameDB.gachaPools?.standard;
  if (!Array.isArray(standardPool?.drops)) return;

  const existingFairyDrops = new Set(
    standardPool.drops
      .filter((drop) => drop.kind === 'fairy')
      .map((drop) => drop.id),
  );

  Object.values(fairies).forEach((fairy) => {
    if (existingFairyDrops.has(fairy.id)) return;
    standardPool.drops.push({
      kind: 'fairy',
      id: fairy.id,
      qty: 1,
      weight: getFairyWeight(fairy),
    });
  });
}
