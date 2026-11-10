import { useMemo, useRef } from 'react';
import { traceNeighbors, type TracePuzzle } from '../../engine/trace/solve.ts';
import { cellAt, Frame, HintMarks, mid, Tiles, U, xy, type BoardProps, type GameUI, type Hint } from './common.tsx';

/** the cells of the line so far, starting on number 1 */
type S = number[];

const startOf = (p: TracePuzzle) => +Object.keys(p.numbers).find((c) => p.numbers[+c] === 0)!;

function Board({ puzzle: p, state, set, done, hint, preview }: BoardProps<TracePuzzle, S, number[]>) {
  const { rows, cols } = p, ref = useRef<SVGSVGElement>(null);
  const adj = useMemo(() => traceNeighbors(p), [p]);
  const dragging = useRef(false), live = useRef(state);
  live.current = state;
  const last = Math.max(...Object.values(p.numbers));

  /** Walk the line toward `cell`: step back if it is the previous cell, else extend. */
  const reachFor = (cell: number, merge: boolean): boolean => {
    let path = live.current.slice(), changed = false;
    for (let guard = 0; guard < rows + cols; guard++) {
      const head = path[path.length - 1];
      if (head === cell) break;
      const at = path.indexOf(cell);
      if (at !== -1) { path = path.slice(0, at + 1); changed = true; break; }
      // one step along the row or column toward the target
      const hr = Math.floor(head / cols), hc = head % cols, r = Math.floor(cell / cols), c = cell % cols;
      if (hr !== r && hc !== c) break;
      const next = hr === r ? head + Math.sign(c - hc) : head + Math.sign(r - hr) * cols;
      if (!adj[head].includes(next)) break;
      if (path.includes(next)) { path = path.slice(0, path.indexOf(next) + 1); changed = true; continue; }
      const seen = path.filter((x) => x in p.numbers).length;
      if (next in p.numbers && p.numbers[next] !== seen) break;
      if (p.numbers[head] === last) break;
      path.push(next); changed = true;
    }
    if (changed) { live.current = path; set(path, merge); }
    return changed;
  };
  const down = (e: React.PointerEvent) => {
    if (done) return;
    const i = cellAt(ref.current!, e, rows, cols);
    if (i < 0) return;
    ref.current!.setPointerCapture(e.pointerId);
    dragging.current = true;
    reachFor(i, false);
  };
  const moveTo = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const i = cellAt(ref.current!, e, rows, cols);
    if (i >= 0) reachFor(i, true);
  };
  const key = (e: React.KeyboardEvent) => {
    if (done) return;
    const head = state[state.length - 1];
    const d = e.key === 'ArrowUp' ? -cols : e.key === 'ArrowDown' ? cols : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (d && adj[head].includes(head + d)) { e.preventDefault(); reachFor(head + d, false); }
    else if (e.key === 'Backspace' && state.length > 1) set(state.slice(0, -1));
  };

  const on = new Set(state), head = state[state.length - 1];
  const d = state.map((c, i) => `${i ? 'L' : 'M'}${mid(cols, c).join(' ')}`).join(' ');
  return (
    <Frame rows={rows} cols={cols} preview={preview} label={`Trace board, ${rows} by ${cols}`} ref={ref}
      onPointerDown={down} onPointerMove={moveTo} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }} onKeyDown={key}>
      <Tiles rows={rows} cols={cols} className={(i) => (on.has(i) ? 'is-on' : '')} />
      {state.length > 1 && <path className="trace-line" d={d} />}
      {!done && !preview && (() => { const [x, y] = mid(cols, head); return <circle className="trace-head" cx={x} cy={y} r={21} />; })()}
      <g className="walls">
        {p.walls.map(([c, dir], i) => {
          const [x, y] = xy(cols, c);
          const l = dir === 'RIGHT' ? [x + U, y + 8, x + U, y + U - 8] : dir === 'DOWN' ? [x + 8, y + U, x + U - 8, y + U]
            : dir === 'LEFT' ? [x, y + 8, x, y + U - 8] : [x + 8, y, x + U - 8, y];
          return <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />;
        })}
      </g>
      {Object.entries(p.numbers).map(([c, n]) => {
        const [x, y] = mid(cols, +c);
        return <g key={c} className="stop"><circle cx={x} cy={y} r={29} /><text x={x} y={y + 11}>{n + 1}</text></g>;
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
