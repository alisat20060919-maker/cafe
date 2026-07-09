import { runDevChecks } from '@dev/checks';
import { GameDB } from '@db';
import { initState } from '@state';
import { getGatherDropPreview } from '@actions/gather';
import { initUI, showModal, showOpeningStoryIfNeeded } from '@ui';
import { initHome, renderHome } from '@home';
import { initRouter } from '@router';
import { initGachaPage, renderGacha } from '@pages/gacha';
import { initInventoryPage, renderInventory } from '@pages/inventory';
import { initFairiesPage, renderFairies } from '@pages/fairies';
import { renderCollection } from '@pages/collection';
import { initCommissionsPage, renderCommissions } from '@pages/commissions';
import { initShopPage, renderShop } from '@pages/shop';

function getSceneTitle(locationId = '') {
  const scene = document.querySelector(`#${locationId}`);
  return scene?.dataset.title || GameDB.scenes?.[locationId]?.label || locationId || '採集地點';
}

function renderRateRows(locationId = '') {
  const preview = getGatherDropPreview(locationId);
  if (!preview.length) return '<p>目前沒有可顯示的掉落資料。</p>';
  return preview.map((drop) => `
    <div class="gather-rate-row">
      <span class="gather-rate-icon">${drop.icon}</span>
      <div class="gather-rate-main">
        <b>${drop.name}</b>
        <small>${drop.rarity}｜${drop.typeLabel}｜每次 ×${drop.qty}</small>
        <em><strong style="width:${Math.max(4, Math.min(100, Number(drop.chance || 0)))}%"></strong></em>
      </div>
      <span class="gather-rate-percent">${drop.chance}%</span>
    </div>
  `).join('');
}

function showDropRateModal(locationId = '') {
  const title = getSceneTitle(locationId);
  showModal(`
    <div class="core-modal-card compact gather-rate-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">DROP RATE</span>
      <h2>${title}掉落機率</h2>
      <p>每次採集會依掉落表抽出一種素材；以下是目前機率。</p>
      <div class="gather-rate-list">${renderRateRows(locationId)}</div>
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
  button.setAttribute('aria-label', `查看${getSceneTitle(scene.id)}掉落機率`);
  button.textContent = '?';
  info.appendChild(button);
}

function enhanceDropHint(line) {
  if (!line || line.dataset.dropHelpReady === 'true') return;
  const scene = line.closest('.scene-card');
  if (!scene?.id) return;
  line.dataset.dropHelpReady = 'true';
  line.innerHTML = '<span class="drop-help-label">可能掉落</span>';
  ensureCornerDropButton(scene);
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
  initState();
  runDevChecks();
  initUI();
  initHome();
  initGatherDropHelp();
  initGachaPage();
  initInventoryPage();
  initFairiesPage();
  initCommissionsPage();
  initShopPage();

  initRouter({
    home: { render: renderHome },
    gacha: { render: renderGacha },
    commissions: { render: renderCommissions },
    inventory: { render: renderInventory },
    fairies: { render: renderFairies },
    collection: { render: renderCollection },
    shop: { render: renderShop },
  }, 'home');

  showOpeningStoryIfNeeded();
}

document.addEventListener('DOMContentLoaded', boot);
