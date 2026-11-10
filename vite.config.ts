import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gamePage, homeHead, notFound, robots, siteOf, sitemap, withSeo } from './scripts/pages.ts';
import { GAME_PATHS, gameFromPath } from './src/seo.ts';

// Search and link previews need absolute URLs. Set SITE_URL at build time (the
// deploy workflow and vercel.json do) to fill in canonical links, og:image,
// the sitemap and structured data; without it they are left out.
const site = siteOf(process.env.SITE_URL);

/**
 * Head tags for the home page, one real page per game (dist/trace/index.html
 * and friends), plus robots.txt, sitemap.xml and 404.html.
 * The dev server answers /trace/ with the same page, so `npm run dev` works.
 */
const pages = (): Plugin => {
  let config: ResolvedConfig;
  let fontFile: string | undefined;
  return {
    name: 'gamedin-pages',
    configResolved(c) { config = c; },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const id = ctx.server ? gameFromPath((ctx.originalUrl ?? '').split(/[?#]/)[0]) : null;
        fontFile = Object.keys(ctx.bundle ?? {}).map((f) => f.replace('assets/', '')).find((f) => /^schibsted-grotesk-latin-wght-normal.*\.woff2$/.test(f)) ?? fontFile;
        const out = id ? gamePage(html, id, site, false) : withSeo(html, homeHead(site));
        // the app's own font, fetched while the stylesheet loads
        const preload = fontFile ? [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `./assets/${fontFile}` }, injectTo: 'head' as const }] : [];
        return { html: out, tags: preload };
      },
    },
    closeBundle() {
      if (config.command !== 'build') return;
      const dist = join(config.root, config.build.outDir);
      const home = readFileSync(join(dist, 'index.html'), 'utf8');
      for (const id of GAME_PATHS) {
        mkdirSync(join(dist, id), { recursive: true });
        writeFileSync(join(dist, id, 'index.html'), gamePage(home, id, site, true));
      }
      const mark = readFileSync(join(config.root, 'public/favicon.svg'), 'utf8').replace('<svg ', '<svg width="32" height="32" aria-hidden="true" ');
      writeFileSync(join(dist, '404.html'), notFound(site, fontFile, mark));
      writeFileSync(join(dist, 'robots.txt'), robots(site));
      if (site) writeFileSync(join(dist, 'sitemap.xml'), sitemap(site, new Date().toISOString().slice(0, 10)));
    },
  };
};

export default defineConfig({ plugins: [react(), pages()], base: './', build: { target: 'es2022' }, worker: { format: 'es' } });
