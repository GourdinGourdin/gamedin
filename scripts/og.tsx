// Source of public/og.png and public/og-<game>.png, the link-preview images (1200 x 630).
// Rendered by scripts/og.ts; og.html?game=trace picks one game's card.
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/schibsted-grotesk';
import '../src/ui/styles.css';
import { GAMES, type GameId } from '../src/engine/index.ts';
import { GAME_IDS, META } from '../src/games.ts';
import { UI } from '../src/ui/boards/index.ts';
import { Logo } from '../src/ui/icons.tsx';
import { SEO } from '../src/seo.ts';

const SIZE = { trace: 5, crowns: 6, pairs: 6, plots: 5, wind: 4 } as const;
const settings = { theme: 'light', autoCross: false, showErrors: false, prefs: {}, seenHow: {} } as const;

function Card() {
  return (
    <div style={{ width: 1200, height: 630, boxSizing: 'border-box', padding: '56px 72px 52px', background: 'var(--bg)', display: 'grid', gridTemplateRows: 'auto 1fr auto', fontFamily: 'var(--font)', animation: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontWeight: 800, fontSize: 40, letterSpacing: '-.03em' }}><Logo size={60} />GamedIn</div>
      <h1 style={{ fontSize: 84, lineHeight: 0.98, letterSpacing: '-.045em', fontWeight: 800, alignSelf: 'center' }}>Five puzzles.<br /><span style={{ color: 'var(--trace)' }}>No daily limit.</span></h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 28, alignItems: 'end' }}>
        {GAME_IDS.map((id) => {
          const g = GAMES[id].generate(SIZE[id], 'easy', 'cover'), ui = UI[id];
          return (
            <div key={id} className="cover" style={{ display: 'grid', gap: 10, aspectRatio: 'auto' }}>
              <ui.Board puzzle={g.puzzle} solution={g.solution} state={ui.solvedState(g.puzzle, g.solution)} set={() => {}} done hint={null} preview settings={settings} />
              <span style={{ fontWeight: 750, fontSize: 24, letterSpacing: '-.02em' }}>{META[id].name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/** One game: its name and pitch, and a large solved board. */
function GameCard({ id }: { id: GameId }) {
  const g = GAMES[id].generate(SIZE[id], 'easy', 'cover'), ui = UI[id];
  return (
    <div style={{ width: 1200, height: 630, boxSizing: 'border-box', padding: '56px 72px 52px', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 470px', gap: 64, fontFamily: 'var(--font)', animation: 'none' }}>
      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontWeight: 800, fontSize: 40, letterSpacing: '-.03em' }}><Logo size={60} />GamedIn</div>
        <div style={{ alignSelf: 'center' }}>
          <h1 style={{ fontSize: 150, lineHeight: 0.95, letterSpacing: '-.05em', fontWeight: 800, color: `var(--${id})` }}>{META[id].name}</h1>
          <p style={{ marginTop: 24, fontSize: 40, lineHeight: 1.15, letterSpacing: '-.02em', fontWeight: 600, color: 'var(--ink-2)', maxWidth: 560 }}>{SEO[id].pitch}</p>
        </div>
      </div>
      <div style={{ alignSelf: 'center', padding: 20, borderRadius: 30, background: 'var(--surface)', boxShadow: 'inset 0 0 0 2px var(--line)' }}>
        <div className={`cover g-${id}`} style={{ borderRadius: 18 }}>
          <ui.Board puzzle={g.puzzle} solution={g.solution} state={ui.solvedState(g.puzzle, g.solution)} set={() => {}} done hint={null} preview settings={settings} />
        </div>
      </div>
    </div>
  );
}

document.documentElement.dataset.theme = 'light';
const game = new URLSearchParams(location.search).get('game') as GameId | null;
createRoot(document.getElementById('root')!).render(game && GAME_IDS.includes(game) ? <GameCard id={game} /> : <Card />);
