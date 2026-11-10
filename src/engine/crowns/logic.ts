// Crowns, solved the way a person does: named deductions only, no guessing.
// Used to grade a puzzle's difficulty and to explain hints.
import type { Difficulty, Grade, Step } from '../types.ts';
import type { CrownsPuzzle } from './solve.ts';

export const OPEN = 0, CROWN = 1, OUT = 2;

export interface CrownsState {
  size: number;
  regions: number[];
  /** OPEN | CROWN | OUT per cell */
  marks: Int8Array;
}

interface Unit { kind: 'row' | 'column' | 'region'; index: number; cells: number[] }

const unitCache = new WeakMap<number[], Unit[]>();
function unitsOf(N: number, regions: number[]): Unit[] {
  let u = unitCache.get(regions);
  if (u) return u;
  u = [];
  for (let r = 0; r < N; r++) u.push({ kind: 'row', index: r, cells: Array.from({ length: N }, (_, c) => r * N + c) });
  for (let c = 0; c < N; c++) u.push({ kind: 'column', index: c, cells: Array.from({ length: N }, (_, r) => r * N + c) });
  const regs = new Map<number, number[]>();
  regions.forEach((k, i) => { if (!regs.has(k)) regs.set(k, []); regs.get(k)!.push(i); });
  [...regs.keys()].sort((a, b) => a - b).forEach((k) => u!.push({ kind: 'region', index: k, cells: regs.get(k)! }));
  unitCache.set(regions, u);
  return u;
}

/** Cells a crown on `cell` rules out: its row, column, region and the 8 around it. */
export function reach(N: number, regions: number[], cell: number): number[] {
  const r = Math.floor(cell / N), c = cell % N, out: number[] = [];
  for (let i = 0; i < N * N; i++) {
    if (i === cell) continue;
    const rr = Math.floor(i / N), cc = i % N;
    if (rr === r || cc === c || regions[i] === regions[cell] || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1)) out.push(i);
  }
  return out;
}

export function placeCrown(st: CrownsState, cell: number) {
  st.marks[cell] = CROWN;
  for (const i of reach(st.size, st.regions, cell)) if (st.marks[i] === OPEN) st.marks[i] = OUT;
}

/** State with the given crowns placed and everything they rule out crossed off. */
export function stateFrom(p: CrownsPuzzle, crowns: number[] = []): CrownsState {
  const st: CrownsState = { size: p.size, regions: p.regions, marks: new Int8Array(p.size * p.size) };
  for (const c of crowns) placeCrown(st, c);
  return st;
}

const open = (st: CrownsState, u: Unit) => u.cells.filter((c) => st.marks[c] === OPEN);
const done = (st: CrownsState, u: Unit) => u.cells.some((c) => st.marks[c] === CROWN);
const name = (u: Unit) => (u.kind === 'region' ? 'this colour region' : `this ${u.kind}`);

export function nextStep(st: CrownsState): Step | null {
  const N = st.size, units = unitsOf(N, st.regions);
  const live = units.filter((u) => !done(st, u)).map((u) => ({ u, o: open(st, u) }));

  // 1. a row, column or region with one open cell
  for (const { u, o } of live) {
    if (o.length === 1) {
      return { level: 1, kind: 'single', value: CROWN, cells: o, because: u.cells,
        text: `Only one cell is still open in ${name(u)}, so its crown goes there.` };
    }
  }
  const rowOf = (c: number) => Math.floor(c / N), colOf = (c: number) => c % N;

  // 2. a region whose open cells sit in one line, and a line whose open cells sit in one region
  for (const { u, o } of live) {
    if (u.kind === 'region') {
      for (const [axis, f] of [['row', rowOf], ['column', colOf]] as const) {
        const line = f(o[0]);
        if (!o.every((c) => f(c) === line)) continue;
        const cells: number[] = [];
        for (let i = 0; i < N * N; i++) if (st.marks[i] === OPEN && f(i) === line && st.regions[i] !== u.index) cells.push(i);
        if (cells.length) {
          return { level: 2, kind: 'confined', value: OUT, cells, because: o,
            text: `This region's open cells are all in one ${axis}, so that ${axis}'s crown is in this region. Cross out the rest of the ${axis}.` };
        }
      }
    } else {
      const k = st.regions[o[0]];
      if (!o.every((c) => st.regions[c] === k)) continue;
      const cells: number[] = [];
      for (let i = 0; i < N * N; i++) if (st.marks[i] === OPEN && st.regions[i] === k && !o.includes(i)) cells.push(i);
      if (cells.length) {
        return { level: 2, kind: 'claimed', value: OUT, cells, because: o,
          text: `Every open cell in ${name(u)} belongs to one region, so that region's crown is in ${name(u)}. Cross out the rest of the region.` };
      }
    }
  }

  // 3. a cell whose crown would leave another row, column or region with nowhere to go
  let best: Step | null = null;
  for (let c = 0; c < N * N; c++) {
    if (st.marks[c] !== OPEN) continue;
    const hit = new Set(reach(N, st.regions, c));
    for (const { u, o } of live) {
      if (u.cells.includes(c) || !o.every((x) => hit.has(x))) continue;
      const level = o.length <= 2 ? 2 : 3;
      if (!best || level < best.level) {
        best = { level, kind: 'blocker', value: OUT, cells: [c], because: o,
          text: `A crown here would rule out every open cell of ${name(u)}. Cross it out.` };
      }
    }
    if (best?.level === 2) return best;
  }

  // 4. k regions packed into k lines (and k lines packed into k regions)
  for (let k = 2; k < N; k++) {
    if (best && k >= 2) { if (best.level <= (k === 2 ? 3 : 4)) return best; }
    for (const [axis, f] of [['rows', rowOf], ['columns', colOf]] as const) {
      const lineUnits = live.filter((x) => x.u.kind === (axis === 'rows' ? 'row' : 'column'));
      for (let a = 0; a + k <= N; a++) {
        const inWin = (c: number) => f(c) >= a && f(c) < a + k;
        const lines = lineUnits.filter((x) => x.u.index >= a && x.u.index < a + k);
        if (lines.length < 2) continue;
        const level = lines.length === 2 ? 3 : 4;
        // regions that fit entirely inside the window
        const inside = live.filter((x) => x.u.kind === 'region' && x.o.every(inWin));
        if (inside.length === lines.length) {
          const ids = new Set(inside.map((x) => x.u.index));
          const cells: number[] = [];
          for (let i = 0; i < N * N; i++) if (st.marks[i] === OPEN && inWin(i) && !ids.has(st.regions[i])) cells.push(i);
          if (cells.length) {
            return { level, kind: 'group', value: OUT, cells, because: inside.flatMap((x) => x.o),
              text: `These ${lines.length} regions only fit in these ${lines.length} ${axis}, so they take all the crowns there. Cross out the other regions' cells in those ${axis}.` };
          }
        }
        // lines whose open cells touch only as many regions
        const ids = new Set<number>();
        for (const x of lines) for (const c of x.o) ids.add(st.regions[c]);
        if (ids.size === lines.length) {
          const cells: number[] = [];
          for (let i = 0; i < N * N; i++) if (st.marks[i] === OPEN && !inWin(i) && ids.has(st.regions[i])) cells.push(i);
          if (cells.length) {
            return { level, kind: 'group', value: OUT, cells, because: lines.flatMap((x) => x.o),
              text: `These ${lines.length} ${axis} only have room in ${lines.length} regions, so those regions' crowns are in these ${axis}. Cross out the rest of those regions.` };
          }
        }
      }
    }
  }
  return best;
}

export function applyStep(st: CrownsState, s: Step) {
  if (s.value === CROWN) placeCrown(st, s.cells[0]);
  else for (const c of s.cells) st.marks[c] = OUT;
}

export function difficultyOf(level: number, counts: number[]): Difficulty {
  if (level <= 2) return 'easy';
  if (level === 3 && (counts[3] ?? 0) <= 3) return 'medium';
  return 'hard';
}

export function gradeCrowns(p: CrownsPuzzle): Grade {
  const st = stateFrom(p);
  const counts = [0, 0, 0, 0, 0];
  let level = 0, crowns = 0;
  for (;;) {
    const s = nextStep(st);
    if (!s) break;
    applyStep(st, s);
    counts[s.level]++;
    if (s.level > level) level = s.level;
    if (s.value === CROWN) crowns++;
  }
  return { solved: crowns === p.size, level, counts, difficulty: difficultyOf(level, counts) };
}
