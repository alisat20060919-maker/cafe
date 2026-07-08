import { validateGameDB } from '@validator';
import { initState } from '@state';
import { initUI } from '@ui';
import { initHome, renderHome } from '@home';
import { initRouter } from '@router';
import { renderGacha } from '@pages/gacha';
import { initInventoryPage, renderInventory } from '@pages/inventory';
import { initCommissionsPage, renderCommissions } from '@pages/commissions';

function boot() {
  validateGameDB();
  initState();
  initUI();
  initHome();
  initInventoryPage();
  initCommissionsPage();

  initRouter({
    home: { render: renderHome },
    gacha: { render: renderGacha },
    commissions: { render: renderCommissions },
    inventory: { render: renderInventory },
  }, 'home');
}

document.addEventListener('DOMContentLoaded', boot);
