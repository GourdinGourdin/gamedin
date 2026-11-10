import { useRef, useState } from 'react';
import { rectCells, shapeOf, type PlotShape, type PlotsPuzzle, type Rect } from '../../engine/plots/solve.ts';
import { nextStep, stateFrom } from '../../engine/plots/logic.ts';
import { buzz, cellAt, cellInside, Frame, gridPoint, FocusRing, HintMarks, mid, Tiles, U, useGridFocus, waveDelay, type BoardProps, type GameUI, type Hint } from './common.tsx';

type S = Rect[];

const same = (a: Rect, b: Rect) => a.every((v, i) => v === b[i]);
const overlap = (a: Rect, b: Rect) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const span = (cols: number, a: number, b: number): Rect => {
  const r1 = Math.floor(a / cols), c1 = a % cols, r2 = Math.floor(b / cols), c2 = b % cols;
  return [Math.min(r1, r2), Math.min(c1, c2), Math.abs(r1 - r2) + 1, Math.abs(c1 - c2) + 1];
};
const holds = (k: Rect, r: number, c: number) => r >= k[0] && r < k[0] + k[2] && c >= k[1] && c < k[1] + k[3];

/** One side of a rectangle follows the finger: the side that was grabbed. A
 *  grab in the middle (or on a one-cell-thick side) only stretches outward. */
function stretch(min: number, max: number, grab: number, to: number): [number, number] {
  const onMin = grab === min, onMax = grab === max;
  if (onMax && !onMin) return [Math.min(min, to), Math.max(min, to)];
  if (onMin && !onMax) return [Math.min(max, to), Math.max(max, to)];
  return [Math.min(min, to), Math.max(max, to)];
}
function resize(cols: number, base: Rect, grab: number, to: number): Rect {
  const [r0, r1] = stretch(base[0], base[0] + base[2] - 1, Math.floor(grab / cols), Math.floor(to / cols));
  const [c0, c1] = stretch(base[1], base[1] + base[3] - 1, grab % cols, to % cols);
  return [r0, c0, r1 - r0 + 1, c1 - c0 + 1];
}

/** The clue a rectangle satisfies, or -1 if it holds none, several, or the wrong one. */
function clueOf(p: PlotsPuzzle, rect: Rect): number {
  const cells = new Set(rectCells(p.cols, rect));
  const inside = p.clues.flatMap((c, i) => (cells.has(c.cell) ? [i] : []));
  if (inside.length !== 1) return -1;
  const c = p.clues[inside[0]];
  if ((c.size && c.size !== rect[2] * rect[3]) || (c.shape !== 'any' && c.shape !== shapeOf(rect[2], rect[3]))) return -1;
  return inside[0];
}

const GLYPH: Record<PlotShape, [number, number]> = { square: [60, 60], tall: [44, 70], wide: [70, 44], any: [60, 60] };

function Legend({ shapes }: { shapes: PlotShape[] }) {
  const label: Record<PlotShape, string> = { square: 'Square', tall: 'Tall', wide: 'Wide', any: 'Any shape' };
  const box: Record<PlotShape, [number, number, number, number]> = { square: [4, 4, 14, 14], tall: [6, 2, 10, 18], wide: [2, 6, 18, 10], any: [4, 4, 14, 14] };
  return (
    <ul className="legend" aria-label="Clue shapes">
      {(['square', 'tall', 'wide', 'any'] as PlotShape[]).filter((s) => shapes.includes(s)).map((s) => {
        const [x, y, w, h] = box[s];
        return <li key={s}><svg viewBox="0 0 22 22" aria-hidden="true"><rect className={s === 'any' ? 'any' : ''} x={x} y={y} width={w} height={h} rx={3} /></svg>{label[s]}</li>;
      })}
    </ul>
  );
}

function Board({ puzzle: p, state, set, done, hint, preview }: BoardProps<PlotsPuzzle, S, Rect[]>) {
  const { rows, cols } = p, ref = useRef<SVGSVGElement>(null);
  type Drag = { a: number; b: number; base: Rect | null };
  // the drag lives in a ref (fast pointer events never see a stale copy) and in state (to draw it)
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };
  const { focus, setFocus, move } = useGridFocus(rows, cols);
  const [anchor, setAnchor] = useState<number | null>(null);

  // the last block drawn or reshaped: tapping an empty cell grows it to reach there
  const last = useRef<Rect | null>(null);
  /** Does `rect` run over any block other than `base`? Blocks are never drawn over. */
  const blocked = (rect: Rect, base: Rect | null = null) => state.some((r) => r !== base && overlap(r, rect));
  const commit = (rect: Rect, base: Rect | null = null) => {
    if (blocked(rect, base)) return false;
    set([...state.filter((r) => r !== base), rect]);
    last.current = rect;
    return true;
  };
  const at = (cell: number) => state.find((k) => holds(k, Math.floor(cell / cols), cell % cols)) ?? null;
  const removeAt = (cell: number) => {
    const hit = at(cell);
    if (hit) set(state.filter((k) => k !== hit));
    return !!hit;
  };
  /** Grow the last block to take in `cell` (its bounding box), if nothing is in the way. */
  const completeTo = (cell: number) => {
    const k = last.current && state.find((r) => same(r, last.current!));
    if (!k) return false;
    const r = Math.floor(cell / cols), c = cell % cols;
    const t = Math.min(k[0], r), l = Math.min(k[1], c);
    const grown: Rect = [t, l, Math.max(k[0] + k[2] - 1, r) - t + 1, Math.max(k[1] + k[3] - 1, c) - l + 1];
    return commit(grown, k);
  };
  const down = (e: React.PointerEvent) => {
    if (done || e.button > 0) return;
    const i = cellAt(ref.current!, e, rows, cols);
    if (i < 0) return;
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    // starting on a rectangle grabs it, to stretch or shrink; elsewhere draws a new one
    setDrag({ a: i, b: i, base: at(i) });
    setFocus(i);
  };
  const moveTo = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    // switch corners only once the finger is well inside the next cell
    const i = cellInside(gridPoint(ref.current!, e, cols), rows, cols, 0.15);
    if (i >= 0 && i !== drag.b) { setDrag({ ...drag, b: i }); buzz(4); }
  };
  const liveOf = (d: Drag) => (d.base ? resize(cols, d.base, d.a, d.b) : span(cols, d.a, d.b));
  const up = () => {
    const drag = dragRef.current;
    if (!drag) return;
    setDrag(null);
    if (drag.a === drag.b) {
      // a tap on a block removes it; a tap on an empty cell completes the last block up to there
      if (drag.base) removeAt(drag.a);
      else if (completeTo(drag.a)) buzz(10);
      return;
    }
    const rect = liveOf(drag);
    if (drag.base && same(rect, drag.base)) return;
    if (!commit(rect, drag.base)) { buzz(30); return; }
    buzz(clueOf(p, rect) === -1 ? 4 : 12);
  };
  const key = (e: React.KeyboardEvent) => {
    if (done) return;
    if (move(e.key) !== null) { e.preventDefault(); return; }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (anchor === null) setAnchor(focus);
      else { if (anchor !== focus) commit(span(cols, anchor, focus)); setAnchor(null); }
    } else if (e.key === 'Backspace' || e.key === 'Delete') { removeAt(focus); setAnchor(null); }
    else if (e.key === 'Escape') setAnchor(null);
  };

  const live = drag && drag.a !== drag.b ? liveOf(drag)
    : anchor !== null && anchor !== focus ? span(cols, anchor, focus) : null;
  const liveClue = live ? clueOf(p, live) : -1;
  const liveBlocked = !!live && blocked(live, drag && drag.a !== drag.b ? drag.base : null);
  const hidden = drag && drag.a !== drag.b ? drag.base : null;
  const box = ([t, l, h, w]: Rect, inset: number, rx = 12) => ({ x: l * U + inset, y: t * U + inset, width: w * U - inset * 2, height: h * U - inset * 2, rx });
  const owner = new Map<number, number>();
  state.forEach((r) => { if (r === hidden) return; const k = clueOf(p, r); if (k !== -1) owner.set(k, 1); });

  const board = (
    <Frame rows={rows} cols={cols} preview={preview} label={`Plots board, ${rows} by ${cols}`} ref={ref}
      className={`board${preview ? ' is-preview' : ''}${done && !preview ? ' is-won' : ''}`}
      onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={() => setDrag(null)} onKeyDown={key}>
      <Tiles rows={rows} cols={cols} />
      {state.map((rect) => {
        if (rect === hidden) return null;
        const k = clueOf(p, rect);
        return <rect key={rect.join()} className={k === -1 ? 'plot is-bad' : `plot p${k % 11}`} style={waveDelay(cols, rect[0] * cols + rect[1])} {...box(rect, 3, 0)} />;
      })}
      {live && <rect className={`plot-live${liveBlocked ? ' is-blocked' : liveClue !== -1 ? ` is-fit p${liveClue % 11}` : ''}`} {...box(live, 3)} />}
      {/* once solved, the clues fade away and only the coloured blocks stay */}
      {p.clues.map((c, i) => {
        const [x, y] = mid(cols, c.cell), [w, h] = GLYPH[c.shape];
        return (
          <g key={i} className={`clue p${i % 11}${owner.has(i) ? '' : ' is-open'}${c.shape === 'any' ? ' is-any' : ''}`}>
            <rect className="badge" x={x - w / 2} y={y - h / 2} width={w} height={h} rx={10} />
            {(c.size > 0 || c.shape === 'any') && <text x={x} y={y + 10}>{c.size || '?'}</text>}
          </g>
        );
      })}
      {live && !liveBlocked && <text className="plot-size" x={(live[1] + live[3] / 2) * U} y={live[0] * U - 12 < 20 ? (live[0] + live[2]) * U + 34 : live[0] * U - 12}>{live[2] * live[3]}</text>}
      <HintMarks hint={hint} cols={cols} />
      {!preview && !done && <FocusRing cols={cols} cell={focus} />}
    </Frame>
  );
  if (preview) return board;
  return <div className="plots">{board}{!done && <Legend shapes={p.clues.map((c) => c.shape)} />}</div>;
}

function hint(p: PlotsPuzzle, s: S, sol: Rect[]): Hint | null {
  const wrong = s.find((r) => !sol.some((k) => same(k, r)));
  if (wrong) {
    return { text: 'This rectangle is not part of the answer. Stretch it, shrink it or remove it.', because: [], cells: rectCells(p.cols, wrong),
      apply: (st: S) => st.filter((r) => !same(r, wrong)) };
  }
  // sol and clues are in different orders: match each placed rectangle to its clue
  const placed: (Rect | null)[] = p.clues.map((c) => s.find((r) => rectCells(p.cols, r).includes(c.cell)) ?? null);
  const step = nextStep(stateFrom(p, placed));
  if (!step) return null;
  const answer = sol.find((r) => rectCells(p.cols, r).includes(p.clues[step.clue].cell))!;
  return { text: step.text, because: step.because, cells: step.cells,
    apply: (cur: S) => [...cur.filter((r) => !overlap(r, answer)), answer] };
}

export const plotsUI: GameUI<PlotsPuzzle, S, Rect[]> = {
  initial: () => [],
  solved: (p, s) => s.reduce((n, r) => n + r[2] * r[3], 0) === p.rows * p.cols && s.every((r) => clueOf(p, r) !== -1),
  solvedState: (_p, sol) => sol.slice(),
  hint, Board,
};
