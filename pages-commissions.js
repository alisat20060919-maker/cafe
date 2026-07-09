import { GameDB } from '@db';
import { getState, getActiveCommissionIds } from '@state';
import {
  canCompleteCommission,
  completeCommission,
  getCommissionDisplayReward,
  getCommissionUnlockText,
  getPaidRefreshCostText,
  getRerollCostText,
  isCommissionUnlocked,
  refreshDailyCommissionList,
  refreshDailyCommissionFree,
  refreshDailyCommissionPaid,
  rerollDifficultCommissions,
} from '@actions/commission';
import { formatReward } from '@utils';
import { navigate } from '@router';
import { goToScene } from '@home';
import { showModal } from '@ui';
import { Events, on, emitNotice } from '@eventBus';

const COMMISSION_FILTERS = [
  { id: 'all', label: '全部', icon: '📋' },
  { id: 'ready', label: '可交付', icon: '✅' },
  { id: 'available', label: '商品不足', icon: '🧺' },
  { id: 'locked', label: '未解鎖', icon: '🔒' },
  { id: 'completed', label: '已完成', icon: '🎀' },
];

const COMMISSION_SORTS = [
  { id: 'default', label: '預設順序' },
  { id: 'status', label: '狀態排序' },
  { id: 'difficulty_desc', label: '難度高到低' },
];

let currentCommissionFilter = 'all';
let currentCommissionSort = 'default';

function pageHeader(kicker, title, body) {
  return `<div class="core-page-head"><span>${kicker}</span><h2>${title}</h2><p>${body}</p></div>`;
}

function itemName(itemId) { return GameDB.items[itemId]?.name || itemId; }
function itemIcon(itemId) { return GameDB.items[itemId]?.icon || '◇'; }
function stationName(stationId) { return GameDB.stations?.[stationId]?.label || stationId || '製作站'; }
function getOwnedCount(itemId) { return Number(getState().inventory?.[itemId] || 0); }
function getRequirements(quest) { return GameDB.getCommissionRequiredItems(quest); }
function getRecipeForOutputItem(itemId) { return Object.values(GameDB.recipes || {}).find((recipe) => recipe.output?.itemId === itemId) || null; }
function isSavedCompleted(record) { return record?.status === 'completed' || record?.status === 'claimed'; }

function renderRequirements(quest) {
  return Object.entries(getRequirements(quest)).map(([itemId, qty]) => {
    const owned = getOwnedCount(itemId);
    const lackClass = owned < qty ? ' class="is-lacking"' : '';
    return `<span${lackClass}>${itemIcon(itemId)} ${itemName(itemId)} ${owned}/${qty}</span>`;
  }).join('、');
}

function getQuestViewStatus(quest) {
  const state = getState();
  if (isSavedCompleted(state.commissions[quest.id])) return 'completed';
  if (!isCommissionUnlocked(quest.id)) return 'locked';
  return canCompleteCommission(quest.id) ? 'ready' : 'available';
}

function statusLabel(status) { return { locked: '尚未解鎖', available: '商品不足', ready: '可交付', completed: '已完成' }[status] || status; }
function statusRank(status) { return { ready: 0, available: 1, locked: 2, completed: 3 }[status] ?? 99; }
function difficultyRank(quest) { return GameDB.getCommissionDifficultyRank?.(quest) || [...String(quest.difficulty || '')].filter((char) => char === '★').length; }

function getQuestEntries() {
  return getActiveCommissionIds()
    .map((commissionId, index) => ({ quest: GameDB.commissions[commissionId], index }))
    .filter((entry) => entry.quest)
    .map((entry) => ({ ...entry, status: getQuestViewStatus(entry.quest) }));
}

function filterQuestEntries(entries) { return currentCommissionFilter === 'all' ? entries : entries.filter((entry) => entry.status === currentCommissionFilter); }
function sortQuestEntries(entries) {
  return [...entries].sort((a, b) => {
    if (currentCommissionSort === 'status') return statusRank(a.status) - statusRank(b.status) || a.index - b.index;
    if (currentCommissionSort === 'difficulty_desc') return difficultyRank(b.quest) - difficultyRank(a.quest) || a.index - b.index;
    return a.index - b.index;
  });
}
function countByStatus(entries, filterId) { return filterId === 'all' ? entries.length : entries.filter((entry) => entry.status === filterId).length; }

function renderDailyRefreshBar() {
  const state = getState();
  const count = Array.isArray(state.dailyCommissions?.ids) ? state.dailyCommissions.ids.length : 0;
  const freeRefreshUsed = Boolean(state.dailyCommissions?.freeRefreshUsed);
  return `
    <div class="core-actions-row commission-refresh-bar" aria-label="每日委託刷新">
      <span>📅 今日 ${count} 件</span>
      <button type="button" data-refresh-daily-commissions>檢查刷新</button>
      <button type="button" data-refresh-free-commissions ${freeRefreshUsed ? 'disabled' : ''}>${freeRefreshUsed ? '免費已用' : '免費刷新'}</button>
      <button type="button" data-refresh-paid-commissions>${getPaidRefreshCostText()}刷新</button>
      <button type="button" data-reroll-commissions>${getRerollCostText()}重抽</button>
    </div>`;
}

function renderFilterTabs(entries) {
  return `<div class="core-filter-group" aria-label="委託分類"><p>委託分類</p><div class="core-filter-tabs">${COMMISSION_FILTERS.map((filter) => `<button type="button" class="${currentCommissionFilter === filter.id ? 'active' : ''}" data-commission-filter="${filter.id}"><span>${filter.icon}</span>${filter.label} ${countByStatus(entries, filter.id)}</button>`).join('')}</div></div>`;
}

function renderSortBox() {
  return `<div class="core-sort-box"><label for="commissionSort">排序</label><select id="commissionSort" data-commission-sort>${COMMISSION_SORTS.map((sort) => `<option value="${sort.id}" ${currentCommissionSort === sort.id ? 'selected' : ''}>${sort.label}</option>`).join('')}</select></div>`;
}

function getMissingItems(quest) {
  return Object.entries(getRequirements(quest)).map(([itemId, qty]) => ({ itemId, need: qty, owned: getOwnedCount(itemId), source: GameDB.getItemSource(itemId) })).filter((item) => item.owned < item.need);
}

function getRecipeIngredientRows(recipe, multiplier = 1) {
  return Object.entries(recipe?.cost || {}).map(([itemId, qty]) => {
    const need = Number(qty || 0) * multiplier;
    const owned = getOwnedCount(itemId);
    return { itemId, need, owned, source: GameDB.getItemSource(itemId), isLacking: owned < need };
  });
}

function renderIngredientRows(rows = []) {
  if (!rows.length) return '<span>這份配方目前沒有素材需求。</span>';
  return rows.map((row) => `<span class="${row.isLacking ? 'is-lacking' : ''}">${itemIcon(row.itemId)} ${itemName(row.itemId)} ${row.owned}/${row.need}｜${row.source.label}</span>`).join('');
}

function renderCraftPlan(item) {
  const recipe = getRecipeForOutputItem(item.itemId);
  if (!recipe) return `<div class="core-recipe core-missing-plan"><b>下一步：</b>前往${item.source.label}取得 ${itemName(item.itemId)}。</div>`;
  const shortage = Math.max(1, item.need - item.owned);
  const ingredientRows = getRecipeIngredientRows(recipe, shortage);
  const recipeSource = GameDB.getItemSource(item.itemId);
  return `<div class="core-recipe core-missing-plan"><b>製作提示：</b>${itemIcon(item.itemId)} ${itemName(item.itemId)} 還差 ${shortage} 個。<br><small>配方：${recipe.name}｜${stationName(recipe.station)}</small><div class="core-missing-ingredients">${renderIngredientRows(ingredientRows)}</div><small>下一步：前往${recipeSource.label}製作；若素材不足，先依上方來源收集。</small></div>`;
}

function getFirstSource(quest) { return getMissingItems(quest)[0]?.source || GameDB.getItemSource('star_berry'); }
function renderMissingSummary(quest, status) {
  if (status !== 'available') return '';
  const missing = getMissingItems(quest);
  if (!missing.length) return '';
  return `<p class="commission-summary-line">缺少 ${missing.length} 種商品，點「查看詳情」看材料來源。</p>`;
}
function renderLockedSummary(quest, status) {
  if (status !== 'locked') return '';
  return `<p class="commission-summary-line">🔒 尚未解鎖，點「查看詳情」看條件。</p>`;
}

function sourceButtonText(source) {
  if (source.type === 'station') return `前往${source.label}製作`;
  if (source.type === 'scene') return `前往${source.label}收集`;
  return `前往${source.label}`;
}

function renderQuestButton(quest, status) {
  if (status === 'completed') return '<button type="button" disabled>已完成</button>';
  if (status === 'locked') return `<button type="button" data-commission-detail="${quest.id}">查看解鎖條件</button>`;
  if (status === 'ready') return `<button type="button" data-complete="${quest.id}">完成委託</button>`;
  const source = getFirstSource(quest);
  return `<button type="button" data-source-type="${source.type}" data-source-id="${source.id}">${sourceButtonText(source)}</button>`;
}

function renderQuestCard(entry) {
  const { quest, status } = entry;
  return `
    <article class="core-quest-card status-${status}">
      <div class="core-quest-top"><span>${quest.difficulty}</span><strong>${statusLabel(status)}</strong></div>
      <h3>${quest.title}</h3>
      <p class="core-customer">客人：${quest.customer}</p>
      <p>${quest.description}</p>
      <div class="core-recipe"><b>需要：</b>${renderRequirements(quest)}</div>
      ${renderLockedSummary(quest, status)}${renderMissingSummary(quest, status)}
      <div class="core-reward"><b>獎勵：</b>${formatReward(getCommissionDisplayReward(quest))}</div>
      <div class="commission-card-actions">
        <button type="button" data-commission-detail="${quest.id}">查看詳情</button>
        ${renderQuestButton(quest, status)}
      </div>
    </article>`;
}

function openCommissionDetail(commissionId) {
  const quest = GameDB.commissions[commissionId];
  if (!quest) return;
  const status = getQuestViewStatus(quest);
  const missingItems = getMissingItems(quest);
  const lockText = status === 'locked' ? `<div class="core-missing-hint core-lock-hint"><p>🔒 尚未解鎖：${getCommissionUnlockText(quest.id)}</p><small>先完成目前可交付的委託取得 EXP，升級後會自動開放。</small></div>` : '';
  const missingText = status === 'available' && missingItems.length ? `<div class="core-missing-hint"><p>缺少商品：</p>${missingItems.map((item) => `<span class="is-lacking">${itemIcon(item.itemId)} ${itemName(item.itemId)} ${item.owned}/${item.need}｜來源：${item.source.label}</span>`).join('')}${missingItems.map(renderCraftPlan).join('')}</div>` : '';
  showModal(`<div class="core-modal-card commission-detail-modal"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">COMMISSION DETAIL</span><h2>${quest.title}</h2><p class="core-customer">客人：${quest.customer}｜${statusLabel(status)}</p><p>${quest.description}</p><div class="core-recipe"><b>需要：</b>${renderRequirements(quest)}</div>${lockText}${missingText}<div class="core-reward"><b>獎勵：</b>${formatReward(getCommissionDisplayReward(quest))}</div></div>`);
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
  if (sourceType === 'station' || sourceType === 'scene') goToSceneSource(sourceType, sourceId);
}

function handleRefreshResult(result, okTitle, failTitle) {
  emitNotice(result.refreshed ? okTitle : failTitle, result.message);
  renderCommissions();
}

function handleCommissionClick(event) {
  const button = event.target.closest('button');
  const page = document.querySelector('#page-commissions');
  if (!button || !page?.contains(button)) return;
  if (button.matches('[data-refresh-daily-commissions]')) return handleRefreshResult(refreshDailyCommissionList(), '委託已刷新', '委託已是最新');
  if (button.matches('[data-refresh-free-commissions]')) return handleRefreshResult(refreshDailyCommissionFree(), '免費刷新完成', '不能免費刷新');
  if (button.matches('[data-refresh-paid-commissions]')) return handleRefreshResult(refreshDailyCommissionPaid(), '付費刷新完成', '不能付費刷新');
  if (button.matches('[data-reroll-commissions]')) return handleRefreshResult(rerollDifficultCommissions(), '重抽完成', '不能重抽');
  if (button.dataset.commissionFilter) { currentCommissionFilter = button.dataset.commissionFilter || 'all'; renderCommissions(); return; }
  if (button.dataset.commissionDetail) { openCommissionDetail(button.dataset.commissionDetail); return; }
  if (button.dataset.complete) { const result = completeCommission(button.dataset.complete); emitNotice(result.ok ? '委託完成' : '還不能完成', result.message); renderCommissions(); return; }
  if (button.dataset.sourceType) goToSource(button.dataset.sourceType, button.dataset.sourceId);
}

function handleCommissionChange(event) {
  const page = document.querySelector('#page-commissions');
  if (!page?.contains(event.target)) return;
  if (event.target.matches('[data-commission-sort]')) { currentCommissionSort = event.target.value || 'default'; renderCommissions(); }
}

function bindCommissionEvents() {
  const page = document.querySelector('#page-commissions');
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', handleCommissionClick);
  page.addEventListener('change', handleCommissionChange);
}

export function renderCommissions() {
  const page = document.querySelector('#page-commissions');
  if (!page) return;
  const allEntries = getQuestEntries();
  const visibleEntries = sortQuestEntries(filterQuestEntries(allEntries));
  const cards = visibleEntries.length ? visibleEntries.map(renderQuestCard).join('') : '<div class="core-empty">目前沒有符合分類的委託。</div>';
  page.innerHTML = `${pageHeader('QUEST BOARD', '委託', '卡片只顯示摘要；材料來源與製作步驟請點開詳情。')}${renderDailyRefreshBar()}${renderFilterTabs(allEntries)}${renderSortBox()}<div class="core-quest-list">${cards}</div>`;
}

export function initCommissionsPage() {
  bindCommissionEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-commissions');
    if (page?.classList.contains('active')) renderCommissions();
  });
}
