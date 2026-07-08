import { GameDB } from '@db';
import { getState } from '@state';
import { canCompleteCommission, completeCommission } from '@actions/commission';
import { formatReward } from '@utils';
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
  return Object.entries(cost)
    .map(([itemId, qty]) => `${itemIcon(itemId)} ${itemName(itemId)} ×${qty}`)
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

export function renderCommissions() {
  const page = document.querySelector('#page-commissions');
  if (!page) return;

  const cards = Object.values(GameDB.commissions).map((quest) => {
    const status = getQuestStatus(quest);
    const disabled = status !== 'ready';
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
        <div class="core-reward"><b>獎勵：</b>${formatReward(quest.reward)}</div>
        <button type="button" data-complete="${quest.id}" ${disabled ? 'disabled' : ''}>${status === 'claimed' ? '已完成' : status === 'ready' ? '完成委託' : '前往收集'}</button>
      </article>
    `;
  }).join('');

  page.innerHTML = `
    ${pageHeader('QUEST BOARD / ACTION MODULE', '委託', '委託邏輯已經移出頁面，這裡只負責顯示任務與按鈕。')}
    <div class="core-quest-list">${cards}</div>
  `;

  $all('[data-complete]', page).forEach((button) => {
    button.addEventListener('click', () => {
      const result = completeCommission(button.dataset.complete);
      emitNotice(result.ok ? '委託完成' : '還不能完成', result.message);
      renderCommissions();
    });
  });
}

export function initCommissionsPage() {
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-commissions');
    if (page?.classList.contains('active')) renderCommissions();
  });
}
