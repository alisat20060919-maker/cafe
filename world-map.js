import { GameDB } from '@db';
import { isUnlocked, getUnlockRequirementText } from '@state';
import { gatherAt, getGatherDropPreview, getGatherStatus } from '@actions/gather';
import { navigate } from '@router';
import { showModal, closeModal } from '@ui';

const locations = [
  {
    id: 'cafe',
    type: 'home',
    icon: '🏡',
    label: '咖啡廳',
    subtitle: '店鋪主區',
    description: '回到咖啡屋，查看菜單、委託與商品櫃。',
    position: 'center',
  },
  {
    id: 'backyard',
    type: 'gather',
    icon: '🌲',
    label: '後山',
    subtitle: '森林採集區',
    description: '採集星星莓、星露水與森林素材。',
    position: 'west',
  },
  {
    id: 'greenhouse',
    type: 'gather',
    icon: '🌙',
    label: '月光溫室',
    subtitle: '魔法植物區',
    description: '照顧月光花與培育稀有植物。',
    position: 'east',
  },
  {
    id: 'kitchen',
    type: 'station',
    icon: '🍳',
    label: '廚房',
    subtitle: '甜點與飲品',
    description: '把採集素材製作成甜點、飲品與正式商品。',
    position: 'southwest',
  },
  {
    id: 'alchemy',
    type: 'station',
    icon: '🧪',
    label: '煉金室',
    subtitle: '精煉與高階配方',
    description: '將基礎素材煉成高階材料與魔法產品。',
    position: 'southeast',
  },
];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLocationState(location) {
  if (location.type === 'gather') {
    const status = getGatherStatus(location.id);
    return {
      unlocked: Boolean(status),
      statusLabel: status?.label || '尚未解鎖',
      depleted: Boolean(status?.isDepleted),
      remaining: Number(status?.remaining || 0),
      limit: Number(status?.limit || 0),
    };
  }

  if (location.type === 'station') {
    const unlocked = isUnlocked({ station: location.id });
    return {
      unlocked,
      statusLabel: unlocked ? '已開放' : getUnlockRequirementText({ station: location.id }) || '尚未解鎖',
      depleted: false,
      remaining: 0,
      limit: 0,
    };
  }

  return {
    unlocked: true,
    statusLabel: '營業中',
    depleted: false,
    remaining: 0,
    limit: 0,
  };
}

function renderLocationNode(location) {
  const state = getLocationState(location);
  const classes = [
    'world-location-node',
    `is-${location.type}`,
    `position-${location.position}`,
    state.unlocked ? 'is-unlocked' : 'is-locked',
    state.depleted ? 'is-depleted' : '',
  ].filter(Boolean).join(' ');

  const statusText = location.type === 'gather' && state.unlocked
    ? `${state.remaining}/${state.limit}`
    : state.statusLabel;

  return `
    <button
      type="button"
      class="${classes}"
      data-world-location="${escapeHtml(location.id)}"
      aria-label="前往${escapeHtml(location.label)}"
    >
      <span class="world-node-icon">${escapeHtml(state.unlocked ? location.icon : '🔒')}</span>
      <span class="world-node-copy">
        <strong>${escapeHtml(location.label)}</strong>
        <small>${escapeHtml(location.subtitle)}</small>
      </span>
      <span class="world-node-status">${escapeHtml(statusText)}</span>
    </button>
  `;
}

function renderRegionSummary() {
  const gatherLocations = locations.filter((location) => location.type === 'gather');
  const remaining = gatherLocations.reduce((sum, location) => sum + Number(getGatherStatus(location.id)?.remaining || 0), 0);
  const limit = gatherLocations.reduce((sum, location) => sum + Number(getGatherStatus(location.id)?.limit || 0), 0);
  const openStations = locations.filter((location) => location.type === 'station' && isUnlocked({ station: location.id })).length;

  return `
    <div class="world-map-summary">
      <span>今日採集 <b>${remaining}/${limit}</b></span>
      <span>工作站 <b>${openStations}/2</b></span>
      <span>已探索區域 <b>${locations.filter((location) => getLocationState(location).unlocked).length}/${locations.length}</b></span>
    </div>
  `;
}

export function renderWorldMap() {
  const root = document.querySelector('#page-world');
  if (!root) return;

  root.innerHTML = `
    <section class="world-map-page">
      <header class="world-map-header">
        <button type="button" class="world-map-back" data-route="home">← 返回咖啡屋</button>
        <div>
          <span class="world-map-kicker">FAIRY CAFE WORLD</span>
          <h2>精靈咖啡屋世界地圖</h2>
          <p>選擇採集區域、工作站或返回咖啡廳。</p>
        </div>
        <button type="button" class="world-map-inventory" data-route="inventory">查看背包</button>
      </header>

      ${renderRegionSummary()}

      <div class="world-map-board" aria-label="精靈咖啡屋世界地圖">
        <div class="world-map-sun">☀️</div>
        <div class="world-map-cloud cloud-one">☁️</div>
        <div class="world-map-cloud cloud-two">☁️</div>
        <div class="world-map-river"></div>
        <div class="world-map-path path-west"></div>
        <div class="world-map-path path-east"></div>
        <div class="world-map-path path-southwest"></div>
        <div class="world-map-path path-southeast"></div>
        ${locations.map(renderLocationNode).join('')}
      </div>

      <p class="world-map-tip">採集區域每天各有次數限制；工作站會隨店長等級逐步開放。</p>
    </section>
  `;
}

function renderPreview(locationId) {
  const preview = getGatherDropPreview(locationId);
  if (!preview.length) return '<p class="core-muted">目前沒有可顯示的掉落資料。</p>';

  return `
    <div class="world-gather-preview">
      ${preview.map((drop) => `
        <span>
          <b>${escapeHtml(drop.icon)} ${escapeHtml(drop.name)}</b>
          <small>×${drop.qty} · ${drop.chance}%</small>
        </span>
      `).join('')}
    </div>
  `;
}

function showLockedModal(location) {
  const requirement = location.type === 'station'
    ? getUnlockRequirementText({ station: location.id }) || '提升店長等級'
    : '推進咖啡屋進度';

  showModal(`
    <div class="core-modal-card compact world-location-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">AREA LOCKED</span>
      <div class="gather-result-icon">🔒</div>
      <h2>${escapeHtml(location.label)}尚未解鎖</h2>
      <p>${escapeHtml(requirement)}後即可前往。</p>
    </div>
  `);
}

function showGatherLocationModal(location) {
  const status = getGatherStatus(location.id);
  if (!status) {
    showLockedModal(location);
    return;
  }

  showModal(`
    <div class="core-modal-card compact world-location-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">GATHER AREA</span>
      <div class="gather-result-icon">${escapeHtml(location.icon)}</div>
      <h2>${escapeHtml(location.label)}</h2>
      <p>${escapeHtml(location.description)}</p>
      <div class="gather-result-status">${escapeHtml(status.label)}</div>
      ${renderPreview(location.id)}
      <button
        type="button"
        data-world-gather="${escapeHtml(location.id)}"
        ${status.isDepleted ? 'disabled' : ''}
      >${status.isDepleted ? '今天已採完' : '採集一次'}</button>
    </div>
  `);
}

function renderSpecialEvent(event) {
  if (!event) return '';
  return `
    <div class="world-gather-event">
      <b>${escapeHtml(event.icon || '✨')} ${escapeHtml(event.title || '特殊事件')}</b>
      <p>${escapeHtml(event.message || '')}</p>
    </div>
  `;
}

function showGatherResult(result) {
  const drop = result.dropView;
  showModal(`
    <div class="core-modal-card compact world-location-modal">
      <button type="button" class="core-modal-close" data-close-modal>×</button>
      <span class="core-modal-kicker">GATHER RESULT</span>
      <div class="gather-result-icon">${escapeHtml(result.ok ? drop?.icon || '🌿' : '🧺')}</div>
      <h2>${escapeHtml(result.title || '採集結果')}</h2>
      <p>${escapeHtml(result.message || '')}</p>
      ${renderSpecialEvent(result.specialEvent)}
      <div class="gather-result-status">今日剩餘 ${Number(result.remaining || 0)}/${Number(result.limit || 0)}</div>
      <button type="button" data-return-world-map>返回世界地圖</button>
    </div>
  `);
}

function handleWorldMapClick(event) {
  const gatherButton = event.target.closest('[data-world-gather]');
  if (gatherButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    gatherButton.disabled = true;
    const result = gatherAt(gatherButton.dataset.worldGather);
    renderWorldMap();
    showGatherResult(result);
    return;
  }

  const returnButton = event.target.closest('[data-return-world-map]');
  if (returnButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeModal();
    navigate('world');
    return;
  }

  const node = event.target.closest('[data-world-location]');
  if (!node) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const location = locations.find((entry) => entry.id === node.dataset.worldLocation);
  if (!location) return;
  const state = getLocationState(location);

  if (!state.unlocked) {
    showLockedModal(location);
    return;
  }

  if (location.type === 'gather') {
    showGatherLocationModal(location);
    return;
  }

  navigate(location.id === 'cafe' ? 'home' : location.id);
}

export function initWorldMap() {
  if (document.documentElement.dataset.worldMapReady === 'true') return;
  document.documentElement.dataset.worldMapReady = 'true';
  document.addEventListener('click', handleWorldMapClick, true);
}
