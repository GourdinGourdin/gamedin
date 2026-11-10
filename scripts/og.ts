// Renders public/og.png (home) and public/og-<game>.png from scripts/og.html. Needs the dev server on :5183.   node scripts/og.ts
import { launch } from './chromium.ts';
import { GAME_IDS } from '../src/games.ts';

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
page.on('pageerror', (e) => { console.error(e.message); process.exitCode = 1; });
const base = process.env.BASE ?? 'http://localhost:5183';
for (const [game, file] of [[null, 'og.png'], ...GAME_IDS.map((g) => [g, `og-${g}.png`] as const)] as const) {
  await page.goto(`${base}/scripts/og.html${game ? `?game=${game}` : ''}`);
  await page.waitForSelector('svg.board');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `public/${file}` });
  console.log(`public/${file}`);
}
await browser.close();
