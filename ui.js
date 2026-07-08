import { GameDB } from '@db';
import { getState, resetState, replaceState, persistState, markOpeningStorySeen } from '@state';
import { claimDailyReward } from '@actions/daily';
import { exportSave, importSave } from '@save';
import { Events, on } from '@eventBus';

let modalHost;
let lockedScrollY = 0;

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function getOpeningStory() {
  return Array.isArray(GameDB.stories?.opening) ? GameDB.stories.opening : [];
}

function lockBodyScroll() {
  if (document.body.classList.contains('core-modal-open')) return;
  lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('core-modal-open');
  document.body.style.position = 'fixed';
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockBodyScroll() {
  if (!document.body.classList.contains('core-modal-open')) return;
  document.body.classList.remove('core-modal-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, lockedScrollY);
  lockedScrollY = 0;
}

export function initUI() {
  modalHost = document.querySelector('#modalHost');
  if (!modalHost) {
    modalHost = document.createElement('div');
    modalHost.id = 'modalHost';
    modalHost.className = 'core-modal-host';
    modalHost.hidden = true;
    document.body.appendChild(modalHost);
  }

  modalHost.addEventListener('click', (event) => {
    if (event.target === modalHost || event.target.closest('[data-close-modal]')) closeModal();
  });

  $('[data-action="daily"]')?.addEventListener('click', handleDaily);
  $('[data-action="settings"]')?.addEventListener('click', openSettings);

  on(Events.STATE_CHANGED, updateStatus);
  on(Events.NOTICE, (event) => {
    showNotice(event.detail?.title || '提示', event.detail?.body || '');
  });

  updateStatus();
}

export function updateStatus() {
  const state = getState();
  const saveLabel = $('.save-label');
  const status = $('.status-pills');
  const ring = $('.level-ring');
  const ringValue = $('#levelRingValue');
  const ringSub = $('#levelRingSub');
  const progress = GameDB.getLevelProgress(state.player);
  const ratio = progress.isMax ? 1 : Math.min(1, Math.max(0, progress.currentLevelExp / progress.neededForNext));
  const degrees = Math.round(ratio * 360);
  const expText = progress.isMax
    ? `EXP ${progress.exp}`
    : `EXP ${progress.currentLevelExp}/${progress.neededForNext}`;

  if (saveLabel) saveLabel.textContent = `${expText} / Save v${state.saveVersion}`;
  if (ring) {
    ring.style.setProperty('--exp-deg', `${degrees}deg`);
    ring.setAttribute('aria-label', `等級 ${state.player.level}，${expText}`);
  }
  if (ringValue) ringValue.textContent = String(state.player.level).padStart(2, '0');
  if (ringSub) ringSub.textContent = progress.isMax ? 'MAX' : 'LV';

  if (status) {
    status.innerHTML = `
      <span>☀️ 森林午後</span>
      <span>✦ 星糖 ${state.player.starSugar}</span>
      <span>🪙 葉幣 ${state.player.leafCoin}</span>
      <span>🎟️ 靈感券 ${state.player.tickets}</span>
    `;
  }

  document.body.classList.toggle('soft-mode', Boolean(state.settings.softMode));
}

function handleDaily() {
  const result = claimDailyReward();
  showNotice(result.ok ? `連續簽到 Day ${result.streak}` : '今日簽到', result.message);
}

function renderOpeningStoryStep(index = 0) {
  const openingStory = getOpeningStory();
  if (!openingStory.length) return;

  const step = openingStory[index] || openingStory[0];
  const isLast = index >= openingStory.length - 1;

  showModal(`
    <div class="core-modal-card compact opening-story-modal">
      <span class="core-modal-kicker">OPENING STORY ${index + 1}/${openingStory.length}</span>
      <div class="gather-result-icon">📜</div>
      <p class="core-customer">${step.speaker}</p>
      <h2>${step.title}</h2>
      <p>${step.body}</p>
      <button type="button" data-opening-story-next="${isLast ? 'finish' : String(index + 1)}">${isLast ? '進入咖啡屋' : '繼續'}</button>
    </div>
  `);

  $('[data-opening-story-next]', modalHost)?.addEventListener('click', (event) => {
    const next = event.currentTarget.dataset.openingStoryNext;
    if (next === 'finish') {
      markOpeningStorySeen();
      closeModal();
      return;
    }

    renderOpeningStoryStep(Number(next || 0));
  });
}

export function showOpeningStoryIfNeeded() {
  const state = getState();
  if (state.story?.seenOpening) return;
  renderOpeningStoryStep(0);
}

export function showNotice(title, body) {
  showModal(`
    <div class="core-modal-card compact">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `);
}

export function showModal(html) {
  if (!modalHost) initUI();
  modalHost.innerHTML = html;
  modalHost.hidden = false;
  lockBodyScroll();
}

export function closeModal() {
  if (!modalHost) return;
  modalHost.hidden = true;
  modalHost.innerHTML = '';
  unlockBodyScroll();
}

export function openSettings() {
  const state = getState();
  showModal(`
    <div class="core-modal-card">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">SYSTEM</span>
      <h2>設定</h2>
      <div class="core-setting-list">
        <button type="button" data-setting="animation">動畫：${state.settings.animation ? 'ON' : 'OFF'}</button>
        <button type="button" data-setting="softMode">柔和模式：${state.settings.softMode ? 'ON' : 'OFF'}</button>
        <button type="button" data-setting="sound">音效：${state.settings.sound ? 'ON' : 'OFF'}</button>
        <button type="button" data-export-save>匯出存檔</button>
        <button type="button" data-import-save>匯入存檔</button>
        <button type="button" data-reset-save>清除存檔</button>
      </div>
      <p class="core-modal-note">目前是第一版本機存檔。資料存在這台裝置的瀏覽器裡。</p>
    </div>
  `);

  $all('[data-setting]', modalHost).forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.setting;
      const next = getState();
      next.settings[key] = !next.settings[key];
      persistState(`setting:${key}`);
      openSettings();
    });
  });

  $('[data-export-save]', modalHost)?.addEventListener('click', () => {
    const code = exportSave(getState());
    showModal(`
      <div class="core-modal-card">
        <button type="button" class="core-modal-close" data-close-modal>×</button>
        <h2>匯出存檔</h2>
        <textarea readonly>${code}</textarea>
        <p class="core-modal-note">先複製起來。之後換裝置可以用匯入存檔貼回來。</p>
      </div>
    `);
  });

  $('[data-import-save]', modalHost)?.addEventListener('click', () => {
    const text = prompt('貼上你的存檔文字');
    if (!text) return;
    try {
      replaceState(importSave(text));
      closeModal();
      showNotice('匯入成功', '存檔已更新。');
    } catch (error) {
      showNotice('匯入失敗', '存檔文字格式不正確。');
    }
  });

  $('[data-reset-save]', modalHost)?.addEventListener('click', () => {
    if (!confirm('確定要清除精靈咖啡屋存檔嗎？')) return;
    resetState();
    closeModal();
    showNotice('已清除', '存檔已重置。');
  });
}
