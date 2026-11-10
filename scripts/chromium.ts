// Launches Playwright's cached Chromium (dev only). Override with CHROMIUM_PATH.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

export async function launch() {
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  const found: string[] = process.env.CHROMIUM_PATH ? [process.env.CHROMIUM_PATH] : [];
  try {
    for (const d of readdirSync(cache).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
      found.push(join(cache, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'));
      found.push(join(cache, d, 'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'));
      found.push(join(cache, d, 'chrome-linux/chrome'));
    }
  } catch { /* no cache */ }
  const executablePath = found.find(existsSync);
  if (!executablePath) throw new Error('No Chromium found. Run `npx playwright install chromium` or set CHROMIUM_PATH.');
  return chromium.launch({ executablePath, headless: true });
}
