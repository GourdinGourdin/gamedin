import { useRef, useState } from 'react';
import { rectCells, shapeOf, type PlotsPuzzle, type Rect } from '../../engine/plots/solve.ts';
import { nextStep, stateFrom } from '../../engine/plots/logic.ts';
import { cellAt, Frame, FocusRing, HintMarks, mid, Tiles, U, useGridFocus, type BoardProps, type GameUI, type Hint } from './common.tsx';

type S = Rect[];

const same = (a: Rect, b: Rect) => a.every((v, i) => v === b[i]);
const overlap = (a: Rect, b: Rect) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const span = (cols: number, a: number, b: number): Rect => {
  const r1 = Math.floor(a / cols), c1 = a % cols, r2 = Math.floor(b / cols), c2 = b % cols;
  return [Math.min(r1, r2), Math.min(c1, c2), Math.abs(r1 - r2) + 1, Math.abs(c1 - c2) + 1];
};

/** The clue a rectangle satisfies, or -1 if it holds none, several, or the wrong one. */
function clueOf(p: PlotsPuzzle, rect: Rect): number {
  const cells = new Set(rectCells(p.cols, rect));
  const inside = p.clues.flatMap((c, i) => (cells.has(c.cell) ? [i] : []));
  if (inside.length !== 1) return -1;
  const c = p.clues[inside[0]];
  if ((c.size && c.size !== rect[2] * rect[3]) || (c.shape !== 'any' && c.shape !== shapeOf(rect[2], rect[3]))) return -1;
  return inside[0];
}

function Board({ puzzle: p, state, set, done, hint, preview }: BoardProps<PlotsPuzzle, S, Rect[]>) {
  const { rows, cols } = p, ref = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const { focus, setFocus, move } = useGridFocus(rows, cols);
  const [anchor, setAnchor] = useState<number | null>(null);

  const commit = (rect: Rect) => set([...state.filter((r) => !overlap(r, rect)), rect]);
  const removeAt = (cell: number) => {
    const r = Math.floor(cell / cols), c = cell % cols;
    const hit = state.find((k) => r >= k[0] && r < k[0] + k[2] && c >= k[1] && c < k[1] + k[3]);
    if (hit) set(state.filter((k) => k !== hit));
    return !!hit;
  };
  const down = (e: React.PointerEvent) => {
    if (done) return;
    const i = cellAt(ref.current!, e, rows, cols);
    if (i < 0) return;
    ref.current!.setPointerCapture(e.pointerId);
    setDrag({ a: i, b: i });
    setFocus(i);
  };
  const moveTo = (e: React.PointerEvent) => {
    if (!drag) return;
    const i = cellAt(ref.current!, e, rows, cols);
    if (i >= 0 && i !== drag.b) setDrag({ a: drag.a, b: i });
  };
  const up = () => {
    if (!drag) return;
    setDrag(null);
    // a tap removes the rectangle under it; a drag draws one
    if (drag.a === drag.b) { if (!removeAt(drag.a)) return; }
    else commit(span(cols, drag.a, drag.b));
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

  const live = drag && drag.a !== drag.b ? span(cols, drag.a, drag.b) : anchor !== null && anchor !== focus ? span(cols, anchor, focus) : null;
  const box = ([t, l, h, w]: Rect, inset: number) => ({ x: l * U + inset, y: t * U + inset, width: w * U - inset * 2, height: h * U - inset * 2, rx: 20 });
  return (
    <Frame rows={rows} cols={cols} preview={preview} label={`Plots board, ${rows} by ${cols}`} ref={ref}
      onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={() => setDrag(null)} onKeyDown={key}>
      <Tiles rows={rows} cols={cols} />
      {state.map((rect) => {
        const k = clueOf(p, rect);
        return <rect key={rect.join()} className={k === -1 ? 'plot is-bad' : `plot p${k % 6}`} {...box(rect, 5)} />;
      })}
      {p.clues.map((c, i) => {
        const [x, y] = mid(cols, c.cell);
        const w = c.shape === 'tall' ? 34 : c.shape === 'wide' ? 62 : 48, h = c.shape === 'wide' ? 34 : c.shape === 'tall' ? 62 : 48;
        return (
          <g key={i} className="clue">
            {c.shape === 'any'
              ? <circle cx={x} cy={y} r={27} className="clue-any" />
              : <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} />}
            {c.size > 0 && <text x={x} y={y + 10}>{c.size}</text>}
          </g>
        );
      })}
      {live && <rect className="plot-live" {...box(live, 5)} />}
      {live && <text className="plot-size" x={(live[1] + live[3] / 2) * U} y={live[0] * U - 12 < 20 ? (live[0] + live[2]) * U + 34 : live[0] * U - 12}>{live[2] * live[3]}</text>}
      <HintMarks hint={hint} cols={cols} />
      {!preview && !done && <FocusRing cols={cols} cell={focus} />}
    </Frame>
  );
}

function hint(p: PlotsPuzzle, s: S, sol: Rect[]): Hint | null {
  const wrong = s.find((r) => !sol.some((k) => same(k, r)));
  if (wrong) {
    return { text: 'This rectangle is not part of the answer. Remove it and try another shape.', because: [], cells: rectCells(p.cols, wrong),
      apply: (st: S) => st.filter((r) => !same(r, wrong)) };
  }
  // sol and clues are in different orders: match each placed rectangle to its clue
  const placed: (Rect | null)[] = p.clues.map((c) => s.find((r) => rectCells(p.cols, r).includes(c.cell)) ?? null);
  const st = stateFrom(p, placed);
  const step = nextStep(st);
  if (!step) return null;
  const answer = sol.find((r) => rectCells(p.cols, r).includes(p.clues[step.clue].cell))!;
  return { text: step.text, because: step.because, cells: step.level === 3 ? step.cells : step.level === 1 ? step.cells : step.cells,
    apply: (cur: S) => [...cur.filter((r) => !overlap(r, answer)), answer] };
}

export const plotsUI: GameUI<PlotsPuzzle, S, Rect[]> = {
  initial: () => [],
  solved: (p, s) => s.reduce((n, r) => n + r[2] * r[3], 0) === p.rows * p.cols && s.every((r) => clueOf(p, r) !== -1),
  solvedState: (_p, sol) => sol.slice(),
  hint, Board,
};
