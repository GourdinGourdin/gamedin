// Captures scene.html frame by frame and encodes out/gamedin-silent.mp4 (then: node mix.mjs).
// Needs the app's dev server:  npm run dev -- --port 5183   (in the project root)
// Usage: node render.mjs [fps=30] [--stills t1,t2,...]
import { chromium } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const stills = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;
const fps = Number(args.find((a) => /^\d+$/.test(a)) ?? 30);
const URL = (process.env.BASE ?? 'http://localhost:5183') + '/video/scene.html?render=1';
const OUT = join(import.meta.dirname, 'out');
mkdirSync(OUT, { recursive: true });

const cache = join(homedir(), 'Library/Caches/ms-playwright');
const executablePath = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
  .map((d) => join(cache, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')).find(existsSync);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(URL);
await page.waitForFunction(() => typeof window.renderAt === 'function');
await page.evaluate(() => document.fonts.ready);
const shot = async (t, type) => { await page.evaluate((x) => window.renderAt(x), t); return page.screenshot({ type, quality: type === 'jpeg' ? 95 : undefined }); };

if (stills) {
  const { writeFileSync } = await import('node:fs');
  for (const t of stills) writeFileSync(join(OUT, `still-${t}.png`), await shot(t, 'png'));
  await browser.close();
  console.log('stills written');
  process.exit();
}
const duration = await page.evaluate(() => window.DURATION), total = Math.round(duration * fps);
const out = join(OUT, 'gamedin-silent.mp4');
const ff = spawn(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-r', String(fps), '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  if (!ff.stdin.write(await shot(i / fps, 'jpeg'))) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`frame ${i}/${total}`);
}
ff.stdin.end();
const code = await new Promise((r) => ff.on('close', r));
await browser.close();
if (code !== 0) { console.error('ffmpeg failed'); process.exit(1); }
console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
