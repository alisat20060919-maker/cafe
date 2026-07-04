const viewport = document.querySelector('#mapViewport');
const scenes = [...document.querySelectorAll('.scene-card')];
const tabs = [...document.querySelectorAll('.tab')];
const prevButton = document.querySelector('#prevScene');
const nextButton = document.querySelector('#nextScene');
const speakerName = document.querySelector('#speakerName');
const placeName = document.querySelector('#placeName');
const dialogueText = document.querySelector('#dialogueText');

let activeIndex = 0;

function setActiveScene(index) {
  activeIndex = Math.max(0, Math.min(index, scenes.length - 1));
  const scene = scenes[activeIndex];

  scenes.forEach((item, itemIndex) => {
    item.classList.toggle('active', itemIndex === activeIndex);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === scene.id);
  });

  speakerName.textContent = scene.dataset.speaker;
  placeName.textContent = scene.dataset.title;
  dialogueText.textContent = scene.dataset.dialogue;
}

function scrollToScene(index) {
  const scene = scenes[Math.max(0, Math.min(index, scenes.length - 1))];
  viewport.scrollTo({
    left: scene.offsetLeft,
    behavior: 'smooth',
  });
  setActiveScene(scenes.indexOf(scene));
}

prevButton.addEventListener('click', () => scrollToScene(activeIndex - 1));
nextButton.addEventListener('click', () => scrollToScene(activeIndex + 1));

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const index = scenes.findIndex((scene) => scene.id === tab.dataset.target);
    scrollToScene(index);
  });
});

scenes.forEach((scene, index) => {
  scene.querySelector('.enter-button').addEventListener('click', () => {
    setActiveScene(index);
    dialogueText.textContent = `你選擇了「${scene.dataset.title}」。這裡之後可以做成獨立頁面或任務清單。`;
  });
});

let scrollTimer;
viewport.addEventListener('scroll', () => {
  window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
    setActiveScene(index);
  }, 80);
});

viewport.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') scrollToScene(activeIndex - 1);
  if (event.key === 'ArrowRight') scrollToScene(activeIndex + 1);
});

setActiveScene(0);
