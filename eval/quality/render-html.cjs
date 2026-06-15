// Renders each generated HTML deliverable to a full-page PNG via headless Chrome,
// so the deliverables can be eyeballed and judged visually. Reads results-html/run.json.
const { chromium } = require('/Users/arturlemos/Documents/Projetos/iazzas/node_modules/playwright');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const HERE = '/Users/arturlemos/Documents/Projetos/iazzas/eval/quality';
(async () => {
  const runs = JSON.parse(readFileSync(`${HERE}/results-html/run.json`, 'utf8'));
  const browser = await chromium.launch({ channel: 'chrome' });
  let n = 0;
  for (const r of runs) {
    if (!r.hasHtml) continue;
    const htmlPath = `${HERE}/results-html/${r.config}/${r.task}.html`;
    if (!existsSync(htmlPath)) continue;
    const pngPath = `${HERE}/results-html/${r.config}/${r.task}.png`;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    try {
      await page.goto('file://' + htmlPath, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(900); // let fonts/Chart.js settle
      await page.screenshot({ path: pngPath, fullPage: true });
      n++;
      process.stdout.write(`rendered ${r.config}/${r.task}\n`);
    } catch (e) {
      process.stdout.write(`FAIL ${r.config}/${r.task}: ${e.message}\n`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
  console.log(`\n${n} PNGs renderizados em results-html/<config>/`);
})();
