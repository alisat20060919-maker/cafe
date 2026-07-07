import { initState } from './game-state.js?v=core03';
import { initUI } from './ui.js?v=core03';
import { initHome, renderHome } from './home.js?v=core03';
import { initRouter } from './router.js?v=core03';
import { renderGacha } from './pages-gacha.js?v=core03';
import { initInventoryPage, renderInventory } from './pages-inventory.js?v=core03';
import { initCommissionsPage, renderCommissions } from './pages-commissions.js?v=core03';

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
