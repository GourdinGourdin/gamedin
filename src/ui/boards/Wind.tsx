import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WindGamePuzzle } from '../../engine/wind/generate.ts';
import { buzz, cellAt, cellInside, Frame, gridPoint, samples, HintMarks, mid, route, Tiles, U, xy, type BoardProps, type GameUI, type Hint } from './common.tsx';

interface Sol { paths: number[][]; words: string[] }
/** found: indexes of solved words; starts: indexes of words whose first tile a hint revealed */
interface S { found: number[]; starts: number[] }

const sameCells = (a: number[], b: number[]) => a.length === b.length && a.slice().sort((x, y) => x - y).join() === b.slice().sort((x, y) => x - y).join();

function Board({ puzzle: p, solution: sol, state, set, done, hint, preview }: BoardProps<WindGamePuzzle, S, Sol>) {
  const { rows, cols } = p, ref = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [wrong, setWrong] = useState(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  type Pt = { x: number; y: number };
  const press = useRef<{ grew: boolean; last: Pt; queue: Pt[] } | null>(null), live = useRef(sel);
  const tail = useRef<SVGLineElement>(null), headEl = useRef<SVGCircleElement>(null);
  const segs = useRef<(SVGLineElement | null)[]>([]), letEls = useRef<(SVGTextElement | null)[]>([]);
  // Drawn length of the selection, in cells along its path. It chases the real length
  // (path steps plus a stub toward the finger), same model as Trace.
  const anim = useRef({ p: 0, raf: 0, last: 0, pt: null as Pt | null, dir: [1, 0] as [number, number] });
  const api = useRef({ tick: (_now: number) => {} });
  live.current = sel;
  useEffect(() => { update([]); setNote(null); }, [p]);
  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); cancelAnimationFrame(anim.current.raf); }, []);
  const isHole = (c: number) => !p.letters[c];

  const owner = new Map<number, number>();
  state.found.forEach((w) => sol.paths[w].forEach((c) => owner.set(c, w)));
  const latest = useRef(state), ownerRef = useRef(owner);
  latest.current = state; ownerRef.current = owner;
  const near = (a: number, b: number) => Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols)) === 1;
  const update = (next: number[]) => { live.current = next; setSel(next); };

  // handlers can fire again before React re-renders, so they read the newest state from a ref
  const submit = (path: number[]) => {
    const state = latest.current;
    const word = path.map((c) => p.letters[c]).join('');
    const i = sol.words.findIndex((w, k) => !state.found.includes(k) && w === word && sameCells(sol.paths[k], path));
    if (i !== -1) { update([]); setNote(null); buzz(18); const nextState = { ...state, found: [...state.found, i] }; latest.current = nextState; nextState.found.forEach((w) => sol.paths[w].forEach((c) => ownerRef.current.set(c, w))); set(nextState); return; }
    const rightWord = sol.words.some((w, k) => !state.found.includes(k) && w === word);
    setNote({ bad: true, text: rightWord ? `${word} is in here, but on other tiles.` : path.length < 3 ? 'Words have at least three letters.' : `${word} is not one of the words.` });
    // the wrong word shakes red for a moment, then lets go
    buzz(30);
    setWrong(true);
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => { wrongTimer.current = null; setWrong(false); update([]); }, 420);
  };
  const step = (cell: number): boolean => {
    const cur = live.current, at = cur.indexOf(cell);
    if (ownerRef.current.has(cell) || isHole(cell)) return false;
    if (at !== -1) { if (at < cur.length - 1) { update(cur.slice(0, at + 1)); return true; } return false; }
    if (cur.length && near(cur[cur.length - 1], cell)) { update([...cur, cell]); return true; }
    return false;
  };
  /** How far past the head the line reaches toward the finger (0 to 0.5 cells), only toward a tile it could enter. */
  const stubTarget = (): number => {
    const a = anim.current, path = live.current;
    if (!a.pt || !path.length) return 0;
    const head = path[path.length - 1], [hx, hy] = mid(cols, head), dx = a.pt.x * U - hx, dy = a.pt.y * U - hy, horiz = Math.abs(dx) >= Math.abs(dy);
    const dir: [number, number] = horiz ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    const c = (head % cols) + dir[0], r = Math.floor(head / cols) + dir[1];
    if (c < 0 || r < 0 || c >= cols || r >= rows) return 0;
    const next = r * cols + c;
    if (next !== path[path.length - 2] && (isHole(next) || ownerRef.current.has(next) || path.includes(next))) return 0;
    if (dir[0] !== a.dir[0] || dir[1] !== a.dir[1]) { a.p = Math.min(a.p, path.length - 1); a.dir = dir; }
    return Math.min(0.5, Math.max(0, Math.abs(horiz ? dx : dy) - 4) / U);
  };
  /** Draw the selection up to length a.p straight onto the DOM, bypassing React. */
  const paint = () => {
    const a = anim.current, path = live.current, L = path.length - 1, shown = Math.max(0, Math.min(a.p, L));
    for (let i = 0; i < segs.current.length; i++) {
      const el = segs.current[i];
      if (!el || i >= L) continue;
      const f = Math.min(1, Math.max(0, shown - i)), [ax, ay] = mid(cols, path[i]), [bx, by] = mid(cols, path[i + 1]);
      el.style.display = f > 0 ? '' : 'none';
      el.setAttribute('x2', String(ax + (bx - ax) * f)); el.setAttribute('y2', String(ay + (by - ay) * f));
    }
    const t = tail.current, h = headEl.current;
    if (L < 0) { if (t) t.style.display = 'none'; if (h) h.style.display = 'none'; }
    else {
      const [hx, hy] = mid(cols, path[L]), over = Math.max(0, a.p - L) * U;
      let ex = hx, ey = hy;
      if (a.p > L) { ex = hx + a.dir[0] * over; ey = hy + a.dir[1] * over; }
      else if (L > 0) { const i = Math.min(L - 1, Math.floor(a.p)), [ax, ay] = mid(cols, path[i]), [bx, by] = mid(cols, path[i + 1]), f = a.p - i; ex = ax + (bx - ax) * f; ey = ay + (by - ay) * f; }
      if (t) { t.setAttribute('x1', String(hx)); t.setAttribute('y1', String(hy)); t.setAttribute('x2', String(ex)); t.setAttribute('y2', String(ey)); t.style.display = a.p > L ? '' : 'none'; }
      if (h) { h.setAttribute('cx', String(ex)); h.setAttribute('cy', String(ey)); h.style.display = ''; }
    }
    // letters turn white as the line reaches them
    for (let i = 0; i < letEls.current.length; i++) {
      const el = letEls.current[i];
      if (!el) continue;
      const k = path.indexOf(i);
      const on = k !== -1 && shown >= k - 0.35;
      if (on !== (el.style.fill === 'rgb(255, 255, 255)' || el.style.fill === '#fff')) el.style.fill = on ? '#fff' : '';
    }
  };
  const kick = () => { const a = anim.current; if (!a.raf) { a.last = performance.now(); a.raf = requestAnimationFrame((t) => api.current.tick(t)); } };
  const follow = (pts: Pt[]) => {
    const pr = press.current;
    if (!pr) return;
    for (const pt of pts) {
      for (const sp of samples(pr.last, pt)) {
        // tiles are picked near their centre, so cutting a corner never grabs the wrong letter
        const cell = cellInside(sp, rows, cols, 0.18);
        if (cell >= 0 && cell !== live.current[live.current.length - 1] && step(cell)) { pr.grew = true; buzz(5); }
      }
      pr.last = pt;
    }
    anim.current.pt = pts[pts.length - 1];
  };
  const tick = (now: number) => {
    const a = anim.current, pr = press.current;
    a.raf = 0;
    const dt = Math.min(48, now - a.last || 16); a.last = now;
    if (pr?.queue.length) { const pts = pr.queue; pr.queue = []; follow(pts); }
    const goal = Math.max(0, live.current.length - 1) + stubTarget(), diff = goal - a.p;
    a.p = Math.abs(diff) < 0.004 ? goal : a.p + diff * (1 - Math.exp(-dt / 38));
    paint();
    if (a.p !== goal || pr?.queue.length) kick();
  };
  api.current.tick = tick;
  const down = (e: React.PointerEvent) => {
    if (done || e.button > 0) return;
    const cell = cellAt(ref.current!, e, rows, cols);
    if (cell < 0 || ownerRef.current.has(cell) || isHole(cell)) return;
    ref.current!.setPointerCapture(e.pointerId);
    setNote(null);
    if (wrongTimer.current) { clearTimeout(wrongTimer.current); wrongTimer.current = null; }
    if (wrong) { setWrong(false); update([]); }
    const cur = live.current;
    // tapping the last tile again sends the word
    if (cur.length >= 2 && cur[cur.length - 1] === cell) { submit(cur); return; }
    e.preventDefault();
    const pt = gridPoint(ref.current!, e, cols);
    press.current = { grew: false, last: pt, queue: [] };
    anim.current.pt = pt;
    if (!step(cell)) update([cell]);
    kick();
  };
  const moveTo = (e: React.PointerEvent) => {
    const pr = press.current;
    if (!pr) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e.nativeEvent]) pr.queue.push(gridPoint(ref.current!, ev, cols));
    kick();
  };
  const up = () => {
    const pr = press.current;
    if (!pr) return;
    if (pr.queue.length) { const pts = pr.queue; pr.queue = []; follow(pts); }
    press.current = null;
    anim.current.pt = null;
    kick();
    if (pr.grew && live.current.length >= 2) submit(live.current);
  };
  // after every render the path may have grown or shrunk: fit the drawn length before paint
  useLayoutEffect(() => {
    const a = anim.current, L = Math.max(0, sel.length - 1);
    if (a.p > L + 0.5 || !sel.length) a.p = L;
    paint();
    if (a.p !== L) kick();
  });

  const line = (path: number[]) => route(cols, path);
  // blocked tiles: grey, with an outline where they meet letter tiles
  let holeEdge = '';
  const holes: number[] = [];
  for (let c = 0; c < rows * cols; c++) {
    if (!isHole(c)) continue;
    holes.push(c);
    const [x, y] = xy(cols, c), r = Math.floor(c / cols), q = c % cols;
    if (r > 0 && !isHole(c - cols)) holeEdge += `M${x} ${y}H${x + U}`;
    if (r < rows - 1 && !isHole(c + cols)) holeEdge += `M${x} ${y + U}H${x + U}`;
    if (q > 0 && !isHole(c - 1)) holeEdge += `M${x} ${y}V${y + U}`;
    if (q < cols - 1 && !isHole(c + 1)) holeEdge += `M${x + U} ${y}V${y + U}`;
  }
  const starts = new Set<number>();
  sol.paths.forEach((path, w) => { if (!state.found.includes(w) && (p.showStarts || state.starts.includes(w))) starts.add(path[0]); });
  return (
    <div className={`wind wind-board${wrong ? ' is-wrong' : ''}`}>
      {!preview && <p className="wind-theme">{p.showTheme || done ? p.theme : 'Theme hidden'}</p>}
      <Frame rows={rows} cols={cols} preview={preview} label={`Wind board, ${rows} by ${cols} letters`} ref={ref}
        onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
        onKeyDown={(e) => { if (e.key === 'Enter' && sel.length >= 2) submit(sel); if (e.key === 'Escape') update([]); }}>
        <Tiles rows={rows} cols={cols} />
        {holes.map((c) => { const [x, y] = xy(cols, c); return <rect key={c} className="hole" x={x} y={y} width={U} height={U} />; })}
        {holeEdge && <path className="hole-edge" d={holeEdge} />}
        {state.found.map((w, k) => <path key={w} className={`word-line w${k % 6}`} d={line(sol.paths[w])} />)}
        <g className={`sel-segs w${state.found.length % 6}`}>
          {sel.slice(1).map((c, i) => {
            const [ax, ay] = mid(cols, sel[i]), [bx, by] = mid(cols, c);
            return <line key={i} ref={(el) => { segs.current[i] = el; }} className="sel-seg" x1={ax} y1={ay} x2={bx} y2={by} />;
          })}
          {/* drawn by paint(), outside React */}
          <line ref={tail} className="sel-seg sel-tail" style={{ display: 'none' }} />
          <circle ref={headEl} className="sel-head" r={37} style={{ display: 'none' }} />
        </g>
        {[...starts].map((c) => { const [x, y] = mid(cols, c); return <circle key={c} className="word-start" cx={x - 30} cy={y - 30} r={7} />; })}
        {p.letters.map((ch, i) => {
          const [x, y] = mid(cols, i);
          if (!ch) return null;
          return <text key={i} ref={(el) => { letEls.current[i] = el; }} className={`letter${owner.has(i) ? ' is-found' : ''}`} x={x} y={y + 15}>{ch}</text>;
        })}
        <HintMarks hint={hint} cols={cols} />
      </Frame>
      {!preview && (
        <>
          <p className={`wind-note${note?.bad ? ' is-bad' : ''}`} role="status">{note?.text ?? (sel.length ? sel.map((c) => p.letters[c]).join('') : ' ')}</p>
          <ul className="wind-words" aria-label="Words to find">
            {sol.words.map((w, i) => [w, i] as const).sort((a, b) => a[0].length - b[0].length || a[1] - b[1]).map(([w, i]) => {
              const got = state.found.includes(i);
              return <li key={i} className={got ? `is-found w${state.found.indexOf(i) % 6}` : ''} aria-label={got ? w : `${w.length} letters`}>{[...w].map((ch, j) => <span key={j}>{got ? ch : ''}</span>)}</li>;
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
