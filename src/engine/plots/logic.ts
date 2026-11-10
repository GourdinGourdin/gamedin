// Plots, solved by named deductions. Grades puzzles and explains hints.
import type { Difficulty, Grade, Step } from '../types.ts';
import { candidates, rectCells, type PlotsPuzzle, type Rect } from './solve.ts';

interface Cand { rect: Rect; cells: number[] }
export interface PlotsState {
  p: PlotsPuzzle;
  /** live candidates per clue */
  cands: Cand[][];
  /** placed rectangle per clue */
  placed: (Rect | null)[];
  covered: Uint8Array;
}
export interface PlotsStep extends Step { clue: number; rect?: Rect }

/** `placed`: rectangles already on the board, by clue index (wrong ones should be left out). */
export function stateFrom(p: PlotsPuzzle, placed: (Rect | null)[] = []): PlotsState {
  const st: PlotsState = {
    p, cands: candidates(p).map((l) => l.map((rect) => ({ rect, cells: rectCells(p.cols, rect) }))),
    placed: p.clues.map(() => null), covered: new Uint8Array(p.rows * p.cols),
  };
  placed.forEach((r, i) => { if (r) place(st, i, r); });
  return st;
}

export function place(st: PlotsState, clue: number, rect: Rect) {
  const cells = rectCells(st.p.cols, rect);
  st.placed[clue] = rect;
  st.cands[clue] = [{ rect, cells }];
  for (const c of cells) st.covered[c] = 1;
  st.cands.forEach((list, i) => {
    if (i !== clue && !st.placed[i]) st.cands[i] = list.filter((k) => k.cells.every((c) => !st.covered[c]));
  });
}

export function nextStep(st: PlotsState): PlotsStep | null {
  const { p, cands, placed, covered } = st, n = p.rows * p.cols;
  // 1. a clue with one rectangle left
  for (let i = 0; i < cands.length; i++) {
    if (!placed[i] && cands[i].length === 1) {
      return { level: 1, kind: 'only-fit', clue: i, rect: cands[i][0].rect, value: i, cells: cands[i][0].cells, because: [p.clues[i].cell],
        text: 'Only one rectangle fits this clue without covering another clue or leaving the grid.' };
    }
  }
  // which clues can reach each open cell
  const reach: number[][] = Array.from({ length: n }, () => []);
  cands.forEach((list, i) => {
    if (placed[i]) return;
    const seen = new Set<number>();
    for (const k of list) for (const c of k.cells) seen.add(c);
    for (const c of seen) reach[c].push(i);
  });
  // 2. a cell only one clue can reach
  for (let cell = 0; cell < n; cell++) {
    if (covered[cell] || reach[cell].length !== 1) continue;
    const i = reach[cell][0], keep = cands[i].filter((k) => k.cells.includes(cell));
    if (keep.length < cands[i].length) {
      return { level: 2, kind: 'only-reach', clue: i, value: -1, cells: [cell], because: [p.clues[i].cell],
        rect: keep.length === 1 ? keep[0].rect : undefined,
        text: keep.length === 1
          ? 'Only this clue can reach the marked cell, and only one of its rectangles does.'
          : 'Only this clue can reach the marked cell, so its rectangle must cover it.' };
    }
  }
  // 3. a rectangle that would strand a cell or leave a clue with no room
  for (let i = 0; i < cands.length; i++) {
    if (placed[i]) continue;
    for (const k of cands[i]) {
      const hit = new Set(k.cells);
      let why = -1;
      for (let j = 0; j < cands.length && why === -1; j++) {
        if (j !== i && !placed[j] && cands[j].every((x) => x.cells.some((c) => hit.has(c)))) why = p.clues[j].cell;
      }
      for (let cell = 0; cell < n && why === -1; cell++) {
        if (covered[cell] || hit.has(cell)) continue;
        if (!reach[cell].some((j) => j !== i && cands[j].some((x) => x.cells.includes(cell) && x.cells.every((c) => !hit.has(c))))) why = cell;
      }
      if (why !== -1) {
        return { level: 3, kind: 'strand', clue: i, value: -2, cells: k.cells, because: [why, p.clues[i].cell], rect: k.rect,
          text: 'This rectangle cannot be right: it would leave the marked cell with no rectangle to belong to.' };
      }
    }
  }
  return null;
}

export function applyStep(st: PlotsState, s: PlotsStep) {
  if (s.level === 1) place(st, s.clue, s.rect!);
  else if (s.level === 2) st.cands[s.clue] = st.cands[s.clue].filter((k) => k.cells.includes(s.cells[0]));
  else st.cands[s.clue] = st.cands[s.clue].filter((k) => k.rect !== s.rect);
}

export function difficultyOf(level: number, counts: number[]): Difficulty {
  if (level <= 1 || (level === 2 && counts[2] <= 2)) return 'easy';
  if (level === 2 || (level === 3 && counts[3] <= 1)) return 'medium';
  return 'hard';
}

export function gradePlots(p: PlotsPuzzle, maxLevel = 3): Grade {
  const st = stateFrom(p), counts = [0, 0, 0, 0];
  let level = 0;
  for (;;) {
    const s = nextStep(st);
    if (!s || s.level > maxLevel) break;
    applyStep(st, s);
    counts[s.level]++;
    if (s.level > level) level = s.level;
  }
  return { solved: st.placed.every(Boolean), level, counts, difficulty: difficultyOf(level, counts) };
}
