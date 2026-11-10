// Plots generator: cut the grid into random rectangles, put one clue in each,
// then hide clue details for as long as logic alone still solves it.
import { makeRng, randInt, shuffle, type Rng } from '../rng.ts';
import type { Difficulty, Grade } from '../types.ts';
import { gradePlots } from './logic.ts';
import { shapeOf, type PlotsClue, type PlotsPuzzle, type Rect } from './solve.ts';

export interface PlotsGame { puzzle: PlotsPuzzle; solution: Rect[]; grade: Grade }
export const PLOTS_SIZES = [5, 6, 7, 8];
/** A real 6x6 day had 6 pieces of 3 to 9 cells: pieces are big. */
const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

function partition(N: number, r: Rng): Rect[] | null {
  const used = new Uint8Array(N * N), rects: Rect[] = [];
  const maxArea = N <= 5 ? 9 : N <= 6 ? 12 : N <= 7 ? 14 : 16;
  for (let cell = 0; cell < N * N; cell++) {
    if (used[cell]) continue;
    const t = Math.floor(cell / N), l = cell % N;
    let maxW = 0;
    while (l + maxW < N && !used[cell + maxW]) maxW++;
    const opts: Rect[] = [];
    for (let w = 1; w <= maxW; w++) for (let h = 1; t + h <= N; h++) if (h * w >= 2 && h * w <= maxArea && h <= 4 && w <= 4) opts.push([t, l, h, w]);
    if (!opts.length) return null;
    // favour mid-sized pieces
    const weights = opts.map(([, , h, w]) => (h * w >= 4 && h * w <= 9 ? 3 : h * w < 4 ? 0.6 : 1.2) * (h === w ? 1.6 : 1) * (h === 1 || w === 1 ? 0.5 : 1));
    let x = r() * weights.reduce((a, b) => a + b, 0), rect = opts[0];
    for (let i = 0; i < opts.length; i++) { x -= weights[i]; if (x <= 0) { rect = opts[i]; break; } }
    for (let rr = rect[0]; rr < rect[0] + rect[2]; rr++) for (let cc = rect[1]; cc < rect[1] + rect[3]; cc++) used[rr * N + cc] = 1;
    rects.push(rect);
  }
  return rects;
}

export function generatePlots(size: number, difficulty: Difficulty, seed: string): PlotsGame {
  const r = makeRng(`plots/${size}/${difficulty}/${seed}`), N = size;
  let best: PlotsGame | null = null, bestGap = 9;
  for (let attempt = 0; attempt < 300; attempt++) {
    const rects = partition(N, r);
    if (!rects || rects.length < N - 1 || rects.length > N + 2) continue;
    const clues: PlotsClue[] = rects.map(([t, l, h, w]) => ({
      cell: (t + randInt(r, h)) * N + l + randInt(r, w), size: h * w, shape: shapeOf(h, w),
    }));
    const puzzle: PlotsPuzzle = { rows: N, cols: N, clues };
    if (!gradePlots(puzzle).solved) continue;
    // like the daily boards: every clue shows its shape, most hide their size;
    // hard boards also hide a few shapes
    const maxLevel = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    // real boards still show a number on about a third of the pieces
    const keep = Math.max(2, Math.round(clues.length / 3));
    for (const i of shuffle(r, [...clues.keys()])) {
      if (clues.filter((c) => c.size).length <= keep) break;
      const old = clues[i];
      clues[i] = { ...old, size: 0 };
      if (!gradePlots(puzzle, maxLevel).solved) clues[i] = old;
    }
    if (difficulty === 'hard') {
      for (const i of shuffle(r, [...clues.keys()]).slice(0, 2)) {
        const old = clues[i];
        clues[i] = { ...old, shape: 'any' };
        if (!gradePlots(puzzle, maxLevel).solved) clues[i] = old;
      }
    }
    const grade = gradePlots(puzzle);
    const gap = Math.abs(ORDER.indexOf(grade.difficulty) - ORDER.indexOf(difficulty));
    if (gap < bestGap) { best = { puzzle: { ...puzzle, clues: clues.slice() }, solution: rects, grade }; bestGap = gap; }
    if (gap === 0 || (attempt > 80 && best)) break;
  }
  if (!best) throw new Error('plots: no puzzle found');
  return best;
}
