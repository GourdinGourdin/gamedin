// Writes dist/sw.js after a build: caches every built file so the app works offline.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const files = [];
const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (f !== 'sw.js') files.push(relative('dist', p)); } };
walk('dist');
const version = createHash('sha1').update(files.join('|') + Date.now()).digest('hex').slice(0, 10);
writeFileSync('dist/sw.js', `const CACHE = 'gamedin-${version}';
const FILES = ${JSON.stringify(['./', ...files.filter((f) => f !== 'index.html').map((f) => `./${f}`)])};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
`);
console.log(`dist/sw.js: ${files.length} files cached, version ${version}`);
