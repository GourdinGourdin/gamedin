// The advert, drawn with the app's real boards. Every frame is a pure function
// of time: window.renderAt(t) draws second t, so render.mjs can capture it
// frame by frame. Open scene.html in the dev server to watch it in real time.
import { type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '@fontsource-variable/schibsted-grotesk';
import '../src/ui/styles.css';
import './scene.css';
import { GAMES, type GameId } from '../src/engine/index.ts';
import { GAME_IDS, META } from '../src/games.ts';
import { UI } from '../src/ui/boards/index.ts';
import type { Hint } from '../src/ui/boards/common.tsx';
import { Logo } from '../src/ui/icons.tsx';
import type { Settings } from '../src/store.ts';

interface Word { w: string; s: number; e: number }
interface Line { id: string; start: number; dur: number; text: string; words: Word[] }
const TL = (window as any).TL as { duration: number; lines: Line[] };
const SETTINGS: Settings = { theme: 'light', autoCross: false, showErrors: false, prefs: {}, seenHow: {} };

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const out = (x: number) => 1 - (1 - clamp(x)) ** 3;
const back = (x: number) => { const c = 1.9, y = clamp(x) - 1; return 1 + (c + 1) * y ** 3 + c * y ** 2; };
/** 0..1 over `dur` seconds starting at `at`. */
const ramp = (t: number, at: number, dur: number) => clamp((t - at) / dur);

const LEAD = 0.12;
const line = (id: string) => TL.lines.find((l) => l.id === id)!;
const cut = (id: string) => line(id).start - LEAD;
const nextCut = (id: string) => { const i = TL.lines.findIndex((l) => l.id === id); return i + 1 < TL.lines.length ? TL.lines[i + 1].start - LEAD : TL.duration; };
/** when a spoken word starts (absolute seconds) */
const wordAt = (id: string, w: string) => { const l = line(id); return l.start + (l.words.find((x) => x.w.toLowerCase().startsWith(w))?.s ?? 0); };

// real puzzles, generated once
const SPEC: Record<GameId, [number, 'easy' | 'medium' | 'hard']> = { trace: [6, 'medium'], crowns: [7, 'medium'], pairs: [6, 'medium'], plots: [6, 'easy'], wind: [5, 'medium'] };
const G = Object.fromEntries(GAME_IDS.map((id) => [id, GAMES[id].generate(SPEC[id][0], SPEC[id][1], 'advert')])) as Record<GameId, any>;
const MANY = Array.from({ length: 16 }, (_, i) => GAMES.crowns.generate(7, 'medium', `fresh${i}`));

function stateAt(id: GameId, g: any, p: number): any {
  const ui = UI[id];
  if (p >= 1) return ui.solvedState(g.puzzle, g.solution);
  if (id === 'trace') return g.solution.slice(0, 1 + Math.floor(p * (g.solution.length - 1)));
  if (id === 'crowns') { const s = ui.initial(g.puzzle), N = g.puzzle.size; for (let r = 0; r < Math.floor(p * (N + 0.5)); r++) s[r * N + g.solution[r]] = 2; return s; }
  if (id === 'pairs') { const s = ui.initial(g.puzzle), todo = s.flatMap((v: number, i: number) => (v === -1 ? [i] : [])); todo.slice(0, Math.floor(p * todo.length)).forEach((i: number) => { s[i] = g.solution[i]; }); return s; }
  if (id === 'plots') return g.solution.slice(0, Math.floor(p * (g.solution.length + 0.5)));
  return { found: g.solution.words.map((_: string, i: number) => i).slice(0, Math.floor(p * (g.solution.words.length + 0.5))), starts: [] };
}

function Brd({ id, g = G[id], p = 1, hint = null, state }: { id: GameId; g?: any; p?: number; hint?: Hint | null; state?: any }) {
  const ui = UI[id];
  return <ui.Board puzzle={g.puzzle} solution={g.solution} state={state ?? stateAt(id, g, p)} set={() => {}} done hint={hint} preview settings={SETTINGS} />;
}

const pop = (k: number, extra = ''): CSSProperties => ({ opacity: clamp(k * 3), transform: `scale(${0.6 + 0.4 * back(k)}) ${extra}` });
const rise = (k: number, px = 40): CSSProperties => ({ opacity: out(k * 1.6), transform: `translateY(${(1 - out(k)) * px}px)` });

function Hook({ t }: { t: number }) {
  const flip = wordAt('hook', "that's"), k = ramp(t, flip, 0.3);
  const secs = 59 - Math.floor(t * 1.0) % 60;
  return (
    <div className="sc sc-paper">
      <h1 className="big" style={{ ...rise(ramp(t, 0, 0.3)), top: 110 }}>
        {k > 0 ? <span className="hot" style={pop(k)}>Not enough.</span> : <>One puzzle<br />a day?</>}
      </h1>
      <div className="card" style={{ top: 330, width: 330, left: 105, transform: `rotate(${-3 + 3 * out(ramp(t, 0.1, 0.5))}deg) translateX(${k > 0 && k < 1 ? Math.sin(k * 18) * 8 : 0}px)` }}>
        <Brd id="crowns" />
      </div>
      <p className={`pill${k > 0 ? ' is-struck' : ''}`} style={{ top: 712, ...rise(ramp(t, 0.35, 0.3), 20) }}>Next puzzle in 23:59:{String(secs).padStart(2, '0')}</p>
    </div>
  );
}

function Meet({ t }: { t: number }) {
  const t0 = cut('meet'), five = wordAt('meet', 'five'), no = wordAt('meet', 'with');
  const slots = [[40, 0], [200, 0], [360, 0], [120, 160], [280, 160]];
  return (
    <div className="sc sc-paper">
      <div className="lockup" style={{ top: 120, ...pop(ramp(t, t0, 0.35)) }}><Logo size={84} /><span>GamedIn</span></div>
      <div className="five" style={{ top: 300 }}>
        {GAME_IDS.map((id, i) => (
          <div key={id} className="mini" style={{ left: slots[i][0], top: slots[i][1], ...pop(ramp(t, five + i * 0.09, 0.3)) }}><Brd id={id} /></div>
        ))}
      </div>
      <h2 className="mid" style={{ top: 650, ...rise(ramp(t, five, 0.3)) }}>Five logic puzzles.</h2>
      <h2 className="mid hot" style={{ top: 704, ...pop(ramp(t, no, 0.3)) }}>No daily limit.</h2>
    </div>
  );
}

const TAG: Record<GameId, string> = {
  trace: 'One line. Every cell.', crowns: 'One per row, column, colour.', pairs: 'Two shapes. Perfect balance.', plots: 'Rectangles that fit the clues.', wind: 'Hidden words. Every tile.',
};
const TIME: Record<GameId, string> = { trace: '0:38', crowns: '1:12', pairs: '0:54', plots: '0:47', wind: '1:05' };

function Beat({ t, id }: { t: number; id: GameId }) {
  const t0 = cut(id), t1 = nextCut(id), k = ramp(t, t0, 0.32);
  const p = ramp(t, t0 + 0.2, t1 - t0 - 0.62), doneK = ramp(t, t1 - 0.4, 0.22);
  const i = GAME_IDS.indexOf(id);
  return (
    <div className={`sc sc-game g-${id}`}>
      <p className="count" style={rise(k, 0)}>{i + 1}/5</p>
      <h1 className="name" style={{ opacity: out(k * 2), transform: `translateX(${(1 - out(k)) * -70}px)` }}>{META[id].name}</h1>
      <p className="tag" style={rise(ramp(t, t0 + 0.08, 0.3), 16)}>{TAG[id]}</p>
      <div className="card" style={{ top: 300, width: 452, left: 44, transform: `translateY(${(1 - out(k)) * 120}px) rotate(${(1 - out(k)) * 5}deg) scale(${1 + 0.03 * Math.sin(Math.PI * doneK)})` }}>
        <Brd id={id} p={p} />
      </div>
      <p className="solved" style={pop(doneK)}>Solved <b>{TIME[id]}</b></p>
    </div>
  );
}

function Fresh({ t }: { t: number }) {
  const t0 = cut('fresh'), n = Math.floor((t - t0) / 0.17), every = wordAt('fresh', 'every');
  const local = (t - t0) / 0.17 - n;
  return (
    <div className="sc sc-paper">
      <h1 className="big" style={{ top: 96, ...rise(ramp(t, t0, 0.3)) }}>A fresh board,<br /><span className="hot">every time.</span></h1>
      <div className="card" style={{ top: 300, width: 330, left: 105, transform: `scale(${0.96 + 0.04 * out(local * 2.5)})` }}>
        <Brd id="crowns" g={MANY[n % MANY.length]} />
      </div>
      <p className="pill is-ink" style={{ top: 690, ...rise(ramp(t, every, 0.3), 20) }}>Puzzle {(1 + n * 37 + Math.floor(local * 37)).toLocaleString('en-US')}</p>
    </div>
  );
}

const HINT = (() => {
  const g = G.pairs, ui = UI.pairs;
  let state = stateAt('pairs', g, 0.35), hint = ui.hint(g.puzzle, state, g.solution)!;
  // walk forward to a step that is nice to show
  for (let i = 0; i < 12 && hint.because.length < 2; i++) { state = hint.apply!(state); hint = ui.hint(g.puzzle, state, g.solution)!; }
  return { state, hint, after: hint.apply!(state) };
})();

function HintScene({ t }: { t: number }) {
  const t0 = cut('hint'), show = wordAt('hint', 'a'), done = wordAt('hint', 'next');
  const applied = t > done + 0.25;
  return (
    <div className="sc sc-paper g-pairs">
      <h1 className="big" style={{ top: 96, ...rise(ramp(t, t0, 0.3)) }}>Stuck?</h1>
      <div className="card" style={{ top: 196, width: 350, left: 95 }}>
        <Brd id="pairs" state={applied ? HINT.after : HINT.state} hint={t > show && !applied ? HINT.hint : null} />
      </div>
      <aside className="hint hintcard" style={{ top: 572, ...rise(ramp(t, show, 0.3), 30) }}>
        <p>{HINT.hint.text}</p>
        <div><span className={`btn btn-small btn-primary${applied ? ' is-pressed' : ''}`}>Do it for me</span><span className="btn btn-small btn-quiet">Got it</span></div>
      </aside>
    </div>
  );
}

function Free({ t }: { t: number }) {
  const rows: [string, number, string][] = [['No account.', wordAt('free', 'no'), 'trace'], ['No ads.', line('free').start + (line('free').words[2]?.s ?? 0.8), 'sym'], ['Works offline.', wordAt('free', 'it'), 'plots']];
  return (
    <div className="sc sc-ink">
      {rows.map(([label, at, c], i) => (
        <h1 key={label} className={`huge c-${c}`} style={{ top: 250 + i * 130, opacity: out(ramp(t, at, 0.2) * 2), transform: `translateX(${(1 - out(ramp(t, at, 0.3))) * -60}px)` }}>{label}</h1>
      ))}
    </div>
  );
}

function Outro({ t }: { t: number }) {
  const t0 = cut('outro'), play = wordAt('outro', 'play');
  return (
    <div className="sc sc-paper">
      <div className="lockup is-big" style={{ top: 190, ...pop(ramp(t, t0, 0.4)) }}><Logo size={120} /><span>GamedIn</span></div>
      <h2 className="mid" style={{ top: 480, ...rise(ramp(t, play, 0.3)) }}>Play as many as you like.</h2>
      <div className="row" style={{ top: 570 }}>
        {GAME_IDS.map((id, i) => <div key={id} className="tiny" style={pop(ramp(t, play + 0.15 + i * 0.07, 0.3))}><Brd id={id} /></div>)}
      </div>
      <p className="fine" style={{ top: 700, ...rise(ramp(t, play + 0.6, 0.4), 10) }}>Free in your browser, on phone and desktop.</p>
      <p className="fine is-small" style={{ top: 880, opacity: ramp(t, play + 0.8, 0.4) }}>An independent project, not affiliated with LinkedIn.</p>
    </div>
  );
}

function Captions({ t, dark }: { t: number; dark: boolean }) {
  const l = TL.lines.find((x) => t >= x.start - 0.05 && t < x.start + x.dur + 0.25);
  if (!l) return null;
  // chunks of up to three words, broken at punctuation
  const chunks: Word[][] = [[]];
  l.words.forEach((w, i) => { chunks[chunks.length - 1].push(w); if ((/[.?!,]$/.test(w.w) || chunks[chunks.length - 1].length === 3) && i < l.words.length - 1) chunks.push([]); });
  const rel = t - l.start;
  const cur = chunks.find((c, i) => rel < (chunks[i + 1]?.[0].s ?? Infinity)) ?? chunks[chunks.length - 1];
  return (
    <p className={`cap${dark ? ' is-light' : ''}`} style={{ transform: `scale(${0.94 + 0.06 * out((rel - cur[0].s) / 0.12)})` }}>
      {cur.map((w) => <span key={w.s} className={rel >= w.s ? 'is-said' : ''}>{w.w} </span>)}
    </p>
  );
}

function Scene({ t }: { t: number }): ReactNode {
  const ids = TL.lines.map((l) => l.id);
  let id = ids[0];
  for (const x of ids) if (t >= cut(x)) id = x;
  const body = id === 'hook' ? <Hook t={t} /> : id === 'meet' ? <Meet t={t} /> : id === 'fresh' ? <Fresh t={t} /> : id === 'hint' ? <HintScene t={t} />
    : id === 'free' ? <Free t={t} /> : id === 'outro' ? <Outro t={t} /> : <Beat t={t} id={id as GameId} />;
  // a quick wipe of the next scene's colour over each cut
  const since = t - cut(id), wipe = id !== 'hook' && since < 0.2 ? 1 - out(since / 0.2) : 0;
  return (
    <div className="frame">
      {body}
      {wipe > 0 && <div className="wipe" style={{ opacity: wipe * 0.9 }} />}
      <Captions t={t} dark={id === 'free'} />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
(window as any).DURATION = TL.duration;
(window as any).renderAt = (t: number) => flushSync(() => root.render(<Scene t={t} />));
if (new URLSearchParams(location.search).has('render')) (window as any).renderAt(0);
else { const t0 = performance.now(); const loop = () => { (window as any).renderAt(((performance.now() - t0) / 1000) % TL.duration); requestAnimationFrame(loop); }; loop(); }
