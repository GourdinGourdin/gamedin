import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { traceNeighbors, type TracePuzzle } from '../../engine/trace/solve.ts';
import { buzz, cellAt, cellInside, Frame, gridPoint, mid, route, samples, Tiles, U, xy, type BoardProps, type GameUI, type Hint } from './common.tsx';

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
  const live = useRef(state), drag = useRef<{ moved: boolean; last: Pt | null; queue: Pt[] } | null>(null);
  const tail = useRef<SVGLineElement>(null), headEl = useRef<SVGCircleElement>(null), ringEl = useRef<SVGCircleElement>(null);
  const segs = useRef<(SVGLineElement | null)[]>([]);
  // The line's drawn length, in cells along the path. It chases the real length
  // (path steps, plus a stub toward the finger) a little each frame, so the
  // line flows after the finger instead of jumping a cell at a time.
  const anim = useRef({ p: state.length - 1, raf: 0, last: 0, pt: null as Pt | null, dir: [1, 0] as [number, number] });
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

  /** How far past the head the line should reach toward the finger, in cells (0 to 0.5), and which way. */
  const stubTarget = (): number => {
    const a = anim.current, path = live.current, head = path[path.length - 1];
    if (!a.pt || done) return 0;
    const [hx, hy] = mid(cols, head), dx = a.pt.x * U - hx, dy = a.pt.y * U - hy, horiz = Math.abs(dx) >= Math.abs(dy);
    const dir: [number, number] = horiz ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    const next = head + (horiz ? dir[0] : dir[1] * cols);
    // only reach toward a cell the line could actually enter
    if (!canEnter(path, next) && next !== path[path.length - 2]) return 0;
    if (dir[0] !== a.dir[0] || dir[1] !== a.dir[1]) { a.p = Math.min(a.p, path.length - 1); a.dir = dir; }
    return Math.min(0.5, Math.max(0, Math.abs(horiz ? dx : dy) - 4) / U);
  };
  /** Draw the line up to length a.p straight onto the DOM, bypassing React. */
  const paint = () => {
    const a = anim.current, path = live.current, L = path.length - 1, shown = Math.min(a.p, L);
    for (let i = Math.max(0, Math.floor(shown) - 2); i < segs.current.length; i++) {
      const el = segs.current[i];
      if (!el || i >= L) continue;
      const f = Math.min(1, Math.max(0, shown - i)), [ax, ay] = mid(cols, path[i]), [bx, by] = mid(cols, path[i + 1]);
      el.style.display = f > 0 ? '' : 'none';
      el.setAttribute('x2', String(ax + (bx - ax) * f)); el.setAttribute('y2', String(ay + (by - ay) * f));
    }
    const [hx, hy] = mid(cols, path[L]), over = Math.max(0, a.p - L) * U;
    let ex = hx, ey = hy;
    if (a.p > L) { ex = hx + a.dir[0] * over; ey = hy + a.dir[1] * over; }
    else if (L > 0) { const i = Math.min(L - 1, Math.floor(a.p)), [ax, ay] = mid(cols, path[i]), [bx, by] = mid(cols, path[i + 1]), f = a.p - i; ex = ax + (bx - ax) * f; ey = ay + (by - ay) * f; }
    const t = tail.current;
    if (t) {
      t.setAttribute('x1', String(hx)); t.setAttribute('y1', String(hy)); t.setAttribute('x2', String(ex)); t.setAttribute('y2', String(ey));
      t.style.stroke = lineColor(L, n); t.style.display = a.p > L ? '' : 'none';
    }
    for (const el of [headEl.current, ringEl.current]) if (el) { el.setAttribute('cx', String(ex)); el.setAttribute('cy', String(ey)); }
  };
  const tick = (now: number) => {
    const a = anim.current, d = drag.current;
    a.raf = 0;
    const dt = Math.min(48, now - a.last || 16); a.last = now;
    if (d?.queue.length) { const pts = d.queue; d.queue = []; follow(pts, false); }
    const goal = live.current.length - 1 + stubTarget(), diff = goal - a.p;
    a.p = Math.abs(diff) < 0.004 ? goal : a.p + diff * (1 - Math.exp(-dt / 38));
    paint();
    if (a.p !== goal || d?.queue.length) kick();
  };
  const kick = () => { const a = anim.current; if (!a.raf) { a.last = performance.now(); a.raf = requestAnimationFrame(tick); } };
  const follow = (pts: Pt[], first: boolean) => {
    let path = live.current;
    for (const pt of pts) {
      for (const s of samples(first ? null : drag.current?.last ?? null, pt)) {
        const c = cellInside(s, rows, cols);
        if (c >= 0) path = toward(path, c);
      }
      if (drag.current) drag.current.last = pt;
    }
    anim.current.pt = pts[pts.length - 1];
    if (path !== live.current) {
      if (path.length > live.current.length) buzz(5);
      live.current = path;
      set(path, !first || (drag.current?.moved ?? false));
      if (drag.current) drag.current.moved = true;
    }
    kick();
  };
  const down = (e: React.PointerEvent) => {
    if (done || e.button > 0) return;
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    const pt = gridPoint(ref.current!, e, cols), c = cellAt(ref.current!, e, rows, cols);
    drag.current = { moved: false, last: pt, queue: [] };
    setHeld(true);
    // grabbing the line anywhere rewinds it to there
    const at = live.current.indexOf(c);
    if (at !== -1 && at < live.current.length - 1) {
      live.current = live.current.slice(0, at + 1); set(live.current); drag.current.moved = true; anim.current.pt = pt; kick();
    } else follow([pt], true);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e.nativeEvent]) d.queue.push(gridPoint(ref.current!, ev, cols));
    kick();
  };
  const up = () => {
    const d = drag.current;
    if (!d) return;
    if (d.queue.length) follow(d.queue, false);
    drag.current = null;
    anim.current.pt = null;
    setHeld(false);
    kick();
  };
  // after every render: the path may have grown or shrunk, so fit the drawn length to it before paint
  useLayoutEffect(() => {
    const a = anim.current, L = state.length - 1;
    if (done || preview) a.p = L;
    else if (a.p > L + 0.5) a.p = L;
    paint();
    if (a.p !== L) kick();
  });
  useEffect(() => () => cancelAnimationFrame(anim.current.raf), []);
  const key = (e: React.KeyboardEvent) => {
    if (done) return;
    const head = state[state.length - 1];
    const d = e.key === 'ArrowUp' ? -cols : e.key === 'ArrowDown' ? cols : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (d && adj[head].includes(head + d)) { e.preventDefault(); const next = toward(state, head + d); if (next !== state) set(next); }
    else if (e.key === 'Backspace' && state.length > 1) set(state.slice(0, -1));
  };

  const head = state[state.length - 1], [hx, hy] = mid(cols, head), on = new Set(state);
  const headColor = lineColor(state.length - 1, n);
  const guide = hint?.arrow && hint.arrow[0] === head && hint.arrow.length > 1 ? hint.arrow[1] : null;
  return (
    <Frame rows={rows} cols={cols} preview={preview} label={`Trace board, ${rows} by ${cols}`} ref={ref}
      className={`board${preview ? ' is-preview' : ''}${done && !preview ? ' is-won' : ''}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onKeyDown={key}>
      <Tiles rows={rows} cols={cols} />
      <g className="trace-segs">
        {state.slice(1).map((c, i) => {
          const [ax, ay] = mid(cols, state[i]), [bx, by] = mid(cols, c);
          return <line key={i} ref={(el) => { segs.current[i] = el; }} className="trace-seg" x1={ax} y1={ay} x2={bx} y2={by} style={{ stroke: lineColor(i + 0.5, n) }} />;
        })}
      </g>
      {guide && (() => {
        // the hint: one step of the line, faded, with a chevron pointing the way
        const [gx, gy] = mid(cols, guide), ang = (Math.atan2(gy - hy, gx - hx) * 180) / Math.PI;
        return (
          <g className="trace-guide" aria-hidden="true">
            <line className="trace-seg" x1={hx} y1={hy} x2={gx} y2={gy} style={{ stroke: lineColor(state.length - 0.5, n) }} />
            <g transform={`translate(${(hx + gx) / 2} ${(hy + gy) / 2}) rotate(${ang})`}><path className="trace-chevron" d="M-9 -13 L5 0 L-9 13" /></g>
          </g>
        );
      })()}
      {done && !preview && state.length > 1 && <path className="trace-sweep" d={route(cols, state)} pathLength={1} />}
      {/* drawn by paint(), outside React, so a re-render never snaps it back */}
      <line ref={tail} className="trace-tail" />
      {!done && !preview && (
        <>
          <circle ref={ringEl} className={`trace-ring${held ? ' is-held' : ''}`} cx={hx} cy={hy} r={26} style={{ stroke: headColor }} />
          <circle ref={headEl} className="trace-head" cx={hx} cy={hy} r={23} style={{ fill: headColor }} />
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
    </Frame>
  );
}

function hint(_p: TracePuzzle, s: S, sol: number[]): Hint | null {
  let ok = 0;
  while (ok < s.length && s[ok] === sol[ok]) ok++;
  if (ok >= sol.length) return null;
  const arrow = [sol[ok - 1], sol[ok]];
  const apply = () => sol.slice(0, ok + 1);
  if (ok < s.length) {
    // the line went off the route: wind it back to the last right cell straight away
    return { text: 'Your line left the route, so it was wound back to the last right cell. Go the way the arrow points.', because: [], cells: [], arrow, apply, now: () => sol.slice(0, ok) };
  }
  return { text: 'Go the way the arrow points.', because: [], cells: [], arrow, apply };
}

export const traceUI: GameUI<TracePuzzle, S, number[]> = {
  initial: (p) => [startOf(p)],
  solved: (p, s, sol) => s.length === p.rows * p.cols && s[s.length - 1] === sol[sol.length - 1],
  solvedState: (_p, sol) => sol.slice(),
  hint, Board,
};
