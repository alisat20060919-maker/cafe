export const ROOM_DEFAULTS = {
  player: { x: 47, y: 82 },
  walkBounds: { minX: 7, maxX: 93, minY: 31, maxY: 91 },
};

export const OBJECTS = {
  rowan: {
    label: '洛溫',
    kind: 'npc',
    x: 67,
    y: 54,
    approach: { x: 61, y: 66 },
    prompt: '和店長互動',
    intro: '金色長髮的店長正在櫃檯後整理杯子，注意到米洛靠近後便停下手。',
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
    x: 20,
    y: 28,
    approach: { x: 23, y: 43 },
    prompt: '查看今日菜單',
    intro: '牆上的木框菜單寫著今天供應的甜點與飲品。',
    actions: [
      { id: 'view-menu', label: '查看菜單', icon: '📜' },
      { id: 'recommend', label: '請店長推薦', icon: '✨' },
    ],
  },
  cabinet: {
    label: '甜點展示櫃',
    kind: 'fixture',
    x: 49,
    y: 51,
    approach: { x: 48, y: 64 },
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
    x: 82,
    y: 27,
    approach: { x: 79, y: 44 },
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
    x: 63,
    y: 47,
    approach: { x: 61, y: 63 },
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
    x: 34,
    y: 27,
    approach: { x: 34, y: 45 },
    prompt: '前往廚房',
    intro: '門後傳來奶油與烤餅乾的香氣。',
    actions: [{ id: 'go-kitchen', label: '進入廚房', icon: '🧁' }],
  },
  backyard: {
    label: '後門',
    kind: 'door',
    x: 93,
    y: 47,
    approach: { x: 87, y: 55 },
    prompt: '前往後山',
    intro: '門縫外可以看見森林裡晃動的光點。',
    actions: [{ id: 'go-backyard', label: '前往後山', icon: '🌲' }],
  },
  table: {
    label: '靠窗座位',
    kind: 'fixture',
    x: 25,
    y: 68,
    approach: { x: 31, y: 72 },
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
    y: 77,
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
    x: 75,
    y: 23,
    approach: { x: 72, y: 41 },
    prompt: '查看二樓',
    intro: '樓梯通往尚未開放的房間與私人空間。',
    actions: [{ id: 'locked-upstairs', label: '尚未開放', icon: '🔒', locked: true, lockText: '隨主線劇情解鎖' }],
  },
};

function objectButton(id, icon, label, extraClass = '') {
  return `<button class="cafe-object ${extraClass}" type="button" data-cafe-object="${id}" aria-label="${label}">
    <span class="cafe-object-pin">${icon}</span><span class="cafe-object-label">${label}</span>
  </button>`;
}

export function renderRoomMarkup() {
  return `
    <div class="inside-head cafe-room-head">
      <div>
        <p class="inside-label">HALFMOON AMBER · INTERIOR</p>
        <h2 class="inside-title">半月琥珀・店內</h2>
        <p class="inside-subtitle">左下角搖桿移動米洛；靠近角色與物件後即可互動。</p>
      </div>
      <button class="inside-back" id="backToMap" type="button">返回領地</button>
    </div>

    <section class="cafe-room-v3" aria-label="可走動的咖啡廳內部">
      <div class="cafe-room-toolbar">
        <div><span class="cafe-room-mode">自由活動</span><b>半月琥珀・一樓</b></div>
        <p>場景已改為網站內建向量版本；之後可逐件替換成正式素材。</p>
        <button type="button" data-cafe-focus="rowan">找店長</button>
      </div>

      <div class="cafe-room-viewport" data-cafe-viewport tabindex="0" aria-label="咖啡廳場景，使用搖桿或方向鍵移動">
        <div class="cafe-room-stage" data-cafe-stage>
          <div class="vector-room" aria-hidden="true">
            <div class="vector-wall"></div>
            <div class="vector-floor"></div>
            <div class="vector-window window-a"><i></i></div>
            <div class="vector-window window-b"><i></i></div>
            <div class="vector-menu-board"><b>MENU</b><span>月光拿鐵</span><span>星星莓塔</span><span>夜空可可</span></div>
            <div class="vector-kitchen-door"><span>廚房</span></div>
            <div class="vector-shelf shelf-a"><i></i><i></i><i></i></div>
            <div class="vector-shelf shelf-b"><i></i><i></i><i></i></div>
            <div class="vector-stair"><span></span><span></span><span></span><span></span><span></span></div>
            <div class="vector-backdoor"><span>後門</span></div>
            <div class="vector-counter"><div class="counter-top"></div><div class="counter-register"></div><div class="counter-cups"></div></div>
            <div class="vector-dessert-case"><i></i><i></i><i></i><i></i></div>
            <div class="vector-rug rug-a"></div>
            <div class="vector-rug rug-b"></div>
            <div class="vector-table table-a"><i class="chair c1"></i><i class="chair c2"></i><i class="chair c3"></i><b>☕</b></div>
            <div class="vector-table table-b"><i class="chair c1"></i><i class="chair c2"></i><b>🌿</b></div>
            <div class="vector-quest-board"><i></i><i></i><i></i></div>
            <div class="vector-plant plant-a"><i></i></div>
            <div class="vector-plant plant-b"><i></i></div>
            <div class="vector-plant plant-c"><i></i></div>
            <div class="vector-lamp lamp-a"></div>
            <div class="vector-lamp lamp-b"></div>
            <div class="vector-crate crate-a"></div>
            <div class="vector-crate crate-b"></div>
          </div>

          ${objectButton('menu', '📜', '今日菜單', 'cafe-fixture object-menu')}
          ${objectButton('cabinet', '🍰', '甜點櫃', 'cafe-fixture object-cabinet')}
          ${objectButton('quest', '📋', '委託板', 'cafe-fixture object-quest')}
          ${objectButton('order', '🧾', '櫃檯', 'cafe-fixture object-order')}
          ${objectButton('kitchen', '🧁', '廚房', 'cafe-door object-kitchen')}
          ${objectButton('backyard', '🌲', '後山', 'cafe-door object-backyard')}
          ${objectButton('table', '🫖', '休息', 'cafe-fixture object-table')}
          ${objectButton('stairs', '🔒', '二樓', 'cafe-door object-stairs')}

          <button class="cafe-object cafe-character cafe-rowan" type="button" data-cafe-object="rowan" aria-label="洛溫">
            <span class="cafe-character-shadow" aria-hidden="true"></span>
            <span class="cafe-rowan-sprite" aria-hidden="true"><i class="rowan-hair-back"></i><i class="rowan-head"></i><i class="rowan-hair-front"></i><i class="rowan-body"></i><i class="rowan-coat"></i></span>
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

        <div class="cafe-joystick" data-cafe-joystick aria-label="移動搖桿">
          <div class="cafe-joystick-ring"><i data-cafe-joystick-knob></i></div>
          <small>移動</small>
        </div>
        <button class="cafe-nearby-action" type="button" data-cafe-interact-fixed hidden>互動</button>
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
