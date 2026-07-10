import { runDevChecks } from '@dev/checks';
import { runDataIntegrityChecks } from './data-integrity-checks.js?v=core001';
import { applyLegacyGameDataAliases } from './data-aliases.js?v=core002';
import { runSmokeTests, renderSmokeTestReport } from './smoke-tests.js?v=core002';
import { runEdgeTests, renderEdgeTestReport } from './edge-tests.js?v=core002';
import { initCraftUI, renderCraftStationPage } from './craft-ui.js?v=core003';
import { initBackyardEntry } from './backyard-entry.js?v=core001';
import { initBackyardPage, renderBackyardPage } from './backyard-page.js?v=core001';
import { GameDB } from '@db';
import { applyFairyExpansion } from './fairy-expansion.js?v=core002';
import { initState } from '@state';
import { getGatherDropPreview } from '@actions/gather';
import { initUI, showModal, showOpeningStoryIfNeeded } from '@ui';
import { initHome, renderHome } from '@home';
import { initRouter } from '@router';
import { initGachaPage, renderGacha } from '@pages/gacha';
import { initInventoryPage, renderInventory } from '@pages/inventory';
import { initFairiesPage, renderFairies } from '@pages/fairies';
import { initCollectionPage, renderCollection } from '@pages/collection';
import { initCommissionsPage, renderCommissions } from '@pages/commissions';
import { initShopPage, renderShop } from '@pages/shop';

function getSceneTitle(locationId = '') {
  const scene = document.querySelector(`#${locationId}`);
  return scene?.dataset.title || GameDB.scenes?.[locationId]?.label || locationId || '採集地點';
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function joinNames(items = []) {
  const names = [...new Set(items.map((item) => item.name).filter(Boolean))];
  if (!names.length) return '暫無';
  if (names.length <= 4) return names.join('、');
  return `${names.slice(0, 4).join('、')}等 ${names.length} 種`;
}

function getChanceGroup(drop) {
  const chance = Number(drop.chance || 0);
  if (chance >= 35) return 'common';
  if (chance >= 15) return 'normal';
  return 'rare';
}

function renderDropTextSummary(locationId = '') {
  const preview = getGatherDropPreview(locationId);
  const table = GameDB.gatherTables?.[locationId];
  if (!preview.length) return '<p>目前沒有可顯示的掉落資料。</p>';

  const groups = preview.reduce((acc, drop) => {
    const key = getChanceGroup(drop);
    acc[key] ||= [];
    acc[key].push(drop);
    return acc;
  }, {});

  const rareNames = joinNames(groups.rare || []);
  const eventCount = Array.isArray(table?.specialEvents) ? table.specialEvents.length : 0;
  const eventText = eventCount > 0
    ? `採集時還可能觸發 ${eventCount} 種小事件，獲得額外素材或劇情文字。`
    : '這個地點目前沒有特殊事件。';

  return `
    <div class="gather-rate-text-summary">
      <p><b>主要會獲得：</b>${escapeHtml(joinNames(groups.common || []))}。</p>
      <p><b>也有機會獲得：</b>${escapeHtml(joinNames(groups.normal || []))}。</p>
      <p><b>較少見素材：</b>${escapeHtml(rareNames)}。</p>
      <p><b>特殊事件：</b>${escapeHtml(eventText)}</p>
      <p class="core-muted">實際結果仍依採集表隨機抽取；這裡只用文字概述，不再顯示完整百分比清單。</p>
    </div>
  `;
}

function showDropRateModal(locationId = '') {
  const title = getSceneTitle(locationId);
  showModal(`
    <div class="core-modal-card compact gather-rate-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">GATHER HINT</span>
      <h2>${title}採集提示</h2>
      <p>素材數量變多後，這裡改成簡短文字說明，不再列出全部掉落率。</p>
      ${renderDropTextSummary(locationId)}
    </div>
  `);
}

function ensureCornerDropButton(scene) {
  const info = scene?.querySelector('.scene-info');
  if (!info || info.querySelector('.gather-help-button')) return;
  const button = document.createElement('button');
  button.className = 'gather-help-button';
  button.type = 'button';
  button.dataset.gatherDropHelp = scene.id;
  button.setAttribute('aria-label', `查看${getSceneTitle(scene.id)}採集提示`);
  button.textContent = '?';
  info.appendChild(button);
}

function enhanceDropHint(line) {
  if (!line || line.dataset.dropHelpReady === 'true') return;
  const scene = line.closest('.scene-card');
  if (!scene?.id) return;
  line.dataset.dropHelpReady = 'true';
  ensureCornerDropButton(scene);
  line.remove();
}

function enhanceDropHints(root = document) {
  root.querySelectorAll?.('.gather-preview-line').forEach(enhanceDropHint);
}

function initGatherDropHelp() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gather-drop-help]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    showDropRateModal(button.dataset.gatherDropHelp);
  });
  enhanceDropHints();
  const target = document.querySelector('#page-home') || document.body;
  const observer = new MutationObserver(() => enhanceDropHints(target));
  observer.observe(target, { childList: true, subtree: true });
}

function boot() {
  applyFairyExpansion();
  applyLegacyGameDataAliases(GameDB);
  initState();
  runDevChecks();
  runDataIntegrityChecks();
  initUI();
  initCraftUI();
  initBackyardEntry();
  initBackyardPage();
  initHome();
  initGatherDropHelp();
  initGachaPage();
  initInventoryPage();
  initFairiesPage();
  initCollectionPage();
  initCommissionsPage();
  initShopPage();

  initRouter({
    home: { render: renderHome },
    backyard: { render: renderBackyardPage },
    kitchen: { render: () => renderCraftStationPage('kitchen') },
    alchemy: { render: () => renderCraftStationPage('alchemy') },
    gacha: { render: renderGacha },
    commissions: { render: renderCommissions },
    inventory: { render: renderInventory },
    fairies: { render: renderFairies },
    collection: { render: renderCollection },
    shop: { render: renderShop },
  }, 'home');

  const smokeReport = runSmokeTests();
  const edgeReport = runEdgeTests();

  if (!edgeReport.skipped) {
    showModal(renderEdgeTestReport(edgeReport));
  } else if (!smokeReport.skipped) {
    showModal(renderSmokeTestReport(smokeReport));
  } else {
    showOpeningStoryIfNeeded();
  }
}

document.addEventListener('DOMContentLoaded', boot);
