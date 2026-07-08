import { getState, resetState, replaceState, persistState, markOpeningStorySeen } from '@state';
import { claimDailyReward } from '@actions/daily';
import { exportSave, importSave } from '@save';
import { Events, on } from '@eventBus';

let modalHost;

const openingStory = [
  {
    speaker: '？？？',
    title: '森林盡頭的邀請函',
    body: '你在信箱裡發現一封沾著星屑的邀請函。信紙上寫著：「如果你願意照顧這間小店，迷路的精靈們就會找到回家的燈。」',
  },
  {
    speaker: '小店長',
    title: '精靈咖啡屋',
    body: '推開木門後，咖啡香、月光花瓣和星星莓的甜味一起湧了出來。這裡曾經很熱鬧，但現在只剩下一盞還沒熄滅的小燈。',
  },
  {
    speaker: '小店長',
    title: '第一天營業',
    body: '從今天開始，你要接下客人的委託、製作甜點與飲品、累積經驗，讓咖啡屋慢慢恢復原本的樣子。也許某一天，封住的煉金室會再次亮起來。',
  },
];

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
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

  if (saveLabel) saveLabel.textContent = `LV. ${String(state.player.level).padStart(2, '0')} / Save v${state.saveVersion}`;
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
}

export function closeModal() {
  if (!modalHost) return;
  modalHost.hidden = true;
  modalHost.innerHTML = '';
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
