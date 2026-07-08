import { GameDB } from '@db';
import { getState, getActiveCommissionIds } from '@state';
import { canCompleteCommission, completeCommission, refreshDailyCommissionList } from '@actions/commission';
import { formatReward } from '@utils';
import { navigate } from '@router';
import { goToScene } from '@home';
import { Events, on, emitNotice } from '@eventBus';

const COMMISSION_FILTERS = [
  { id: 'all', label: '全部', icon: '📋' },
  { id: 'ready', label: '可交付', icon: '✅' },
  { id: 'available', label: '商品不足', icon: '🧺' },
  { id: 'completed', label: '已完成', icon: '🎀' },
];

const COMMISSION_SORTS = [
  { id: 'default', label: '預設順序' },
  { id: 'status', label: '狀態排序' },
  { id: 'difficulty_desc', label: '難度高到低' },
];

let currentCommissionFilter = 'all';
let currentCommissionSort = 'default';

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

function isSavedCompleted(record) {
  return record?.status === 'completed' || record?.status === 'claimed';
}

function getQuestViewStatus(quest) {
  const state = getState();
  if (isSavedCompleted(state.commissions[quest.id])) return 'completed';
  return canCompleteCommission(quest.id) ? 'ready' : 'available';
}

function statusLabel(status) {
  return {
    available: '商品不足',
    ready: '可交付',
    completed: '已完成',
  }[status] || status;
}

function statusRank(status) {
  return { ready: 0, available: 1, completed: 2 }[status] ?? 99;
}

function difficultyRank(quest) {
  return [...String(quest.difficulty || '')].filter((char) => char === '★').length;
}

function getQuestEntries() {
  return getActiveCommissionIds()
    .map((commissionId, index) => ({ quest: GameDB.commissions[commissionId], index }))
    .filter((entry) => entry.quest)
    .map((entry) => ({
      ...entry,
      status: getQuestViewStatus(entry.quest),
    }));
}

function filterQuestEntries(entries) {
  if (currentCommissionFilter === 'all') return entries;
  return entries.filter((entry) => entry.status === currentCommissionFilter);
}

function sortQuestEntries(entries) {
  return [...entries].sort((a, b) => {
    if (currentCommissionSort === 'status') {
      return statusRank(a.status) - statusRank(b.status) || a.index - b.index;
    }

    if (currentCommissionSort === 'difficulty_desc') {
      return difficultyRank(b.quest) - difficultyRank(a.quest) || a.index - b.index;
    }

    return a.index - b.index;
  });
}

function countByStatus(entries, filterId) {
  if (filterId === 'all') return entries.length;
  return entries.filter((entry) => entry.status === filterId).length;
}

function renderDailyRefreshBar() {
  const state = getState();
  const date = state.dailyCommissions?.date || '尚未刷新';
  const count = Array.isArray(state.dailyCommissions?.ids) ? state.dailyCommissions.ids.length : 0;

  return `
    <div class="core-actions-row" aria-label="每日委託刷新">
      <span>📅 今日委託 ${date}｜${count} 件</span>
      <button type="button" data-refresh-daily-commissions>檢查刷新</button>
    </div>
  `;
}

function renderFilterTabs(entries) {
  return `
    <div class="core-filter-group" aria-label="委託分類">
      <p>委託分類</p>
      <div class="core-filter-tabs">
        ${COMMISSION_FILTERS.map((filter) => `
          <button type="button" class="${currentCommissionFilter === filter.id ? 'active' : ''}" data-commission-filter="${filter.id}">
            <span>${filter.icon}</span>${filter.label} ${countByStatus(entries, filter.id)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSortBox() {
  return `
    <div class="core-sort-box">
      <label for="commissionSort">排序</label>
      <select id="commissionSort" data-commission-sort>
        ${COMMISSION_SORTS.map((sort) => `
          <option value="${sort.id}" ${currentCommissionSort === sort.id ? 'selected' : ''}>${sort.label}</option>
        `).join('')}
      </select>
    </div>
  `;
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
  if (status === 'completed') {
    return '<button type="button" disabled>已完成</button>';
  }

  if (status === 'ready') {
    return `<button type="button" data-complete="${quest.id}">完成委託</button>`;
  }

  const source = getFirstSource(quest);
  return `<button type="button" data-source-type="${source.type}" data-source-id="${source.id}">${sourceButtonText(source)}</button>`;
}

function renderQuestCard(entry) {
  const { quest, status } = entry;
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

  const allEntries = getQuestEntries();
  const visibleEntries = sortQuestEntries(filterQuestEntries(allEntries));
  const cards = visibleEntries.length
    ? visibleEntries.map(renderQuestCard).join('')
    : '<div class="core-empty">目前沒有符合分類的委託。</div>';

  page.innerHTML = `
    ${pageHeader('QUEST BOARD / DAILY DELIVERY', '委託', '每日委託會依玩家本地日期刷新；刷新只保存今日委託 ID，不保存文案。')}
    ${renderDailyRefreshBar()}
    ${renderFilterTabs(allEntries)}
    ${renderSortBox()}
    <div class="core-quest-list">${cards}</div>
  `;

  page.querySelector('[data-refresh-daily-commissions]')?.addEventListener('click', () => {
    const result = refreshDailyCommissionList();
    emitNotice(result.refreshed ? '委託已刷新' : '委託已是最新', result.message);
    renderCommissions();
  });

  $all('[data-commission-filter]', page).forEach((button) => {
    button.addEventListener('click', () => {
      currentCommissionFilter = button.dataset.commissionFilter || 'all';
      renderCommissions();
    });
  });

  page.querySelector('[data-commission-sort]')?.addEventListener('change', (event) => {
    currentCommissionSort = event.target.value || 'default';
    renderCommissions();
  });

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
