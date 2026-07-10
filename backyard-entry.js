import { navigate } from '@router';

function ensureBackyardStyles() {
  if (document.querySelector('link[data-backyard-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './backyard-page.css?v=ui01';
  link.dataset.backyardStyles = 'true';
  document.head.appendChild(link);
}

function ensureBackyardPageHost() {
  if (document.querySelector('#page-backyard')) return;
  const page = document.createElement('section');
  page.className = 'page core-page-host';
  page.id = 'page-backyard';
  page.setAttribute('aria-label', '後山採集與精靈遠征頁');
  const firstHost = document.querySelector('.core-page-host');
  if (firstHost?.parentNode) firstHost.parentNode.insertBefore(page, firstHost);
}

function handleBackyardEntry(event) {
  const button = event.target.closest('#backyard .enter-button');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  navigate('backyard');
}

export function initBackyardEntry() {
  ensureBackyardStyles();
  ensureBackyardPageHost();
  if (document.documentElement.dataset.backyardEntryReady === 'true') return;
  document.documentElement.dataset.backyardEntryReady = 'true';
  document.addEventListener('click', handleBackyardEntry, true);
}
