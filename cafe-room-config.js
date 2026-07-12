export const ROOM_DEFAULTS = {
  player: { x: 50, y: 82 },
  walkBounds: { minX: 7, maxX: 94, minY: 48, maxY: 90 },
};

export const OBJECTS = {
  rowan: {
    label: '洛溫',
    kind: 'npc',
    x: 22,
    y: 58,
    approach: { x: 30, y: 74 },
    prompt: '和店長互動',
    intro: '金色長髮的店長正站在櫃檯後整理杯具，注意到米洛靠近後便抬起眼。',
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
    x: 9,
    y: 27,
    approach: { x: 15, y: 58 },
    prompt: '查看今日菜單',
    intro: '大型木框菜單板上，以粉筆寫著今日供應的甜點與飲品。',
    actions: [
      { id: 'view-menu', label: '查看菜單', icon: '📜' },
      { id: 'recommend', label: '請店長推薦', icon: '✨' },
    ],
  },
  cabinet: {
    label: '甜點展示櫃',
    kind: 'fixture',
    x: 25,
    y: 55,
    approach: { x: 33, y: 73 },
    prompt: '查看甜點櫃',
    intro: '玻璃櫃裡排著星星莓塔、月光花瓣蛋糕與剛包好的小禮盒。',
    actions: [
      { id: 'browse-shop', label: '查看商品', icon: '🎁' },
      { id: 'peek-dessert', label: '偷看甜點', icon: '🍰' },
    ],
  },
  quest: {
    label: '委託板',
    kind: 'fixture',
    x: 67,
    y: 27,
    approach: { x: 66, y: 56 },
    prompt: '查看委託',
    intro: '幾張帶著星屑的委託單整齊釘在布告板上。',
    actions: [
      { id: 'open-commissions', label: '打開委託', icon: '📋' },
      { id: 'read-request', label: '讀一張委託', icon: '✉️' },
    ],
  },
  order: {
    label: '主櫃檯',
    kind: 'fixture',
    x: 29,
    y: 61,
    approach: { x: 37, y: 76 },
    prompt: '查看客人訂單',
    intro: '主櫃檯旁放著今日訂單、結帳簿與等待交付的包裹。',
    actions: [
      { id: 'view-orders', label: '查看訂單', icon: '🧾' },
      { id: 'wipe-counter', label: '整理櫃檯', icon: '🧽' },
    ],
  },
  kitchen: {
    label: '廚房入口',
    kind: 'door',
    x: 51,
    y: 31,
    approach: { x: 51, y: 57 },
    prompt: '前往廚房',
    intro: '拱門後傳來奶油、咖啡豆與烤餅乾的香氣。',
    actions: [
      { id: 'go-kitchen', label: '進入廚房', icon: '🧁' },
    ],
  },
  backyard: {
    label: '後門',
    kind: 'door',
    x: 92,
    y: 38,
    approach: { x: 87, y: 62 },
    prompt: '前往後山',
    intro: '綠色木門外能看見森林裡緩慢晃動的光點。',
    actions: [
      { id: 'go-backyard', label: '前往後山', icon: '🌲' },
    ],
  },
  table: {
    label: '中央座位',
    kind: 'fixture',
    x: 66,
    y: 67,
    approach: { x: 65, y: 84 },
    prompt: '坐下休息',
    intro: '圓桌上放著一小瓶鮮花與洛溫剛收好的茶具。',
    actions: [
      { id: 'rest', label: '休息一下', icon: '🫖' },
      { id: 'inspect-table', label: '看看桌面', icon: '🔎' },
    ],
  },
  catlamp: {
    label: '貓貓燈',
    kind: 'npc',
    x: 55,
    y: 78,
    approach: { x: 50, y: 84 },
    prompt: '摸摸貓貓燈',
    intro: '貓貓燈在米洛腳邊繞了一圈，尾端亮起柔和的光。',
    actions: [
      { id: 'pet-catlamp', label: '摸摸牠', icon: '🐾' },
      { id: 'charge-catlamp', label: '餵一點星光', icon: '🌙' },
    ],
  },
  stairs: {
    label: '二樓走廊',
    kind: 'door',
    x: 80,
    y: 27,
    approach: { x: 78, y: 56 },
    prompt: '查看二樓',
    intro: '木梯通往尚未開放的私人房間與二樓走廊。',
    actions: [
      { id: 'locked-upstairs', label: '尚未開放', icon: '🔒', locked: true, lockText: '隨主線劇情解鎖' },
    ],
  },
};

function renderDecor() {
  return `
    <div class="room-back-wall" aria-hidden="true">
      <div class="room-beam beam-one"></div><div class="room-beam beam-two"></div>
      <div class="room-window"><i></i><b></b></div>
      <div class="room-menu-board"><strong>MENU</strong><span>Moon latte</span><span>Star berry tart</span><span>Night cocoa</span></div>
      <div class="room-shelf shelf-left"><i></i><i></i><i></i><i></i></div>
      <div class="room-kitchen-arch"><span>廚房</span></div>
      <div class="room-quest-board"><i></i><i></i><i></i><i></i></div>
      <div class="room-stairs"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="room-upstairs-landing"></div>
      <div class="room-back-door"><i></i><span>後門</span></div>
      <div class="room-wall-lamp lamp-left"></div><div class="room-wall-lamp lamp-right"></div>
      <div class="room-vine vine-left"></div><div class="room-vine vine-right"></div>
    </div>
    <div class="room-floor" aria-hidden="true"></div>
    <div class="room-counter"><div class="counter-top"></div><div class="counter-front"></div><div class="counter-register"></div></div>
    <div class="room-display-case"><div class="display-glass"><i></i><i></i><i></i></div></div>
    <div class="room-rug rug-main"></div>
    <div class="room-table table-main"><i></i><b></b><span></span></div>
    <div class="room-chair chair-a"></div><div class="room-chair chair-b"></div><div class="room-chair chair-c"></div>
    <div class="room-side-table"><i></i><b></b></div>
    <div class="room-crate crate-one"></div><div class="room-crate crate-two"></div>
    <div class="room-plant plant-a"><i></i></div><div class="room-plant plant-b"><i></i></div><div class="room-plant plant-c"><i></i></div>
    <div class="room-light-pool light-a"></div><div class="room-light-pool light-b"></div>
  `;
}

export function renderRoomMarkup() {
  return `
    <div class="inside-head cafe-room-head">
      <div>
        <p class="inside-label">HALFMOON AMBER · INTERIOR</p>
        <h2 class="inside-title">半月琥珀・店內</h2>
        <p class="inside-subtitle">使用左下角搖桿移動米洛，靠近角色與物件後即可互動。</p>
      </div>
      <button class="inside-back" id="backToMap" type="button">返回地圖</button>
    </div>

    <section class="cafe-room-v3" aria-label="可走動的咖啡廳內部">
      <div class="cafe-room-toolbar">
        <div><span class="cafe-room-mode">自由活動</span><b>米洛正在半月琥珀裡</b></div>
        <p>地圖已改為大型斜俯視室內場景。點擊物件可自動靠近；手機以搖桿移動。</p>
        <button type="button" data-cafe-focus="rowan">找店長</button>
      </div>

      <div class="cafe-room-viewport-shell">
        <div class="cafe-room-viewport" data-cafe-viewport tabindex="0" aria-label="咖啡廳場景，使用搖桿或方向鍵移動">
          <div class="cafe-room-stage" data-cafe-stage>
          ${renderDecor()}

          <button class="cafe-object cafe-fixture object-menu" type="button" data-cafe-object="menu" aria-label="今日菜單">
            <span class="cafe-object-pin">📜</span><span class="cafe-object-label">今日菜單</span>
          </button>
          <button class="cafe-object cafe-fixture object-cabinet" type="button" data-cafe-object="cabinet" aria-label="甜點展示櫃">
            <span class="cafe-object-pin">🍰</span><span class="cafe-object-label">甜點櫃</span>
          </button>
          <button class="cafe-object cafe-fixture object-quest" type="button" data-cafe-object="quest" aria-label="委託板">
            <span class="cafe-object-pin">📋</span><span class="cafe-object-label">委託板</span>
          </button>
          <button class="cafe-object cafe-fixture object-order" type="button" data-cafe-object="order" aria-label="主櫃檯">
            <span class="cafe-object-pin">🧾</span><span class="cafe-object-label">櫃檯</span>
          </button>
          <button class="cafe-object cafe-door object-kitchen" type="button" data-cafe-object="kitchen" aria-label="廚房入口">
            <span class="cafe-object-pin">🧁</span><span class="cafe-object-label">廚房</span>
          </button>
          <button class="cafe-object cafe-door object-backyard" type="button" data-cafe-object="backyard" aria-label="後門">
            <span class="cafe-object-pin">🌲</span><span class="cafe-object-label">後山</span>
          </button>
          <button class="cafe-object cafe-fixture object-table" type="button" data-cafe-object="table" aria-label="中央座位">
            <span class="cafe-object-pin">🫖</span><span class="cafe-object-label">休息</span>
          </button>
          <button class="cafe-object cafe-door object-stairs" type="button" data-cafe-object="stairs" aria-label="二樓走廊">
            <span class="cafe-object-pin">🔒</span><span class="cafe-object-label">二樓</span>
          </button>

          <button class="cafe-object cafe-character cafe-rowan" type="button" data-cafe-object="rowan" aria-label="洛溫">
            <span class="cafe-character-shadow" aria-hidden="true"></span>
            <span class="cafe-rowan-sprite" aria-hidden="true">
              <i class="rowan-hair-back"></i>
              <i class="rowan-leg rowan-leg-left"></i><i class="rowan-leg rowan-leg-right"></i>
              <i class="rowan-body"></i><i class="rowan-vest"></i>
              <i class="rowan-arm rowan-arm-left"></i><i class="rowan-arm rowan-arm-right"></i>
              <b class="rowan-head"><i class="rowan-eye rowan-eye-left"></i><i class="rowan-eye rowan-eye-right"></i><em></em></b>
              <i class="rowan-hair-front"></i><i class="rowan-hair-side side-left"></i><i class="rowan-hair-side side-right"></i>
            </span>
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

        <div class="cafe-joystick" data-cafe-joystick aria-label="虛擬搖桿">
          <div class="cafe-joystick-base"><span data-cafe-joystick-stick></span></div>
          <small>移動</small>
        </div>
        <button class="cafe-interact-overlay" type="button" data-cafe-interact-overlay hidden>互動</button>
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
