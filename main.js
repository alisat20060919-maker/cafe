import { GameDB } from './game-data.js';
import {
  initState,
  getState,
  resetState,
  replaceState,
  persistState,
  claimDailyReward,
  drawGacha,
  canCompleteCommission,
  completeCommission,
  formatReward,
} from './game-state.js';
import { exportSave, importSave } from './save.js';

const pageNames = {
  home: '店鋪',
  gacha: '祈願',
  commissions: '委託',
  inventory: '背包',
};

let pageHost;
let modalHost;
let currentPage = 'home';

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
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

function renderDrop(record) {
  if (!record) return '';
  if (record.kind === 'fairy') {
    const fairy = GameDB.fairies[record.id];
    return `<article class="core-result-card ssr"><b>${fairy.icon} ${fairy.name}</b><span>${fairy.rarity}</span><p>「${fairy.quote}」</p></article>`;
  }
  const item = GameDB.items[record.id];
  return `<article class="core-result-card"><b>${item.icon} ${item.name} ×${record.qty}</b><span>${item.rarity} / ${item.typeName}</span><p>${item.description}</p></article>`;
}

function ensureTopActions() {
  const topBar = $('.top-bar');
  if (!topBar || $('.top-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'top-actions';
  actions.innerHTML = `
    <button type="button" data-action="daily">🎁<span>簽到</span></button>
  `;
  topBar.appendChild(actions);

  actions.querySelector('[data-action="daily"]').addEventListener('click', handleDaily);
}

function ensurePageHost() {
  if (pageHost) return pageHost;
  pageHost = document.createElement('section');
  pageHost.className = 'core-page-host';
  pageHost.hidden = true;
  pageHost.setAttribute('aria-live', 'polite');

  const dialogue = $('.dialogue-box');
  dialogue?.before(pageHost);

  modalHost = document.createElement('div');
  modalHost.className = 'core-modal-host';
  modalHost.hidden = true;
  document.body.appendChild(modalHost);
  modalHost.addEventListener('click', (event) => {
    if (event.target === modalHost || event.target.closest('[data-close-modal]')) closeModal();
  });

  return pageHost;
}

function rewriteBottomDock() {
  const dock = $('.bottom-dock');
  if (!dock) return;

  dock.innerHTML = `
    <button type="button" data-page-button="gacha">🎰<span>祈願</span></button>
    <button type="button" data-page-button="commissions">📋<span>委託</span></button>
    <button type="button" class="dock-center" data-page-button="home">🏠<span>店鋪</span></button>
    <button type="button" data-page-button="inventory">🧺<span>背包</span></button>
    <button type="button" data-dock-action="settings">⚙️<span>設定</span></button>
  `;

  $all('[data-page-button]', dock).forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.pageButton));
  });

  $('[data-dock-action="settings"]', dock)?.addEventListener('click', openSettings);
}

function updateStatus() {
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

function setDockActive(page) {
  $all('[data-page-button]').forEach((button) => {
    button.classList.toggle('active', button.dataset.pageButton === page);
  });
}

function setDialogue(place, text) {
  const speakerName = $('#speakerName');
  const placeName = $('#placeName');
  const dialogueText = $('#dialogueText');
  if (speakerName) speakerName.textContent = '小店長';
  if (placeName) placeName.textContent = place;
  if (dialogueText) dialogueText.textContent = text;
}

function setPage(page) {
  currentPage = pageNames[page] ? page : 'home';
  const gameWindow = $('.game-window');
  ensurePageHost();

  gameWindow?.classList.remove('gacha-mode', 'page-mode');
  gameWindow?.setAttribute('data-page', currentPage);
  setDockActive(currentPage);

  if (currentPage === 'home') {
    pageHost.hidden = true;
    setDialogue('咖啡屋', '回到店鋪。主畫面現在放在底部中央圓形按鈕，簽到留在右上角。');
    updateStatus();
    return;
  }

  pageHost.hidden = false;
  if (currentPage === 'gacha') renderGacha();
  if (currentPage === 'inventory') renderInventory();
  if (currentPage === 'commissions') renderCommissions();
  updateStatus();
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

function renderGacha(results = []) {
  const state = getState();
  const pool = GameDB.gachaPools.standard;
  const costMeta = GameDB.currencies[pool.cost.currency];

  pageHost.innerHTML = `
    ${pageHeader('WISH / DATA CONNECTED', '星糖祈願', '現在抽卡會真的扣星糖，結果會寫進 gameState，背包會讀同一份資料。')}
    <section class="core-gacha-layout">
      <div class="core-gacha-machine">
        <div class="core-orb">✦</div>
        <h3>${pool.name}</h3>
        <p>${pool.description}</p>
        <div class="core-pills">
          <span>${costMeta.icon} ${costMeta.name} ${state.player[pool.cost.currency]}</span>
          <span>單抽 ${pool.cost.amount}</span>
        </div>
        <div class="core-actions-row">
          <button type="button" data-draw="1">抽 1 次</button>
          <button type="button" data-draw="10">抽 10 次</button>
        </div>
      </div>
      <div class="core-result-list">
        ${results.length ? results.map(renderDrop).join('') : '<p class="core-empty">還沒有祈願結果。先抽一次看看。</p>'}
      </div>
    </section>
  `;

  $all('[data-draw]', pageHost).forEach((button) => {
    button.addEventListener('click', () => {
      const times = Number(button.dataset.draw || 1);
      const drawn = [];
      for (let i = 0; i < times; i += 1) {
        const result = drawGacha('standard');
        if (!result.ok) {
          showNotice('祈願失敗', result.message);
          break;
        }
        drawn.push(result.drop);
      }
      renderGacha(drawn);
      updateStatus();
    });
  });
}

function renderInventory() {
  const state = getState();
  const itemCards = Object.values(GameDB.items)
    .map((item) => ({ item, count: Number(state.inventory[item.id] || 0) }))
    .filter(({ count }) => count > 0)
    .map(({ item, count }) => `
      <article class="core-item-card rarity-${item.rarity.toLowerCase()}">
        <div class="core-item-icon">${item.icon}</div>
        <div>
          <b>${item.name}</b>
          <span>${item.rarity} / ${item.typeName} / ${'★'.repeat(item.stars)}</span>
          <p>${item.description}</p>
          <small>用途：${item.use}</small>
        </div>
        <strong>×${count}</strong>
      </article>
    `)
    .join('');

  const fairyCards = Object.entries(state.fairies)
    .filter(([, data]) => data?.owned)
    .map(([fairyId]) => {
      const fairy = GameDB.fairies[fairyId];
      return `
        <article class="core-item-card ssr">
          <div class="core-item-icon">${fairy.icon}</div>
          <div>
            <b>${fairy.name}</b>
            <span>${fairy.rarity} / 精靈</span>
            <p>「${fairy.quote}」</p>
            <small>${fairy.description}</small>
          </div>
          <strong>已契約</strong>
        </article>
      `;
    })
    .join('');

  pageHost.innerHTML = `
    ${pageHeader('BAG / RENDER FROM STATE', '背包', '這裡不是寫死的卡片，而是讀取 gameState.inventory 和 gameState.fairies 動態生成。')}
    <div class="core-list">
      ${itemCards || '<p class="core-empty">背包還是空的。去祈願或簽到拿一點素材吧。</p>'}
      ${fairyCards}
    </div>
  `;
}

function renderCommissions() {
  const state = getState();
  const cards = Object.values(GameDB.commissions).map((quest) => {
    const done = state.commissions[quest.id]?.status === 'claimed';
    const canDo = canCompleteCommission(quest.id);
    const status = done ? '已完成' : canDo ? '可製作' : '素材不足';
    return `
      <article class="core-quest-card">
        <div class="core-quest-top">
          <span>${quest.difficulty}</span>
          <strong>${status}</strong>
        </div>
        <h3>${quest.title}</h3>
        <p class="core-customer">客人：${quest.customer}</p>
        <p>${quest.description}</p>
        <div class="core-recipe"><b>需要：</b>${renderCost(quest.cost)}</div>
        <div class="core-reward"><b>獎勵：</b>${formatReward(quest.reward)}</div>
        <button type="button" data-complete="${quest.id}" ${done || !canDo ? 'disabled' : ''}>${done ? '已完成' : canDo ? '完成委託' : '素材不足'}</button>
      </article>
    `;
  }).join('');

  pageHost.innerHTML = `
    ${pageHeader('QUEST BOARD / CORE LOOP', '委託', '委託會檢查同一份背包資料，成功後扣素材並給獎勵。')}
    <div class="core-quest-list">${cards}</div>
  `;

  $all('[data-complete]', pageHost).forEach((button) => {
    button.addEventListener('click', () => {
      const result = completeCommission(button.dataset.complete);
      showNotice(result.ok ? '委託完成' : '還不能完成', result.message);
      renderCommissions();
      updateStatus();
    });
  });
}

function handleDaily() {
  const result = claimDailyReward();
  showNotice(result.ok ? `連續簽到 Day ${result.streak}` : '今日簽到', result.message);
  updateStatus();
  if (currentPage === 'inventory') renderInventory();
}

function openSettings() {
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
      persistState();
      updateStatus();
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
      setPage(currentPage);
      showNotice('匯入成功', '存檔已更新。');
    } catch (error) {
      showNotice('匯入失敗', '存檔文字格式不正確。');
    }
  });

  $('[data-reset-save]', modalHost)?.addEventListener('click', () => {
    if (!confirm('確定要清除精靈咖啡屋存檔嗎？')) return;
    resetState();
    closeModal();
    setPage('home');
    showNotice('已清除', '存檔已重置。');
  });
}

function showNotice(title, body) {
  showModal(`
    <div class="core-modal-card compact">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `);
}

function showModal(html) {
  if (!modalHost) ensurePageHost();
  modalHost.innerHTML = html;
  modalHost.hidden = false;
}

function closeModal() {
  modalHost.hidden = true;
  modalHost.innerHTML = '';
}

function boot() {
  initState();
  ensureTopActions();
  ensurePageHost();
  rewriteBottomDock();
  updateStatus();
  setPage('home');
}

document.addEventListener('DOMContentLoaded', boot);
