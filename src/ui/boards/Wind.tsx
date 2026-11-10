import { useEffect, useRef, useState } from 'react';
import type { WindGamePuzzle } from '../../engine/wind/generate.ts';
import { buzz, cellAt, cellInside, Frame, gridPoint, samples, HintMarks, mid, Tiles, U, type BoardProps, type GameUI, type Hint } from './common.tsx';

interface Sol { paths: number[][]; words: string[] }
/** found: indexes of solved words; starts: indexes of words whose first tile a hint revealed */
interface S { found: number[]; starts: number[] }

const sameCells = (a: number[], b: number[]) => a.length === b.length && a.slice().sort((x, y) => x - y).join() === b.slice().sort((x, y) => x - y).join();

function Board({ puzzle: p, solution: sol, state, set, done, hint, preview }: BoardProps<WindGamePuzzle, S, Sol>) {
  const { rows, cols } = p, ref = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const press = useRef<{ grew: boolean; pt: { x: number; y: number } } | null>(null), live = useRef(sel);
  live.current = sel;
  useEffect(() => { setSel([]); setNote(null); }, [p]);

  const owner = new Map<number, number>();
  state.found.forEach((w) => sol.paths[w].forEach((c) => owner.set(c, w)));
  const near = (a: number, b: number) => Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols)) === 1;
  const update = (next: number[]) => { live.current = next; setSel(next); };

  const submit = (path: number[]) => {
    const word = path.map((c) => p.letters[c]).join('');
    const i = sol.words.findIndex((w, k) => !state.found.includes(k) && w === word && sameCells(sol.paths[k], path));
    update([]);
    if (i !== -1) { setNote(null); buzz(18); set({ ...state, found: [...state.found, i] }); return; }
    const rightWord = sol.words.some((w, k) => !state.found.includes(k) && w === word);
    setNote({ bad: true, text: rightWord ? `${word} is in here, but on other tiles.` : path.length < 3 ? 'Words have at least three letters.' : `${word} is not one of the words.` });
  };
  const step = (cell: number): boolean => {
    const cur = live.current, at = cur.indexOf(cell);
    if (owner.has(cell)) return false;
    if (at !== -1) { if (at < cur.length - 1) { update(cur.slice(0, at + 1)); return true; } return false; }
    if (cur.length && near(cur[cur.length - 1], cell)) { update([...cur, cell]); return true; }
    return false;
  };
  const down = (e: React.PointerEvent) => {
    if (done) return;
    const cell = cellAt(ref.current!, e, rows, cols);
    if (cell < 0 || owner.has(cell)) return;
    ref.current!.setPointerCapture(e.pointerId);
    setNote(null);
    const cur = live.current;
    // tapping the last tile again sends the word
    if (cur.length >= 2 && cur[cur.length - 1] === cell) { submit(cur); return; }
    e.preventDefault();
    press.current = { grew: false, pt: gridPoint(ref.current!, e, cols) };
    if (!step(cell)) update([cell]);
  };
  const moveTo = (e: React.PointerEvent) => {
    if (!press.current) return;
    const pt = gridPoint(ref.current!, e, cols);
    for (const sp of samples(press.current.pt, pt)) {
      // tiles are picked near their centre, so cutting a corner never grabs the wrong letter
      const cell = cellInside(sp, rows, cols, 0.2);
      if (cell >= 0 && cell !== live.current[live.current.length - 1] && step(cell)) { press.current.grew = true; buzz(5); }
    }
    press.current.pt = pt;
  };
  const up = () => {
    const pr = press.current;
    press.current = null;
    if (pr?.grew && live.current.length >= 2) submit(live.current);
  };

  const line = (path: number[]) => path.map((c, i) => `${i ? 'L' : 'M'}${mid(cols, c).join(' ')}`).join(' ');
  const starts = new Set<number>();
  sol.paths.forEach((path, w) => { if (!state.found.includes(w) && (p.showStarts || state.starts.includes(w))) starts.add(path[0]); });
  const selSet = new Set(sel);
  return (
    <div className="wind">
      {!preview && <p className="wind-theme">{p.showTheme || done ? p.theme : 'Theme hidden'}</p>}
      <Frame rows={rows} cols={cols} preview={preview} label={`Wind board, ${rows} by ${cols} letters`} ref={ref}
        onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={up}
        onKeyDown={(e) => { if (e.key === 'Enter' && sel.length >= 2) submit(sel); if (e.key === 'Escape') update([]); }}>
        <Tiles rows={rows} cols={cols} />
        {state.found.map((w) => <path key={w} className={`word-line w${w % 4}`} d={line(sol.paths[w])} />)}
        {sel.length > 0 && <path className="sel-line" d={sel.length === 1 ? `${line(sel)} l0.01 0` : line(sel)} />}
        {[...starts].map((c) => { const [x, y] = mid(cols, c); return <circle key={c} className="word-start" cx={x - 30} cy={y - 30} r={7} />; })}
        {p.letters.map((ch, i) => {
          const [x, y] = mid(cols, i);
          return <text key={i} className={`letter${owner.has(i) ? ' is-found' : selSet.has(i) ? ' is-sel' : ''}`} x={x} y={y + 15}>{ch}</text>;
        })}
        <HintMarks hint={hint} cols={cols} />
      </Frame>
      {!preview && (
        <>
          <p className={`wind-note${note?.bad ? ' is-bad' : ''}`} role="status">{note?.text ?? (sel.length ? sel.map((c) => p.letters[c]).join('') : ' ')}</p>
          <ul className="wind-words" aria-label="Words to find">
            {sol.words.map((w, i) => {
              const got = state.found.includes(i);
              return <li key={i} className={got ? `is-found w${i % 4}` : ''} aria-label={got ? w : `${w.length} letters`}>{[...w].map((ch, j) => <span key={j}>{got ? ch : ''}</span>)}</li>;
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function hint(p: WindGamePuzzle, s: S, sol: Sol): Hint | null {
  const i = sol.words.findIndex((_, k) => !s.found.includes(k));
  if (i === -1) return null;
  if (!p.showStarts && !s.starts.includes(i)) {
    return { text: `A ${sol.words[i].length}-letter word starts on the marked tile.`, because: [], cells: [sol.paths[i][0]], apply: (st: S) => ({ ...st, starts: [...st.starts, i] }) };
  }
  return { text: `The ${sol.words[i].length}-letter word that starts here runs along the marked tiles.`, because: [sol.paths[i][0]], cells: sol.paths[i].slice(1),
    apply: (st: S) => ({ ...st, found: [...st.found, i] }) };
}

export const windUI: GameUI<WindGamePuzzle, S, Sol> = {
  initial: () => ({ found: [], starts: [] }),
  solved: (_p, s, sol) => s.found.length === sol.words.length,
  solvedState: (_p, sol) => ({ found: sol.words.map((_, i) => i), starts: [] }),
  hint, Board,
};
