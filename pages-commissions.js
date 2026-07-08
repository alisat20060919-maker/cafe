import { GameDB } from '@db';
import { getState } from '@state';
import { canCompleteCommission, completeCommission } from '@actions/commission';
import { formatReward } from '@utils';
import { navigate } from '@router';
import { goToScene } from '@home';
import { Events, on, emitNotice } from '@eventBus';

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

function getItemSource(itemId) {
  return GameDB.itemSources?.[itemId] || { type: 'scene', id: 'backyard', label: '後山' };
}

function getMissingItems(cost = {}) {
  const state = getState();
  return Object.entries(cost)
    .map(([itemId, qty]) => ({
      itemId,
      need: qty,
      owned: Number(state.inventory[itemId] || 0),
      source: getItemSource(itemId),
    }))
    .filter((item) => item.owned < item.need);
}

function getFirstSource(quest) {
  const missingItems = getMissingItems(quest.cost);
  return missingItems[0]?.source || { type: 'scene', id: 'backyard', label: '後山' };
}

function renderMissingHint(quest, status) {
  if (status !== 'available') return '';

  const missingItems = getMissingItems(quest.cost);
  if (!missingItems.length) return '';

  const hint = missingItems
    .map((item) => `${itemIcon(item.itemId)} ${itemName(item.itemId)}：${item.owned}/${item.need}，來源：${item.source.label}`)
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

  const source = getFirstSource(quest);
  return `<button type="button" data-source-type="${source.type}" data-source-id="${source.id}">前往${source.label}</button>`;
}

function findSourceByScene(sourceId) {
  return Object.values(GameDB.itemSources || {}).find((item) => item.type === 'scene' && item.id === sourceId);
}

function goToSource(sourceType = 'scene', sourceId = 'backyard') {
  if (sourceType === 'route') {
    navigate(sourceId);
    emitNotice('前往祈願', '夜空碎片目前先透過祈願取得；之後會把煉金室做成二階素材與商品製作。');
    return;
  }

  navigate('home');
  window.requestAnimationFrame(() => {
    goToScene(sourceId);
    const source = findSourceByScene(sourceId);
    emitNotice('前往收集', `已帶你前往${source?.label || '後山'}。`);
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
    ${pageHeader('QUEST BOARD / ACTION MODULE', '委託', '素材不足時會從 GameDB 讀取來源，按鈕可直接跳到收集地點或祈願頁。')}
    <div class="core-quest-list">${cards}</div>
  `;

  $all('[data-complete]', page).forEach((button) => {
    button.addEventListener('click', () => {
      const result = completeCommission(button.dataset.complete);
      emitNotice(result.ok ? '委託完成' : '還不能完成', result.message);
      renderCommissions();
    });
  });

  $all('[data-source-type]', page).forEach((button) => {
    button.addEventListener('click', () => goToSource(button.dataset.sourceType, button.dataset.sourceId));
  });
}

export function initCommissionsPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-commissions');
    if (page?.classList.contains('active')) renderCommissions();
  });
}
