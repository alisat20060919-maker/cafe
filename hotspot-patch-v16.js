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

  function openGacha(){
    const win = document.querySelector('.game-window');
    const viewport = document.querySelector('#mapViewport');
    const card = document.querySelector('#gacha');
    if (!viewport || !card) return;
    win?.classList.remove('inside-mode');
    document.querySelectorAll('.scene-card').forEach(x => x.classList.toggle('active', x.id === 'gacha'));
    document.querySelectorAll('.location-tabs .tab').forEach(x => x.classList.remove('active'));
    const speaker = document.querySelector('#speakerName');
    const place = document.querySelector('#placeName');
    const dialogue = document.querySelector('#dialogueText');
    if (speaker) speaker.textContent = '星糖扭蛋機';
    if (place) place.textContent = '星糖扭蛋';
    if (dialogue) dialogue.textContent = '投入星糖，看看今天會遇見哪一位精靈吧。';
    viewport.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
  }

  function wireBottomGacha(){
    const btn = document.querySelector('[data-gacha-dock]');
    if (!btn || btn.dataset.ready) return;
    btn.dataset.ready = '1';
    btn.addEventListener('click', openGacha);
  }

  apply();
  wireBottomGacha();
  window.addEventListener('load', () => { apply(); wireBottomGacha(); });
  setInterval(apply, 800);
})();