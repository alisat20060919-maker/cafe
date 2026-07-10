import fs from 'node:fs/promises';
import { chromium, webkit, devices } from 'playwright';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.TEST_OUTPUT_DIR || 'test-results';
const testUrl = `${baseUrl}/?checks=1&smoke=1&edge=1`;
const iPhone = devices['iPhone 13'];

await fs.mkdir(outputDir, { recursive: true });

function filterFailedRequests(requests = []) {
  return requests.filter(({ url, resourceType }) => (
    !['image', 'font', 'media'].includes(resourceType)
    && !url.includes('/assets/images/')
    && !url.endsWith('.webp')
    && !url.endsWith('.png')
    && !url.endsWith('.jpg')
    && !url.endsWith('.jpeg')
    && !url.endsWith('.svg')
  ));
}

async function waitForReports(page) {
  await page.waitForFunction(() => (
    window.__fairyCafeSmokeReport
    && window.__fairyCafeEdgeReport
  ), null, { timeout: 60_000 });
}

async function readAppResults(page) {
  return page.evaluate(async () => {
    const integrityModule = await import('./data-integrity-checks.js?v=ci002');
    const integrity = integrityModule.runDataIntegrityChecks();
    return {
      smoke: window.__fairyCafeSmokeReport,
      edge: window.__fairyCafeEdgeReport,
      integrity,
      saveVersionText: document.querySelector('.save-label')?.textContent || '',
      modalTitle: document.querySelector('#modalHost h2')?.textContent || '',
    };
  });
}

async function testMobileLayout(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const dock = document.querySelector('.bottom-dock');
    const modalHost = document.querySelector('#modalHost');
    const modalCard = modalHost?.querySelector('.core-modal-card');
    const dockRect = dock?.getBoundingClientRect();
    const modalRect = modalCard?.getBoundingClientRect();

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      noHorizontalOverflow: root.scrollWidth <= root.clientWidth + 1,
      rootWidth: { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth },
      dockVisible: Boolean(dockRect)
        && dockRect.top < window.innerHeight
        && dockRect.bottom <= window.innerHeight + 1
        && dockRect.left >= -1
        && dockRect.right <= window.innerWidth + 1,
      dockRect: dockRect ? {
        top: Math.round(dockRect.top),
        bottom: Math.round(dockRect.bottom),
        left: Math.round(dockRect.left),
        right: Math.round(dockRect.right),
      } : null,
      modalVisible: Boolean(modalRect)
        && modalRect.width > 0
        && modalRect.height > 0
        && modalRect.left >= -1
        && modalRect.right <= window.innerWidth + 1,
      modalRect: modalRect ? {
        top: Math.round(modalRect.top),
        bottom: Math.round(modalRect.bottom),
        left: Math.round(modalRect.left),
        right: Math.round(modalRect.right),
        height: Math.round(modalRect.height),
      } : null,
    };
  });
}

async function testModalScrollLock(page) {
  const closeButton = page.locator('#modalHost [data-close-modal]').first();
  if (await closeButton.count()) await closeButton.click();

  await page.locator('[data-action="settings"]').click();
  await page.locator('#modalHost [data-setting]').first().waitFor({ state: 'visible' });

  const opened = await page.evaluate(() => ({
    bodyClass: document.body.classList.contains('core-modal-open'),
    bodyPosition: document.body.style.position,
    hostHidden: document.querySelector('#modalHost')?.hidden,
  }));

  await page.locator('#modalHost [data-close-modal]').first().click();

  const closed = await page.evaluate(() => ({
    bodyClass: document.body.classList.contains('core-modal-open'),
    bodyPosition: document.body.style.position,
    hostHidden: document.querySelector('#modalHost')?.hidden,
  }));

  return {
    opened,
    closed,
    ok: opened.bodyClass
      && opened.bodyPosition === 'fixed'
      && opened.hostHidden === false
      && !closed.bodyClass
      && closed.bodyPosition === ''
      && closed.hostHidden === true,
  };
}

async function runEngine(engineName, browserType) {
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  let browser;
  let context;
  let page;
  let report;

  try {
    browser = await browserType.launch({ headless: true });
    context = await browser.newContext({
      ...iPhone,
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
    });
    page = await context.newPage();

    page.on('console', (message) => {
      consoleMessages.push({ type: message.type(), text: message.text() });
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error?.stack || error?.message || String(error));
    });
    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        error: request.failure()?.errorText || 'request failed',
      });
    });

    const response = await page.goto(testUrl, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });

    if (!response?.ok()) {
      throw new Error(`首頁載入失敗：HTTP ${response?.status() ?? 'unknown'}`);
    }

    await waitForReports(page);
    const appResults = await readAppResults(page);
    const layout = await testMobileLayout(page);
    const modalScrollLock = await testModalScrollLock(page);

    const saveBeforeReload = await page.evaluate(() => localStorage.getItem('fairyCafeSave'));
    await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });
    await waitForReports(page);
    const saveAfterReload = await page.evaluate(() => localStorage.getItem('fairyCafeSave'));
    const persistence = {
      ok: Boolean(saveBeforeReload) && saveBeforeReload === saveAfterReload,
      beforeLength: saveBeforeReload?.length || 0,
      afterLength: saveAfterReload?.length || 0,
    };

    await page.screenshot({
      path: `${outputDir}/${engineName}-iphone-regression.png`,
      fullPage: true,
    });

    const relevantFailedRequests = filterFailedRequests(failedRequests);
    const layoutOk = layout.noHorizontalOverflow && layout.dockVisible && layout.modalVisible;

    report = {
      engine: engineName,
      ok: Boolean(appResults.integrity?.ok && appResults.smoke?.ok && appResults.edge?.ok)
        && layoutOk
        && modalScrollLock.ok
        && persistence.ok
        && pageErrors.length === 0
        && relevantFailedRequests.length === 0,
      ...appResults,
      layout: { ...layout, ok: layoutOk },
      modalScrollLock,
      persistence,
      pageErrors,
      failedRequests: relevantFailedRequests,
      ignoredAssetFailures: failedRequests.filter(({ resourceType }) => ['image', 'font', 'media'].includes(resourceType)),
      consoleMessages,
    };
  } catch (error) {
    if (page) {
      await page.screenshot({
        path: `${outputDir}/${engineName}-iphone-regression-failure.png`,
        fullPage: true,
      }).catch(() => {});
    }

    report = {
      engine: engineName,
      ok: false,
      fatalError: error?.stack || error?.message || String(error),
      pageErrors,
      failedRequests: filterFailedRequests(failedRequests),
      consoleMessages,
    };
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }

  await fs.writeFile(
    `${outputDir}/${engineName}-regression.json`,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  return report;
}

const reports = [];
reports.push(await runEngine('chromium', chromium));
reports.push(await runEngine('webkit', webkit));

const combinedReport = {
  ok: reports.every((report) => report.ok),
  generatedAt: new Date().toISOString(),
  engines: reports,
};

await fs.writeFile(
  `${outputDir}/browser-regression.json`,
  `${JSON.stringify(combinedReport, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(combinedReport, null, 2));

if (!combinedReport.ok) {
  process.exitCode = 1;
}
