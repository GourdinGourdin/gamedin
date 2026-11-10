// Checks the production build the way a host serves it: under a sub-path
// (/gamedin/, like GitHub Pages), installable, and playable offline.
//   npm run build && node scripts/check-dist.ts
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { launch } from './chromium.ts';

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const url = new URL(req.url!, 'http://x');
  if (!url.pathname.startsWith('/gamedin/')) { res.writeHead(404).end(); return; }
  let file = normalize(join('dist', decodeURIComponent(url.pathname.slice('/gamedin/'.length))));
  if (!file.startsWith('dist')) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(5190);
const BASE = 'http://localhost:5190/gamedin/';

let failed = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE);
await page.waitForSelector('.cover svg');
check(await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active), 'service worker installed');
await page.reload();
await page.waitForSelector('.cover svg');
check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');

const cdp = await ctx.newCDPSession(page);
const all = (await cdp.send('Page.getInstallabilityErrors') as { installabilityErrors: { errorId: string }[] }).installabilityErrors;
// test browsers run in private mode, where Chrome never offers installing; any other reason is real
const installabilityErrors = all.filter((e) => e.errorId !== 'in-incognito');
check(installabilityErrors.length === 0, `installable as an app ${installabilityErrors.map((e) => e.errorId).join(', ')}`);
const { url: manifestUrl } = await cdp.send('Page.getAppManifest') as { url: string };
check(manifestUrl.startsWith(BASE), 'manifest found under the sub-path');

await ctx.setOffline(true);
await page.reload();
await page.waitForSelector('.cover svg', { timeout: 8000 });
check(true, 'home screen loads offline');
await page.click('.game.g-crowns .btn-primary');
await page.waitForSelector('.stage svg.board', { timeout: 8000 });
check(true, 'a new puzzle generates offline');
await page.goto(`${BASE}#/play/wind/5/hard/offline1`);
await page.waitForSelector('.stage svg.board', { timeout: 8000 });
check(true, 'a deep link opens offline');
await ctx.setOffline(false);

for (const f of ['og.png', 'icon-512.png', 'manifest.webmanifest']) check((await page.request.get(BASE + f)).ok(), `${f} is served`);
check(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
