export const ROOM_DEFAULTS = {
  player: { x: 47, y: 78 },
  walkBounds: { minX: 6, maxX: 94, minY: 55, maxY: 88 },
};

export const OBJECTS = {
  rowan: {
    label: '洛溫',
    kind: 'npc',
    x: 72,
    y: 67,
    approach: { x: 66, y: 79 },
    prompt: '和店長互動',
    intro: '洛溫停下手裡的工作，安靜地看向米洛。',
    actions: [
      { id: 'talk', label: '聊天', icon: '💬' },
      { id: 'status', label: '關心店長', icon: '☕' },
      { id: 'help', label: '幫忙工作', icon: '🧺' },
      { id: 'hug', label: '抱抱', icon: '♡', locked: true, lockText: '完成第一章後解鎖' },
    ],
  },
  menu: {
    label: '今日菜單',
    kind: 'fixture',
    x: 25,
    y: 38,
    approach: { x: 28, y: 70 },
    prompt: '查看今日菜單',
    intro: '木板上寫著今天供應的甜點與飲品。',
    actions: [
      { id: 'view-menu', label: '查看菜單', icon: '📜' },
      { id: 'recommend', label: '請店長推薦', icon: '✨' },
    ],
  },
  cabinet: {
    label: '甜點展示櫃',
    kind: 'fixture',
    x: 31,
    y: 62,
    approach: { x: 37, y: 79 },
    prompt: '查看甜點櫃',
    intro: '玻璃後方整齊排著剛完成的甜點與小禮盒。',
    actions: [
      { id: 'browse-shop', label: '查看商品', icon: '🎁' },
      { id: 'peek-dessert', label: '偷看甜點', icon: '🍰' },
    ],
  },
  quest: {
    label: '委託板',
    kind: 'fixture',
    x: 57,
    y: 37,
    approach: { x: 58, y: 68 },
    prompt: '查看委託',
    intro: '幾張帶著星屑的委託單被整齊釘在木板上。',
    actions: [
      { id: 'open-commissions', label: '打開委託', icon: '📋' },
      { id: 'read-request', label: '讀一張委託', icon: '✉️' },
    ],
  },
  order: {
    label: '櫃檯',
    kind: 'fixture',
    x: 73,
    y: 61,
    approach: { x: 65, y: 81 },
    prompt: '查看客人訂單',
    intro: '櫃檯旁放著今日訂單與等待交付的包裹。',
    actions: [
      { id: 'view-orders', label: '查看訂單', icon: '🧾' },
      { id: 'wipe-counter', label: '整理櫃檯', icon: '🧽' },
    ],
  },
  kitchen: {
    label: '廚房門',
    kind: 'door',
    x: 12,
    y: 53,
    approach: { x: 18, y: 73 },
    prompt: '前往廚房',
    intro: '門後傳來奶油與烤餅乾的香氣。',
    actions: [
      { id: 'go-kitchen', label: '進入廚房', icon: '🧁' },
    ],
  },
  backyard: {
    label: '後門',
    kind: 'door',
    x: 90,
    y: 51,
    approach: { x: 84, y: 72 },
    prompt: '前往後山',
    intro: '門縫外可以看見森林裡晃動的光點。',
    actions: [
      { id: 'go-backyard', label: '前往後山', icon: '🌲' },
    ],
  },
  table: {
    label: '靠窗座位',
    kind: 'fixture',
    x: 49,
    y: 65,
    approach: { x: 50, y: 82 },
    prompt: '坐下休息',
    intro: '桌面被擦得很乾淨，旁邊還留著一張柔軟坐墊。',
    actions: [
      { id: 'rest', label: '休息一下', icon: '🫖' },
      { id: 'inspect-table', label: '看看桌面', icon: '🔎' },
    ],
  },
  catlamp: {
    label: '貓貓燈',
    kind: 'npc',
    x: 43,
    y: 76,
    approach: { x: 39, y: 82 },
    prompt: '摸摸貓貓燈',
    intro: '貓貓燈在米洛腳邊轉了一圈，尾端亮起柔和的光。',
    actions: [
      { id: 'pet-catlamp', label: '摸摸牠', icon: '🐾' },
      { id: 'charge-catlamp', label: '餵一點星光', icon: '🌙' },
    ],
  },
  stairs: {
    label: '二樓走廊',
    kind: 'door',
    x: 51,
    y: 25,
    approach: { x: 52, y: 61 },
    prompt: '查看二樓',
    intro: '樓梯通往尚未開放的房間與私人空間。',
    actions: [
      { id: 'locked-upstairs', label: '尚未開放', icon: '🔒', locked: true, lockText: '隨主線劇情解鎖' },
    ],
  },
};

export function renderRoomMarkup() {
  return `
    <div class="inside-head cafe-room-head">
      <div>
        <p class="inside-label">HALFMOON AMBER · INTERIOR</p>
        <h2 class="inside-title">半月琥珀・店內</h2>
        <p class="inside-subtitle">點地面移動米洛，靠近店長與物件後就能互動。</p>
      </div>
      <button class="inside-back" id="backToMap" type="button">返回地圖</button>
    </div>

    <section class="cafe-room-v2" aria-label="可走動的咖啡廳內部">
      <div class="cafe-room-toolbar">
        <div><span class="cafe-room-mode">自由活動</span><b>米洛正在店裡</b></div>
        <p>手機點地面移動；電腦可用方向鍵或 WASD。點亮起的物件即可前往互動。</p>
        <button type="button" data-cafe-focus="rowan">找店長</button>
      </div>

      <div class="cafe-room-viewport" data-cafe-viewport tabindex="0" aria-label="咖啡廳場景，使用方向鍵移動">
        <div class="cafe-room-stage" data-cafe-stage>
          <div class="cafe-room-light light-left" aria-hidden="true"></div>
          <div class="cafe-room-light light-right" aria-hidden="true"></div>
          <div class="cafe-room-floor-glow" aria-hidden="true"></div>

          <button class="cafe-object cafe-fixture object-menu" type="button" data-cafe-object="menu" aria-label="今日菜單">
            <span class="cafe-object-pin">📜</span><span class="cafe-object-label">今日菜單</span>
          </button>
          <button class="cafe-object cafe-fixture object-cabinet" type="button" data-cafe-object="cabinet" aria-label="甜點展示櫃">
            <span class="cafe-object-pin">🍰</span><span class="cafe-object-label">甜點櫃</span>
          </button>
          <button class="cafe-object cafe-fixture object-quest" type="button" data-cafe-object="quest" aria-label="委託板">
            <span class="cafe-object-pin">📋</span><span class="cafe-object-label">委託板</span>
          </button>
          <button class="cafe-object cafe-fixture object-order" type="button" data-cafe-object="order" aria-label="客人訂單櫃檯">
            <span class="cafe-object-pin">🧾</span><span class="cafe-object-label">櫃檯</span>
          </button>
          <button class="cafe-object cafe-door object-kitchen" type="button" data-cafe-object="kitchen" aria-label="廚房門">
            <span class="cafe-object-pin">🧁</span><span class="cafe-object-label">廚房</span>
          </button>
          <button class="cafe-object cafe-door object-backyard" type="button" data-cafe-object="backyard" aria-label="後門">
            <span class="cafe-object-pin">🌲</span><span class="cafe-object-label">後山</span>
          </button>
          <button class="cafe-object cafe-fixture object-table" type="button" data-cafe-object="table" aria-label="靠窗座位">
            <span class="cafe-object-pin">🫖</span><span class="cafe-object-label">休息</span>
          </button>
          <button class="cafe-object cafe-door object-stairs" type="button" data-cafe-object="stairs" aria-label="二樓走廊">
            <span class="cafe-object-pin">🔒</span><span class="cafe-object-label">二樓</span>
          </button>

          <button class="cafe-object cafe-character cafe-rowan" type="button" data-cafe-object="rowan" aria-label="洛溫">
            <span class="cafe-character-shadow" aria-hidden="true"></span>
            <span class="cafe-rowan-sprite" aria-hidden="true"><i></i><b>☕</b></span>
            <span class="cafe-character-name">洛溫</span>
            <span class="cafe-character-bubble">需要我嗎？</span>
          </button>

          <button class="cafe-object cafe-character cafe-catlamp" type="button" data-cafe-object="catlamp" aria-label="貓貓燈">
            <span class="cafe-character-shadow" aria-hidden="true"></span>
            <span class="cafe-catlamp-sprite" aria-hidden="true">🐾</span>
            <span class="cafe-character-name">貓貓燈</span>
          </button>

          <div class="cafe-player" data-cafe-player role="img" aria-label="米洛">
            <span class="cafe-player-shadow" aria-hidden="true"></span>
            <span class="cafe-milo-sprite" aria-hidden="true">
              <i class="milo-ear milo-ear-left"></i><i class="milo-ear milo-ear-right"></i>
              <b class="milo-head"><em></em></b><i class="milo-body"></i><i class="milo-apron"></i>
            </span>
            <span class="cafe-player-name">米洛</span>
          </div>

          <span class="cafe-move-marker" data-cafe-move-marker aria-hidden="true"></span>
          <button class="cafe-interact-prompt" type="button" data-cafe-interact hidden>互動</button>
        </div>
      </div>

      <div class="cafe-room-dpad" aria-label="移動按鈕">
        <button type="button" data-cafe-step="up" aria-label="向上">▲</button>
        <button type="button" data-cafe-step="left" aria-label="向左">◀</button>
        <button type="button" data-cafe-step="down" aria-label="向下">▼</button>
        <button type="button" data-cafe-step="right" aria-label="向右">▶</button>
      </div>

      <aside class="cafe-action-drawer" data-cafe-drawer hidden aria-live="polite">
        <div class="cafe-action-copy">
          <span>INTERACTION</span>
          <h3 data-cafe-drawer-title>店內互動</h3>
          <p data-cafe-drawer-copy>靠近角色或物件後，可以選擇想做的事。</p>
        </div>
        <div class="cafe-action-buttons" data-cafe-drawer-actions></div>
        <button class="cafe-action-close" type="button" data-cafe-drawer-close aria-label="關閉互動">×</button>
      </aside>
    </section>
  `;
}
