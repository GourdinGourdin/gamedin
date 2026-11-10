// Trace generator: a random path through every cell, numbered stops along it,
// then more stops or walls until no other path fits.
import { makeRng, randInt, shuffle, type Rng } from '../rng.ts';
import type { Difficulty, Grade } from '../types.ts';
import { traceNeighbors, type TracePuzzle, type WallDir } from './solve.ts';

export interface TraceGame { puzzle: TracePuzzle; solution: number[]; grade: Grade }
export const TRACE_SIZES = [5, 6, 7, 8];

/** Random Hamiltonian path on an N x N grid (backbite moves from a snake). */
export function randomPath(N: number, r: Rng): number[] {
  const path: number[] = [];
  for (let row = 0; row < N; row++) for (let c = 0; c < N; c++) path.push(row * N + (row % 2 ? N - 1 - c : c));
  const pos = new Int32Array(N * N);
  const reindex = () => path.forEach((c, i) => { pos[c] = i; });
  reindex();
  const nb = (c: number) => {
    const out: number[] = [], row = Math.floor(c / N), col = c % N;
    if (row > 0) out.push(c - N); if (row < N - 1) out.push(c + N);
    if (col > 0) out.push(c - 1); if (col < N - 1) out.push(c + 1);
    return out;
  };
  for (let k = 0; k < N * N * 24; k++) {
    if (r() < 0.5) { path.reverse(); reindex(); }
    // end = path[last]; join it to a neighbour and cut the loop
    const end = path[path.length - 1], opts = nb(end).filter((c) => c !== path[path.length - 2]);
    const j = pos[opts[randInt(r, opts.length)]];
    const tail = path.splice(j + 1).reverse();
    path.push(...tail);
    reindex();
  }
  return path;
}

/** Up to `limit` solutions by plain depth-first search; null if the node budget ran out. */
export function solveAllTrace(p: TracePuzzle, limit = 2, maxNodes = 150000): number[][] | null {
  const n = p.rows * p.cols, adj = traceNeighbors(p);
  const num = new Int16Array(n).fill(-1);
  let last = 0, start = -1, end = -1;
  for (const [c, s] of Object.entries(p.numbers)) { num[+c] = s; if (s > last) last = s; }
  for (let c = 0; c < n; c++) { if (num[c] === 0) start = c; if (num[c] === last) end = c; }
  if (start < 0 || end < 0) return [];
  const seen = new Uint8Array(n), path: number[] = [], out: number[][] = [];
  const mark = new Int32Array(n), stack = new Int32Array(n);
  let stamp = 0, nodes = 0, aborted = false;
  const go = (c: number, next: number): boolean => {
    seen[c] = 1; path.push(c);
    let stop = false;
    if (path.length === n) {
      if (c === end) { out.push(path.slice()); stop = out.length >= limit; }
    } else if (c !== end && ++nodes <= maxNodes) {
      // every open cell needs two ways in and out (the end needs one), and all must connect
      let ok = true, open = 0, first = -1;
      for (let x = 0; x < n && ok; x++) {
        if (seen[x]) continue;
        open++; first = x;
        let deg = 0;
        for (const y of adj[x]) if (!seen[y] || y === c) deg++;
        if (deg < (x === end ? 1 : 2)) ok = false;
      }
      if (ok) {
        stamp++; let top = 0, count = 1;
        stack[top++] = first; mark[first] = stamp;
        while (top) for (const y of adj[stack[--top]]) if (!seen[y] && mark[y] !== stamp) { mark[y] = stamp; stack[top++] = y; count++; }
        ok = count === open;
      }
      if (ok) {
        for (const d of adj[c]) {
          if (seen[d] || (num[d] !== -1 && num[d] !== next)) continue;
          if (go(d, num[d] === next ? next + 1 : next)) { stop = true; break; }
        }
      }
    } else if (nodes > maxNodes) { aborted = true; stop = true; }
    seen[c] = 0; path.pop();
    return stop;
  };
  go(start, 1);
  return aborted ? null : out;
}

const STOPS: Record<Difficulty, number> = { easy: 0.26, medium: 0.19, hard: 0.13 };

function build(N: number, difficulty: Difficulty, r: Rng): { puzzle: TracePuzzle; solution: number[] } | null {
  const path = randomPath(N, r), n = N * N, at = new Int32Array(n);
  path.forEach((c, i) => { at[c] = i; });
  const stops = new Set([0, n - 1]);
  const want = Math.max(4, Math.round(n * STOPS[difficulty]));
  for (const i of shuffle(r, [...Array(n - 2).keys()].map((i) => i + 1))) {
    if (stops.size >= want) break;
    // keep stops apart so the numbers do not give the route away
    if (![...stops].some((s) => Math.abs(s - i) < 2)) stops.add(i);
  }
  const walls: [number, WallDir][] = [];
  const puzzle = (): TracePuzzle => ({
    rows: N, cols: N, walls,
    numbers: Object.fromEntries([...stops].sort((a, b) => a - b).map((i, k) => [path[i], k])),
  });
  for (let step = 0; step < 40; step++) {
    const sols = solveAllTrace(puzzle(), 2);
    if (!sols) return null;
    const alt = sols.find((s) => s.some((c, i) => c !== path[i]));
    if (!alt) return { puzzle: puzzle(), solution: path };
    // a wall across a step the other path takes and ours does not
    const cuts: [number, WallDir][] = [];
    for (let i = 0; i + 1 < n; i++) {
      const a = alt[i], b = alt[i + 1];
      if (Math.abs(at[a] - at[b]) === 1) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      cuts.push([lo, hi - lo === 1 ? 'RIGHT' : 'DOWN']);
    }
    // a new stop where the other path arrives at a different moment
    const moved = [...Array(n).keys()].filter((i) => !stops.has(i) && alt[i] !== path[i] && ![...stops].some((s) => Math.abs(s - i) < 2));
    const wallBudget = difficulty === 'easy' ? 2 : N;
    if (moved.length && (walls.length >= wallBudget || r() < 0.6)) stops.add(moved[randInt(r, moved.length)]);
    else if (cuts.length && walls.length < N + 2) walls.push(cuts[randInt(r, cuts.length)]);
    else if (moved.length) stops.add(moved[randInt(r, moved.length)]);
    else return null;
  }
  return null;
}

export function generateTrace(size: number, difficulty: Difficulty, seed: string): TraceGame {
  const r = makeRng(`trace/${size}/${difficulty}/${seed}`);
  for (let attempt = 0; attempt < 200; attempt++) {
    const b = build(size, difficulty, r);
    if (!b) continue;
    const stops = Object.keys(b.puzzle.numbers).length;
    const maxStops = Math.round(size * size * (STOPS[difficulty] + 0.1));
    if (stops > maxStops && attempt < 150) continue;
    return { ...b, grade: { solved: true, level: 0, counts: [stops, b.puzzle.walls.length], difficulty } };
  }
  throw new Error('trace: no puzzle found');
}
