// Crowns generator: place the crowns, grow one colour region around each, then
// move border cells until exactly one solution is left.
import { makeRng, randInt, shuffle, type Rng } from '../rng.ts';
import type { Difficulty, Grade } from '../types.ts';
import { gradeCrowns } from './logic.ts';
import { solveAllCrowns, type CrownsPuzzle } from './solve.ts';

export interface CrownsGame { puzzle: CrownsPuzzle; /** crown column per row */ solution: number[]; grade: Grade }

function randomCrowns(N: number, r: Rng): number[] | null {
  const cols: number[] = [], used = new Uint8Array(N);
  const go = (row: number): boolean => {
    if (row === N) return true;
    for (const c of shuffle(r, [...Array(N).keys()])) {
      if (used[c] || (row > 0 && Math.abs(cols[row - 1] - c) <= 1)) continue;
      used[c] = 1; cols[row] = c;
      if (go(row + 1)) return true;
      used[c] = 0;
    }
    return false;
  };
  return go(0) ? cols : null;
}

function neighbours(N: number, i: number): number[] {
  const out: number[] = [], r = Math.floor(i / N), c = i % N;
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
}

// Region style, measured on 608 past daily boards. Sorted region sizes on an
// 8x8 board average 23, 11, 8, 6, 5, 4, 3.5, 2.6 cells: one big region that
// wraps around the others, one medium, the rest small, and a one-cell region
// on about one board in four. Borders are irregular (about 0.72 border edges
// per cell): blocks, bars along a row or column and winding strips mixed.
const PROFILE = [0.36, 0.17, 0.12, 0.1, 0.08, 0.07, 0.055, 0.04];

function targets(N: number, r: Rng): number[] {
  const t: number[] = [];
  for (let k = 0; k < N; k++) {
    const x = (k / (N - 1)) * (PROFILE.length - 1), i = Math.min(PROFILE.length - 2, Math.floor(x));
    const f = PROFILE[i] + (PROFILE[i + 1] - PROFILE[i]) * (x - i);
    t.push(f * (8 / N) * (0.75 + 0.5 * r()));
  }
  const sum = t.reduce((a, b) => a + b, 0);
  return t.map((f) => Math.max(1, Math.round((f / sum) * N * N)));
}

type Style = 'block' | 'bar' | 'wind' | 'free';

function growRegions(N: number, cols: number[], r: Rng): number[] {
  const reg = new Array<number>(N * N).fill(-1), size = new Array<number>(N).fill(1);
  const goal = shuffle(r, targets(N, r));
  if (r() < 0.25) goal[goal.indexOf(Math.min(...goal))] = 1;
  const style: Style[] = goal.map((g) => {
    if (g <= 1) return 'free';
    const x = r();
    return g >= N * N * 0.25 ? (x < 0.75 ? 'wind' : 'free') : x < 0.3 ? 'block' : x < 0.55 ? 'bar' : 'wind';
  });
  const axis = cols.map(() => 1 + randInt(r, 2));
  cols.forEach((c, row) => { reg[row * N + c] = row; });
  const inside = (i: number, k: number) => neighbours(N, i).filter((j) => reg[j] === k).length;
  for (let left = N * N - N; left > 0; left--) {
    // which region grows: the one furthest below its goal, weighted
    const front: number[][] = Array.from({ length: N }, () => []);
    for (let i = 0; i < N * N; i++) {
      if (reg[i] !== -1) continue;
      for (const j of neighbours(N, i)) if (reg[j] !== -1 && !front[reg[j]].includes(i)) front[reg[j]].push(i);
    }
    const want = front.map((f, k) => (f.length ? Math.max(0.02, goal[k] - size[k]) ** 1.5 : 0));
    let x = r() * want.reduce((a, b) => a + b, 0), k = want.findIndex((w) => w > 0);
    for (let q = 0; q < N; q++) { x -= want[q]; if (want[q] > 0 && x <= 0) { k = q; break; } }
    const opts = front[k].map((i) => {
      const n = inside(i, k);
      let w = 1;
      if (style[k] === 'block') w = n >= 2 ? 6 : 1;
      else if (style[k] === 'wind') w = n >= 2 ? 0.25 : 1;
      else if (style[k] === 'bar') {
        const along = neighbours(N, i).some((j) => reg[j] === k && (Math.abs(i - j) === 1 ? 1 : 2) === axis[k]);
        w = along ? 6 : 0.3;
      }
      return [i, w] as const;
    });
    let y = r() * opts.reduce((a, o) => a + o[1], 0), cell = opts[opts.length - 1][0];
    for (const [i, w] of opts) { y -= w; if (y <= 0) { cell = i; break; } }
    reg[cell] = k;
    size[k]++;
  }
  return reg;
}

/** Is region k still one piece without `cell`? */
function staysConnected(N: number, reg: number[], k: number, cell: number): boolean {
  const cells: number[] = [];
  for (let i = 0; i < N * N; i++) if (reg[i] === k && i !== cell) cells.push(i);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), stack = [cells[0]];
  while (stack.length) {
    for (const j of neighbours(N, stack.pop()!)) {
      if (j !== cell && reg[j] === k && !seen.has(j)) { seen.add(j); stack.push(j); }
    }
  }
  return seen.size === cells.length;
}

/** One board with a unique solution, or null if this attempt did not converge. */
export function buildCrowns(N: number, r: Rng): { puzzle: CrownsPuzzle; solution: number[] } | null {
  const cols = randomCrowns(N, r);
  if (!cols) return null;
  const reg = growRegions(N, cols, r);
  for (let step = 0; step < 60 * N; step++) {
    const sols = solveAllCrowns({ size: N, regions: reg }, 2);
    const alt = sols.find((s) => s.some((c, row) => c !== cols[row]));
    if (!alt) return sols.length === 1 ? { puzzle: { size: N, regions: reg }, solution: cols } : null;
    // Break the other solution: hand one of its crown cells to a neighbouring
    // region, which then holds two of its crowns.
    const moves: [number, number][] = [];
    for (let row = 0; row < N; row++) {
      if (alt[row] === cols[row]) continue;
      const cell = row * N + alt[row], k = reg[cell];
      if (!staysConnected(N, reg, k, cell)) continue;
      for (const j of neighbours(N, cell)) if (reg[j] !== k) moves.push([cell, reg[j]]);
    }
    if (!moves.length) return null;
    const [cell, k] = moves[randInt(r, moves.length)];
    reg[cell] = k;
  }
  return null;
}

/** Shape check against the past boards: few tiny regions, irregular borders. */
function looksGood(p: CrownsPuzzle, r: Rng, loose: boolean): boolean {
  const N = p.size, R = p.regions, size = new Array<number>(N).fill(0);
  for (const k of R) size[k]++;
  const ones = size.filter((s) => s === 1).length, small = size.filter((s) => s <= 3).length;
  if (ones > 1 || (ones === 1 && !loose && r() < 0.5) || small > (N >= 8 && !loose ? 2 : 3)) return false;
  let border = 0;
  for (let i = 0; i < N * N; i++) {
    if (i % N < N - 1 && R[i] !== R[i + 1]) border++;
    if (i < N * N - N && R[i] !== R[i + N]) border++;
  }
  return border / (N * N) >= (loose ? 0.56 : 0.62);
}

export const CROWNS_SIZES = [7, 8, 9, 10, 11];
const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export function generateCrowns(size: number, difficulty: Difficulty, seed: string): CrownsGame {
  const r = makeRng(`crowns/${size}/${difficulty}/${seed}`);
  let best: CrownsGame | null = null, bestGap = 9;
  for (let attempt = 0; attempt < 400; attempt++) {
    const b = buildCrowns(size, r);
    if (!b || !looksGood(b.puzzle, r, attempt > 120)) continue;
    const grade = gradeCrowns(b.puzzle);
    if (!grade.solved) continue;
    const gap = Math.abs(ORDER.indexOf(grade.difficulty) - ORDER.indexOf(difficulty));
    if (gap < bestGap) { best = { ...b, grade }; bestGap = gap; }
    if (gap === 0 || (attempt > 150 && best)) break;
  }
  if (!best) throw new Error('crowns: no puzzle found');
  return best;
}
