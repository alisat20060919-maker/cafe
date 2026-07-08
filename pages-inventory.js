import { GameDB } from '@db';
import { getState } from '@state';
import { Events, on } from '@eventBus';

function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function pageHeader(kicker, title, body) {
  return `
    <div class="core-page-head">
      <span>${kicker}</span>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
}

function renderFilterTabs() {
  return GameDB.getInventoryCategories()
    .map((category, index) => `
      <button type="button" data-filter="${category.id}" class="${index === 0 ? 'active' : ''}">
        <span>${category.icon}</span>${category.label}
      </button>
    `)
    .join('');
}

function bindInventoryFilters(page) {
  const list = page.querySelector('#inventory-list');
  if (!list) return;

  $all('[data-filter]', page).forEach((button) => {
    button.addEventListener('click', () => {
      $all('[data-filter]', page).forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      list.dataset.currentFilter = button.dataset.filter || 'all';
    });
  });
}

export function renderInventory() {
  const page = document.querySelector('#page-inventory');
  if (!page) return;

  const state = getState();
  const itemCards = Object.values(GameDB.items)
    .map((item) => ({ item, count: Number(state.inventory[item.id] || 0) }))
    .filter(({ count }) => count > 0)
    .map(({ item, count }) => `
      <article class="core-item-card rarity-${item.rarity.toLowerCase()}" data-category="${item.type}">
        <div class="core-item-icon">${item.icon}</div>
        <div>
          <b>${item.name}</b>
          <span>${item.rarity} / ${GameDB.getItemTypeLabel(item.type)} / ${'★'.repeat(item.stars)}</span>
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
        <article class="core-item-card ssr" data-category="fairy">
          <div class="core-item-icon">${fairy.icon}</div>
          <div>
            <b>${fairy.name}</b>
            <span>${fairy.rarity} / ${GameDB.getItemTypeLabel('fairy')}</span>
            <p>「${fairy.quote}」</p>
            <small>${fairy.description}</small>
          </div>
          <strong>已契約</strong>
        </article>
      `;
    })
    .join('');

  page.innerHTML = `
    ${pageHeader('BAG / RENDER FROM STATE', '背包', '這裡讀取 gameState.inventory 和 gameState.fairies 動態生成，分類資料由 GameDB 提供。')}
    <div class="core-filter-tabs" aria-label="背包分類篩選">
      ${renderFilterTabs()}
    </div>
    <div class="core-list" id="inventory-list" data-current-filter="all">
      ${itemCards || '<p class="core-empty" data-category="empty">背包還是空的。去祈願或簽到拿一點素材吧。</p>'}
      ${fairyCards}
    </div>
  `;

  bindInventoryFilters(page);
}

export function initInventoryPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-inventory');
    if (page?.classList.contains('active')) renderInventory();
  });
}
