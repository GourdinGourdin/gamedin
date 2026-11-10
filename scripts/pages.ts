// Builds the head tags, prerendered text and extra files for every page.
// Used by vite.config.ts at build time (and by the dev server for /trace/ etc.).
import { META, GAME_IDS } from '../src/games.ts';
import { GAME_PATHS, HOME_SEO, SEO } from '../src/seo.ts';
import type { GameId } from '../src/engine/index.ts';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

/** Normalises SITE_URL to end with a slash. Empty when unset. */
export const siteOf = (raw: string | undefined) => (raw ? raw.replace(/\/?$/, '/') : '');

const common = (title: string, description: string, ogTitle: string, ogDescription: string, ogAlt: string, url: string, image: string, site: string) => [
  `<title>${esc(title)}</title>`,
  `<meta name="description" content="${esc(description)}">`,
  site && `<link rel="canonical" href="${url}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="GamedIn">`,
  `<meta property="og:locale" content="en">`,
  `<meta property="og:title" content="${esc(ogTitle)}">`,
  `<meta property="og:description" content="${esc(ogDescription)}">`,
  site && `<meta property="og:url" content="${url}">`,
  site && `<meta property="og:image" content="${image}">`,
  `<meta property="og:image:type" content="image/png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="${esc(ogAlt)}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${esc(ogTitle)}">`,
  `<meta name="twitter:description" content="${esc(ogDescription)}">`,
  site && `<meta name="twitter:image" content="${image}">`,
  `<meta name="twitter:image:alt" content="${esc(ogAlt)}">`,
].filter(Boolean).join('\n');

export function homeHead(site: string): string {
  const ld = site && json({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${site}#website`, name: 'GamedIn', url: site, description: HOME_SEO.description, inLanguage: 'en' },
      {
        '@type': 'ItemList', name: 'GamedIn puzzles', itemListOrder: 'https://schema.org/ItemListOrderAscending', numberOfItems: GAME_PATHS.length,
        itemListElement: GAME_PATHS.map((id, i) => ({ '@type': 'ListItem', position: i + 1, name: META[id].name, url: `${site}${id}/` })),
      },
    ],
  });
  return [common(HOME_SEO.title, HOME_SEO.description, HOME_SEO.ogTitle, HOME_SEO.ogDescription, HOME_SEO.ogAlt, site, `${site}og.png`, site), ld].filter(Boolean).join('\n');
}

export function gameHead(id: GameId, site: string): string {
  const s = SEO[id], m = META[id], url = `${site}${id}/`, image = `${site}og-${id}.png`;
  const alt = `${m.name}: a solved board`;
  const ld = site && json([
    {
      '@context': 'https://schema.org', '@type': 'WebApplication', name: m.name, url, image, description: s.description,
      applicationCategory: 'GameApplication', genre: 'Puzzle', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', inLanguage: 'en',
      isAccessibleForFree: true, offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      isPartOf: { '@type': 'WebSite', name: 'GamedIn', url: site },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GamedIn', item: site },
        { '@type': 'ListItem', position: 2, name: m.name, item: url },
      ],
    },
  ]);
  return [common(s.title, s.description, s.title.replace(' | GamedIn', ''), s.description, alt, url, image, site), ld].filter(Boolean).join('\n');
}

/** Text a crawler or a reader without scripts sees before the app takes over. Same class names as GamePage. */
export function gamePrerender(id: GameId): string {
  const s = SEO[id], m = META[id];
  return `<div class="page gp g-${id}">
<header class="top"><a class="icon-btn" href="../" aria-label="All games"></a><a class="brand" href="../"><span>GamedIn</span></a></header>
<main>
<section class="gp-hero"><div class="gp-head"><h1>${esc(m.name)}</h1><p class="gp-pitch">${esc(s.pitch)}</p></div></section>
<section class="gp-section"><h2>How to play</h2><ol class="gp-how">${m.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol></section>
<section class="gp-section"><h2>About ${esc(m.name)}</h2><p class="gp-about">${esc(s.about)}</p></section>
<section class="gp-section"><h2>More puzzles</h2><ul class="gp-more">${GAME_IDS.filter((g) => g !== id).map((g) => `<li><a href="../${g}/">${esc(META[g].name)}</a></li>`).join('')}</ul></section>
</main>
<footer class="foot"><p>An independent project. Not affiliated with LinkedIn.</p></footer>
</div>`;
}

const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/;
export const withSeo = (html: string, head: string) => html.replace(SEO_BLOCK, () => `<!--seo-->\n${head}\n<!--/seo-->`);

/** Turns the built home page into one game's page, which lives one folder deeper. */
export function gamePage(homeHtml: string, id: GameId, site: string, deeper: boolean): string {
  let html = withSeo(homeHtml, gameHead(id, site));
  html = html.replace('<div id="root"></div>', () => `<div id="root">${gamePrerender(id)}</div>`);
  if (deeper) html = html.replace(/(href|src)="\.\//g, '$1="../');
  return html;
}

export function robots(site: string): string {
  return `User-agent: *\nAllow: /\n${site ? `\nSitemap: ${site}sitemap.xml\n` : ''}`;
}

export function sitemap(site: string, day: string): string {
  const urls = [site, ...GAME_PATHS.map((g) => `${site}${g}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u, i) => `  <url><loc>${u}</loc><lastmod>${day}</lastmod><changefreq>${i ? 'monthly' : 'weekly'}</changefreq><priority>${i ? '0.8' : '1.0'}</priority></url>`).join('\n')}\n</urlset>\n`;
}

/** Served by GitHub Pages and Vercel for unknown paths, at any depth, so every link is absolute. */
export function notFound(site: string, fontFile: string | undefined, mark: string): string {
  const home = site || '/';
  const font = fontFile ? `@font-face{font-family:'Schibsted Grotesk Variable';font-style:normal;font-display:swap;font-weight:400 900;src:url(${site || '/'}assets/${fontFile}) format('woff2')}` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | GamedIn</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#F7F0E1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17130F" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${home}favicon.svg" type="image/svg+xml">
<style>
${font}
:root{--bg:#F7F0E1;--surface:#FFFBF3;--ink:#231E18;--ink-2:#4E463B;--line:#E4D9C4;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#17130F;--surface:#221D18;--ink:#F3EBDD;--ink-2:#D0C5B3;--line:#372F27;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px 16px;background:var(--bg);color:var(--ink);font:400 16px/1.45 'Schibsted Grotesk Variable',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
main{width:min(100%,440px);background:var(--surface);border-radius:22px;padding:28px 24px;box-shadow:0 1px 0 rgba(35,30,24,.06),inset 0 0 0 1px var(--line);display:grid;gap:14px;justify-items:start}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;letter-spacing:-.02em}
.brand svg{display:block;border-radius:25%}
h1{margin:6px 0 0;font-size:clamp(34px,9vw,44px);line-height:1;letter-spacing:-.035em;font-weight:800}
p{margin:0;color:var(--ink-2);font-size:17px;max-width:32ch}
a.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:14px;background:var(--ink);color:var(--bg);font-weight:650;text-decoration:none}
a.btn:hover{background:var(--ink-2)}
:focus-visible{outline:2.5px solid var(--ink);outline-offset:2px;border-radius:6px}
</style>
</head>
<body>
<main>
<div class="brand">${mark}GamedIn</div>
<h1>Page not found</h1>
<p>That address does not lead to a puzzle. Five are waiting on the home page.</p>
<a class="btn" href="${home}">Go to GamedIn</a>
</main>
</body>
</html>
`;
}
