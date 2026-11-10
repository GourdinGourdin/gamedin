// Checks the production build the way a host serves it: under a sub-path
// (/gamedin/, like GitHub Pages), installable, and playable offline.
//   npm run build && node scripts/check-dist.ts
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { launch } from './chromium.ts';
import { GAME_IDS, META } from '../src/games.ts';
import { SEO } from '../src/seo.ts';

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = createServer((req, res) => {
  const url = new URL(req.url!, 'http://x');
  if (!url.pathname.startsWith('/gamedin/')) { res.writeHead(404).end(); return; }
  let file = normalize(join('dist', decodeURIComponent(url.pathname.slice('/gamedin/'.length))));
  if (!file.startsWith('dist')) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: `${url.pathname}/` }).end(); return; }
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/html' }).end(readFileSync('dist/404.html')); return; }
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

// one real page per game
const SITE = (process.env.SITE_URL ?? '').replace(/\/?$/, '/');
const read = (f: string) => readFileSync(join('dist', f), 'utf8');
const seen = { titles: new Set<string>(), descriptions: new Set<string>() };
const failedRequests: string[] = [];
page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) failedRequests.push(`${r.status()} ${r.url()}`); });
for (const id of GAME_IDS) {
  const html = read(`${id}/index.html`);
  const attr = (re: RegExp) => re.exec(html)?.[1] ?? '';
  const title = attr(/<title>([^<]*)<\/title>/), desc = attr(/<meta name="description" content="([^"]*)"/).replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  check(title === SEO[id].title && title.startsWith(`${META[id].name}: `) && title.endsWith(' | GamedIn'), `${id}: title "${title}"`);
  check(desc.length >= 140 && desc.length <= 160, `${id}: description is ${desc.length} characters`);
  check(!seen.titles.has(title) && !seen.descriptions.has(desc), `${id}: title and description are unique`);
  seen.titles.add(title); seen.descriptions.add(desc);
  check(!/\u00B7/.test(html), `${id}: no middle dots`);
  check(html.includes(`<h1>${META[id].name}</h1>`) && html.includes(SEO[id].about.slice(0, 60)), `${id}: heading and text are in the HTML for crawlers`);
  check(/Not affiliated with LinkedIn/.test(html), `${id}: not-affiliated line`);
  check(html.includes('href="../assets/') && !html.includes('href="./') && !html.includes('src="./'), `${id}: assets point one folder up`);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1]!)].flat());
  if (SITE) {
    check(attr(/<link rel="canonical" href="([^"]*)"/) === `${SITE}${id}/`, `${id}: canonical`);
    check(attr(/<meta property="og:url" content="([^"]*)"/) === `${SITE}${id}/`, `${id}: og:url`);
    check(attr(/<meta property="og:image" content="([^"]*)"/) === `${SITE}og-${id}.png`, `${id}: og:image`);
    check(attr(/<meta property="og:title" content="([^"]*)"/) !== '' && attr(/<meta property="og:description" content="([^"]*)"/) !== '', `${id}: og:title and og:description`);
    const app = ld.find((x) => x['@type'] === 'WebApplication'), crumbs = ld.find((x) => x['@type'] === 'BreadcrumbList');
    check(!!app && app.isAccessibleForFree === true && app.offers?.price === 0 && app.genre === 'Puzzle' && app.url === `${SITE}${id}/` && app.image === `${SITE}og-${id}.png`, `${id}: WebApplication JSON-LD`);
    check(crumbs?.itemListElement?.length === 2 && crumbs.itemListElement[1].item === `${SITE}${id}/`, `${id}: BreadcrumbList JSON-LD`);
  }
  check(existsSync(join('dist', `og-${id}.png`)), `og-${id}.png is built`);

  await page.goto(`${BASE}${id}/`);
  await page.waitForSelector('.gp .cover svg');
  check(await page.locator('.gp h1').innerText() === META[id].name, `${id}: page renders its heading`);
  check(await page.locator('.gp-more a').count() === 4, `${id}: links to the other four games`);
  check(await page.evaluate(() => document.title) === SEO[id].title, `${id}: title in the browser`);
}
const withSlash = await page.request.get(`${BASE}trace`, { maxRedirects: 0 });
check(withSlash.status() === 301, 'a game folder without a slash redirects');
const missing = await page.request.get(`${BASE}nothing-here`);
check(missing.status() === 404 && (await missing.text()).includes('Go to GamedIn'), 'unknown paths get 404.html');

// a game page hands over to the app and back
await page.goto(`${BASE}crowns/`);
await page.waitForSelector('.gp .cover svg');
await page.click('.gp-actions .btn-primary');
await page.waitForSelector('.stage svg.board', { timeout: 8000 });
check(new URL(page.url()).pathname === '/gamedin/' && page.url().includes('#/play/crowns/'), 'Play leaves the game page for the app');
await page.goBack();
await page.waitForSelector('.gp h1');
check(new URL(page.url()).pathname === '/gamedin/crowns/', 'Back returns to the game page');
await page.goto(`${BASE}trace/#/play/crowns/11/hard/size11`);
await page.waitForSelector('.stage svg.board');
check(new URL(page.url()).pathname === '/gamedin/', 'a deep link on a game page opens the puzzle');
await page.goto(`${BASE}#/play/crowns/11/hard/size11`);
await page.waitForSelector('.stage svg.board');
check(true, 'Crowns 11x11 deep link opens');
await page.goto(BASE);
await page.waitForSelector('.cover svg');
check(await page.locator('a[href="trace/"], a[href="./trace/"]').count() > 0, 'home links to the game pages');

// home page
const home = read('index.html');
check(/<title>GamedIn: unlimited logic puzzles, free<\/title>/.test(home) && /<html lang="en">/.test(home), 'home: title and lang');
check(/rel="preload" as="font" type="font\/woff2" crossorigin="" href="\.\/assets\/schibsted-grotesk-latin-wght-normal/.test(home), 'home: font preload');
check(/media="\(prefers-color-scheme: dark\)"/.test(home) && /rel="manifest"/.test(home) && /rel="apple-touch-icon"/.test(home), 'home: theme colours, manifest, touch icon');
if (SITE) {
  const ld = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1]!)].flatMap((x) => x['@graph'] ?? [x]));
  const list = ld.find((x) => x['@type'] === 'ItemList');
  check(!!ld.find((x) => x['@type'] === 'WebSite') && list?.itemListElement.length === 5 && list.itemListElement.every((i: { url: string }, n: number) => i.url === `${SITE}${GAME_IDS[n]}/`), 'home: WebSite and ItemList JSON-LD');
  const map = read('sitemap.xml'), locs = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(locs.length === 6 && locs.includes(SITE) && GAME_IDS.every((g) => locs.includes(`${SITE}${g}/`)), 'sitemap.xml lists the home page and five games');
  check(read('robots.txt').includes(`Sitemap: ${SITE}sitemap.xml`), 'robots.txt points at the sitemap');
}
check(/Allow: \//.test(read('robots.txt')), 'robots.txt allows crawling');
check(existsSync('dist/404.html'), '404.html is built');
check(failedRequests.length === 0, `no failed requests ${failedRequests.slice(0, 3).join(' | ')}`);

// game pages work offline too
await page.goto(`${BASE}wind/`);
await page.reload();
await page.evaluate(async () => { await navigator.serviceWorker.ready; });
await ctx.setOffline(true);
await page.goto(`${BASE}pairs/`);
await page.waitForSelector('.gp .cover svg', { timeout: 8000 });
check(true, 'a game page loads offline');
await page.goto(`${BASE}plots/`);
await page.waitForSelector('.gp h1', { timeout: 8000 });
check(await page.locator('.gp h1').innerText() === 'Plots', 'another game page loads offline');
await ctx.setOffline(false);

for (const f of ['og.png', 'icon-512.png', 'manifest.webmanifest']) check((await page.request.get(BASE + f)).ok(), `${f} is served`);
check(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
