import { useEffect, useState } from 'react';
import type { GameId } from '../engine/index.ts';
import type { Difficulty } from '../engine/types.ts';
import { dailySpec, dayKey, GAME_IDS, META } from '../games.ts';
import { gameFromPath, HOME_SEO, rootPath, SEO } from '../seo.ts';
import { useStore } from '../store.ts';
import { GamePage } from './GamePage.tsx';
import { Home } from './Home.tsx';
import { Play } from './Play.tsx';
import { Stats } from './Stats.tsx';

export const go = (path: string) => { location.hash = path; };

type Route =
  | { page: 'home' } | { page: 'stats' } | { page: 'game'; game: GameId }
  | { page: 'play'; game: GameId; size: number; difficulty: Difficulty; seed: string; daily?: string };

/**
 * Routes live after the #. A game's own page (/trace/) is what you get with no
 * route at all; any route, even #/, leaves it for the app proper.
 */
function parse(hash: string, path = location.pathname): Route {
  const [, page, game, size, difficulty, seed] = hash.replace(/^#/, '').split('/');
  const id = GAME_IDS.find((g) => g === game);
  if (page === 'stats') return { page: 'stats' };
  if (page === 'daily' && id) { const day = dayKey(); return { page: 'play', game: id, ...dailySpec(id, day), daily: day }; }
  if (page === 'play' && id && META[id].sizes.includes(+size) && ['easy', 'medium', 'hard'].includes(difficulty) && seed) {
    return { page: 'play', game: id, size: +size, difficulty: difficulty as Difficulty, seed: decodeURIComponent(seed).slice(0, 40) };
  }
  const own = gameFromPath(path);
  return own && !hash.replace(/^#/, '') ? { page: 'game', game: own } : { page: 'home' };
}

export function App() {
  const [route, setRoute] = useState(() => parse(location.hash));
  const { settings } = useStore();
  useEffect(() => {
    const on = () => { setRoute((was) => { const next = parse(location.hash); return JSON.stringify(next) === JSON.stringify(was) ? was : next; }); window.scrollTo(0, 0); };
    // popstate too: stepping back from the app to a game's page changes the path as well as the hash
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => { window.removeEventListener('hashchange', on); window.removeEventListener('popstate', on); };
  }, []);
  useEffect(() => {
    // the app proper lives at the site root: leave /trace/ without reloading, so Back returns to it
    if (route.page !== 'game' && gameFromPath(location.pathname)) history.replaceState(history.state, '', rootPath(location.pathname) + location.search + location.hash);
    document.title = route.page === 'game' ? SEO[route.game].title : HOME_SEO.title;
  }, [route]);
  useEffect(() => {
    if (settings.theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  if (route.page === 'play') {
    const { page: _page, ...spec } = route;
    return <Play key={`${spec.game}/${spec.size}/${spec.difficulty}/${spec.seed}/${spec.daily ?? ''}`} {...spec} />;
  }
  if (route.page === 'game') return <GamePage key={route.game} game={route.game} />;
  return route.page === 'stats' ? <Stats /> : <Home />;
}
