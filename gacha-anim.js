(() => {
  const stage = document.querySelector('.stage');
  const buttons = document.querySelectorAll('.draw');
  if (!stage || !buttons.length) return;

  const play = (btn) => {
    btn.classList.remove('tap');
    stage.classList.remove('gachaRun');
    void btn.offsetWidth;
    btn.classList.add('tap');
    stage.classList.add('gachaRun');
    setTimeout(() => btn.classList.remove('tap'), 520);
    setTimeout(() => stage.classList.remove('gachaRun'), 950);
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => play(btn));
  });
})();
