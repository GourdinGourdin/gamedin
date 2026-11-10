// Blocked tiles for Wind, in the shapes the daily word-snake boards use: a
// small shape (single tile, bar, L, T, block) placed against an edge or in a
// corner, repeated by a symmetry of the square (half turn, mirror, or all four
// quarter turns). Never scattered at random.
import { randInt, type Rng } from '../rng.ts';

type Shape = [number, number][];
const SHAPES: Shape[] = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
];

type Sym = (r: number, c: number, N: number) => [number, number][];
const SYMS: [Sym, number][] = [
  [(r, c, N) => [[r, c], [N - 1 - r, N - 1 - c]], 5],
  [(r, c, N) => [[r, c], [r, N - 1 - c]], 2],
  [(r, c, N) => [[r, c], [N - 1 - r, c]], 1],
  [(r, c, N) => [[r, c], [c, N - 1 - r], [N - 1 - r, N - 1 - c], [N - 1 - c, r]], 3],
];

/** Number of blocked tiles allowed for each board size, from past boards. */
export const HOLES: Record<number, [number, number]> = { 5: [2, 8], 6: [7, 14], 7: [14, 22] };

function pickSym(r: Rng): Sym {
  let x = r() * SYMS.reduce((a, s) => a + s[1], 0);
  for (const [s, w] of SYMS) { x -= w; if (x <= 0) return s; }
  return SYMS[0][0];
}

/** Open tiles still form one piece, and no more than two have a single way in or out. */
function playable(N: number, hole: Uint8Array): boolean {
  const open: number[] = [];
  for (let i = 0; i < N * N; i++) if (!hole[i]) open.push(i);
  if (!open.length) return false;
  const nb = (i: number) => {
    const out: number[] = [], r = Math.floor(i / N), c = i % N;
    if (r > 0) out.push(i - N); if (r < N - 1) out.push(i + N);
    if (c > 0) out.push(i - 1); if (c < N - 1) out.push(i + 1);
    return out.filter((j) => !hole[j]);
  };
  let deadEnds = 0;
  for (const i of open) { const d = nb(i).length; if (d === 0) return false; if (d === 1) deadEnds++; }
  if (deadEnds > 2) return false;
  const seen = new Set([open[0]]), stack = [open[0]];
  while (stack.length) for (const j of nb(stack.pop()!)) if (!seen.has(j)) { seen.add(j); stack.push(j); }
  return seen.size === open.length;
}

/** A symmetric pattern of blocked tiles, or an empty one when `none`. */
export function holePattern(N: number, r: Rng, none = false): Uint8Array {
  const [lo, hi] = HOLES[N] ?? [0, 0];
  for (let attempt = 0; attempt < 200 && !none && hi > 0; attempt++) {
    const hole = new Uint8Array(N * N), sym = pickSym(r);
    const pieces = 1 + (r() < 0.35 ? 1 : 0);
    for (let p = 0; p < pieces; p++) {
      const shape = SHAPES[randInt(r, SHAPES.length)];
      const turn = randInt(r, 4);
      const cells = shape.map(([a, b]) => (turn === 0 ? [a, b] : turn === 1 ? [b, -a] : turn === 2 ? [-a, -b] : [-b, a]));
      const minR = Math.min(...cells.map((x) => x[0])), minC = Math.min(...cells.map((x) => x[1]));
      const h = Math.max(...cells.map((x) => x[0])) - minR + 1, w = Math.max(...cells.map((x) => x[1])) - minC + 1;
      // anchor: a corner, an edge, or one step in from the edge
      const at = r();
      const row0 = at < 0.45 ? 0 : at < 0.75 ? randInt(r, Math.max(1, N - h + 1)) : 1;
      const col0 = at < 0.45 ? 0 : at < 0.75 ? (r() < 0.5 ? 0 : 1) : randInt(r, Math.max(1, N - w + 1));
      for (const [a, b] of cells) {
        const rr = a - minR + row0, cc = b - minC + col0;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
        for (const [x, y] of sym(rr, cc, N)) hole[x * N + y] = 1;
      }
    }
    const count = hole.reduce((a, b) => a + b, 0);
    if (count < lo || count > hi) continue;
    if (playable(N, hole)) return hole;
  }
  return new Uint8Array(N * N);
}

/** Random path through every open tile: a greedy walk to start, then backbite moves to mix it. */
export function openPath(N: number, hole: Uint8Array, r: Rng): number[] | null {
  const nb = (i: number) => {
    const out: number[] = [], row = Math.floor(i / N), c = i % N;
    if (row > 0) out.push(i - N); if (row < N - 1) out.push(i + N);
    if (c > 0) out.push(i - 1); if (c < N - 1) out.push(i + 1);
    return out.filter((j) => !hole[j]);
  };
  const open: number[] = [];
  for (let i = 0; i < N * N; i++) if (!hole[i]) open.push(i);
  const ends = open.filter((i) => nb(i).length === 1);
  let path: number[] | null = null;
  for (let tries = 0; tries < 200 && !path; tries++) {
    const start = ends.length ? ends[randInt(r, ends.length)] : open[randInt(r, open.length)];
    const used = new Uint8Array(N * N), p = [start];
    used[start] = 1;
    let budget = 4000;
    const go = (): boolean => {
      if (p.length === open.length) return true;
      if (--budget < 0) return false;
      const here = p[p.length - 1];
      const next = nb(here).filter((j) => !used[j])
        .map((j) => [j, nb(j).filter((k) => !used[k]).length + r() * 0.9] as const)
        .sort((a, b) => a[1] - b[1]);
      for (const [j] of next) {
        used[j] = 1; p.push(j);
        if (go()) return true;
        used[j] = 0; p.pop();
      }
      return false;
    };
    if (go()) path = p;
  }
  if (!path) return null;
  // backbite moves keep it a path through every open tile
  const pos = new Int32Array(N * N);
  const reindex = () => path!.forEach((c, i) => { pos[c] = i; });
  reindex();
  for (let k = 0; k < open.length * 24; k++) {
    if (r() < 0.5) { path.reverse(); reindex(); }
    const end = path[path.length - 1], opts = nb(end).filter((c) => c !== path![path!.length - 2]);
    if (!opts.length) continue;
    const j = pos[opts[randInt(r, opts.length)]];
    const tail = path.splice(j + 1).reverse();
    path.push(...tail);
    reindex();
  }
  return path;
}
