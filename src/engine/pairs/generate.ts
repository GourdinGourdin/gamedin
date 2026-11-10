// Pairs generator: a random full grid, then clues are removed for as long as
// the puzzle can still be finished by logic at the wanted level.
import { makeRng, shuffle } from '../rng.ts';
import type { Difficulty, Grade } from '../types.ts';
import { gradePairs } from './logic.ts';
import { solvePairs, type PairsPuzzle } from './solve.ts';

export interface PairsGame { puzzle: PairsPuzzle; solution: number[]; grade: Grade }
export const PAIRS_SIZES = [4, 6, 8];
const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

type Clue = [0, number] | [1, number, number];

export function generatePairs(size: number, difficulty: Difficulty, seed: string): PairsGame {
  const r = makeRng(`pairs/${size}/${difficulty}/${seed}`);
  const N = size, maxLevel = difficulty === 'easy' ? 2 : 3;
  let best: PairsGame | null = null, bestGap = 9;
  for (let attempt = 0; attempt < 40; attempt++) {
    const solution = solvePairs({ size, given: {}, edges: [] }, { random: r })!;
    const build = (cs: Clue[]): PairsPuzzle => {
      const given: Record<number, number> = {};
      const edges: PairsPuzzle['edges'] = [];
      for (const k of cs) {
        if (k[0] === 0) given[k[1]] = solution[k[1]];
        else edges.push([k[1], k[2], solution[k[1]] === solution[k[2]] ? '=' : 'x']);
      }
      return { size, given, edges };
    };
    // candidate clues: every cell, and a share of the links
    const all: Clue[] = [];
    for (let c = 0; c < N * N; c++) {
      all.push([0, c]);
      if (c % N < N - 1 && r() < 0.5) all.push([1, c, c + 1]);
      if (c + N < N * N && r() < 0.5) all.push([1, c, c + N]);
    }
    shuffle(r, all);
    let used = all;
    for (let i = used.length - 1; i >= 0; i--) {
      const without = used.slice(0, i).concat(used.slice(i + 1));
      if (gradePairs(build(without), maxLevel).solved) used = without;
    }
    const puzzle = build(used), grade = gradePairs(puzzle);
    if (!grade.solved) continue;
    const gap = Math.abs(ORDER.indexOf(grade.difficulty) - ORDER.indexOf(difficulty));
    if (gap < bestGap) { best = { puzzle, solution, grade }; bestGap = gap; }
    if (gap === 0) break;
  }
  if (!best) throw new Error('pairs: no puzzle found');
  return best;
}
