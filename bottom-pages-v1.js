(() => {
  function ensurePages(){
    if (document.querySelector('#bottomPageHost')) return;
    const style = document.createElement('style');
    style.textContent = `
      .game-window.page-mode .location-tabs,
      .game-window.page-mode .map-area,
      .game-window.page-mode .cafe-inside,
      .game-window.page-mode .dialogue-box,
      .game-window.page-mode .gacha-spa{display:none!important}
      .bottom-page-host{display:none;flex:1;min-height:0;padding:14px 20px 0}
      .game-window.page-mode .bottom-page-host{display:flex;flex-direction:column}
      .bottom-page{display:none;flex:1;min-height:0;overflow:auto;border:3px solid #c99955;border-radius:26px;background:linear-gradient(180deg,rgba(23,63,44,.92),rgba(35,22,14,.94));box-shadow:inset 0 0 0 5px rgba(255,244,215,.08),0 14px 26px rgba(0,0,0,.28);padding:18px;color:#fff4d7}
      .bottom-page.active{display:block}
      .bp-kicker{font-size:12px;letter-spacing:.22em;color:#d8c37b;font-weight:900;margin-bottom:6px}.bp-title{font-size:30px;line-height:1.1;font-weight:900;margin:0 0 14px;text-shadow:0 3px #0005}.bp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.bp-card{border:2px solid rgba(247,216,123,.55);border-radius:20px;background:rgba(42,29,22,.72);padding:14px;box-shadow:inset 0 2px 0 rgba(255,255,255,.12),0 8px 18px rgba(0,0,0,.22)}.bp-card b{display:block;font-size:18px;margin-bottom:6px}.bp-card span{display:inline-block;background:#f7d87b;color:#2a1d16;border-radius:999px;padding:5px 10px;font-weight:900;font-size:12px;margin-bottom:8px}.bp-card p{margin:0;line-height:1.65}.bp-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border:2px solid rgba(247,216,123,.45);border-radius:18px;background:rgba(42,29,22,.68);padding:12px 14px;margin:10px 0}.bp-row strong{font-size:18px}.bp-row small{opacity:.8}.bp-button{border:2px solid #f7d87b;border-radius:999px;background:linear-gradient(#fff1ad,#efb85e);color:#2b1d13;font-weight:900;padding:10px 16px}.bp-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.bp-tabs button{border:2px solid rgba(247,216,123,.55);border-radius:999px;background:#2a1d16;color:#fff4d7;font-weight:900;padding:8px 12px}.bp-tabs button.on{background:#f7d87b;color:#2a1d16}.bottom-dock button.on{background:linear-gradient(180deg,#fff1ad,#efb85e)!important;color:#2b1d13!important}
      @media(max-width:520px){.bottom-page-host{padding:10px 12px 0}.bottom-page{padding:14px}.bp-grid{grid-template-columns:1fr}.bp-title{font-size:26px}.bp-row{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
    const host = document.createElement('section');
    host.id = 'bottomPageHost';
    host.className = 'bottom-page-host';
    host.innerHTML = `
      <article class="bottom-page" data-page="sign"><div class="bp-kicker">DAILY BONUS</div><h2 class="bp-title">每日簽到</h2><div class="bp-row"><div><strong>今日獎勵</strong><br><small>星糖 +30 / 葉幣 +80</small></div><button class="bp-button">領取</button></div><div class="bp-grid"><section class="bp-card"><span>DAY 1</span><b>星糖 30</b><p>今日份靈感糖霜，已放進小店長的糖罐。</p></section><section class="bp-card"><span>DAY 2</span><b>月光花瓣 ×1</b><p>適合拿來做溫柔系飲品與祝福甜點。</p></section><section class="bp-card"><span>DAY 3</span><b>靈感券 ×1</b><p>可以投入星糖扭蛋，試著遇見新的精靈。</p></section><section class="bp-card"><span>DAY 7</span><b>SSR 保底碎片</b><p>集滿後可兌換一份夢幻精靈契約。</p></section></div></article>
      <article class="bottom-page" data-page="inventory"><div class="bp-kicker">BAG / STORAGE</div><h2 class="bp-title">庫存</h2><div class="bp-tabs"><button class="on">素材</button><button>甜點</button><button>精靈</button><button>活動</button></div><div class="bp-grid"><section class="bp-card"><span>素材 001</span><b>月光花瓣</b><p>純度 ★★★★★ / 安定性 ★★★★☆</p></section><section class="bp-card"><span>素材 002</span><b>星星莓</b><p>活力 ★★★★☆ / 好運 ★★★★★</p></section><section class="bp-card"><span>素材 003</span><b>夜空碎片</b><p>夢境 ★★★★★ / 神祕 ★★★★☆</p></section><section class="bp-card"><span>消耗品</span><b>靈感券 ×3</b><p>投入扭蛋機後會變成糖霧與召喚光。</p></section></div></article>
      <article class="bottom-page" data-page="commission"><div class="bp-kicker">ORDER BOARD</div><h2 class="bp-title">委託</h2><div class="bp-row"><div><strong>待確認</strong><br><small>客人送來需求單，等待店長確認預算與素材。</small></div><button class="bp-button">查看</button></div><div class="bp-row"><div><strong>製作中</strong><br><small>目前有 2 份餐點正在廚房與煉金室調配。</small></div><button class="bp-button">進度</button></div><div class="bp-row"><div><strong>已完成</strong><br><small>完成後會包裝成魔法外帶盒交付。</small></div><button class="bp-button">紀錄</button></div><div class="bp-grid"><section class="bp-card"><span>規則</span><b>先出圖後收款</b><p>草圖一次確認，完稿後再收款。</p></section><section class="bp-card"><span>模式</span><b>自帶價 / 驚喜包</b><p>客人可提供預算，店長依靈感加料。</p></section></div></article>
      <article class="bottom-page" data-page="settings"><div class="bp-kicker">SYSTEM</div><h2 class="bp-title">設定</h2><div class="bp-row"><div><strong>動畫演出</strong><br><small>控制抽卡與頁面切換動畫。</small></div><button class="bp-button">ON</button></div><div class="bp-row"><div><strong>柔和模式</strong><br><small>降低閃光與高亮特效。</small></div><button class="bp-button">OFF</button></div><div class="bp-row"><div><strong>資料狀態</strong><br><small>目前為展示版，數值不會永久保存。</small></div><button class="bp-button">說明</button></div></article>
    `;
    document.querySelector('.dialogue-box')?.before(host);
  }
  function setActive(btn){ document.querySelectorAll('.bottom-dock button').forEach(b=>b.classList.toggle('on',b===btn)); }
  function openPage(name, btn){
    ensurePages();
    document.querySelector('.game-window')?.classList.remove('gacha-mode','inside-mode');
    document.querySelector('.game-window')?.classList.add('page-mode');
    document.querySelectorAll('.bottom-page').forEach(p=>p.classList.toggle('active',p.dataset.page===name));
    setActive(btn);
  }
  function backHome(btn){
    document.querySelector('.game-window')?.classList.remove('page-mode','gacha-mode');
    setActive(btn);
  }
  function wire(){
    const btns=[...document.querySelectorAll('.bottom-dock button')];
    const sign=btns[0], inventory=btns[2], commission=btns[3], settings=btns[4];
    if(sign&&!sign.dataset.pageReady){sign.dataset.pageReady='1';sign.addEventListener('click',e=>{e.preventDefault();openPage('sign',sign);});}
    if(inventory&&!inventory.dataset.pageReady){inventory.dataset.pageReady='1';inventory.addEventListener('click',e=>{e.preventDefault();openPage('inventory',inventory);});}
    if(commission&&!commission.dataset.pageReady){commission.dataset.pageReady='1';commission.addEventListener('click',e=>{e.preventDefault();openPage('commission',commission);});}
    if(settings&&!settings.dataset.pageReady){settings.dataset.pageReady='1';settings.addEventListener('click',e=>{e.preventDefault();openPage('settings',settings);});}
  }
  wire();
  window.addEventListener('load', wire);
})();