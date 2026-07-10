import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.TEST_OUTPUT_DIR || 'test-results';
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];

page.on('console', (message) => {
  consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on('pageerror', (error) => {
  pageErrors.push(error?.stack || error?.message || String(error));
});
page.on('requestfailed', (request) => {
  failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' });
});

let report;
try {
  const response = await page.goto(`${baseUrl}/?checks=1&smoke=1&edge=1`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });

  if (!response?.ok()) {
    throw new Error(`首頁載入失敗：HTTP ${response?.status() ?? 'unknown'}`);
  }

  await page.waitForFunction(() => (
    window.__fairyCafeSmokeReport
    && window.__fairyCafeEdgeReport
  ), null, { timeout: 60_000 });

  const results = await page.evaluate(async () => {
    const integrityModule = await import('./data-integrity-checks.js?v=ci001');
    const integrity = integrityModule.runDataIntegrityChecks();
    return {
      smoke: window.__fairyCafeSmokeReport,
      edge: window.__fairyCafeEdgeReport,
      integrity,
      saveVersionText: document.querySelector('.save-label')?.textContent || '',
      modalTitle: document.querySelector('#modalHost h2')?.textContent || '',
    };
  });

  await page.screenshot({
    path: `${outputDir}/browser-regression.png`,
    fullPage: true,
  });

  const relevantFailedRequests = failedRequests.filter(({ url }) => (
    !url.includes('/assets/images/')
    && !url.endsWith('.webp')
    && !url.endsWith('.png')
    && !url.endsWith('.jpg')
    && !url.endsWith('.jpeg')
  ));

  report = {
    ok: Boolean(results.integrity?.ok && results.smoke?.ok && results.edge?.ok)
      && pageErrors.length === 0
      && relevantFailedRequests.length === 0,
    ...results,
    pageErrors,
    failedRequests: relevantFailedRequests,
    consoleMessages,
  };
} catch (error) {
  await page.screenshot({
    path: `${outputDir}/browser-regression-failure.png`,
    fullPage: true,
  }).catch(() => {});

  report = {
    ok: false,
    fatalError: error?.stack || error?.message || String(error),
    pageErrors,
    failedRequests,
    consoleMessages,
  };
} finally {
  await browser.close();
}

await fs.writeFile(
  `${outputDir}/browser-regression.json`,
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  process.exitCode = 1;
}
