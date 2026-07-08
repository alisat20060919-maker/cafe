import { initState } from './game-state.js?v=core06';
import { initUI } from './ui.js?v=core06';
import { initHome, renderHome } from './home.js?v=core06';
import { initRouter } from './router.js?v=core06';
import { renderGacha } from './pages-gacha.js?v=core06';
import { initInventoryPage, renderInventory } from './pages-inventory.js?v=core06';
import { initCommissionsPage, renderCommissions } from './pages-commissions.js?v=core06';

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
