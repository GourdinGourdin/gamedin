import { DIFF_LABEL, formatTime, GAME_IDS, META } from '../games.ts';
import { streak, summary, useStore } from '../store.ts';
import { go } from './App.tsx';
import { Back, Time } from './icons.tsx';

export function Stats() {
  const { results } = useStore();
  const run = streak(results);
  return (
    <div className="page stats">
      <header className="top">
        <button className="icon-btn" onClick={() => go('/')} aria-label="Back to all games"><Back /></button>
        <h1 className="top-title">Statistics</h1>
        <span className="top-spacer" />
      </header>
      {results.length === 0 ? (
        <div className="empty-card">
          <h2>No scores yet</h2>
          <p>Solve a puzzle and your times, best runs and daily streak show up here.</p>
          <button className="btn btn-primary" onClick={() => go('/')}>Pick a puzzle</button>
        </div>
      ) : <>
      <dl className="totals">
        <div><dt>Puzzles solved</dt><dd>{results.length}</dd></div>
        <div><dt>Daily streak</dt><dd>{run}</dd></div>
        <div><dt>Time played</dt><dd><Time text={formatTime(results.reduce((a, r) => a + r.ms, 0))} /></dd></div>
      </dl>
      <ul className="stat-list">
        {GAME_IDS.map((id) => {
          const s = summary(results, id);
          if (!s.played) return null;
          const max = Math.max(...s.recent.map((r) => r.ms));
          return (
            <li key={id} className={`stat g-${id}`}>
              <h2>{META[id].name}</h2>
              <dl>
                <div><dt>Solved</dt><dd>{s.played}</dd></div>
                <div><dt>Best</dt><dd><Time text={formatTime(s.best)} /></dd></div>
                <div><dt>Average</dt><dd><Time text={formatTime(s.average)} /></dd></div>
              </dl>
              <div className="bars" role="img" aria-label={`Last ${s.recent.length} solve times, oldest first`}>
                {s.recent.map((r, i) => <i key={i} style={{ height: `${Math.max(6, (r.ms / max) * 100)}%` }} title={`${formatTime(r.ms)}, ${META[id].sizeLabel(r.size)} ${DIFF_LABEL[r.difficulty]}`} />)}
              </div>
              <p className="bars-note">Last {s.recent.length} solve{s.recent.length === 1 ? '' : 's'}, oldest on the left</p>
            </li>
          );
        })}
      </ul>
      </>}
    </div>
  );
}
