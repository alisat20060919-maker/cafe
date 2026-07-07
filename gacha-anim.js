(() => {
  const stage = document.querySelector('.stage');
  const buttons = document.querySelectorAll('.draw');
  if (!stage || !buttons.length) return;

  const pool = [
    ['r','🍪','森林餅乾'], ['r','🪵','小木牌菜單'], ['r','🧺','莓果籃'],
    ['sr','🍓','星星莓奶油塔'], ['sr','💌','神祕客人來信'],
    ['ssr','🌙','月光花瓣王冠'], ['ssr','🌌','夜空碎片禮盒']
  ];
  const history = [];
  const owned = new Set();
  let skip = localStorage.getItem('gachaSkip') === '1';

  const modal = document.createElement('div');
  modal.className = 'gachaModal';
  document.body.appendChild(modal);

  const pick = () => {
    const r = Math.random();
    const tier = r < .08 ? 'ssr' : r < .32 ? 'sr' : 'r';
    const list = pool.filter(x => x[0] === tier);
    return list[Math.floor(Math.random() * list.length)];
  };

  const card = (x) => `<div class="resultCard ${x[0]}"><div class="tier">${x[0].toUpperCase()}</div><div class="icon">${x[1]}</div><div class="name">${x[2]}</div></div>`;

  const result = (count) => {
    const out = Array.from({length: count}, pick);
    out.forEach(x => { history.push(x); owned.add(x[2]); });
    show('抽取結果', `<div class="resultGrid ${count === 1 ? 'single' : ''}">${out.map(card).join('')}</div>`);
    return out;
  };

  const show = (title, html) => {
    modal.innerHTML = `<div class="gachaPanel"><h2>${title}</h2>${html}<div class="gachaActions"><button data-close>關閉</button><button data-again>再抽一次</button></div></div>`;
    modal.classList.add('show');
    modal.querySelector('[data-close]').onclick = () => modal.classList.remove('show');
    modal.querySelector('[data-again]').onclick = () => { modal.classList.remove('show'); play(buttons[0], 1); };
  };

  const showInfo = (kind) => {
    if (kind === 'rate') show('機率', '<div class="rateRow"><span>R 普通</span><b>68%</b></div><div class="rateRow"><span>SR 稀有</span><b>24%</b></div><div class="rateRow"><span>SSR 夢幻</span><b>8%</b></div>');
    if (kind === 'log') show('抽卡紀錄', history.length ? `<div class="resultGrid">${history.slice(-10).reverse().map(card).join('')}</div>` : '<div class="emptyNote">還沒有抽卡紀錄</div>');
    if (kind === 'book') show('圖鑑', owned.size ? `<div class="resultGrid">${[...owned].map(s => pool.find(x => x[2] === s)).filter(Boolean).map(card).join('')}</div>` : '<div class="emptyNote">還沒有收藏</div>');
  };

  const setSkipText = () => {
    const btn = document.querySelector('[data-skip]');
    if (btn) btn.textContent = skip ? '動畫OFF' : '動畫ON';
    stage.classList.toggle('skipFX', skip);
  };

  const play = (btn, count) => {
    if (skip) { result(count); return; }
    const preview = Array.from({length: count}, pick);
    const rare = preview.some(x => x[0] !== 'r');
    btn.classList.remove('tap');
    stage.classList.remove('gachaRun','rareRun');
    void btn.offsetWidth;
    btn.classList.add('tap');
    stage.classList.add('gachaRun');
    if (rare) stage.classList.add('rareRun');
    setTimeout(() => btn.classList.remove('tap'), 620);
    setTimeout(() => stage.classList.remove('gachaRun','rareRun'), 1250);
    setTimeout(() => {
      preview.forEach(x => { history.push(x); owned.add(x[2]); });
      show('抽取結果', `<div class="resultGrid ${count === 1 ? 'single' : ''}">${preview.map(card).join('')}</div>`);
    }, 1080);
  };

  buttons[0].onclick = () => play(buttons[0], 1);
  buttons[1].onclick = () => play(buttons[1], 10);
  document.querySelector('.help')?.addEventListener('click', () => showInfo('rate'));
  const mini = [...document.querySelectorAll('.mini button')];
  mini[0]?.addEventListener('click', () => showInfo('rate'));
  mini[1]?.addEventListener('click', () => showInfo('log'));
  mini[2]?.addEventListener('click', () => showInfo('book'));
  mini[3]?.setAttribute('data-skip','1');
  mini[3]?.addEventListener('click', () => { skip = !skip; localStorage.setItem('gachaSkip', skip ? '1' : '0'); setSkipText(); });
  setSkipText();
})();
