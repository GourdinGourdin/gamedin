import { useMemo, useRef, useState } from 'react';
import { traceNeighbors, type TracePuzzle } from '../../engine/trace/solve.ts';
import { buzz, cellAt, cellInside, Frame, gridPoint, HintMarks, mid, route, samples, Tiles, U, xy, type BoardProps, type GameUI, type Hint } from './common.tsx';

/** the cells of the line so far, starting on number 1 */
type S = number[];

const startOf = (p: TracePuzzle) => +Object.keys(p.numbers).find((c) => p.numbers[+c] === 0)!;

/** Colour of the line at step i of n: it warms from orange through rose to violet as it grows. */
export function lineColor(i: number, n: number): string {
  const t = n > 1 ? Math.min(1, i / (n - 1)) : 0;
  const h = 22 - t * 118, s = 82 - t * 10, l = 56 + Math.sin(t * Math.PI) * 3;
  return `hsl(${(h + 360) % 360} ${s}% ${l}%)`;
}

type Pt = { x: number; y: number };

function Board({ puzzle: p, state, set, done, hint, preview }: BoardProps<TracePuzzle, S, number[]>) {
  const { rows, cols } = p, n = rows * cols, ref = useRef<SVGSVGElement>(null);
  const adj = useMemo(() => traceNeighbors(p), [p]);
  const last = Math.max(...Object.values(p.numbers));
  const live = useRef(state), drag = useRef<{ pt: Pt; moved: boolean; queue: Pt[]; frame: number } | null>(null);
  const tail = useRef<SVGLineElement>(null);
  const [held, setHeld] = useState(false);
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
    const hr = Math.floor(head / cols), hc = head % cols, r = Math.floor(c / cols), q = c % cols;
    if (Math.abs(hr - r) === 1 && Math.abs(hc - q) === 1) {
      for (const m of [hr * cols + q, r * cols + hc]) {
        if (canEnter(path, m) && canEnter([...path, m], c)) return [...path, m, c];
      }
    }
    return path;
  };
  /** The short stub from the head toward the finger, drawn straight to the DOM. */
  const drawTail = (pt: Pt | null) => {
    const el = tail.current;
    if (!el) return;
    const path = live.current, head = path[path.length - 1], [hx, hy] = mid(cols, head);
    let tx = hx, ty = hy;
    if (pt) {
      const dx = pt.x * U - hx, dy = pt.y * U - hy, horiz = Math.abs(dx) >= Math.abs(dy);
      const len = Math.min(U * 0.5, Math.abs(horiz ? dx : dy));
      if (len > 4) { if (horiz) tx = hx + Math.sign(dx) * len; else ty = hy + Math.sign(dy) * len; }
    }
    el.setAttribute('x1', String(hx)); el.setAttribute('y1', String(hy));
    el.setAttribute('x2', String(tx)); el.setAttribute('y2', String(ty));
    el.style.stroke = lineColor(path.length - 1, n);
    el.style.opacity = pt ? '1' : '0';
  };
  const follow = (pts: Pt[], first: boolean) => {
    let path = live.current;
    for (const pt of pts) {
      for (const s of samples(first ? null : drag.current?.pt ?? null, pt)) {
        const c = cellInside(s, rows, cols);
        if (c >= 0) path = toward(path, c);
      }
      if (drag.current) drag.current.pt = pt;
    }
    const pt = pts[pts.length - 1];
    if (path !== live.current) {
      if (path.length > live.current.length) buzz(5);
      live.current = path;
      set(path, !first || (drag.current?.moved ?? false));
      if (drag.current) drag.current.moved = true;
    }
    drawTail(pt);
  };
  // pointer moves arrive faster than the screen draws: queue them, and walk
  // the queue once per frame, so every turn of the finger still counts
  const frame = () => {
    const d = drag.current;
    if (!d) return;
    d.frame = 0;
    if (d.queue.length) { const pts = d.queue; d.queue = []; follow(pts, false); }
  };
  const down = (e: React.PointerEvent) => {
    if (done || e.button > 0) return;
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    const pt = gridPoint(ref.current!, e, cols), c = cellAt(ref.current!, e, rows, cols);
    drag.current = { pt, moved: false, queue: [], frame: 0 };
    setHeld(true);
    // grabbing the line anywhere rewinds it to there
    const at = live.current.indexOf(c);
    if (at !== -1 && at < live.current.length - 1) {
      live.current = live.current.slice(0, at + 1); set(live.current); drag.current.moved = true; drawTail(pt);
    } else follow([pt], true);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e.nativeEvent]) d.queue.push(gridPoint(ref.current!, ev, cols));
    if (!d.frame) d.frame = requestAnimationFrame(frame);
  };
  const up = () => {
    const d = drag.current;
    if (!d) return;
    if (d.frame) cancelAnimationFrame(d.frame);
    if (d.queue.length) follow(d.queue, false);
    drag.current = null;
    setHeld(false);
    drawTail(null);
  };
  const key = (e: React.KeyboardEvent) => {
    if (done) return;
    const head = state[state.length - 1];
    const d = e.key === 'ArrowUp' ? -cols : e.key === 'ArrowDown' ? cols : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (d && adj[head].includes(head + d)) { e.preventDefault(); const next = toward(state, head + d); if (next !== state) set(next); }
    else if (e.key === 'Backspace' && state.length > 1) set(state.slice(0, -1));
  };

  const head = state[state.length - 1], [hx, hy] = mid(cols, head), on = new Set(state);
  const headColor = lineColor(state.length - 1, n);
  return (
    <Frame rows={rows} cols={cols} preview={preview} label={`Trace board, ${rows} by ${cols}`} ref={ref}
      className={`board${preview ? ' is-preview' : ''}${done && !preview ? ' is-won' : ''}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onKeyDown={key}>
      <Tiles rows={rows} cols={cols} />
      <g className="trace-segs">
        {state.slice(1).map((c, i) => {
          const [ax, ay] = mid(cols, state[i]), [bx, by] = mid(cols, c);
          return <line key={i} className="trace-seg" x1={ax} y1={ay} x2={bx} y2={by} style={{ stroke: lineColor(i + 0.5, n) }} />;
        })}
      </g>
      {done && !preview && state.length > 1 && <path className="trace-sweep" d={route(cols, state)} pathLength={1} />}
      {/* drawn by drawTail(), outside React, so a re-render never snaps it back */}
      <line ref={tail} className="trace-tail" />
      {!done && !preview && (
        <>
          <circle className={`trace-ring${held ? ' is-held' : ''}`} cx={hx} cy={hy} r={26} style={{ stroke: headColor }} />
          <circle className="trace-head" cx={hx} cy={hy} r={23} style={{ fill: headColor }} />
        </>
      )}
      <g className="walls">
        <path d={p.walls.map(([c, dir]) => {
          const [x, y] = xy(cols, c);
          return dir === 'RIGHT' ? `M${x + U} ${y}V${y + U}` : dir === 'DOWN' ? `M${x} ${y + U}H${x + U}` : dir === 'LEFT' ? `M${x} ${y}V${y + U}` : `M${x} ${y}H${x + U}`;
        }).join('')} />
      </g>
      {Object.entries(p.numbers).map(([c, k]) => {
        const [x, y] = mid(cols, +c);
        return <g key={c} className={`stop${on.has(+c) ? ' is-reached' : ''}`}><circle cx={x} cy={y} r={29} /><text x={x} y={y + 11}>{k + 1}</text></g>;
      })}
      <HintMarks hint={hint} cols={cols} />
    </Frame>
  );
}

function hint(_p: TracePuzzle, s: S, sol: number[]): Hint | null {
  let ok = 0;
  while (ok < s.length && s[ok] === sol[ok]) ok++;
  if (ok >= sol.length) return null;
  const arrow = sol.slice(Math.max(0, ok - 1), ok + 3);
  const apply = () => sol.slice(0, Math.min(sol.length, ok + 3));
  if (ok < s.length) {
    return { text: 'Your line leaves the route at the marked cell. Rewind to the arrow and follow it.', because: [], cells: [s[ok]], arrow, apply };
  }
  return { text: 'Follow the arrow from the end of your line.', because: [], cells: [], arrow, apply };
}

export const traceUI: GameUI<TracePuzzle, S, number[]> = {
  initial: (p) => [startOf(p)],
  solved: (p, s, sol) => s.length === p.rows * p.cols && s[s.length - 1] === sol[sol.length - 1],
  solvedState: (_p, sol) => sol.slice(),
  hint, Board,
};
