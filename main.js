import { initState } from './game-state.js';
import { initUI } from './ui.js';
import { initHome, renderHome } from './home.js';
import { initRouter } from './router.js';
import { renderGacha } from './pages-gacha.js';
import { initInventoryPage, renderInventory } from './pages-inventory.js';
import { initCommissionsPage, renderCommissions } from './pages-commissions.js';

function boot() {
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
