(() => {
  const positions = { menu:['198px','220px'], cabinet:['92px','252px'], quest:['438px','232px'], order:['640px','150px'] };
  function apply(){ document.querySelectorAll('.room-hotspot').forEach(el=>{ const p=positions[el.dataset.panel]; if(!p)return; el.style.left=p[0]; el.style.top=p[1]; el.style.right='auto'; el.style.bottom='auto'; }); }
  function loadCss(href){ if([...document.styleSheets].some(s=>(s.href||'').includes(href.split('?')[0])))return; const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l); }
  function loadScript(src){ if(document.querySelector(`script[src^="${src.split('?')[0]}"]`))return; const s=document.createElement('script'); s.src=src; document.body.appendChild(s); }
  function buildGachaView(){
    if(document.querySelector('#gachaSpa'))return;
    const style=document.createElement('style');
    style.textContent=`
      .game-window.gacha-mode{padding:10px 8px 8px!important;gap:8px!important}
      .game-window.gacha-mode .top-bar,.game-window.gacha-mode .location-tabs,.game-window.gacha-mode .map-area,.game-window.gacha-mode .cafe-inside,.game-window.gacha-mode .dialogue-box{display:none!important}
      .gacha-spa{display:none;flex:1;min-height:0;padding:0;width:100%}
      .game-window.gacha-mode .gacha-spa{display:flex;flex-direction:column}
      .gacha-spa-head,.gacha-spa-pills{display:none!important}
      .gacha-spa .stage{flex:1;min-height:0;width:100%;border:3px solid #d8b978;border-radius:24px;overflow:hidden;background:linear-gradient(#0001,#0009),url('https://drive.google.com/thumbnail?id=1wN2o8H0BZqnJ9iguet5Wl1eZBZ637iNS&sz=w1200') center/cover no-repeat;padding:12px 16px 16px;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 24px #0004,inset 0 0 0 5px #fff2}
      .gacha-spa .head{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:3}.gacha-spa .tag{background:#f7d87b;color:#2a1d16;border-radius:999px;padding:8px 14px;font-weight:900}.gacha-spa .help{width:44px;height:44px;border:0;background:url('https://drive.google.com/thumbnail?id=1IF875UNiMQ2I7Nbw5D9bDM5HMW4cDwXf&sz=w300') center/contain no-repeat}
      .gacha-spa .box{flex:1;min-height:360px;position:relative}.gacha-spa .aura{position:absolute;left:50%;top:49%;width:500px;height:500px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,#fff7 0 12%,#ffd85d55 30%,transparent 66%);filter:blur(9px);mix-blend-mode:screen}.gacha-spa .burst{position:absolute;left:50%;top:49%;width:520px;height:520px;border-radius:50%;transform:translate(-50%,-50%);background:repeating-conic-gradient(#fff5 0 5deg,#ffd95a33 5deg 10deg,transparent 10deg 20deg);filter:blur(2px);mix-blend-mode:screen;opacity:.38}.gacha-spa .machine{position:absolute;left:50%;top:50%;width:min(405px,94vw);height:min(405px,94vw);transform:translate(-50%,-50%);object-fit:contain;filter:none;clip-path:none}
      .gacha-spa .draws{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:auto}.gacha-spa .draw{height:80px;border:2px solid #e3c873;border-radius:22px;color:#fff8d7;font-weight:900;font-size:21px;text-shadow:0 3px #0008;box-shadow:inset 0 2px 0 #fff5,0 6px 10px #0006}.gacha-spa .draw small{display:block;font-size:12px}.gacha-spa .d1{background:linear-gradient(#315e50,#172b24)}.gacha-spa .d10{background:linear-gradient(#b64c57,#5b1822)}.gacha-spa .mini{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.gacha-spa .mini button{height:42px;border:2px solid #b89b58;border-radius:16px;background:#2a1d16dd;color:#fff4d7;font-weight:900;font-size:12px}
      @media(max-height:760px){.game-window.gacha-mode{padding:8px 6px 7px!important}.gacha-spa .box{min-height:320px}.gacha-spa .machine{width:min(365px,94vw);height:min(365px,94vw)}.gacha-spa .draw{height:72px}.gacha-spa .mini button{height:38px}}
    `;
    document.head.appendChild(style);
    const section=document.createElement('section'); section.id='gachaSpa'; section.className='gacha-spa';
    section.innerHTML=`<div class="gacha-spa-head"><div><div class="gacha-spa-label">LV.05 / GACHA</div><div class="gacha-spa-title">星糖扭蛋</div></div></div><div class="gacha-spa-pills"><span>✦ 星糖 1280</span><span>靈感券 3</span></div><section class="stage"><div class="head"><span class="tag">MOONLIGHT WISH</span><button class="help"></button></div><div class="box"><div class="aura"></div><div class="burst"></div><img class="machine" src="https://drive.google.com/thumbnail?id=14qDmg3ViAmQAd5OmQtl9UEdw28vrg6h3&sz=w900"></div><div class="draws"><button class="draw d1">抽 1 張<small>券1 / 星糖160</small></button><button class="draw d10">抽 10 張<small>星糖1600</small></button></div><div class="mini"><button>機率</button><button>紀錄</button><button>圖鑑</button><button data-skip>動畫ON</button></div></section>`;
    document.querySelector('.dialogue-box')?.before(section);
    loadCss('gacha-result.css?v=result01'); loadCss('gacha-cinema.css?v=cinema05'); loadCss('gacha-anim.css?v=anim03');
    loadScript('gacha-anim.js?v=spa03'); setTimeout(()=>loadScript('gacha-cinema.js?v=spa03'),50); setTimeout(()=>loadScript('gacha-fairy.js?v=spa03'),100);
  }
  function setDockActive(target){ document.querySelectorAll('.bottom-dock button').forEach(btn=>btn.classList.toggle('on',btn===target)); }
  function showMain(){ document.querySelector('.game-window')?.classList.remove('gacha-mode'); }
  function openGacha(e){ e?.preventDefault(); buildGachaView(); document.querySelector('.game-window')?.classList.add('gacha-mode'); setDockActive(document.querySelector('[data-gacha-dock]')); }
  function wire(){ const g=document.querySelector('[data-gacha-dock]'); if(g&&!g.dataset.ready){g.dataset.ready='1';g.addEventListener('click',openGacha)} document.querySelectorAll('.bottom-dock button:not([data-gacha-dock])').forEach(btn=>{ if(btn.dataset.mainReady)return; btn.dataset.mainReady='1'; btn.addEventListener('click',()=>{showMain();setDockActive(btn);}); }); }
  apply(); wire(); window.addEventListener('load',()=>{apply();wire();}); setInterval(apply,800);
})();