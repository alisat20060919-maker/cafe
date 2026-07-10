import { GameDB } from '@db';
import { gatherAt, getGatherDropPreview, getGatherStatus } from '@actions/gather';
import { showModal, closeModal } from '@ui';
import { navigate } from '@router';
import {
  claimExpedition,
  getActiveExpedition,
  getExpeditionHistory,
  getExpeditionRegions,
  getOwnedExpeditionFairies,
  startExpedition,
} from './expedition-actions.js?v=core001';

let tickerId = null;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(minutes = 0) {
  const value = Math.max(0, Number(minutes || 0));
  if (value < 60) return `${value} 分鐘`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} 小時 ${rest} 分鐘` : `${hours} 小時`;
}

function formatRemaining(ms = 0) {
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

function renderGatherPreview() {
  const preview = getGatherDropPreview('backyard');
  return preview.map((drop) => `
    <span class="backyard-drop-chip">
      <b>${escapeHtml(drop.icon)} ${escapeHtml(drop.name)}</b>
      <small>×${Number(drop.qty || 1)} · ${Number(drop.chance || 0)}%</small>
    </span>
  `).join('');
}

function renderPersonalGathering() {
  const status = getGatherStatus('backyard');
  return `
    <article class="backyard-panel personal-gather-panel">
      <div class="backyard-panel-heading">
        <span class="backyard-panel-icon">🧺</span>
        <div>
          <span class="backyard-kicker">LOCAL GATHERING</span>
          <h3>店長親自採集</h3>
          <p>咖啡廳就在森林裡，從後山可以立即取得本地 Demo 素材。</p>
        </div>
      </div>
      <div class="backyard-status-row">
        <span>今日剩餘 <b>${Number(status?.remaining || 0)}/${Number(status?.limit || 0)}</b></span>
        <span>${status?.isDepleted ? '今天已採集完成' : '立即取得，不需等待'}</span>
      </div>
      <div class="backyard-drop-grid">${renderGatherPreview()}</div>
      <button type="button" class="backyard-primary-button" data-backyard-gather ${status?.isDepleted ? 'disabled' : ''}>
        ${status?.isDepleted ? '明天再來採集' : '採集一次'}
      </button>
    </article>
  `;
}

function renderFairySelect(fairies = []) {
  if (!fairies.length) {
    return `
      <div class="backyard-empty-fairies">
        <span>🧚</span>
        <div><b>還沒有可派遣的契約精靈</b><p>先透過祈願取得精靈，之後就能派她前往其他區域。</p></div>
        <button type="button" data-route="gacha">前往祈願</button>
      </div>
    `;
  }

  return `
    <label class="backyard-fairy-select">
      <span>派遣精靈</span>
      <select id="expeditionFairySelect">
        ${fairies.map((fairy) => `
          <option value="${escapeHtml(fairy.fairyId)}">${escapeHtml(fairy.icon)} ${escapeHtml(fairy.name)}｜${escapeHtml(fairy.passiveBuff?.label || fairy.rarity)}</option>
        `).join('')}
      </select>
    </label>
  `;
}

function renderRegionCard(region, canDispatch) {
  return `
    <article class="expedition-region-card">
      <div class="expedition-region-top">
        <span class="expedition-region-icon">${escapeHtml(region.icon)}</span>
        <div><h4>${escapeHtml(region.name)}</h4><small>${formatDuration(region.durationMinutes)}</small></div>
      </div>
      <p>${escapeHtml(region.description)}</p>
      <div class="expedition-preview-list">
        ${region.preview.map((drop) => `<span>${escapeHtml(drop.icon)} ${escapeHtml(drop.name)}</span>`).join('')}
      </div>
      <button type="button" data-start-expedition="${escapeHtml(region.id)}" ${canDispatch ? '' : 'disabled'}>派遣到此區域</button>
    </article>
  `;
}

function renderActiveExpedition(active) {
  return `
    <div class="active-expedition-card" data-active-expedition>
      <div class="active-expedition-visual">
        <span>${escapeHtml(active.fairy.icon || '🧚')}</span>
        <span class="active-expedition-route">→</span>
        <span>${escapeHtml(active.region.icon)}</span>
      </div>
      <span class="backyard-kicker">EXPEDITION IN PROGRESS</span>
      <h4>${escapeHtml(active.fairy.name)}正在前往${escapeHtml(active.region.name)}</h4>
      <p>${escapeHtml(active.fairy.passiveBuff?.label || '精靈會依照自己的能力協助探索。')}</p>
      <div class="expedition-countdown" data-expedition-countdown>${active.isComplete ? '遠征完成' : formatRemaining(active.remainingMs)}</div>
      <button type="button" class="backyard-primary-button" data-claim-expedition ${active.isComplete ? '' : 'disabled'}>
        ${active.isComplete ? '領取遠征素材' : '等待精靈歸來'}
      </button>
    </div>
  `;
}

function renderHistory() {
  const history = getExpeditionHistory().slice(0, 3);
  if (!history.length) return '<p class="backyard-history-empty">還沒有完成過遠征。</p>';
  return `
    <div class="backyard-history-list">
      ${history.map((record) => `
        <div>
          <span>${escapeHtml(record.fairy?.icon || '🧚')} ${escapeHtml(record.fairy?.name || '精靈')}</span>
          <b>${escapeHtml(record.region?.name || record.regionId)}</b>
          <small>${record.rewardView.map((drop) => `${escapeHtml(drop.icon)}×${drop.qty}`).join(' ')}</small>
        </div>
      `).join('')}
    </div>
  `;
}

function renderExpeditionCamp() {
  const fairies = getOwnedExpeditionFairies();
  const active = getActiveExpedition();
  const regions = getExpeditionRegions();

  return `
    <article class="backyard-panel expedition-panel">
      <div class="backyard-panel-heading">
        <span class="backyard-panel-icon">⛺</span>
        <div>
          <span class="backyard-kicker">FAIRY EXPEDITION</span>
          <h3>精靈遠征營地</h3>
          <p>派契約精靈前往森林外的其他區域，等待完成後回來領取素材。</p>
        </div>
      </div>
      ${active ? renderActiveExpedition(active) : `
        ${renderFairySelect(fairies)}
        <div class="expedition-region-grid">
          ${regions.map((region) => renderRegionCard(region, fairies.length > 0)).join('')}
        </div>
      `}
      <section class="backyard-history">
        <h4>最近遠征紀錄</h4>
        ${renderHistory()}
      </section>
    </article>
  `;
}

export function renderBackyardPage() {
  const root = document.querySelector('#page-backyard');
  if (!root) return;

  root.innerHTML = `
    <section class="backyard-page">
      <header class="backyard-header">
        <button type="button" class="backyard-back" data-route="home">← 返回領地</button>
        <div>
          <span class="backyard-kicker">AREA 02 · BACKYARD</span>
          <h2>🌲 咖啡廳後山</h2>
          <p>本地森林素材可以親自採集；其他區域的素材則交給契約精靈遠征。</p>
        </div>
        <button type="button" class="backyard-inventory" data-route="inventory">查看背包</button>
      </header>
      <div class="backyard-scene-banner">
        <div class="backyard-scene-copy"><b>今天的森林也很安靜。</b><span>選擇親自採集，或到營地安排一趟遠征。</span></div>
      </div>
      <div class="backyard-layout">
        ${renderPersonalGathering()}
        ${renderExpeditionCamp()}
      </div>
    </section>
  `;

  syncExpeditionTicker();
}

function renderGatherResult(result) {
  const drop = result.dropView;
  showModal(`
    <div class="core-modal-card compact gather-result-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">BACKYARD GATHERING</span>
      <div class="gather-result-icon">${escapeHtml(result.ok ? drop?.icon || '🌿' : '🧺')}</div>
      <h2>${escapeHtml(result.title || '採集結果')}</h2>
      <p>${escapeHtml(result.message || '')}</p>
      ${result.ok ? `<div class="gather-result-status">獲得 ${escapeHtml(drop.name)} ×${Number(drop.qty || 1)}｜今日剩餘 ${Number(result.remaining || 0)}/${Number(result.limit || 0)}</div>` : ''}
      <button type="button" data-return-backyard>返回後山</button>
    </div>
  `);
}

function renderExpeditionStartResult(result) {
  showModal(`
    <div class="core-modal-card compact location-hint-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">EXPEDITION</span>
      <div class="gather-result-icon">${result.ok ? '🧚' : '⚠️'}</div>
      <h2>${escapeHtml(result.ok ? result.title : '無法派遣')}</h2>
      <p>${escapeHtml(result.message || '')}</p>
      <button type="button" data-return-backyard>返回後山</button>
    </div>
  `);
}

function renderExpeditionClaimResult(result) {
  showModal(`
    <div class="core-modal-card compact location-hint-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">EXPEDITION RESULT</span>
      <div class="gather-result-icon">${result.ok ? escapeHtml(result.fairy?.icon || '🧚') : '⏳'}</div>
      <h2>${escapeHtml(result.ok ? result.title : '還不能領取')}</h2>
      <p>${escapeHtml(result.message || '')}</p>
      ${result.ok ? `<div class="expedition-claim-rewards">${result.rewardView.map((drop) => `<span>${escapeHtml(drop.icon)} ${escapeHtml(drop.name)} ×${drop.qty}</span>`).join('')}</div>` : ''}
      <button type="button" data-return-backyard>返回後山</button>
    </div>
  `);
}

function syncExpeditionTicker() {
  if (tickerId) {
    window.clearInterval(tickerId);
    tickerId = null;
  }

  const active = getActiveExpedition();
  if (!active || active.isComplete) return;

  tickerId = window.setInterval(() => {
    const next = getActiveExpedition();
    const countdown = document.querySelector('#page-backyard.active [data-expedition-countdown]');
    const claimButton = document.querySelector('#page-backyard.active [data-claim-expedition]');
    if (!next || !countdown || !claimButton) {
      window.clearInterval(tickerId);
      tickerId = null;
      return;
    }
    if (next.isComplete) {
      countdown.textContent = '遠征完成';
      claimButton.disabled = false;
      claimButton.textContent = '領取遠征素材';
      window.clearInterval(tickerId);
      tickerId = null;
      return;
    }
    countdown.textContent = formatRemaining(next.remainingMs);
  }, 1000);
}

function handleBackyardClick(event) {
  const gatherButton = event.target.closest('[data-backyard-gather]');
  if (gatherButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    gatherButton.disabled = true;
    const result = gatherAt('backyard');
    renderBackyardPage();
    renderGatherResult(result);
    return;
  }

  const expeditionButton = event.target.closest('[data-start-expedition]');
  if (expeditionButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const fairyId = document.querySelector('#page-backyard #expeditionFairySelect')?.value || '';
    const result = startExpedition(expeditionButton.dataset.startExpedition, fairyId);
    renderBackyardPage();
    renderExpeditionStartResult(result);
    return;
  }

  const claimButton = event.target.closest('[data-claim-expedition]');
  if (claimButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    claimButton.disabled = true;
    const result = claimExpedition();
    renderBackyardPage();
    renderExpeditionClaimResult(result);
    return;
  }

  const returnButton = event.target.closest('[data-return-backyard]');
  if (returnButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeModal();
    navigate('backyard');
  }
}

export function initBackyardPage() {
  if (document.documentElement.dataset.backyardReady === 'true') return;
  document.documentElement.dataset.backyardReady = 'true';
  document.addEventListener('click', handleBackyardClick, true);
}
