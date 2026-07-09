import { GameDB } from '@db';
import { getState, getActiveCommissionIds } from '@state';
import {
  canCompleteCommission,
  completeCommission,
  getCommissionDisplayReward,
  getCommissionUnlockText,
  isCommissionUnlocked,
} from '@actions/commission';
import { formatReward } from '@utils';
import { navigate } from '@router';
import { goToScene } from '@home';
import { showModal } from '@ui';
import { Events, on, emitNotice } from '@eventBus';

const COMMISSION_GROUPS = [
  { id: 'daily', label: '每日任務', icon: '📅', hint: '每天會更新的小委託' },
  { id: 'special', label: '特殊任務', icon: '✨', hint: '劇情、活動與精靈委託' },
  { id: 'completed', label: '已完成', icon: '🎀', hint: '已交付的委託' },
];

let currentCommissionGroup = 'daily';

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
function getFirstRequiredItem(quest) { return Object.keys(getRequirements(quest))[0] || 'star_berry'; }

function renderRequirements(quest, limit = 2) {
  const entries = Object.entries(getRequirements(quest));
  const visible = entries.slice(0, limit);
  const hiddenCount = Math.max(0, entries.length - visible.length);
  const chips = visible.map(([itemId, qty]) => {
    const owned = getOwnedCount(itemId);
    const lackClass = owned < qty ? ' is-lacking' : '';
    return `<span class="commission-need-chip${lackClass}">${itemIcon(itemId)} ${itemName(itemId)} <b>${owned}/${qty}</b></span>`;
  }).join('');
  return `${chips}${hiddenCount ? `<span class="commission-need-chip">+${hiddenCount}</span>` : ''}`;
}

function renderRequestLine(quest) {
  const entries = Object.entries(getRequirements(quest));
  if (!entries.length) return quest.request || '無需求';
  return entries.map(([itemId, qty]) => `${itemIcon(itemId)} ${itemName(itemId)} ×${qty}`).join('、');
}

function getQuestViewStatus(quest) {
  const state = getState();
  if (isSavedCompleted(state.commissions[quest.id])) return 'completed';
  if (!isCommissionUnlocked(quest.id)) return 'locked';
  return canCompleteCommission(quest.id) ? 'ready' : 'available';
}

function statusLabel(status) { return { locked: '未解鎖', available: '商品不足', ready: '可交付', completed: '已完成' }[status] || status; }
function statusIcon(status) { return { locked: '🔒', available: '🧺', ready: '✅', completed: '🎀' }[status] || '📋'; }
function statusRank(status) { return { ready: 0, available: 1, locked: 2, completed: 3 }[status] ?? 99; }

function getCommissionIdsForBoard() {
  const activeIds = getActiveCommissionIds();
  const allIds = Object.keys(GameDB.commissions || {});
  const merged = [...activeIds, ...allIds.filter((id) => !activeIds.includes(id))];
  return merged;
}

function getQuestEntries() {
  return getCommissionIdsForBoard()
    .map((commissionId, index) => ({ quest: GameDB.commissions[commissionId], index }))
    .filter((entry) => entry.quest)
    .map((entry) => ({ ...entry, status: getQuestViewStatus(entry.quest) }));
}

function getEntryGroup(entry) {
  if (entry.status === 'completed') return 'completed';
  return entry.quest.category === 'daily' || entry.quest.category === 'mvp' ? 'daily' : 'special';
}

function countByGroup(entries, groupId) {
  return entries.filter((entry) => getEntryGroup(entry) === groupId).length;
}

function filterQuestEntries(entries) {
  return entries
    .filter((entry) => getEntryGroup(entry) === currentCommissionGroup)
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.index - b.index);
}

function renderTaskTabs(entries) {
  return `
    <div class="commission-task-tabs" aria-label="任務分類">
      ${COMMISSION_GROUPS.map((group) => `
        <button type="button" class="${currentCommissionGroup === group.id ? 'active' : ''}" data-commission-group="${group.id}">
          <span>${group.icon}</span>
          <b>${group.label}</b>
          <small>${countByGroup(entries, group.id)}</small>
        </button>
      `).join('')}
    </div>`;
}

function renderGroupHint(entries) {
  const group = COMMISSION_GROUPS.find((item) => item.id === currentCommissionGroup) || COMMISSION_GROUPS[0];
  return `<div class="commission-group-hint"><b>${group.label}</b><span>${group.hint}</span><small>${countByGroup(entries, group.id)} 件</small></div>`;
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

function sourceButtonText(source) {
  if (source.type === 'station') return '製作';
  if (source.type === 'scene') return '收集';
  return '前往';
}

function renderQuestButton(quest, status) {
  if (status === 'completed') return '<button class="commission-primary-action" type="button" disabled>完成</button>';
  if (status === 'locked') return `<button class="commission-primary-action" type="button" data-commission-detail="${quest.id}">條件</button>`;
  if (status === 'ready') return `<button class="commission-primary-action" type="button" data-complete="${quest.id}">交付</button>`;
  const source = getFirstSource(quest);
  return `<button class="commission-primary-action" type="button" data-source-type="${source.type}" data-source-id="${source.id}">${sourceButtonText(source)}</button>`;
}

function renderQuestCard(entry) {
  const { quest, status } = entry;
  const primaryItem = getFirstRequiredItem(quest);
  return `
    <article class="core-quest-card commission-card status-${status}">
      <button class="commission-row-open" type="button" data-commission-detail="${quest.id}" aria-label="查看 ${quest.title} 詳情">
        <div class="commission-thumb"><span>${itemIcon(primaryItem)}</span></div>
        <div class="commission-row-main">
          <div class="commission-row-top">
            <span class="commission-rank">${quest.difficulty}</span>
            <strong class="commission-status status-${status}">${statusIcon(status)} ${statusLabel(status)}</strong>
          </div>
          <h3>${quest.title}</h3>
          <p class="commission-client">${quest.customer}</p>
          <p class="commission-request-line">${renderRequestLine(quest)}</p>
          <div class="commission-need-row">${renderRequirements(quest)}</div>
        </div>
      </button>
      <div class="commission-row-side">
        <button class="commission-detail-action" type="button" data-commission-detail="${quest.id}">詳情</button>
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
  showModal(`<div class="core-modal-card commission-detail-modal"><button type="button" class="core-modal-close" data-close-modal>×</button><span class="core-modal-kicker">COMMISSION DETAIL</span><h2>${quest.title}</h2><p class="core-customer">客人：${quest.customer}｜${statusLabel(status)}</p><p>${quest.description}</p><div class="core-recipe"><b>需要：</b><div class="commission-detail-needs">${renderRequirements(quest, 99)}</div></div>${lockText}${missingText}<div class="core-reward"><b>獎勵：</b>${formatReward(getCommissionDisplayReward(quest))}</div></div>`);
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

function handleCommissionClick(event) {
  const button = event.target.closest('button');
  const page = document.querySelector('#page-commissions');
  if (!button || !page?.contains(button)) return;
  if (button.dataset.commissionGroup) { currentCommissionGroup = button.dataset.commissionGroup || 'daily'; renderCommissions(); return; }
  if (button.dataset.commissionDetail) { openCommissionDetail(button.dataset.commissionDetail); return; }
  if (button.dataset.complete) { const result = completeCommission(button.dataset.complete); emitNotice(result.ok ? '委託完成' : '還不能完成', result.message); renderCommissions(); return; }
  if (button.dataset.sourceType) goToSource(button.dataset.sourceType, button.dataset.sourceId);
}

function bindCommissionEvents() {
  const page = document.querySelector('#page-commissions');
  if (!page || page.dataset.eventsBound === 'true') return;
  page.dataset.eventsBound = 'true';
  page.addEventListener('click', handleCommissionClick);
}

export function renderCommissions() {
  const page = document.querySelector('#page-commissions');
  if (!page) return;
  const allEntries = getQuestEntries();
  const visibleEntries = filterQuestEntries(allEntries);
  const cards = visibleEntries.length ? visibleEntries.map(renderQuestCard).join('') : '<div class="core-empty">這個分類目前沒有委託。</div>';
  page.innerHTML = `${pageHeader('QUEST BOARD', '委託', '依任務種類瀏覽；點詳情再看描述、缺材料與製作提示。')}${renderTaskTabs(allEntries)}${renderGroupHint(allEntries)}<div class="core-quest-list commission-board-list">${cards}</div>`;
}

export function initCommissionsPage() {
  bindCommissionEvents();
  on(Events.STATE_CHANGED, () => {
    const page = document.querySelector('#page-commissions');
    if (page?.classList.contains('active')) renderCommissions();
  });
}
