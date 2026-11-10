import { useEffect, useState } from 'react';
import type { GameId } from '../engine/index.ts';
import { DIFF_LABEL, dailySpec, formatTime, GAME_IDS, META } from '../games.ts';
import { LARPEDIN_URL } from '../links.ts';
import { generate, takeSeed, type Generated } from '../gen.ts';
import { dailyDone, getStore, resetAll, setSettings, streak, useStore } from '../store.ts';
import { go } from './App.tsx';
import { UI } from './boards/index.ts';
import { Chart, Check, External, Gear, LarpedInMark, Logo } from './icons.tsx';
import { Choice, Sheet, Toggle } from './Sheet.tsx';

const COVER: Record<GameId, number> = { trace: 5, crowns: 6, pairs: 6, plots: 5, wind: 4 };

/** A small solved board, drawn from a real generated puzzle. */
export function Cover({ game }: { game: GameId }) {
  const [g, setG] = useState<Generated | null>(null);
  const { settings } = useStore();
  useEffect(() => { let on = true; void generate({ game, size: COVER[game], difficulty: 'easy', seed: 'cover' }).then((x) => { if (on) setG(x); }); return () => { on = false; }; }, [game]);
  const ui = UI[game];
  return (
    <div className={`cover g-${game}`} aria-hidden="true">
      {g && <ui.Board puzzle={g.puzzle} solution={g.solution} state={ui.solvedState(g.puzzle, g.solution)} set={() => {}} done hint={null} preview settings={settings} />}
    </div>
  );
}

export function startGame(game: GameId) {
  const { settings, progress } = getStore();
  const saved = progress[game];
  if (saved && saved.key.startsWith('play/')) { go(`/${saved.key}`); return; }
  const pref = settings.prefs[game] ?? { size: META[game].defaultSize, difficulty: 'medium' as const };
  go(`/play/${game}/${pref.size}/${pref.difficulty}/${takeSeed(game, pref.size, pref.difficulty)}`);
}

export function Home() {
  const { results, progress, settings } = useStore();
  const [sheet, setSheet] = useState(false);
  const run = streak(results);
  return (
    <div className="page home">
      <header className="top">
        <a className="brand" href="#/"><Logo /><span>GamedIn</span></a>
        <nav>
          <button className="icon-btn" onClick={() => go('/stats')} aria-label="Statistics"><Chart /></button>
          <button className="icon-btn" onClick={() => setSheet(true)} aria-label="Settings"><Gear /></button>
        </nav>
      </header>

      <section className="intro">
        <h1>Five puzzles.<br />No daily limit.</h1>
        <p>Every board is made on your device, has exactly one solution, and never needs a guess.</p>
        {run > 0 && <p className="streak"><b>{run}</b> day{run === 1 ? '' : 's'} in a row</p>}
      </section>

      <ul className="games">
        {GAME_IDS.map((id) => {
          const m = META[id], saved = progress[id], resume = !!saved && saved.key.startsWith('play/');
          const daily = results.find((r) => r.game === id && r.daily && dailyDone([r], id));
          const pref = settings.prefs[id] ?? { size: m.defaultSize, difficulty: 'medium' as const };
          return (
            <li key={id} className={`game g-${id}`}>
              <button className="game-cover" onClick={() => startGame(id)} aria-label={`Play ${m.name}`}><Cover game={id} /></button>
              <div className="game-text">
                <h2><a href={`${id}/`}>{m.name}</a></h2>
                <p>{m.rule}</p>
              </div>
              <div className="game-actions">
                <button className="btn btn-primary" onClick={() => startGame(id)}>
                  {resume ? 'Continue' : 'Play'}
                  <small>{resume ? formatTime(saved.ms) : `${m.sizeLabel(pref.size)} ${DIFF_LABEL[pref.difficulty]}`}</small>
                </button>
                <button className={`btn btn-quiet${daily ? ' is-done' : ''}`} onClick={() => go(`/daily/${id}`)}>
                  {daily ? <><Check />Daily</> : 'Daily'}
                  <small>{daily ? formatTime(daily.ms) : DIFF_LABEL[dailySpec(id).difficulty]}</small>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="promo" aria-labelledby="promo-title">
        <LarpedInMark size={56} />
        <div className="promo-text">
          <h2 id="promo-title">LarpedIn</h2>
          <p>A free browser extension that solves LinkedIn's daily puzzles for you, in milliseconds.</p>
        </div>
        <a className="btn btn-quiet" href={LARPEDIN_URL} target="_blank" rel="noopener">Visit LarpedIn<External /></a>
      </section>

      <footer className="foot">
        <p>GamedIn works offline and keeps your scores on this device. No account, no ads, no tracking.</p>
        <p>An independent project, not affiliated with LinkedIn.</p>
      </footer>

      {sheet && (
        <Sheet title="Settings" onClose={() => setSheet(false)}>
          <Choice label="Appearance" value={settings.theme} onChange={(theme) => setSettings({ theme })}
            options={[{ value: 'auto', label: 'Match device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          <Toggle label="Show mistakes" hint="Mark cells that break a rule as you play." value={settings.showErrors} onChange={(showErrors) => setSettings({ showErrors })} />
          <Toggle label="Cross out for me" hint="In Crowns, mark the cells each crown rules out." value={settings.autoCross} onChange={(autoCross) => setSettings({ autoCross })} />
          <button className="btn btn-danger" onClick={() => { if (confirm('Delete all scores and saved games on this device?')) { resetAll(); setSheet(false); } }}>Delete my data</button>
        </Sheet>
      )}
    </div>
  );
}
