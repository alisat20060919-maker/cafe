import { runDevChecks } from '@dev/checks';
import { initState } from '@state';
import { initUI, showOpeningStoryIfNeeded } from '@ui';
import { initHome, renderHome } from '@home';
import { initRouter } from '@router';
import { renderGacha } from '@pages/gacha';
import { initInventoryPage, renderInventory } from '@pages/inventory';
import { initFairiesPage, renderFairies } from '@pages/fairies';
import { renderCollection } from '@pages/collection';
import { initCommissionsPage, renderCommissions } from '@pages/commissions';

function boot() {
  runDevChecks();
  initState();
  initUI();
  initHome();
  initInventoryPage();
  initFairiesPage();
  initCommissionsPage();

  initRouter({
    home: { render: renderHome },
    gacha: { render: renderGacha },
    commissions: { render: renderCommissions },
    inventory: { render: renderInventory },
    fairies: { render: renderFairies },
    collection: { render: renderCollection },
  }, 'home');

  showOpeningStoryIfNeeded();
}

document.addEventListener('DOMContentLoaded', boot);
