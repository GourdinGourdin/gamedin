// Renders the PNG app icons from public/icon.svg.   node scripts/icons.ts
import { readFileSync } from 'node:fs';
import { launch } from './chromium.ts';

const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await launch();
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // full-bleed square: phones round the corners themselves
  await page.setContent(`<body style="margin:0;background:#15171C">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: `public/icon-${size}.png` });
  await page.close();
}
await browser.close();
