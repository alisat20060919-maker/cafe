import { GameDB } from './game-data.js?v=core06';
import { getState } from './game-state.js?v=core06';
import { Events, on } from './event-bus.js?v=core06';

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
}

export function renderInventory() {
  const page = document.querySelector('#page-inventory');
  if (!page) return;

  const state = getState();
  const itemCards = Object.values(GameDB.items)
    .map((item) => ({ item, count: Number(state.inventory[item.id] || 0) }))
    .filter(({ count }) => count > 0)
    .map(({ item, count }) => `
      <article class="core-item-card rarity-${item.rarity.toLowerCase()}">
        <div class="core-item-icon">${item.icon}</div>
        <div>
          <b>${item.name}</b>
          <span>${item.rarity} / ${item.typeName} / ${'★'.repeat(item.stars)}</span>
          <p>${item.description}</p>
          <small>用途：${item.use}</small>
        </div>
        <strong>×${count}</strong>
      </article>
    `)
    .join('');

  const fairyCards = Object.entries(state.fairies)
    .filter(([, data]) => data?.owned)
    .map(([fairyId]) => {
      const fairy = GameDB.fairies[fairyId];
      return `
        <article class="core-item-card ssr">
          <div class="core-item-icon">${fairy.icon}</div>
          <div>
            <b>${fairy.name}</b>
            <span>${fairy.rarity} / 精靈</span>
            <p>「${fairy.quote}」</p>
            <small>${fairy.description}</small>
          </div>
          <strong>已契約</strong>
        </article>
      `;
    })
    .join('');

  page.innerHTML = `
    ${pageHeader('BAG / RENDER FROM STATE', '背包', '這裡讀取 gameState.inventory 和 gameState.fairies 動態生成。')}
    <div class="core-list">
      ${itemCards || '<p class="core-empty">背包還是空的。去祈願或簽到拿一點素材吧。</p>'}
      ${fairyCards}
    </div>
  `;
}

export function initInventoryPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-inventory');
    if (page?.classList.contains('active')) renderInventory();
  });
}
