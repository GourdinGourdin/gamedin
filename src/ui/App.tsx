import { useEffect, useState } from 'react';
import type { GameId } from '../engine/index.ts';
import type { Difficulty } from '../engine/types.ts';
import { dailySpec, dayKey, GAME_IDS } from '../games.ts';
import { useStore } from '../store.ts';
import { Home } from './Home.tsx';
import { Play } from './Play.tsx';
import { Stats } from './Stats.tsx';

export const go = (path: string) => { location.hash = path; };

type Route =
  | { page: 'home' } | { page: 'stats' }
  | { page: 'play'; game: GameId; size: number; difficulty: Difficulty; seed: string; daily?: string };

function parse(hash: string): Route {
  const [, page, game, size, difficulty, seed] = hash.replace(/^#/, '').split('/');
  const id = GAME_IDS.find((g) => g === game);
  if (page === 'stats') return { page: 'stats' };
  if (page === 'daily' && id) { const day = dayKey(); return { page: 'play', game: id, ...dailySpec(id, day), daily: day }; }
  if (page === 'play' && id && +size >= 4 && +size <= 10 && ['easy', 'medium', 'hard'].includes(difficulty) && seed) {
    return { page: 'play', game: id, size: +size, difficulty: difficulty as Difficulty, seed: decodeURIComponent(seed).slice(0, 40) };
  }
  return { page: 'home' };
}

export function App() {
  const [route, setRoute] = useState(() => parse(location.hash));
  const { settings } = useStore();
  useEffect(() => {
    const on = () => { setRoute(parse(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (settings.theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  if (route.page === 'play') {
    const { page: _page, ...spec } = route;
    return <Play key={`${spec.game}/${spec.size}/${spec.difficulty}/${spec.seed}/${spec.daily ?? ''}`} {...spec} />;
  }
  return route.page === 'stats' ? <Stats /> : <Home />;
}
