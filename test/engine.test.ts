import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAMES } from '../src/engine/index.ts';
import { DIFFICULTIES } from '../src/engine/types.ts';
import { makeRng } from '../src/engine/rng.ts';
import { checkCrowns } from '../src/engine/crowns/solve.ts';
import { gradeCrowns } from '../src/engine/crowns/logic.ts';
import { checkPairs } from '../src/engine/pairs/solve.ts';
import { gradePairs } from '../src/engine/pairs/logic.ts';
import { checkPlots } from '../src/engine/plots/solve.ts';
import { gradePlots } from '../src/engine/plots/logic.ts';
import { checkTrace } from '../src/engine/trace/solve.ts';
import { checkWind } from '../src/engine/wind/solve.ts';
import { windDict } from '../src/engine/wind/generate.ts';
import { THEMES } from '../src/engine/wind/themes.ts';

const PER = +(process.env.PUZZLES ?? 6);
const check: Record<string, (p: any, s: any) => boolean> = {
  crowns: checkCrowns, pairs: checkPairs, plots: checkPlots, trace: checkTrace,
  wind: (p, s) => checkWind(p, s.paths, windDict()),
};
const logic: Record<string, (p: any) => { solved: boolean }> = { crowns: gradeCrowns, pairs: gradePairs, plots: gradePlots };

test('the seeded generator is repeatable', () => {
  const a = makeRng('abc'), b = makeRng('abc'), c = makeRng('abd');
  const x = [a(), a(), a()], y = [b(), b(), b()], z = [c(), c(), c()];
  assert.deepEqual(x, y);
  assert.notDeepEqual(x, z);
  assert.ok(x.every((v) => v >= 0 && v < 1));
});

for (const g of Object.values(GAMES)) {
  for (const size of g.sizes) {
    test(`${g.id} ${size}: valid, one solution, solvable by logic, repeatable`, () => {
      for (const d of DIFFICULTIES) {
        for (let i = 0; i < PER; i++) {
          const seed = `t${i}`, game = g.generate(size, d, seed);
          assert.ok(check[g.id](game.puzzle, game.solution), `${g.id} ${size} ${d} ${seed}: solution is valid`);
          assert.ok(g.isUnique(game.puzzle), `${g.id} ${size} ${d} ${seed}: one solution`);
          if (logic[g.id]) assert.ok(logic[g.id](game.puzzle).solved, `${g.id} ${size} ${d} ${seed}: no guessing needed`);
          if (i === 0) assert.deepEqual(g.generate(size, d, seed), game, 'same seed, same puzzle');
        }
      }
    });
  }
}

test('wind themes are usable', () => {
  assert.ok(THEMES.length >= 60);
  for (const t of THEMES) assert.ok(t.words.length >= 12, `${t.title} has ${t.words.length} words`);
});
