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
    window.location.href = 'lucky-v19.html?v=fairy02';
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