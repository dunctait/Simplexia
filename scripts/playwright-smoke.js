const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.simplexIslands && window.simplexIslands.state.result);

  const initialSeed = await page.locator('#seedOut').textContent();
  await page.locator('#randomize').click();
  await page.waitForFunction((seed) => document.querySelector('#seedOut').textContent !== seed, initialSeed);

  await page.locator('[data-view="globe"]').click();
  await page.locator('#showGrid').check();
  await page.locator('#saveName').fill('Smoke island');
  await page.locator('#save').click();
  await page.waitForFunction(() => document.querySelector('#savedList').options.length > 0);

  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('#map-canvas');
    const ctx = canvas.getContext('2d');
    const sample = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return { width: canvas.width, height: canvas.height, sample: Array.from(sample) };
  });

  if (canvasInfo.width < 240 || canvasInfo.height < 240) throw new Error(`Canvas too small: ${JSON.stringify(canvasInfo)}`);
  if (canvasInfo.sample[3] === 0) throw new Error('Canvas center is transparent');

  await browser.close();
  console.log(JSON.stringify({ ok: true, canvasInfo }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
