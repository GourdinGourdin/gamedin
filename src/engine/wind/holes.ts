// Blocked tiles for Wind, in the shapes the daily word-snake boards use: a
// small shape (single tile, bar, L, T, block) placed against an edge or in a
// corner, repeated by a symmetry of the square (half turn, mirror, or all four
// quarter turns). Never scattered at random.
import { randInt, type Rng } from '../rng.ts';

type Shape = [number, number][];
const SINGLE: Shape = [[0, 0]];
const DOMINO: Shape = [[0, 0], [1, 0]];
const BAR3: Shape = [[0, 0], [1, 0], [2, 0]];
const BAR4: Shape = [[0, 0], [1, 0], [2, 0], [3, 0]];
const L3: Shape = [[0, 0], [0, 1], [1, 0]];
const L2: Shape = [[0, 0], [0, 1], [1, 1]];
const CORNER: Shape = [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]];
const BLOCK: Shape = [[0, 0], [0, 1], [1, 0], [1, 1]];
const T: Shape = [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]];
const TSHORT: Shape = [[0, 0], [0, 1], [0, 2], [1, 1]];
const PLUS: Shape = [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]];

/** Shape weights per board size: small shapes on small boards, big ones on big boards. */
const SHAPES: Record<number, [Shape, number][]> = {
  5: [[SINGLE, 5], [DOMINO, 4], [BAR3, 4], [L3, 3], [L2, 1], [BLOCK, 1], [TSHORT, 1], [CORNER, 1]],
  6: [[SINGLE, 2], [DOMINO, 3], [BAR3, 3], [L3, 3], [BLOCK, 2], [TSHORT, 3], [T, 4], [CORNER, 3], [PLUS, 1]],
  7: [[DOMINO, 1], [BAR3, 3], [BAR4, 1], [L3, 3], [BLOCK, 2], [TSHORT, 2], [T, 4], [CORNER, 7], [PLUS, 2], [SINGLE, 1]],
};

type Sym = (r: number, c: number, N: number) => [number, number][];
const HALF: Sym = (r, c, N) => [[r, c], [N - 1 - r, N - 1 - c]];
const MIRROR: Sym = (r, c, N) => [[r, c], [r, N - 1 - c]];
const FLIP: Sym = (r, c, N) => [[r, c], [N - 1 - r, c]];
const QUARTER: Sym = (r, c, N) => [[r, c], [c, N - 1 - r], [N - 1 - r, N - 1 - c], [N - 1 - c, r]];
const SYMS: Record<number, [Sym, number][]> = {
  5: [[HALF, 6], [MIRROR, 3], [FLIP, 1], [QUARTER, 2]],
  6: [[HALF, 6], [MIRROR, 2], [FLIP, 1], [QUARTER, 3]],
  7: [[HALF, 5], [MIRROR, 3], [FLIP, 1], [QUARTER, 2]],
};

function pick<T>(r: Rng, list: [T, number][]): T {
  let x = r() * list.reduce((a, s) => a + s[1], 0);
  for (const [s, w] of list) { x -= w; if (x <= 0) return s; }
  return list[0][0];
}

/** Number of blocked tiles allowed for each board size, from past boards. */
export const HOLES: Record<number, [number, number]> = { 5: [2, 8], 6: [7, 14], 7: [10, 22] };

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
  if (seen.size !== open.length) return false;
  return !hasCorridor(N, hole) && !hasBlockedLine(N, hole);
}

/** True if a whole row or column is blocked, which would cut the board in two or leave a slab. */
function hasBlockedLine(N: number, hole: Uint8Array): boolean {
  for (let a = 0; a < N; a++) {
    let row = true, col = true;
    for (let b = 0; b < N; b++) { if (!hole[a * N + b]) row = false; if (!hole[b * N + a]) col = false; }
    if (row || col) return true;
  }
  return false;
}

/** True if three or more open tiles in a row are squeezed between blocked tiles on both sides. */
function hasCorridor(N: number, hole: Uint8Array): boolean {
  const wall = (r: number, c: number) => r >= 0 && c >= 0 && r < N && c < N && hole[r * N + c] === 1;
  for (let dir = 0; dir < 2; dir++) {
    for (let a = 0; a < N; a++) {
      let run = 0;
      for (let b = 0; b < N; b++) {
        const r = dir ? a : b, c = dir ? b : a;
        const pinched = !hole[r * N + c] && (dir ? wall(r - 1, c) && wall(r + 1, c) : wall(r, c - 1) && wall(r, c + 1));
        run = pinched ? run + 1 : 0;
        if (run >= 3) return true;
      }
    }
  }
  return false;
}

/** A symmetric pattern of blocked tiles, or an empty one when `none`. */
export function holePattern(N: number, r: Rng, none = false): Uint8Array {
  const [lo, hi] = HOLES[N] ?? [0, 0];
  for (let attempt = 0; attempt < 200 && !none && hi > 0; attempt++) {
    const hole = new Uint8Array(N * N), sym = pick(r, SYMS[N] ?? SYMS[5]);
    const four = sym === QUARTER;
    const pieces = four || N === 5 ? 1 + (r() < 0.25 ? 1 : 0) : 1 + (r() < 0.3 ? 1 : 0);
    for (let p = 0; p < pieces; p++) {
      const shape = pick(r, SHAPES[N] ?? SHAPES[5]);
      const turn = randInt(r, 4);
      const cells = shape.map(([a, b]) => (turn === 0 ? [a, b] : turn === 1 ? [b, -a] : turn === 2 ? [-a, -b] : [-b, a]));
      const minR = Math.min(...cells.map((x) => x[0])), minC = Math.min(...cells.map((x) => x[1]));
      const h = Math.max(...cells.map((x) => x[0])) - minR + 1, w = Math.max(...cells.map((x) => x[1])) - minC + 1;
      // anchor: a corner, along an edge, or one step in from the edge
      const at = r(), flip = r() < 0.5;
      let row0: number, col0: number;
      if (at < 0.4) { row0 = 0; col0 = 0; }
      else if (at < 0.65) { row0 = 0; col0 = randInt(r, Math.max(1, N - w + 1)); }
      else if (at < 0.85) { row0 = 1; col0 = randInt(r, Math.max(1, N - w)); }
      else { row0 = 1; col0 = 1; }
      if (flip) [row0, col0] = [col0, row0];
      // the shape's own size decides how far "one in" can go
      row0 = Math.min(row0, N - h); col0 = Math.min(col0, N - w);
      for (const [a, b] of cells) {
        const rr = a - minR + row0, cc = b - minC + col0;
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
