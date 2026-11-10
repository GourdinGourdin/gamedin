// One page per game, at /trace/ and friends. Real links and real text, so it
// reads well in search results and with scripts off; the board is a solved one.
import { DIFF_LABEL, dailySpec, formatTime, GAME_IDS, META } from '../games.ts';
import type { GameId } from '../engine/index.ts';
import { SEO } from '../seo.ts';
import { dailyDone, summary, useStore, type Result } from '../store.ts';
import { go } from './App.tsx';
import { Cover, startGame } from './Home.tsx';
import { Back, Check, Logo } from './icons.tsx';
import './gamepage.css';

const ORDER = { easy: 0, medium: 1, hard: 2 } as const;

/** The fastest solve for each size and difficulty played. */
function bests(results: Result[], game: GameId) {
  const best = new Map<string, Result>();
  for (const r of results) {
    if (r.game !== game) continue;
    const k = `${r.size}/${r.difficulty}`, was = best.get(k);
    if (!was || r.ms < was.ms) best.set(k, r);
  }
  return [...best.values()].sort((a, b) => a.size - b.size || ORDER[a.difficulty] - ORDER[b.difficulty]);
}

export function GamePage({ game }: { game: GameId }) {
  const { results, progress, settings } = useStore();
  const m = META[game], s = SEO[game];
  const saved = progress[game], resume = !!saved && saved.key.startsWith('play/');
  const pref = settings.prefs[game] ?? { size: m.defaultSize, difficulty: 'medium' as const };
  const daily = results.find((r) => r.game === game && r.daily && dailyDone([r], game));
  const rows = bests(results, game);
  const solved = summary(results, game).played;

  return (
    <div className={`page gp g-${game}`}>
      <header className="top">
        <a className="icon-btn" href="../" aria-label="All games"><Back /></a>
        <a className="brand" href="../"><Logo /><span>GamedIn</span></a>
      </header>

      <main>
        <section className="gp-hero">
          <div className="gp-board"><Cover game={game} /></div>
          <div className="gp-head">
            <h1>{m.name}</h1>
            <p className="gp-pitch">{s.pitch}</p>
            <div className="gp-actions">
              <button className="btn btn-primary" onClick={() => startGame(game)}>
                {resume ? 'Continue' : 'Play'}
                <small>{resume ? formatTime(saved.ms) : `${m.sizeLabel(pref.size)} ${DIFF_LABEL[pref.difficulty]}`}</small>
              </button>
              <button className={`btn btn-quiet${daily ? ' is-done' : ''}`} onClick={() => go(`/daily/${game}`)}>
                {daily ? <><Check />Daily</> : 'Daily'}
                <small>{daily ? formatTime(daily.ms) : DIFF_LABEL[dailySpec(game).difficulty]}</small>
              </button>
            </div>
          </div>
        </section>

        <div className="gp-cols">
          <section className="gp-section">
            <h2>How to play</h2>
            <ol className="gp-how">{m.how.map((h) => <li key={h}>{h}</li>)}</ol>
          </section>

          <section className="gp-section">
            <h2>Your best times</h2>
            {rows.length === 0
              ? <p className="gp-empty">Solve a puzzle and your best time shows up here.</p>
              : <>
                <table className="gp-times">
                  <tbody>{rows.map((r) => (
                    <tr key={`${r.size}/${r.difficulty}`}><th scope="row">{m.sizeLabel(r.size)} {DIFF_LABEL[r.difficulty]}</th><td>{formatTime(r.ms)}</td></tr>
                  ))}</tbody>
                </table>
                <p className="gp-empty">{solved} solved on this device.</p>
              </>}
          </section>
        </div>

        <section className="gp-section">
          <h2>About {m.name}</h2>
          <p className="gp-about">{s.about}</p>
        </section>

        <section className="gp-section" aria-labelledby="more-title">
          <h2 id="more-title">More puzzles</h2>
          <ul className="gp-more">
            {GAME_IDS.filter((g) => g !== game).map((g) => (
              <li key={g} className={`g-${g}`}>
                <a href={`../${g}/`}>
                  <span className="gp-more-cover"><Cover game={g} /></span>
                  <span className="gp-more-name">{META[g].name}</span>
                  <span className="gp-more-rule">{META[g].rule}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>GamedIn works offline and keeps your scores on this device. No account, no ads, no tracking.</p>
        <p>An independent project. Not affiliated with LinkedIn.</p>
      </footer>
    </div>
  );
}
