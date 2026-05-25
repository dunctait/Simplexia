const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const artifactDir = path.join(repoRoot, 'artifacts', 'smoke');
  fs.mkdirSync(artifactDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.simplexIslands && window.simplexIslands.state.result);

  const initialSeed = await page.locator('#seedOut').textContent();
  await page.locator('#randomize').click();
  await page.waitForFunction((seed) => document.querySelector('#seedOut').textContent !== seed, initialSeed);

  await page.waitForFunction(() => {
    const stage = document.querySelector('#globe-stage');
    return stage && !stage.hidden && stage.querySelector('canvas');
  });
  await page.locator('#octaves').evaluate((input) => {
    input.value = '6';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#resolution').evaluate((input) => {
    input.value = '224';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('#globe-stage').dataset.resolution === '224');
  const highResolutionVertexCount = await page.locator('#globe-stage').evaluate((stage) => Number(stage.dataset.vertexCount));
  await page.locator('#resolution').evaluate((input) => {
    input.value = '80';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction((previous) => {
    const stage = document.querySelector('#globe-stage');
    return stage.dataset.resolution === '80' && Number(stage.dataset.vertexCount) !== previous;
  }, highResolutionVertexCount);
  const lowResolutionVertexCount = await page.locator('#globe-stage').evaluate((stage) => Number(stage.dataset.vertexCount));
  if (!(highResolutionVertexCount > lowResolutionVertexCount)) {
    throw new Error(`Resolution did not change mesh complexity: high=${highResolutionVertexCount}, low=${lowResolutionVertexCount}`);
  }
  await page.locator('#resolution').evaluate((input) => {
    input.value = '224';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('#globe-stage').dataset.resolution === '224');
  await page.locator('#biomePreset').selectOption('arctic');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.simplexIslands && window.simplexIslands.state.result);
  await page.waitForFunction(() => {
    const stage = document.querySelector('#globe-stage');
    return stage && !stage.hidden && stage.querySelector('canvas');
  });
  const restoredSession = await page.evaluate(() => ({
    resolution: window.simplexIslands.state.settings.resolution,
    octaves: window.simplexIslands.state.settings.octaves,
    biomePreset: window.simplexIslands.state.settings.biomePreset
  }));
  if (restoredSession.resolution !== 224 || restoredSession.octaves !== 6 || restoredSession.biomePreset !== 'arctic') {
    throw new Error(`Session did not restore after refresh: ${JSON.stringify(restoredSession)}`);
  }
  await page.locator('#saveName').fill('Smoke island');
  await page.locator('#save').click();
  await page.waitForFunction(() => document.querySelector('#savedList').options.length > 0);

  const globeInfo = await page.evaluate(() => {
    const globeCanvas = document.querySelector('#globe-stage canvas');
    const globeRect = globeCanvas.getBoundingClientRect();
    const gl = globeCanvas.getContext('webgl2') || globeCanvas.getContext('webgl');
    const globePixel = new Uint8Array(4);
    gl.readPixels(Math.floor(globeCanvas.width / 2), Math.floor(globeCanvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, globePixel);
    return { width: globeRect.width, height: globeRect.height, sample: Array.from(globePixel) };
  });

  const canvasInfo = { width: globeInfo.width, height: globeInfo.height, sample: globeInfo.sample, globe: globeInfo };

  if (canvasInfo.width < 240 || canvasInfo.height < 240) throw new Error(`Canvas too small: ${JSON.stringify(canvasInfo)}`);
  if (canvasInfo.sample[3] === 0) throw new Error('Canvas center is transparent');
  if (canvasInfo.globe.width < 240 || canvasInfo.globe.height < 240) throw new Error(`Globe canvas too small: ${JSON.stringify(canvasInfo)}`);
  if (canvasInfo.globe.sample.every((value) => value === 0)) throw new Error(`Globe center pixel is blank: ${JSON.stringify(canvasInfo)}`);
  await page.screenshot({ path: path.join(artifactDir, 'globe-mobile.png'), fullPage: true });

  await browser.close();
  console.log(JSON.stringify({ ok: true, canvasInfo }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
