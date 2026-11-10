import { useCallback, useState, type ReactNode, type SVGProps } from 'react';
import type { Settings } from '../../store.ts';

/** Cell size in SVG units. */
export const U = 100;
const PAD = 6;

export interface Hint {
  text: string;
  /** cells that explain the hint */
  because: number[];
  /** cells the hint is about */
  cells: number[];
  /** applies the hint to a state */
  apply?: (state: any) => any;
}

export interface BoardProps<P, S, Sol> {
  puzzle: P;
  solution: Sol;
  state: S;
  /** merge = replace the latest undo step (used while dragging) */
  set: (next: S, merge?: boolean) => void;
  done: boolean;
  hint: Hint | null;
  /** static picture: no input, no focus */
  preview?: boolean;
  settings: Settings;
}

export interface GameUI<P = any, S = any, Sol = any> {
  initial(p: P): S;
  solved(p: P, s: S, sol: Sol): boolean;
  hint(p: P, s: S, sol: Sol): Hint | null;
  solvedState(p: P, sol: Sol): S;
  Board: (props: BoardProps<P, S, Sol>) => ReactNode;
}

export function cellAt(svg: SVGSVGElement, e: { clientX: number; clientY: number }, rows: number, cols: number): number {
  const box = svg.getBoundingClientRect();
  const scale = box.width / (cols * U + PAD * 2);
  const x = (e.clientX - box.left) / scale - PAD, y = (e.clientY - box.top) / scale - PAD;
  const c = Math.floor(x / U), r = Math.floor(y / U);
  return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
}

export const xy = (cols: number, i: number): [number, number] => [(i % cols) * U, Math.floor(i / cols) * U];
export const mid = (cols: number, i: number): [number, number] => [(i % cols) * U + U / 2, Math.floor(i / cols) * U + U / 2];

/** Keyboard focus that moves around the grid with the arrow keys. */
export function useGridFocus(rows: number, cols: number) {
  const [focus, setFocus] = useState(0);
  const move = useCallback((key: string): number | null => {
    const d = key === 'ArrowUp' ? -cols : key === 'ArrowDown' ? cols : key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
    if (!d) return null;
    const r = Math.floor(focus / cols), c = focus % cols;
    if ((d === -1 && c === 0) || (d === 1 && c === cols - 1) || (d === -cols && r === 0) || (d === cols && r === rows - 1)) return focus;
    setFocus(focus + d);
    return focus + d;
  }, [focus, rows, cols]);
  return { focus, setFocus, move };
}

export function Frame({ rows, cols, preview, label, children, ...rest }:
  { rows: number; cols: number; preview?: boolean; label: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg className={`board${preview ? ' is-preview' : ''}`} viewBox={`${-PAD} ${-PAD} ${cols * U + PAD * 2} ${rows * U + PAD * 2}`}
      role={preview ? 'img' : 'application'} aria-label={label} tabIndex={preview ? undefined : 0} {...rest}>
      {children}
    </svg>
  );
}

export function FocusRing({ cols, cell }: { cols: number; cell: number }) {
  const [x, y] = xy(cols, cell);
  return <rect className="focus-ring" x={x + 5} y={y + 5} width={U - 10} height={U - 10} rx={16} />;
}

export function HintMarks({ hint, cols }: { hint: Hint | null; cols: number }) {
  if (!hint) return null;
  return (
    <g className="hint-marks">
      {hint.because.map((i) => { const [x, y] = xy(cols, i); return <rect key={`b${i}`} className="hint-because" x={x + 9} y={y + 9} width={U - 18} height={U - 18} rx={14} />; })}
      {hint.cells.map((i) => { const [x, y] = xy(cols, i); return <rect key={`c${i}`} className="hint-cell" x={x + 7} y={y + 7} width={U - 14} height={U - 14} rx={15} />; })}
    </g>
  );
}

/** Rounded cell tiles, the base layer of most boards. */
export function Tiles({ rows, cols, className }: { rows: number; cols: number; className?: (i: number) => string }) {
  const out = [];
  for (let i = 0; i < rows * cols; i++) {
    const [x, y] = xy(cols, i);
    out.push(<rect key={i} className={`tile ${className?.(i) ?? ''}`} x={x + 4} y={y + 4} width={U - 8} height={U - 8} rx={16} />);
  }
  return <g>{out}</g>;
}
