import { runDevChecks } from '@dev/checks';
import { initState } from '@state';
import { initUI, showOpeningStoryIfNeeded } from '@ui';
import { initHome, renderHome } from '@home';
import { initRouter } from '@router';
import { initGachaPage, renderGacha } from '@pages/gacha';
import { initInventoryPage, renderInventory } from '@pages/inventory';
import { initFairiesPage, renderFairies } from '@pages/fairies';
import { renderCollection } from '@pages/collection';
import { initCommissionsPage, renderCommissions } from '@pages/commissions';
import { initShopPage, renderShop } from '@pages/shop';

function boot() {
  initState();
  runDevChecks();
  initUI();
  initHome();
  initGachaPage();
  initInventoryPage();
  initFairiesPage();
  initCommissionsPage();
  initShopPage();

  initRouter({
    home: { render: renderHome },
    gacha: { render: renderGacha },
    commissions: { render: renderCommissions },
    inventory: { render: renderInventory },
    fairies: { render: renderFairies },
    collection: { render: renderCollection },
    shop: { render: renderShop },
  }, 'home');

  showOpeningStoryIfNeeded();
}

document.addEventListener('DOMContentLoaded', boot);
