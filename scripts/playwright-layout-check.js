const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function checkViewport(browser, repoRoot, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.simplexIslands && window.simplexIslands.state.result);
  await page.waitForTimeout(100);
  const result = await page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const canvas = rect('#map-canvas');
    const controls = rect('#controls');
    const buttons = Array.from(document.querySelectorAll('button')).map((button) => {
      const r = button.getBoundingClientRect();
      return { text: button.textContent.trim(), width: r.width, height: r.height };
    });
    return { canvas, controls, buttons, viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth };
  });
  await page.close();

  const failures = [];
  if (result.scrollWidth > viewport.width + 1) failures.push(`horizontal overflow ${result.scrollWidth} > ${viewport.width}`);
  if (result.canvas.width < 240 || result.canvas.height < 240) failures.push('canvas below minimum useful size');
  if (viewport.width > 860 && result.canvas.bottom > viewport.height + 1) failures.push('desktop canvas extends below viewport');
  for (const button of result.buttons) {
    if (button.height < 40) failures.push(`small button ${button.text}`);
  }
  return { viewport, ok: failures.length === 0, failures, result };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 375, height: 667 },
    { width: 430, height: 932 },
    { width: 1024, height: 768 }
  ];
  const results = [];
  for (const viewport of viewports) results.push(await checkViewport(browser, repoRoot, viewport));
  await browser.close();
  console.log(JSON.stringify({ ok: results.every((item) => item.ok), results }, null, 2));
  if (!results.every((item) => item.ok)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
