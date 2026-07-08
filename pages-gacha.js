import { GameDB } from './game-data.js?v=core07';
import { getState } from './game-state.js?v=core07';
import { drawGacha } from './gacha-actions.js?v=core07';
import { emitNotice } from './event-bus.js?v=core07';

function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
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

function renderDrop(record) {
  if (!record) return '';
  if (record.kind === 'fairy') {
    const fairy = GameDB.fairies[record.id];
    return `<article class="core-result-card ssr"><b>${fairy.icon} ${fairy.name}</b><span>${fairy.rarity}</span><p>「${fairy.quote}」</p></article>`;
  }
  const item = GameDB.items[record.id];
  return `<article class="core-result-card"><b>${item.icon} ${item.name} ×${record.qty}</b><span>${item.rarity} / ${item.typeName}</span><p>${item.description}</p></article>`;
}

export function renderGacha(results = []) {
  const page = document.querySelector('#page-gacha');
  if (!page) return;

  const state = getState();
  const pool = GameDB.gachaPools.standard;
  const costMeta = GameDB.currencies[pool.cost.currency];

  page.innerHTML = `
    ${pageHeader('WISH / ACTION MODULE', '星糖祈願', '祈願邏輯已經移出頁面，畫面只負責按鈕與結果顯示。')}
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

  $all('[data-draw]', page).forEach((button) => {
    button.addEventListener('click', () => {
      const times = Number(button.dataset.draw || 1);
      const drawn = [];
      for (let i = 0; i < times; i += 1) {
        const result = drawGacha('standard');
        if (!result.ok) {
          emitNotice('祈願失敗', result.message);
          break;
        }
        drawn.push(result.drop);
      }
      renderGacha(drawn);
    });
  });
}
