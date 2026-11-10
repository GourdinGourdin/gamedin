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

// Region style, from 667 past daily boards: a couple of tiny regions (1 to 3
// cells) on every board, several regions that run along a row or column, and
// a few large sprawling ones.
function growRegions(N: number, cols: number[], r: Rng): number[] {
  const reg = new Array<number>(N * N).fill(-1), size = new Array<number>(N).fill(1);
  const ids = shuffle(r, [...Array(N).keys()]);
  const cap = new Array<number>(N).fill(Infinity);
  const tiny = (N >= 10 ? 2 : 1) + (r() < 0.35 ? 1 : 0);
  ids.slice(0, tiny).forEach((k) => { cap[k] = 1 + randInt(r, 3); });
  // 0 = no preference, 1 = along its row, 2 = along its column
  const dir = cols.map(() => (r() < 0.5 ? 1 + randInt(r, 2) : 0));
  const weight = cols.map(() => 0.45 + 1.3 * r() ** 1.4);
  cols.forEach((c, row) => { reg[row * N + c] = row; });
  for (let left = N * N - N; left > 0; left--) {
    let opts: [number, number, number][] = [];
    for (let pass = 0; pass < 2 && !opts.length; pass++) {
      for (let i = 0; i < N * N; i++) {
        if (reg[i] !== -1) continue;
        for (const j of neighbours(N, i)) {
          const k = reg[j];
          if (k === -1 || (pass === 0 && size[k] >= cap[k])) continue;
          const along = Math.abs(i - j) === 1 ? 1 : 2;
          opts.push([i, k, weight[k] * (dir[k] === along ? 5 : dir[k] ? 0.4 : 1)]);
        }
      }
    }
    let x = r() * opts.reduce((a, o) => a + o[2], 0), chosen = opts[opts.length - 1];
    for (const o of opts) { x -= o[2]; if (x <= 0) { chosen = o; break; } }
    reg[chosen[0]] = chosen[1];
    size[chosen[1]]++;
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

/** Shape check: no more than two one-cell regions. */
function looksGood(p: CrownsPuzzle): boolean {
  const size = new Array<number>(p.size).fill(0);
  for (const k of p.regions) size[k]++;
  return size.filter((s) => s === 1).length <= (p.size >= 9 ? 2 : 1);
}

export const CROWNS_SIZES = [7, 8, 9, 10, 11];
const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export function generateCrowns(size: number, difficulty: Difficulty, seed: string): CrownsGame {
  const r = makeRng(`crowns/${size}/${difficulty}/${seed}`);
  let best: CrownsGame | null = null, bestGap = 9;
  for (let attempt = 0; attempt < 400; attempt++) {
    const b = buildCrowns(size, r);
    if (!b || !looksGood(b.puzzle)) continue;
    const grade = gradeCrowns(b.puzzle);
    if (!grade.solved) continue;
    const gap = Math.abs(ORDER.indexOf(grade.difficulty) - ORDER.indexOf(difficulty));
    if (gap < bestGap) { best = { ...b, grade }; bestGap = gap; }
    if (gap === 0 || (attempt > 150 && best)) break;
  }
  if (!best) throw new Error('crowns: no puzzle found');
  return best;
}
