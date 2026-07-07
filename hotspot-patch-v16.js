(() => {
  const positions = {
    menu: ['198px','220px'],
    cabinet: ['92px','252px'],
    quest: ['438px','232px'],
    order: ['640px','150px']
  };
  function apply(){
    document.querySelectorAll('.room-hotspot').forEach(el => {
      const p = positions[el.dataset.panel];
      if (!p) return;
      el.style.left = p[0];
      el.style.top = p[1];
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });
  }

  function addMainGacha(){
    const tabs = document.querySelector('.location-tabs');
    const track = document.querySelector('.map-track');
    const viewport = document.querySelector('#mapViewport');
    if (!tabs || !track || !viewport || document.querySelector('#gacha')) return;

    const style = document.createElement('style');
    style.textContent = `.location-tabs .tab.gacha-tab{background:linear-gradient(180deg,#fff1ad,#efb85e);color:#2b1d13}.scene-card.gacha-main{background:radial-gradient(circle at 50% 35%,#4b2f67,#071b14 68%,#020806)!important;overflow:hidden}.scene-card.gacha-main:before{content:"";position:absolute;inset:-20%;background:radial-gradient(circle,#ffd97866 0 10%,transparent 52%);animation:gachaMainGlow 3s ease-in-out infinite}.gacha-main-box{position:absolute;inset:12px;border:3px solid rgba(247,216,123,.7);border-radius:24px;background:rgba(6,26,18,.9);box-shadow:inset 0 0 0 4px rgba(255,244,215,.08),0 18px 34px rgba(0,0,0,.35);overflow:hidden}.gacha-main-head{height:54px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;background:linear-gradient(180deg,#3a281d,#211610);border-bottom:2px solid rgba(247,216,123,.48);position:relative;z-index:3}.gacha-main-head b{color:#fff7d8;font-size:18px}.gacha-main-head a{background:#f7d87b;color:#2b1d13;border-radius:999px;padding:7px 10px;text-decoration:none;font-size:12px;font-weight:900}.gacha-main-frame{position:absolute;left:0;right:0;top:54px;bottom:0;width:100%;height:calc(100% - 54px);border:0;background:#061a12}.gacha-main .enter-button,.gacha-main .scene-info{display:none}@keyframes gachaMainGlow{0%,100%{opacity:.45;transform:scale(.95)}50%{opacity:.85;transform:scale(1.06)}}`;
    document.head.appendChild(style);

    const tab = document.createElement('button');
    tab.className = 'tab gacha-tab';
    tab.dataset.target = 'gacha';
    tab.type = 'button';
    tab.textContent = '扭蛋';
    tabs.appendChild(tab);

    const card = document.createElement('article');
    card.className = 'scene-card gacha-main';
    card.id = 'gacha';
    card.dataset.speaker = '星糖扭蛋機';
    card.dataset.title = '星糖扭蛋';
    card.dataset.dialogue = '投入星糖，看看今天會遇見哪一位精靈吧。';
    card.innerHTML = '<div class="gacha-main-box"><div class="gacha-main-head"><b>星糖扭蛋</b><a href="lucky-v19.html?v=fairy02">全頁開啟</a></div><iframe class="gacha-main-frame" src="lucky-v19.html?v=fairy02" title="星糖扭蛋"></iframe></div><button class="enter-button" type="button">開始扭蛋</button><div class="scene-info"><span class="chapter">AREA 06</span><h2>星糖扭蛋</h2><p>抽取素材、甜點與稀有精靈。</p></div>';
    track.appendChild(card);

    const showGacha = () => {
      document.querySelectorAll('.scene-card').forEach(x => x.classList.toggle('active', x.id === 'gacha'));
      document.querySelectorAll('.location-tabs .tab').forEach(x => x.classList.toggle('active', x.dataset.target === 'gacha'));
      document.querySelector('#speakerName').textContent = '星糖扭蛋機';
      document.querySelector('#placeName').textContent = '星糖扭蛋';
      document.querySelector('#dialogueText').textContent = '投入星糖，看看今天會遇見哪一位精靈吧。';
      viewport.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
    };
    tab.addEventListener('click', showGacha);
  }

  apply();
  addMainGacha();
  window.addEventListener('load', () => { apply(); addMainGacha(); });
  setInterval(apply, 800);
})();