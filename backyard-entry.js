import { navigate } from '@router';

function handleBackyardEntry(event) {
  const button = event.target.closest('#backyard .enter-button');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  navigate('backyard');
}

export function initBackyardEntry() {
  if (document.documentElement.dataset.backyardEntryReady === 'true') return;
  document.documentElement.dataset.backyardEntryReady = 'true';
  document.addEventListener('click', handleBackyardEntry, true);
}
