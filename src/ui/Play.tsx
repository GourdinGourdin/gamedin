import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { GameId } from '../engine/index.ts';
import type { Difficulty } from '../engine/types.ts';
import { DIFF_LABEL, formatTime, META } from '../games.ts';
import { generate, nextSeed, takeSeed, type Generated } from '../gen.ts';
import { addResult, getStore, saveProgress, setPref, setSettings, streak, useStore } from '../store.ts';
import { go } from './App.tsx';
import { UI } from './boards/index.ts';
import type { Hint } from './boards/common.tsx';
import { Back, Bulb, Help, Restart, Share, Sliders, Undo, Time } from './icons.tsx';
import { Choice, Sheet } from './Sheet.tsx';

type ClockRef = RefObject<{ ms: number; last: number }>;

/** The running time. It ticks on its own, so the board does not redraw with it. */
function Clock({ clock, running }: { clock: ClockRef; running: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) { tick((n) => n + 1); return; }
    clock.current.last = performance.now();
    const step = () => {
      const now = performance.now();
      if (!document.hidden) clock.current.ms += now - clock.current.last;
      clock.current.last = now;
      tick((n) => n + 1);
    };
    const id = setInterval(step, 250);
    return () => { step(); clearInterval(id); };
  }, [running, clock]);
  const ms = clock.current.ms;
  return <time className="clock" aria-label={`Time ${formatTime(ms)}`}><Time text={formatTime(ms)} /></time>;
}

interface Props { game: GameId; size: number; difficulty: Difficulty; seed: string; daily?: string }

export function Play({ game, size, difficulty, seed, daily }: Props) {
  const m = META[game], ui = UI[game];
  const key = daily ? `daily/${game}/${daily}` : `play/${game}/${size}/${difficulty}/${seed}`;
  const { settings, results } = useStore();
  const [g, setG] = useState<Generated | null>(null);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<unknown[]>([]);
  const [ms, setMs] = useState(0);
  const [hints, setHints] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [done, setDone] = useState(false);
  const [sheet, setSheet] = useState<'options' | 'how' | null>(null);
  const [copied, setCopied] = useState(false);
  const [opt, setOpt] = useState({ size, difficulty });
  const clock = useRef({ ms: 0, last: 0 });
  const state = history[history.length - 1];
  const already = daily ? results.find((r) => r.game === game && r.daily === daily) : undefined;

  useEffect(() => {
    let on = true;
    generate({ game, size, difficulty, seed }).then((x) => {
      if (!on) return;
      const saved = getStore().progress[game];
      if (already) { setHistory([ui.solvedState(x.puzzle, x.solution)]); setMs(already.ms); setDone(true); }
      else if (saved?.key === key) { setHistory(saved.history); clock.current.ms = saved.ms; setMs(saved.ms); setHints(saved.hints); }
      else setHistory([ui.initial(x.puzzle)]);
      setG(x);
      if (!getStore().settings.seenHow[game]) { setSheet('how'); setSettings({ seenHow: { ...getStore().settings.seenHow, [game]: true } }); }
    }).catch(() => on && setFailed(true));
    if (!daily) nextSeed(game, size, difficulty);
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!g || done || !history.length) return;
    saveProgress(game, { key, state, history: history.slice(-200), ms: clock.current.ms, hints });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, hints]);

  // the board gets one set() for its whole life, so it never re-renders just for a new function
  const setRef = useRef<(next: unknown, merge?: boolean) => void>(() => {});
  const stableSet = useCallback((next: unknown, merge?: boolean) => setRef.current(next, merge), []);

  if (failed) return (
    <div className="page play">
      <header className="top"><button className="icon-btn" onClick={() => go('/')} aria-label="Back to all games"><Back /></button></header>
      <div className="empty-card" role="alert">
        <h2>Could not make this puzzle</h2>
        <p>Something went wrong while building the board. A fresh one usually works.</p>
        <button className="btn btn-primary" onClick={() => go(`/play/${game}/${size}/${difficulty}/${takeSeed(game, size, difficulty)}`)}>Try another</button>
      </div>
    </div>
  );

  const finish = (final: unknown) => {
    if (!g || !ui.solved(g.puzzle, final, g.solution)) return;
    const now = performance.now();
    clock.current.ms += now - clock.current.last;
    clock.current.last = now;
    setMs(clock.current.ms);
    setDone(true); setHint(null);
    addResult({ game, size, difficulty, ms: Math.round(clock.current.ms), at: Date.now(), hints, daily });
    saveProgress(game, null);
  };
  const set = (next: unknown, merge?: boolean) => {
    if (done) return;
    setHint(null);
    setHistory((h) => (merge && h.length > 1 ? [...h.slice(0, -1), next] : [...h, next]));
    finish(next);
  };
  setRef.current = set;
  const undo = () => { setHint(null); setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h)); };
  const restart = () => { if (g) { setHint(null); setHistory((h) => [...h, ui.initial(g.puzzle)]); } };
  const askHint = () => {
    if (!g) return;
    if (hint?.apply) { const next = hint.apply(state); setHint(null); setHistory((h) => [...h, next]); finish(next); return; }
    const h = ui.hint(g.puzzle, state, g.solution);
    if (!h) return;
    if (h.now) { const next = h.now(state); if (next !== state) setHistory((hs) => [...hs, next]); }
    setHint(h); setHints((n) => n + 1);
  };
  const next = (s = size, d = difficulty) => go(`/play/${game}/${s}/${d}/${takeSeed(game, s, d)}`);
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/${daily ? `daily/${game}` : key}`;
    const text = `${daily ? 'Daily ' : ''}${m.name} ${m.sizeLabel(size)} ${DIFF_LABEL[difficulty]}, solved in ${formatTime(ms)}${hints ? ` with ${hints} hint${hints === 1 ? '' : 's'}` : ''}. Can you beat it?`;
    try {
      if (navigator.share) await navigator.share({ title: 'GamedIn', text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* share sheet closed */ }
  };

  // earlier solves at this size and level (the one just finished is left out)
  const same = results.filter((r) => r.game === game && r.size === size && r.difficulty === difficulty);
  const before = done && !already ? same.slice(0, -1) : same;
  const best = before.length ? Math.min(...before.map((r) => r.ms)) : 0;
  const isBest = done && !already && best > 0 && Math.round(ms) < best;
  return (
    <div className={`page play g-${game}${done ? ' is-done' : ''}`}>
      <header className="top">
        <button className="icon-btn" onClick={() => go('/')} aria-label="Back to all games"><Back /></button>
        <div className="top-title">
          <h1>{m.name}</h1>
          <p>{daily ? 'Daily puzzle' : m.sizeLabel(size)} <span>{DIFF_LABEL[difficulty]}</span></p>
        </div>
        <Clock clock={clock} running={!!g && !done && !sheet} />
      </header>

      <main className="stage">
        {g ? <ui.Board puzzle={g.puzzle} solution={g.solution} state={state} set={stableSet} done={done} hint={hint} settings={settings} />
          : <div className="board-wait" role="status" aria-label="Making your puzzle" />}
      </main>

      <p className="sr-only" role="status" aria-live="polite">{done ? `Solved in ${formatTime(ms)}.` : ''}</p>

      {hint && (
        <aside className="hint" role="status">
          <p>{hint.text}</p>
          <div>
            {hint.apply && <button className="btn btn-small btn-primary" onClick={askHint}>Do it for me</button>}
            <button className="btn btn-small btn-quiet" onClick={() => setHint(null)}>Got it</button>
          </div>
        </aside>
      )}

      {done ? (
        <section className="result">
          <p className="result-label">{already ? 'Solved today' : isBest ? 'New best' : 'Solved'}</p>
          <p className="result-time"><Time text={formatTime(ms)} /></p>
          <p className="result-note">
            {hints > 0 && !already ? `${hints} hint${hints === 1 ? '' : 's'} used. ` : ''}
            {best > 0 && !isBest ? `Your best at this size and level is ${formatTime(best)}.` : ''}
            {daily ? ` ${streak(results)} day${streak(results) === 1 ? '' : 's'} in a row. Next daily tomorrow.` : ''}
          </p>
          <div className="result-actions">
            <button className="btn btn-primary btn-wide" onClick={() => next()} autoFocus>{daily ? 'Play another' : 'Next puzzle'}</button>
            <button className="btn btn-quiet" onClick={share}><Share />{copied ? 'Copied' : 'Share'}</button>
          </div>
        </section>
      ) : (
        <nav className="tools" aria-label="Game controls">
          <button onClick={undo} disabled={history.length < 2}><Undo /><span>Undo</span></button>
          <button onClick={askHint} disabled={!g}><Bulb /><span>Hint</span></button>
          <button onClick={restart} disabled={history.length < 2}><Restart /><span>Clear</span></button>
          <button onClick={() => setSheet('how')}><Help /><span>Rules</span></button>
          <button onClick={() => setSheet('options')}><Sliders /><span>New</span></button>
        </nav>
      )}

      {sheet === 'how' && (
        <Sheet title={`How to play ${m.name}`} onClose={() => setSheet(null)}>
          <ol className="how">{m.how.map((line) => <li key={line}>{line}</li>)}</ol>
          <button className="btn btn-primary btn-wide" onClick={() => setSheet(null)}>Play</button>
        </Sheet>
      )}
      {sheet === 'options' && (
        <Sheet title={`New ${m.name} puzzle`} onClose={() => setSheet(null)}>
          <Choice label="Size" value={opt.size} onChange={(s) => setOpt({ ...opt, size: s })} options={m.sizes.map((s) => ({ value: s, label: m.sizeLabel(s) }))} />
          <Choice label="Difficulty" value={opt.difficulty} onChange={(d) => setOpt({ ...opt, difficulty: d })}
            options={(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => ({ value: d, label: DIFF_LABEL[d] }))} />
          <button className="btn btn-primary btn-wide" onClick={() => { setPref(game, opt.size, opt.difficulty); saveProgress(game, null); next(opt.size, opt.difficulty); }}>Start</button>
        </Sheet>
      )}
    </div>
  );
}
