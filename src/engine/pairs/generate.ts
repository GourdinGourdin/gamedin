// Pairs generator: a random full grid, then clues are removed for as long as
// the puzzle can still be finished by logic at the wanted level.
import { makeRng, randInt, shuffle } from '../rng.ts';
import type { Difficulty, Grade } from '../types.ts';
import { gradePairs } from './logic.ts';
import { solvePairs, type PairsPuzzle } from './solve.ts';

export interface PairsGame { puzzle: PairsPuzzle; solution: number[]; grade: Grade }
export const PAIRS_SIZES = [6];
const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

type Clue = [0, number] | [1, number, number];
const key = (k: Clue) => k.join(',');

/** Hand-set boards place their clues in patterns. Each clue comes with its
 *  mirror or rotated twin, and a pair is kept or removed together. */
function partner(N: number, sym: number, c: number): number {
  const r = Math.floor(c / N), q = c % N;
  if (sym === 0) return (N - 1 - r) * N + (N - 1 - q); // half turn
  if (sym === 1) return r * N + (N - 1 - q); // left-right mirror
  if (sym === 2) return (N - 1 - r) * N + q; // top-bottom mirror
  return q * N + r; // diagonal mirror
}
function twin(N: number, sym: number, k: Clue): Clue {
  if (k[0] === 0) return [0, partner(N, sym, k[1])];
  const a = partner(N, sym, k[1]), b = partner(N, sym, k[2]);
  return [1, Math.min(a, b), Math.max(a, b)];
}

export function generatePairs(size: number, difficulty: Difficulty, seed: string): PairsGame {
  const r = makeRng(`pairs/${size}/${difficulty}/${seed}`);
  const N = size, maxLevel = difficulty === 'easy' ? 2 : 3;
  let best: PairsGame | null = null, bestGap = 9;
  for (let attempt = 0; attempt < 60; attempt++) {
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
    const sym = randInt(r, 4);
    const all: Clue[] = [];
    for (let c = 0; c < N * N; c++) {
      all.push([0, c]);
    }
    // only some cell borders may carry a sign, so shapes do most of the work
    for (let c = 0; c < N * N; c++) {
      if (c % N < N - 1 && r() < 0.3) all.push([1, c, c + 1]);
      if (c + N < N * N && r() < 0.3) all.push([1, c, c + N]);
    }
    // group clues with their twins, then drop groups while logic still solves it
    const seen = new Set<string>(), groups: Clue[][] = [];
    for (const k of shuffle(r, all)) {
      if (seen.has(key(k))) continue;
      const t = twin(N, sym, k), g = key(t) === key(k) ? [k] : [k, t];
      g.forEach((x) => seen.add(key(x)));
      groups.push(g);
    }
    let used = groups;
    for (let i = used.length - 1; i >= 0; i--) {
      const without = used.slice(0, i).concat(used.slice(i + 1));
      if (gradePairs(build(without.flat()), maxLevel).solved) used = without;
    }
    const puzzle = build(used.flat()), grade = gradePairs(puzzle);
    if (!grade.solved) continue;
    // keep the look of the daily boards: a handful of shapes and a few signs
    const nGiven = Object.keys(puzzle.given).length, nEdge = puzzle.edges.length;
    if ((nGiven < 4 || nEdge < 2 || nGiven + nEdge > 16) && attempt < 45) continue;
    const gap = Math.abs(ORDER.indexOf(grade.difficulty) - ORDER.indexOf(difficulty));
    if (gap < bestGap) { best = { puzzle, solution, grade }; bestGap = gap; }
    if (gap === 0) break;
  }
  if (!best) throw new Error('pairs: no puzzle found');
  return best;
}
