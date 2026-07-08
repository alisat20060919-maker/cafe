import { GameDB } from '@db';
import { getState } from '@state';
import { canCompleteCommission, completeCommission } from '@actions/commission';
import { formatReward } from '@utils';
import { navigate } from '@router';
import { goToScene } from '@home';
import { Events, on, emitNotice } from '@eventBus';

const itemSourceScene = {
  moon_petals: 'greenhouse',
  star_berry: 'backyard',
  night_sky_fragment: 'alchemy',
  forest_cookie: 'backyard',
  stardew_water: 'backyard',
};

const sceneNames = {
  cafe: '咖啡廳',
  backyard: '後山',
  kitchen: '廚房',
  alchemy: '煉金室',
  greenhouse: '溫室',
};

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

function itemName(itemId) {
  return GameDB.items[itemId]?.name || itemId;
}

function itemIcon(itemId) {
  return GameDB.items[itemId]?.icon || '◇';
}

function renderCost(cost = {}) {
  const state = getState();
  return Object.entries(cost)
    .map(([itemId, qty]) => {
      const owned = Number(state.inventory[itemId] || 0);
      const lackClass = owned < qty ? ' class="is-lacking"' : '';
      return `<span${lackClass}>${itemIcon(itemId)} ${itemName(itemId)} ${owned}/${qty}</span>`;
    })
    .join('、');
}

function getQuestStatus(quest) {
  const state = getState();
  if (state.commissions[quest.id]?.status === 'claimed') return 'claimed';
  return canCompleteCommission(quest.id) ? 'ready' : 'available';
}

function statusLabel(status) {
  return {
    locked: '未解鎖',
    available: '素材不足',
    ready: '可交付',
    claimed: '已完成',
  }[status] || status;
}

function getMissingItems(cost = {}) {
  const state = getState();
  return Object.entries(cost)
    .map(([itemId, qty]) => ({
      itemId,
      need: qty,
      owned: Number(state.inventory[itemId] || 0),
      sceneId: itemSourceScene[itemId] || 'backyard',
    }))
    .filter((item) => item.owned < item.need);
}

function getCollectionScene(quest) {
  const missingItems = getMissingItems(quest.cost);
  return missingItems[0]?.sceneId || 'backyard';
}

function renderMissingHint(quest, status) {
  if (status !== 'available') return '';

  const missingItems = getMissingItems(quest.cost);
  if (!missingItems.length) return '';

  const hint = missingItems
    .map((item) => `${itemIcon(item.itemId)} ${itemName(item.itemId)}：${item.owned}/${item.need}，來源：${sceneNames[item.sceneId] || '後山'}`)
    .join('<br>');

  return `<p class="core-missing-hint">缺少素材：<br>${hint}</p>`;
}

function renderQuestButton(quest, status) {
  if (status === 'claimed') {
    return '<button type="button" disabled>已完成</button>';
  }

  if (status === 'ready') {
    return `<button type="button" data-complete="${quest.id}">完成委託</button>`;
  }

  const targetScene = getCollectionScene(quest);
  return `<button type="button" data-collect="${targetScene}">前往${sceneNames[targetScene] || '後山'}收集</button>`;
}

function goCollect(targetScene = 'backyard') {
  navigate('home');
  window.requestAnimationFrame(() => {
    goToScene(targetScene);
    emitNotice('前往收集', `已帶你前往${sceneNames[targetScene] || '後山'}。`);
  });
}

export function renderCommissions() {
  const page = document.querySelector('#page-commissions');
  if (!page) return;

  const cards = Object.values(GameDB.commissions).map((quest) => {
    const status = getQuestStatus(quest);
    return `
      <article class="core-quest-card status-${status}">
        <div class="core-quest-top">
          <span>${quest.difficulty}</span>
          <strong>${statusLabel(status)}</strong>
        </div>
        <h3>${quest.title}</h3>
        <p class="core-customer">客人：${quest.customer}</p>
        <p>${quest.description}</p>
        <div class="core-recipe"><b>需要：</b>${renderCost(quest.cost)}</div>
        ${renderMissingHint(quest, status)}
        <div class="core-reward"><b>獎勵：</b>${formatReward(quest.reward)}</div>
        ${renderQuestButton(quest, status)}
      </article>
    `;
  }).join('');

  page.innerHTML = `
    ${pageHeader('QUEST BOARD / ACTION MODULE', '委託', '素材不足時會標出缺少素材與來源，按鈕可直接跳到收集地點。')}
    <div class="core-quest-list">${cards}</div>
  `;

  $all('[data-complete]', page).forEach((button) => {
    button.addEventListener('click', () => {
      const result = completeCommission(button.dataset.complete);
      emitNotice(result.ok ? '委託完成' : '還不能完成', result.message);
      renderCommissions();
    });
  });

  $all('[data-collect]', page).forEach((button) => {
    button.addEventListener('click', () => goCollect(button.dataset.collect));
  });
}

export function initCommissionsPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-commissions');
    if (page?.classList.contains('active')) renderCommissions();
  });
}
