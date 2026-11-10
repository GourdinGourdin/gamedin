// Plays every game in a real browser with mouse input, checks it is recognised
// as solved, and saves screenshots to shots/.
//   npm run e2e            (needs the dev server or a preview on BASE)
import { mkdirSync } from 'node:fs';
import { launch } from './chromium.ts';
import { GAMES, type GameId } from '../src/engine/index.ts';
import { rectCells } from '../src/engine/plots/solve.ts';

const BASE = process.env.BASE ?? 'http://localhost:5183';
const SPECS: [GameId, number, 'easy' | 'medium' | 'hard'][] = [['trace', 7, 'medium'], ['crowns', 8, 'medium'], ['pairs', 6, 'hard'], ['plots', 6, 'hard'], ['wind', 5, 'medium']];
mkdirSync('shots', { recursive: true });

const browser = await launch();
let failed = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

for (const [name, viewport, scheme] of [['phone', { width: 390, height: 844 }, 'light'], ['desktop', { width: 1280, height: 800 }, 'dark']] as const) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`${BASE}/#/`);
  await page.waitForSelector('.cover svg');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/${name}-home.png`, fullPage: true });

  for (const [game, size, difficulty] of SPECS) {
    const seed = 'e2e1', g = GAMES[game].generate(size, difficulty, seed);
    await page.goto(`${BASE}/#/play/${game}/${size}/${difficulty}/${seed}`);
    await page.waitForSelector('.stage svg.board');
    const how = page.locator('.sheet .btn-primary');
    if (await how.count()) { await page.waitForTimeout(300); await page.screenshot({ path: `shots/${name}-${game}-rules.png` }); await how.click(); }
    await page.waitForTimeout(200);
    await page.screenshot({ path: `shots/${name}-${game}-start.png` });

    // hint, then undo back to the start
    await page.click('.tools button:nth-child(2)');
    check(await page.locator('.hint').count() === 1, `${name} ${game}: hint appears`);
    await page.screenshot({ path: `shots/${name}-${game}-hint.png` });
    await page.click('.hint .btn-primary');
    await page.click('.tools button:nth-child(1)');

    const cols = game === 'plots' || game === 'trace' || game === 'wind' ? g.puzzle.cols : g.puzzle.size;
    const at = async (cell: number) => {
      const b = (await page.locator('.stage svg.board').boundingBox())!, k = b.width / (cols * 100 + 12);
      return [b.x + (6 + (cell % cols) * 100 + 50) * k, b.y + (6 + Math.floor(cell / cols) * 100 + 50) * k] as const;
    };
    const tap = async (cell: number, times = 1) => { const [x, y] = await at(cell); for (let i = 0; i < times; i++) await page.mouse.click(x, y); };
    const drag = async (cells: number[]) => {
      const [x, y] = await at(cells[0]);
      await page.mouse.move(x, y); await page.mouse.down();
      for (const c of cells.slice(1)) { const [mx, my] = await at(c); await page.mouse.move(mx, my, { steps: 3 }); }
      await page.mouse.up();
    };
    let mid = false;
    const midShot = async () => { if (!mid) { mid = true; await page.screenshot({ path: `shots/${name}-${game}-mid.png` }); } };
    if (game === 'crowns') {
      for (let r = 0; r < size; r++) { await tap(r * size + g.solution[r], 2); if (r === 3) await midShot(); }
    } else if (game === 'pairs') {
      for (let i = 0; i < size * size; i++) { if (!(i in g.puzzle.given)) await tap(i, g.solution[i] + 1); if (i === 18) await midShot(); }
    } else if (game === 'plots') {
      for (const [i, r] of g.solution.entries()) { const cells = rectCells(cols, r); await drag([cells[0], cells[cells.length - 1]]); if (i === 3) await midShot(); }
    } else if (game === 'trace') {
      await drag(g.solution.slice(0, 20)); await midShot(); await drag(g.solution.slice(19));
    } else {
      for (const [i, path] of g.solution.paths.entries()) { await drag(path); if (i === 1) await midShot(); }
    }
    await page.waitForTimeout(700);
    check(await page.locator('.result').count() === 1, `${name} ${game}: solved by mouse input`);
    await page.screenshot({ path: `shots/${name}-${game}-solved.png` });
  }
  // the daily puzzle: solve Crowns by keyboard, then the home screen marks it done
  {
    const d = new Date(), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const wd = d.getDay(), difficulty = wd === 1 || wd === 2 ? 'easy' : wd === 0 || wd === 6 ? 'hard' : 'medium';
    const { dailySpec } = await import('../src/games.ts');
    const spec = dailySpec('crowns', day), g = GAMES.crowns.generate(spec.size, spec.difficulty, spec.seed);
    void difficulty;
    await page.goto(`${BASE}/#/daily/crowns`);
    await page.waitForSelector('.stage svg.board');
    await page.focus('.stage svg.board');
    let col = 0;
    for (let r = 0; r < spec.size; r++) {
      const want = g.solution[r];
      for (; col < want; col++) await page.keyboard.press('ArrowRight');
      for (; col > want; col--) await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Space'); await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(500);
    check(await page.locator('.result').count() === 1, `${name} daily crowns: solved by keyboard`);
    await page.goto(`${BASE}/#/`);
    await page.waitForTimeout(300);
    check(await page.locator('.game-actions .is-done').count() === 1, `${name}: home marks the daily as done`);
  }
  await page.goto(`${BASE}/#/stats`);
  await page.waitForTimeout(300);
  check(await page.locator('.stat').count() === 5, `${name}: stats list all five games`);
  await page.screenshot({ path: `shots/${name}-stats.png`, fullPage: true });
  await page.goto(`${BASE}/#/`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `shots/${name}-home-after.png`, fullPage: true });
  check(errors.length === 0, `${name}: no console errors ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
