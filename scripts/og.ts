// Renders public/og.png from scripts/og.html. Needs the dev server on :5183.   node scripts/og.ts
import { launch } from './chromium.ts';

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
page.on('pageerror', (e) => { console.error(e.message); process.exitCode = 1; });
await page.goto(`${process.env.BASE ?? 'http://localhost:5183'}/scripts/og.html`);
await page.waitForSelector('svg.board');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('public/og.png');
