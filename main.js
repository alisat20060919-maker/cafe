import { runDevChecks } from '@dev/checks';
import { runDataIntegrityChecks } from './data-integrity-checks.js?v=core001';
import { applyLegacyGameDataAliases } from './data-aliases.js?v=core002';
import { runSmokeTests, renderSmokeTestReport } from './smoke-tests.js?v=core002';
import { runEdgeTests, renderEdgeTestReport } from './edge-tests.js?v=core002';
import { initCraftUI, renderCraftStationPage } from './craft-ui.js?v=core003';
import { initWorldMap, renderWorldMap } from './world-map.js?v=core001';
import { GameDB } from '@db';
import { applyFairyExpansion } from './fairy-expansion.js?v=core002';
import { initState } from '@state';
import { initUI, showModal, showOpeningStoryIfNeeded } from '@ui';
import { initHome, renderHome } from '@home';
import { initRouter } from '@router';
import { initGachaPage, renderGacha } from '@pages/gacha';
import { initInventoryPage, renderInventory } from '@pages/inventory';
import { initFairiesPage, renderFairies } from '@pages/fairies';
import { initCollectionPage, renderCollection } from '@pages/collection';
import { initCommissionsPage, renderCommissions } from '@pages/commissions';
import { initShopPage, renderShop } from '@pages/shop';

function boot() {
  applyFairyExpansion();
  applyLegacyGameDataAliases(GameDB);
  initState();
  runDevChecks();
  runDataIntegrityChecks();
  initUI();
  initCraftUI();
  initWorldMap();
  initHome();
  initGachaPage();
  initInventoryPage();
  initFairiesPage();
  initCollectionPage();
  initCommissionsPage();
  initShopPage();

  initRouter({
    home: { render: renderHome },
    world: { render: renderWorldMap },
    kitchen: { render: () => renderCraftStationPage('kitchen') },
    alchemy: { render: () => renderCraftStationPage('alchemy') },
    gacha: { render: renderGacha },
    commissions: { render: renderCommissions },
    inventory: { render: renderInventory },
    fairies: { render: renderFairies },
    collection: { render: renderCollection },
    shop: { render: renderShop },
  }, 'home');

  const smokeReport = runSmokeTests();
  const edgeReport = runEdgeTests();

  if (!edgeReport.skipped) {
    showModal(renderEdgeTestReport(edgeReport));
  } else if (!smokeReport.skipped) {
    showModal(renderSmokeTestReport(smokeReport));
  } else {
    showOpeningStoryIfNeeded();
  }
}

document.addEventListener('DOMContentLoaded', boot);
