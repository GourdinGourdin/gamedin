// Generates many puzzles per game and size, and reports speed and difficulty mix.
//   node scripts/bench.ts [game] [count]
import { GAMES } from '../src/engine/index.ts';
import type { Difficulty } from '../src/engine/types.ts';

const only = process.argv[2], count = +(process.argv[3] ?? 30);
for (const g of Object.values(GAMES)) {
  if (only && only !== 'all' && g.id !== only) continue;
  for (const size of g.sizes) {
    for (const want of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const times: number[] = [];
      let hit = 0, unique = 0;
      for (let i = 0; i < count; i++) {
        const t = performance.now();
        const game = g.generate(size, want, `bench${i}`);
        times.push(performance.now() - t);
        if (game.grade.difficulty === want) hit++;
        if (g.isUnique(game.puzzle)) unique++;
      }
      times.sort((a, b) => a - b);
      console.log(`${g.id.padEnd(7)} ${String(size).padStart(2)} ${want.padEnd(6)} on-target ${String(hit).padStart(3)}/${count}  unique ${unique}/${count}  median ${times[count >> 1].toFixed(0)} ms  p95 ${times[Math.floor(count * 0.95)].toFixed(0)} ms  max ${times[count - 1].toFixed(0)} ms`);
    }
  }
}
