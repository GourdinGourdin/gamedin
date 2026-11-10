import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Link previews need absolute URLs. Set SITE_URL at build time (the deploy
// workflow does) to fill in og:url and og:image; without it they are left out.
const site = (process.env.SITE_URL ?? '').replace(/\/?$/, '/');
const meta: Plugin = {
  name: 'gamedin-meta',
  transformIndexHtml: (html) => html.replace('<!--meta-->', site !== '/'
    ? `<link rel="canonical" href="${site}">\n<meta property="og:url" content="${site}">\n<meta property="og:image" content="${site}og.png">\n<meta name="twitter:image" content="${site}og.png">`
    : ''),
};

export default defineConfig({ plugins: [react(), meta], base: './', build: { target: 'es2022' }, worker: { format: 'es' } });
