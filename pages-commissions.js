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

function getRequirements(quest) {
  return GameDB.getCommissionRequiredItems(quest);
}

function renderRequirements(quest) {
  const state = getState();
  return Object.entries(getRequirements(quest))
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
    available: '商品不足',
    ready: '可交付',
    claimed: '已完成',
  }[status] || status;
}

function getMissingItems(quest) {
  const state = getState();
  return Object.entries(getRequirements(quest))
    .map(([itemId, qty]) => ({
      itemId,
      need: qty,
      owned: Number(state.inventory[itemId] || 0),
      source: GameDB.getItemSource(itemId),
    }))
    .filter((item) => item.owned < item.need);
}

function getFirstSource(quest) {
  const missingItems = getMissingItems(quest);
  return missingItems[0]?.source || GameDB.getItemSource('star_berry');
}

function renderMissingHint(quest, status) {
  if (status !== 'available') return '';

  const missingItems = getMissingItems(quest);
  if (!missingItems.length) return '';

  const hint = missingItems
    .map((item) => `${itemIcon(item.itemId)} ${itemName(item.itemId)}：${item.owned}/${item.need}，來源：${item.source.label}`)
    .join('<br>');

  return `<p class="core-missing-hint">缺少商品：<br>${hint}</p>`;
}

function sourceButtonText(source) {
  if (source.type === 'station') return `前往${source.label}製作`;
  if (source.type === 'scene') return `前往${source.label}收集`;
  return `前往${source.label}`;
}

function renderQuestButton(quest, status) {
  if (status === 'claimed') {
    return '<button type="button" disabled>已完成</button>';
  }

  if (status === 'ready') {
    return `<button type="button" data-complete="${quest.id}">完成委託</button>`;
  }

  const source = getFirstSource(quest);
  return `<button type="button" data-source-type="${source.type}" data-source-id="${source.id}">${sourceButtonText(source)}</button>`;
}

function goToSceneSource(sourceType = 'scene', sourceId = 'backyard') {
  const source = { type: sourceType, id: sourceId, label: GameDB.getSourceLabel({ type: sourceType, id: sourceId }) };
  navigate('home');
  window.requestAnimationFrame(() => {
    goToScene(sourceId);
    emitNotice(sourceType === 'station' ? '前往製作' : '前往收集', `已帶你前往${source.label}。`);
  });
}

function goToSource(sourceType = 'scene', sourceId = 'backyard') {
  const source = { type: sourceType, id: sourceId, label: GameDB.getSourceLabel({ type: sourceType, id: sourceId }) };

  if (sourceType === 'route') {
    navigate(sourceId);
    emitNotice(`前往${source.label}`, `${source.label}是目前可取得部分稀有素材的功能頁。`);
    return;
  }

  if (sourceType === 'station' || sourceType === 'scene') {
    goToSceneSource(sourceType, sourceId);
  }
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
        <div class="core-recipe"><b>需要：</b>${renderRequirements(quest)}</div>
        ${renderMissingHint(quest, status)}
        <div class="core-reward"><b>獎勵：</b>${formatReward(quest.reward)}</div>
        ${renderQuestButton(quest, status)}
      </article>
    `;
  }).join('');

  page.innerHTML = `
    ${pageHeader('QUEST BOARD / PRODUCT DELIVERY', '委託', '委託現在會要求已製作完成的商品；缺少商品時會帶你前往對應製作站。')}
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
