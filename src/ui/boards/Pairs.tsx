import { useRef } from 'react';
import type { PairsPuzzle } from '../../engine/pairs/solve.ts';
import { nextStep, stateFrom } from '../../engine/pairs/logic.ts';
import { buzz, cellAt, Frame, FocusRing, HintMarks, mid, Tiles, U, useGridFocus, type BoardProps, type GameUI, type Hint } from './common.tsx';

/** -1 empty, 0 circle, 1 square (givens included) */
type S = number[];

function errors(p: PairsPuzzle, s: S): { cells: Set<number>; edges: Set<number> } {
  const N = p.size, cells = new Set<number>(), edges = new Set<number>();
  for (let i = 0; i < N; i++) {
    for (const line of [Array.from({ length: N }, (_, j) => i * N + j), Array.from({ length: N }, (_, j) => j * N + i)]) {
      for (let j = 0; j + 2 < N; j++) {
        const [a, b, c] = [line[j], line[j + 1], line[j + 2]];
        if (s[a] !== -1 && s[a] === s[b] && s[b] === s[c]) { cells.add(a); cells.add(b); cells.add(c); }
      }
      for (let v = 0; v < 2; v++) {
        const same = line.filter((c) => s[c] === v);
        if (same.length > N / 2) same.forEach((c) => cells.add(c));
      }
    }
  }
  p.edges.forEach(([a, b, t], i) => { if (s[a] !== -1 && s[b] !== -1 && (s[a] === s[b]) !== (t === '=')) edges.add(i); });
  return { cells, edges };
}

function Board({ puzzle: p, state, set, done, hint, preview, settings }: BoardProps<PairsPuzzle, S, number[]>) {
  const N = p.size, ref = useRef<SVGSVGElement>(null);
  const { focus, setFocus, move } = useGridFocus(N, N);
  const err = settings.showErrors ? errors(p, state) : { cells: new Set<number>(), edges: new Set<number>() };
  const cycle = (i: number) => {
    if (done || i in p.given) return; // starting cells are fixed
    const next = state.slice();
    next[i] = state[i] === -1 ? 0 : state[i] === 0 ? 1 : -1;
    set(next);
  };
  const down = (e: React.PointerEvent) => { if (e.button > 0) return; e.preventDefault(); const i = cellAt(ref.current!, e, N, N); if (i >= 0) { setFocus(i); cycle(i); buzz(6); } };
  const key = (e: React.KeyboardEvent) => {
    if (move(e.key) !== null) e.preventDefault();
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cycle(focus); }
  };
  return (
    <Frame rows={N} cols={N} preview={preview} label={`Pairs board, ${N} by ${N}`} ref={ref} onPointerDown={down} onKeyDown={key}>
      <Tiles rows={N} cols={N} className={(i) => `${i in p.given ? 'is-given' : ''} ${err.cells.has(i) && !(i in p.given) ? 'is-bad' : ''}`} />
      {state.map((v, i) => {
        if (v === -1) return null;
        const [x, y] = mid(N, i);
        // keyed by value, so a change remounts the symbol and it flips in
        return v === 0
          ? <g key={`${i}a`} className="sym"><circle className="sym-a" cx={x} cy={y} r={27} /><ellipse className="sym-shine" cx={x - 9} cy={y - 10} rx={9} ry={6} transform={`rotate(-35 ${x - 9} ${y - 10})`} /></g>
          : <g key={`${i}b`} className="sym"><rect className="sym-b" x={x - 24} y={y - 24} width={48} height={48} rx={11} /><rect className="sym-shine" x={x - 16} y={y - 16} width={14} height={9} rx={4.5} /></g>;
      })}
      {p.edges.map(([a, b, t], i) => {
        const [ax, ay] = mid(N, a), [bx, by] = mid(N, b), x = (ax + bx) / 2, y = (ay + by) / 2;
        return (
          <g key={i} className={`link${err.edges.has(i) ? ' is-bad' : ''}`} transform={`translate(${x} ${y})`}>
            <circle r={15} />
            {t === '=' ? <path d="M-7 -4 H7 M-7 4 H7" /> : <path d="M-6 -6 L6 6 M6 -6 L-6 6" />}
          </g>
        );
      })}
      <HintMarks hint={hint} cols={N} />
      {!preview && !done && <FocusRing cols={N} cell={focus} />}
    </Frame>
  );
}

function hint(p: PairsPuzzle, s: S, sol: number[]): Hint | null {
  const wrong = s.findIndex((v, i) => v !== -1 && v !== sol[i]);
  if (wrong !== -1) return { text: 'This cell is wrong. Clear it and look again.', because: [], cells: [wrong], apply: (st: S) => st.map((v, i) => (i === wrong ? -1 : v)) };
  const step = nextStep(stateFrom(p, s));
  if (!step) return null;
  return { text: step.text, because: step.because, cells: step.cells, apply: (st: S) => st.map((v, i) => (step.cells.includes(i) ? step.value : v)) };
}

export const pairsUI: GameUI<PairsPuzzle, S, number[]> = {
  initial: (p) => Array.from({ length: p.size * p.size }, (_, i) => p.given[i] ?? -1),
  solved: (_p, s, sol) => s.every((v, i) => v === sol[i]),
  solvedState: (_p, sol) => sol.slice(),
  hint, Board,
};
