export const ROOM_DEFAULTS = {
  player: { x: 47, y: 82 },
  walkBounds: { minX: 5, maxX: 95, minY: 44, maxY: 92 },
};

export const OBJECTS = {
  rowan: {
    label: '洛溫', kind: 'npc', x: 67, y: 58,
    approach: { x: 61, y: 74 }, prompt: '和店長互動',
    intro: '金色長髮落在肩後，洛溫放下杯子，安靜地看向米洛。',
    actions: [
      { id: 'talk', label: '聊天', icon: '💬' },
      { id: 'status', label: '關心店長', icon: '☕' },
      { id: 'help', label: '幫忙工作', icon: '🧺' },
      { id: 'hug', label: '抱抱', icon: '♡', locked: true, lockText: '完成第一章後解鎖' },
    ],
  },
  menu: {
    label: '今日菜單', kind: 'fixture', x: 25, y: 25,
    approach: { x: 27, y: 55 }, prompt: '查看今日菜單',
    intro: '木框菜單板上寫著今天供應的甜點與飲品。',
    actions: [
      { id: 'view-menu', label: '查看菜單', icon: '📜' },
      { id: 'recommend', label: '請店長推薦', icon: '✨' },
    ],
  },
  cabinet: {
    label: '甜點展示櫃', kind: 'fixture', x: 24, y: 55,
    approach: { x: 31, y: 73 }, prompt: '查看甜點櫃',
    intro: '玻璃櫃裡整齊排著剛完成的甜點與小禮盒。',
    actions: [
      { id: 'browse-shop', label: '查看商品', icon: '🎁' },
      { id: 'peek-dessert', label: '偷看甜點', icon: '🍰' },
    ],
  },
  quest: {
    label: '委託板', kind: 'fixture', x: 48, y: 24,
    approach: { x: 49, y: 53 }, prompt: '查看委託',
    intro: '幾張帶著星屑的委託單被整齊釘在木板上。',
    actions: [
      { id: 'open-commissions', label: '打開委託', icon: '📋' },
      { id: 'read-request', label: '讀一張委託', icon: '✉️' },
    ],
  },
  order: {
    label: '櫃檯', kind: 'fixture', x: 65, y: 52,
    approach: { x: 59, y: 72 }, prompt: '查看客人訂單',
    intro: '櫃檯旁放著今日訂單、咖啡器具與等待交付的包裹。',
    actions: [
      { id: 'view-orders', label: '查看訂單', icon: '🧾' },
      { id: 'wipe-counter', label: '整理櫃檯', icon: '🧽' },
    ],
  },
  kitchen: {
    label: '廚房門', kind: 'door', x: 10, y: 29,
    approach: { x: 16, y: 57 }, prompt: '前往廚房',
    intro: '拱門後傳來奶油與烤餅乾的香氣。',
    actions: [{ id: 'go-kitchen', label: '進入廚房', icon: '🧁' }],
  },
  backyard: {
    label: '後門', kind: 'door', x: 92, y: 31,
    approach: { x: 87, y: 58 }, prompt: '前往後山',
    intro: '門縫外可以看見森林裡晃動的光點。',
    actions: [{ id: 'go-backyard', label: '前往後山', icon: '🌲' }],
  },
  table: {
    label: '中央座位', kind: 'fixture', x: 47, y: 65,
    approach: { x: 47, y: 82 }, prompt: '坐下休息',
    intro: '圓桌上放著一小束花，旁邊留著柔軟坐墊。',
    actions: [
      { id: 'rest', label: '休息一下', icon: '🫖' },
      { id: 'inspect-table', label: '看看桌面', icon: '🔎' },
    ],
  },
  catlamp: {
    label: '貓貓燈', kind: 'npc', x: 55, y: 76,
    approach: { x: 52, y: 84 }, prompt: '摸摸貓貓燈',
    intro: '貓貓燈在米洛腳邊轉了一圈，尾端亮起柔和的光。',
    actions: [
      { id: 'pet-catlamp', label: '摸摸牠', icon: '🐾' },
      { id: 'charge-catlamp', label: '餵一點星光', icon: '🌙' },
    ],
  },
  stairs: {
    label: '二樓走廊', kind: 'door', x: 81, y: 27,
    approach: { x: 77, y: 56 }, prompt: '查看二樓',
    intro: '木樓梯通往尚未開放的房間與私人空間。',
    actions: [{ id: 'locked-upstairs', label: '尚未開放', icon: '🔒', locked: true, lockText: '隨主線劇情解鎖' }],
  },
};

function renderVectorRoom() {
  return `
    <svg class="cafe-room-vector-map" viewBox="0 0 1400 760" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5dfb5"/><stop offset="1" stop-color="#d8b47d"/></linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a86d39"/><stop offset="1" stop-color="#5c351f"/></linearGradient>
        <linearGradient id="green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#75955a"/><stop offset="1" stop-color="#405c3a"/></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7dc" stop-opacity=".9"/><stop offset="1" stop-color="#9fd1c4" stop-opacity=".55"/></linearGradient>
        <pattern id="floor" width="92" height="58" patternUnits="userSpaceOnUse"><rect width="92" height="58" fill="#b47b48"/><path d="M0 0H92M0 58H92M46 0V58" stroke="#8c572f" stroke-width="4" opacity=".48"/><path d="M3 6H89" stroke="#dca96d" stroke-width="3" opacity=".24"/></pattern>
        <pattern id="stone" width="80" height="46" patternUnits="userSpaceOnUse"><rect width="80" height="46" fill="#d9c39b"/><path d="M0 0H80M0 46H80M40 0V46" stroke="#b99b6e" stroke-width="3" opacity=".45"/></pattern>
        <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#3f2417" flood-opacity=".28"/></filter>
      </defs>
      <rect width="1400" height="760" rx="34" fill="#4c2f20"/>
      <rect x="18" y="18" width="1364" height="278" rx="26" fill="url(#wall)" stroke="#6e4228" stroke-width="10"/>
      <path d="M18 274H1382V742H18Z" fill="url(#floor)" stroke="#6e4228" stroke-width="10"/>
      <path d="M28 286H1372" stroke="#3d2619" stroke-width="14"/>
      <path d="M92 20V284M1320 20V284M690 20V284" stroke="#8a5732" stroke-width="18" opacity=".82"/>
      <g opacity=".72"><circle cx="111" cy="92" r="42" fill="#b7d7c2" stroke="#74462b" stroke-width="12"/><path d="M111 50V134M69 92H153" stroke="#fff4ce" stroke-width="7"/><circle cx="1280" cy="94" r="42" fill="#b7d7c2" stroke="#74462b" stroke-width="12"/><path d="M1280 52V136M1238 94H1322" stroke="#fff4ce" stroke-width="7"/></g>

      <g filter="url(#shadow)">
        <path d="M54 260V116Q54 62 109 62T164 116V260Z" fill="#496344" stroke="#5b351f" stroke-width="12"/>
        <path d="M77 258V130Q77 93 109 93T141 130V258Z" fill="#253f35" stroke="#d6ad6a" stroke-width="6"/>
        <circle cx="126" cy="173" r="7" fill="#f2d77c"/>
        <text x="109" y="226" fill="#f8e9bd" font-size="27" text-anchor="middle" font-weight="900">廚房</text>
      </g>

      <g filter="url(#shadow)">
        <rect x="238" y="54" width="240" height="168" rx="22" fill="#5a3825" stroke="#8f6038" stroke-width="8"/>
        <rect x="257" y="72" width="202" height="130" rx="13" fill="#24382e" stroke="#e1bd76" stroke-width="5"/>
        <text x="358" y="110" fill="#f5d985" font-size="26" text-anchor="middle" font-weight="900">TODAY</text>
        <path d="M286 136H429M286 162H406M286 185H438" stroke="#f0d7a0" stroke-width="8" stroke-linecap="round" opacity=".78"/>
      </g>

      <g filter="url(#shadow)">
        <rect x="570" y="55" width="226" height="150" rx="20" fill="#8a5b36" stroke="#5e3823" stroke-width="8"/>
        <rect x="591" y="78" width="184" height="104" rx="12" fill="#f7e6bf"/>
        <path d="M615 105H748M615 132H725M615 158H756" stroke="#9c6740" stroke-width="9" stroke-linecap="round"/>
        <circle cx="604" cy="98" r="7" fill="#d97e57"/><circle cx="760" cy="96" r="7" fill="#75925a"/>
      </g>

      <g filter="url(#shadow)">
        <path d="M1128 50H1328V272H1128Z" fill="#795039" stroke="#50301f" stroke-width="10"/>
        <path d="M1160 260H1306L1266 216H1198Z" fill="#a97949"/>
        <path d="M1160 222H1275L1241 184H1196Z" fill="#b98955"/>
        <path d="M1160 184H1245L1219 148H1194Z" fill="#c79862"/>
        <path d="M1160 146H1218L1200 112H1190Z" fill="#d1aa73"/>
        <path d="M1138 64V268M1320 64V268" stroke="#d8ad6c" stroke-width="10"/>
      </g>

      <g filter="url(#shadow)">
        <path d="M1260 270V112Q1260 66 1306 66T1352 112V270Z" fill="#456545" stroke="#5b351f" stroke-width="12"/>
        <path d="M1282 268V130Q1282 96 1306 96T1330 130V268Z" fill="#294333" stroke="#d6ad6a" stroke-width="5"/>
        <circle cx="1321" cy="181" r="7" fill="#f2d77c"/>
        <text x="1306" y="229" fill="#f8e9bd" font-size="25" text-anchor="middle" font-weight="900">後門</text>
      </g>

      <g filter="url(#shadow)">
        <rect x="198" y="340" width="342" height="150" rx="28" fill="url(#wood)" stroke="#4c2c1d" stroke-width="11"/>
        <rect x="214" y="355" width="310" height="80" rx="18" fill="url(#glass)" stroke="#e5c88c" stroke-width="6"/>
        <g fill="#f3c678" stroke="#7f4c2f" stroke-width="4"><circle cx="260" cy="395" r="22"/><path d="M312 413Q340 354 368 413Z"/><rect x="404" y="370" width="54" height="46" rx="11"/><circle cx="492" cy="394" r="21"/></g>
        <path d="M220 452H518" stroke="#d6a66a" stroke-width="10"/>
      </g>

      <g filter="url(#shadow)">
        <path d="M770 324H1048V500H770Z" fill="url(#wood)" stroke="#4b2b1b" stroke-width="11"/>
        <rect x="798" y="344" width="222" height="58" rx="16" fill="#d7ae6e"/>
        <circle cx="836" cy="372" r="20" fill="#f0dfbd" stroke="#6e4228" stroke-width="5"/>
        <rect x="892" y="352" width="36" height="42" rx="7" fill="#35584b"/><rect x="950" y="350" width="45" height="45" rx="8" fill="#8f4b3d"/>
        <path d="M805 441H1014" stroke="#d3a265" stroke-width="10"/>
      </g>

      <g filter="url(#shadow)">
        <ellipse cx="670" cy="570" rx="156" ry="102" fill="#6d8550" opacity=".42"/>
        <ellipse cx="670" cy="554" rx="96" ry="58" fill="#b7834f" stroke="#5a3422" stroke-width="10"/>
        <ellipse cx="670" cy="545" rx="85" ry="46" fill="#e4be7d"/>
        <circle cx="610" cy="645" r="30" fill="#8d5b36" stroke="#5a3422" stroke-width="8"/><circle cx="735" cy="645" r="30" fill="#8d5b36" stroke="#5a3422" stroke-width="8"/>
        <rect x="646" y="518" width="48" height="38" rx="8" fill="#fff0c6" stroke="#7e5436" stroke-width="5"/>
        <circle cx="717" cy="538" r="14" fill="#d4a968"/>
      </g>

      <g filter="url(#shadow)">
        <rect x="1020" y="548" width="248" height="112" rx="24" fill="#9e6b3f" stroke="#593620" stroke-width="10"/>
        <rect x="1048" y="571" width="72" height="64" rx="12" fill="#f1d7a2"/><rect x="1140" y="571" width="98" height="64" rx="12" fill="#526e48"/>
        <path d="M1070 595H1098M1162 594H1215M1162 614H1200" stroke="#7b4b2e" stroke-width="7" stroke-linecap="round"/>
      </g>

      <g fill="#557547" stroke="#395334" stroke-width="5"><circle cx="186" cy="255" r="30"/><circle cx="211" cy="244" r="24"/><circle cx="1008" cy="249" r="31"/><circle cx="1040" cy="238" r="25"/><circle cx="1226" cy="676" r="32"/><circle cx="1260" cy="665" r="27"/></g>
      <g fill="#f5d87e" opacity=".82"><circle cx="178" cy="246" r="5"/><circle cx="211" cy="231" r="5"/><circle cx="1012" cy="238" r="5"/><circle cx="1235" cy="664" r="5"/></g>
      <path d="M0 700Q220 650 420 710T820 700T1180 702T1400 676V760H0Z" fill="#32533c" opacity=".32"/>
    </svg>
  `;
}

export function renderRoomMarkup() {
  return `
    <div class="inside-head cafe-room-head">
      <div><p class="inside-label">HALFMOON AMBER · INTERIOR</p><h2 class="inside-title">半月琥珀・店內</h2><p class="inside-subtitle">使用左下角搖桿移動米洛，靠近發光標記即可互動。</p></div>
      <button class="inside-back" id="backToMap" type="button">返回地圖</button>
    </div>
    <section class="cafe-room-v2" aria-label="可走動的咖啡廳內部">
      <div class="cafe-room-toolbar"><div><span class="cafe-room-mode">自由活動</span><b>米洛正在店裡</b></div><p>場景已改為向量繪製的大型房間，可左右探索。</p><button type="button" data-cafe-focus="rowan">找店長</button></div>
      <div class="cafe-room-viewport" data-cafe-viewport tabindex="0" aria-label="咖啡廳場景">
        <div class="cafe-room-stage" data-cafe-stage>
          ${renderVectorRoom()}
          ${Object.entries(OBJECTS).filter(([id]) => !['rowan','catlamp'].includes(id)).map(([id, object]) => `
            <button class="cafe-object cafe-${object.kind} object-${id}" type="button" data-cafe-object="${id}" aria-label="${object.label}">
              <span class="cafe-object-pin">${id === 'menu' ? '📜' : id === 'cabinet' ? '🍰' : id === 'quest' ? '📋' : id === 'order' ? '🧾' : id === 'kitchen' ? '🧁' : id === 'backyard' ? '🌲' : id === 'table' ? '🫖' : '🔒'}</span>
              <span class="cafe-object-label">${object.label}</span>
            </button>`).join('')}
          <button class="cafe-object cafe-character cafe-rowan" type="button" data-cafe-object="rowan" aria-label="洛溫">
            <span class="cafe-character-shadow"></span><span class="cafe-rowan-sprite"><i class="rowan-hair-back"></i><i class="rowan-head"></i><i class="rowan-hair-front"></i><i class="rowan-body"></i><b>☕</b></span><span class="cafe-character-name">店長・洛溫</span><span class="cafe-character-bubble">需要我嗎？</span>
          </button>
          <button class="cafe-object cafe-character cafe-catlamp" type="button" data-cafe-object="catlamp" aria-label="貓貓燈"><span class="cafe-character-shadow"></span><span class="cafe-catlamp-sprite">🐾</span><span class="cafe-character-name">貓貓燈</span></button>
          <div class="cafe-player" data-cafe-player role="img" aria-label="米洛"><span class="cafe-player-shadow"></span><span class="cafe-milo-sprite"><i class="milo-ear milo-ear-left"></i><i class="milo-ear milo-ear-right"></i><b class="milo-head"><em></em></b><i class="milo-body"></i><i class="milo-apron"></i></span><span class="cafe-player-name">米洛</span></div>
          <span class="cafe-move-marker" data-cafe-move-marker></span><button class="cafe-interact-prompt" type="button" data-cafe-interact hidden>互動</button>
        </div>
      </div>
      <div class="cafe-joystick" data-cafe-joystick aria-label="移動搖桿"><div class="cafe-joystick-ring"><span class="cafe-joystick-knob" data-cafe-joystick-knob>🐾</span></div><small>移動</small></div>
      <aside class="cafe-action-drawer" data-cafe-drawer hidden aria-live="polite"><div class="cafe-action-copy"><span>INTERACTION</span><h3 data-cafe-drawer-title>店內互動</h3><p data-cafe-drawer-copy>靠近角色或物件後，可以選擇想做的事。</p></div><div class="cafe-action-buttons" data-cafe-drawer-actions></div><button class="cafe-action-close" type="button" data-cafe-drawer-close aria-label="關閉互動">×</button></aside>
    </section>
  `;
}
