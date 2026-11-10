import React, { useRef, type ReactNode } from 'react';
import type { CrownsPuzzle } from '../../engine/crowns/solve.ts';
import { CROWN, nextStep, reach, stateFrom } from '../../engine/crowns/logic.ts';
import { buzz, cellAt, cellInside, Frame, gridPoint, samples, FocusRing, HintMarks, mid, U, useGridFocus, xy, type BoardProps, type GameUI, type Hint } from './common.tsx';

/** 0 empty, 1 crossed out, 2 crown */
type S = number[];
const EMPTY = 0, CROSS = 1, QUEEN = 2;

const crownCells = (s: S) => s.flatMap((v, i) => (v === QUEEN ? [i] : []));

function conflicts(p: CrownsPuzzle, s: S): Set<number> {
  const bad = new Set<number>(), q = crownCells(s);
  for (const a of q) {
    const hit = new Set(reach(p.size, p.regions, a));
    for (const b of q) if (b !== a && hit.has(b)) bad.add(a);
  }
  return bad;
}

export const CROWN_PATH = 'M-27 20 L-31 -15 L-14 -1 L0 -24 L14 -1 L31 -15 L27 20 Z';

function Board({ puzzle: p, state, set, done, hint, preview, settings }: BoardProps<CrownsPuzzle, S, number[]>) {
  const N = p.size, ref = useRef<SVGSVGElement>(null);
  const drag = useRef<{ start: number; moved: boolean; base: S; erase: boolean; pt: { x: number; y: number } } | null>(null);
  const { focus, setFocus, move } = useGridFocus(N, N);
  const bad = conflicts(p, state);
  const auto = new Set<number>();
  if (settings.autoCross && !preview) for (const c of crownCells(state)) for (const i of reach(N, p.regions, c)) if (state[i] === EMPTY) auto.add(i);

  const cycle = (i: number) => { const next = state.slice(); next[i] = (state[i] + 1) % 3; if (next[i] === QUEEN) buzz(12); set(next); };
  const down = (e: React.PointerEvent) => {
    if (done) return;
    const i = cellAt(ref.current!, e, N, N);
    if (i < 0) return;
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    // a drag that starts on a cross clears crosses; otherwise it adds them
    drag.current = { start: i, moved: false, base: state, erase: state[i] === CROSS, pt: gridPoint(ref.current!, e, N) };
    setFocus(i);
  };
  const moveTo = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const pt = gridPoint(ref.current!, e, N);
    const cells: number[] = [];
    for (const sp of samples(d.pt, pt)) { const c = cellInside(sp, N, N, 0.08); if (c >= 0 && !cells.includes(c)) cells.push(c); }
    d.pt = pt;
    if (!d.moved && cells.every((c) => c === d.start)) return;
    const next = (d.moved ? state : d.base).slice();
    let changed = false;
    for (const c of d.moved ? cells : [d.start, ...cells]) {
      if (d.erase ? next[c] === CROSS : next[c] === EMPTY) { next[c] = d.erase ? EMPTY : CROSS; changed = true; }
    }
    if (changed || !d.moved) set(next, d.moved);
    d.moved = true;
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) cycle(d.start);
  };
  const key = (e: React.KeyboardEvent) => {
    if (done) return;
    if (move(e.key) !== null) e.preventDefault();
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cycle(focus); }
  };

  const cells: ReactNode[] = [], thin: ReactNode[] = [], thick: ReactNode[] = [], marks: ReactNode[] = [];
  for (let i = 0; i < N * N; i++) {
    const [x, y] = xy(N, i), r = Math.floor(i / N), c = i % N;
    cells.push(<rect key={i} x={x} y={y} width={U} height={U} className={`region r${p.regions[i] % 10}`} style={{ '--d': `${(r + c) * 45}ms` } as React.CSSProperties} />);
    if (c < N - 1) (p.regions[i] !== p.regions[i + 1] ? thick : thin).push(<line key={`v${i}`} x1={x + U} y1={y} x2={x + U} y2={y + U} />);
    if (r < N - 1) (p.regions[i] !== p.regions[i + N] ? thick : thin).push(<line key={`h${i}`} x1={x} y1={y + U} x2={x + U} y2={y + U} />);
    const [cx, cy] = mid(N, i);
    if (state[i] === QUEEN) {
      marks.push(<g key={i} className={`crown${bad.has(i) && settings.showErrors ? ' is-bad' : ''}`} transform={`translate(${cx} ${cy + 2})`}><path d={CROWN_PATH} /></g>);
    } else if (state[i] === CROSS || auto.has(i)) {
      marks.push(<path key={i} className={`cross${state[i] === CROSS ? '' : ' is-auto'}`} d={`M${cx - 13} ${cy - 13} L${cx + 13} ${cy + 13} M${cx + 13} ${cy - 13} L${cx - 13} ${cy + 13}`} />);
    }
  }
  return (
    <Frame rows={N} cols={N} preview={preview} label={`Crowns board, ${N} by ${N}`} ref={ref}
      onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      <clipPath id={`clip${N}`}><rect width={N * U} height={N * U} rx={22} /></clipPath>
      <g clipPath={`url(#clip${N})`}>{cells}</g>
      <g className="grid-thin">{thin}</g>
      <g className="grid-thick">{thick}</g>
      <rect className="grid-edge" width={N * U} height={N * U} rx={22} />
      {marks}
      <HintMarks hint={hint} cols={N} />
      {!preview && !done && <FocusRing cols={N} cell={focus} />}
    </Frame>
  );
}

function hint(p: CrownsPuzzle, s: S, sol: number[]): Hint | null {
  const wrong = crownCells(s).filter((i) => sol[Math.floor(i / p.size)] !== i % p.size);
  if (wrong.length) {
    return { text: 'This crown is in the wrong place. Take it off and try again.', because: [], cells: [wrong[0]],
      apply: (st: S) => st.map((v, i) => (i === wrong[0] ? EMPTY : v)) };
  }
  const step = nextStep(stateFrom(p, crownCells(s)));
  if (!step) return null;
  return { text: step.text, because: step.because.filter((i) => !step.cells.includes(i)), cells: step.cells,
    apply: (st: S) => st.map((v, i) => (step.cells.includes(i) ? (step.value === CROWN ? QUEEN : CROSS) : v)) };
}

export const crownsUI: GameUI<CrownsPuzzle, S, number[]> = {
  initial: (p) => new Array(p.size * p.size).fill(EMPTY),
  solved: (p, s, sol) => { const q = crownCells(s); return q.length === p.size && q.every((i) => sol[Math.floor(i / p.size)] === i % p.size); },
  solvedState: (p, sol) => { const s = new Array(p.size * p.size).fill(EMPTY); sol.forEach((c, r) => { s[r * p.size + c] = QUEEN; }); return s; },
  hint, Board,
};
