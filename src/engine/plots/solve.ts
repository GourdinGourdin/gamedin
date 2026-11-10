// Plots: cut the grid into rectangles. Each rectangle holds exactly one clue;
// the clue gives its area (0 = not given) and its shape.
export type PlotShape = 'square' | 'tall' | 'wide' | 'any';
export interface PlotsClue { cell: number; size: number; shape: PlotShape }
export interface PlotsPuzzle { rows: number; cols: number; clues: PlotsClue[] }
/** [top, left, height, width] */
export type Rect = [number, number, number, number];

export const shapeOf = (h: number, w: number): PlotShape => (h === w ? 'square' : h > w ? 'tall' : 'wide');
const fits = (s: PlotShape, h: number, w: number) => s === 'any' || s === shapeOf(h, w);

export function rectCells(cols: number, [t, l, h, w]: Rect): number[] {
  const out: number[] = [];
  for (let r = t; r < t + h; r++) for (let c = l; c < l + w; c++) out.push(r * cols + c);
  return out;
}

/** Every rectangle each clue could be: holds its cell, no other clue, right area and shape. */
export function candidates(p: PlotsPuzzle): Rect[][] {
  const { rows, cols } = p, clueAt = new Int8Array(rows * cols).fill(-1);
  p.clues.forEach((c, i) => { clueAt[c.cell] = i; });
  return p.clues.map((clue, i) => {
    const r0 = Math.floor(clue.cell / cols), c0 = clue.cell % cols, out: Rect[] = [];
    for (let h = 1; h <= rows; h++) {
      for (let w = 1; w <= cols; w++) {
        if ((clue.size && h * w !== clue.size) || !fits(clue.shape, h, w)) continue;
        for (let t = Math.max(0, r0 - h + 1); t <= Math.min(r0, rows - h); t++) {
          for (let l = Math.max(0, c0 - w + 1); l <= Math.min(c0, cols - w); l++) {
            const rect: Rect = [t, l, h, w];
            if (rectCells(cols, rect).every((x) => clueAt[x] === -1 || clueAt[x] === i)) out.push(rect);
          }
        }
      }
    }
    return out;
  });
}

/** All solutions up to `limit`; each is one rectangle per clue, in clue order. */
export function solveAllPlots(p: PlotsPuzzle, limit = 2, maxNodes = 200000): Rect[][] {
  const n = p.rows * p.cols, cands = candidates(p).map((list) => list.map((rect) => ({ rect, cells: rectCells(p.cols, rect) })));
  const covered = new Uint8Array(n), chosen: (Rect | null)[] = p.clues.map(() => null), out: Rect[][] = [];
  let nodes = 0;
  const free = (cells: number[]) => cells.every((c) => !covered[c]);
  const go = (left: number): boolean => {
    if (left === 0) { out.push(chosen.map((x) => x!)); return out.length >= limit; }
    if (++nodes > maxNodes) return true;
    // the open cell with the fewest rectangles that could cover it
    let bestCell = -1, bestOpts: [number, number][] = [];
    for (let cell = 0; cell < n; cell++) {
      if (covered[cell]) continue;
      const opts: [number, number][] = [];
      for (let i = 0; i < cands.length; i++) {
        if (chosen[i]) continue;
        cands[i].forEach((k, j) => { if (k.cells.includes(cell) && free(k.cells)) opts.push([i, j]); });
      }
      if (bestCell === -1 || opts.length < bestOpts.length) { bestCell = cell; bestOpts = opts; if (opts.length <= 1) break; }
    }
    for (const [i, j] of bestOpts) {
      const k = cands[i][j];
      for (const c of k.cells) covered[c] = 1;
      chosen[i] = k.rect;
      if (go(left - k.cells.length)) return true;
      chosen[i] = null;
      for (const c of k.cells) covered[c] = 0;
    }
    return false;
  };
  go(n);
  return out;
}

export const countPlots = (p: PlotsPuzzle, limit = 2) => solveAllPlots(p, limit).length;

export function checkPlots(p: PlotsPuzzle, rects: Rect[]): boolean {
  const n = p.rows * p.cols, owner = new Int16Array(n).fill(-1);
  for (let i = 0; i < rects.length; i++) {
    const [t, l, h, w] = rects[i];
    if (t < 0 || l < 0 || h < 1 || w < 1 || t + h > p.rows || l + w > p.cols) return false;
    for (const c of rectCells(p.cols, rects[i])) { if (owner[c] !== -1) return false; owner[c] = i; }
  }
  if (owner.some((o) => o === -1)) return false;
  const seen = new Set<number>();
  for (const clue of p.clues) {
    const i = owner[clue.cell];
    if (seen.has(i)) return false;
    seen.add(i);
    const [, , h, w] = rects[i];
    if ((clue.size && clue.size !== h * w) || !fits(clue.shape, h, w)) return false;
  }
  return seen.size === rects.length;
}
