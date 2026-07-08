import { initState } from './game-state.js?v=core05';
import { initUI } from './ui.js?v=core05';
import { initHome, renderHome } from './home.js?v=core05';
import { initRouter } from './router.js?v=core05';
import { renderGacha } from './pages-gacha.js?v=core05';
import { initInventoryPage, renderInventory } from './pages-inventory.js?v=core05';
import { initCommissionsPage, renderCommissions } from './pages-commissions.js?v=core05';

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
