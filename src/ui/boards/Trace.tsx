import { useMemo, useRef, useState } from 'react';
import { traceNeighbors, type TracePuzzle } from '../../engine/trace/solve.ts';
import { buzz, cellAt, cellInside, Frame, gridPoint, HintMarks, mid, samples, Tiles, U, xy, type BoardProps, type GameUI, type Hint } from './common.tsx';

/** the cells of the line so far, starting on number 1 */
type S = number[];

const startOf = (p: TracePuzzle) => +Object.keys(p.numbers).find((c) => p.numbers[+c] === 0)!;

function Board({ puzzle: p, state, set, done, hint, preview }: BoardProps<TracePuzzle, S, number[]>) {
  const { rows, cols } = p, ref = useRef<SVGSVGElement>(null);
  const adj = useMemo(() => traceNeighbors(p), [p]);
  const last = Math.max(...Object.values(p.numbers));
  const live = useRef(state), drag = useRef<{ pt: { x: number; y: number }; moved: boolean } | null>(null);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  live.current = state;

  /** Can the line go from its head to `c`? */
  const canEnter = (path: number[], c: number) => {
    const head = path[path.length - 1];
    if (!adj[head].includes(c) || path.includes(c) || p.numbers[head] === last) return false;
    const seen = path.filter((x) => x in p.numbers).length;
    return !(c in p.numbers) || p.numbers[c] === seen;
  };
  /** Move the line toward cell c: back up over itself, step forward, or cut a corner. */
  const toward = (path: number[], c: number): number[] => {
    const head = path[path.length - 1];
    if (c === head) return path;
    const at = path.indexOf(c);
    if (at !== -1) return path.slice(0, at + 1);
    if (canEnter(path, c)) return [...path, c];
    // a diagonal move: go through whichever corner cell is open
    const hr = Math.floor(head / cols), hc = head % cols, r = Math.floor(c / cols), q = c % cols;
    if (Math.abs(hr - r) === 1 && Math.abs(hc - q) === 1) {
      for (const mid of [hr * cols + q, r * cols + hc]) {
        if (canEnter(path, mid) && canEnter([...path, mid], c)) return [...path, mid, c];
      }
    }
    return path;
  };
  const follow = (pt: { x: number; y: number }, first: boolean) => {
    let path = live.current;
    for (const s of samples(drag.current?.pt ?? null, pt)) {
      const c = cellInside(s, rows, cols);
      if (c >= 0) path = toward(path, c);
    }
    if (drag.current) drag.current.pt = pt;
    if (path !== live.current) {
      if (path.length > live.current.length) buzz(6);
      live.current = path;
      set(path, !first || (drag.current?.moved ?? false));
      if (drag.current) drag.current.moved = true;
    }
  };
  const down = (e: React.PointerEvent) => {
    if (done || e.button > 0) return;
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    const pt = gridPoint(ref.current!, e, cols), c = cellAt(ref.current!, e, rows, cols);
    drag.current = { pt, moved: false };
    // grabbing the line anywhere rewinds it to there
    const at = live.current.indexOf(c);
    if (at !== -1 && at < live.current.length - 1) { live.current = live.current.slice(0, at + 1); set(live.current); drag.current.moved = true; }
    else follow(pt, true);
    setFinger(pt);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const pt = gridPoint(ref.current!, e, cols);
    follow(pt, false);
    setFinger(pt);
  };
  const up = () => { drag.current = null; setFinger(null); };
  const key = (e: React.KeyboardEvent) => {
    if (done) return;
    const head = state[state.length - 1];
    const d = e.key === 'ArrowUp' ? -cols : e.key === 'ArrowDown' ? cols : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (d && adj[head].includes(head + d)) { e.preventDefault(); const next = toward(state, head + d); if (next !== state) set(next); }
    else if (e.key === 'Backspace' && state.length > 1) set(state.slice(0, -1));
  };

  const on = new Set(state), head = state[state.length - 1];
  const d = state.map((c, i) => `${i ? 'L' : 'M'}${mid(cols, c).join(' ')}`).join(' ');
  const [hx, hy] = mid(cols, head);
  // the tail follows the finger a little way out of the head cell
  let tail: [number, number] | null = null;
  if (finger && !done) {
    const fx = finger.x * U, fy = finger.y * U, dx = fx - hx, dy = fy - hy;
    const horiz = Math.abs(dx) >= Math.abs(dy), len = Math.min(U * 0.45, Math.abs(horiz ? dx : dy));
    if (len > 4) tail = horiz ? [hx + Math.sign(dx) * len, hy] : [hx, hy + Math.sign(dy) * len];
  }
  return (
    <Frame rows={rows} cols={cols} preview={preview} label={`Trace board, ${rows} by ${cols}`} ref={ref}
      className={`board${preview ? ' is-preview' : ''}${done && !preview ? ' is-won' : ''}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onKeyDown={key}>
      <Tiles rows={rows} cols={cols} className={(i) => (on.has(i) ? 'is-on' : '')} />
      {state.length > 1 && <path className="trace-line" d={d} />}
      {tail && <line className="trace-line trace-tail" x1={hx} y1={hy} x2={tail[0]} y2={tail[1]} />}
      {!done && !preview && <circle className={`trace-head${finger ? ' is-held' : ''}`} cx={hx} cy={hy} r={21} />}
      <g className="walls">
        {p.walls.map(([c, dir], i) => {
          const [x, y] = xy(cols, c);
          const l = dir === 'RIGHT' ? [x + U, y, x + U, y + U] : dir === 'DOWN' ? [x, y + U, x + U, y + U]
            : dir === 'LEFT' ? [x, y, x, y + U] : [x, y, x + U, y];
          return <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />;
        })}
      </g>
      {Object.entries(p.numbers).map(([c, n]) => {
        const [x, y] = mid(cols, +c);
        return <g key={c} className={`stop${on.has(+c) ? ' is-reached' : ''}`}><circle cx={x} cy={y} r={29} /><text x={x} y={y + 11}>{n + 1}</text></g>;
      })}
      <HintMarks hint={hint} cols={cols} />
    </Frame>
  );
}

function hint(_p: TracePuzzle, s: S, sol: number[]): Hint | null {
  let ok = 0;
  while (ok < s.length && s[ok] === sol[ok]) ok++;
  if (ok < s.length) {
    return { text: 'The line goes wrong at the marked cell. Rewind to there and take another turn.', because: [], cells: [s[ok]], apply: () => sol.slice(0, ok) };
  }
  if (ok >= sol.length) return null;
  const next = sol.slice(ok, ok + 3);
  return { text: 'From the end of your line, the path continues through the marked cells.', because: [s[s.length - 1]], cells: next, apply: () => sol.slice(0, ok + next.length) };
}

export const traceUI: GameUI<TracePuzzle, S, number[]> = {
  initial: (p) => [startOf(p)],
  solved: (p, s, sol) => s.length === p.rows * p.cols && s[s.length - 1] === sol[sol.length - 1],
  solvedState: (_p, sol) => sol.slice(),
  hint, Board,
};
