// Wind generator: pick a theme, pick words whose lengths fill the grid, lay
// them end to end along a random path through every tile, then check that no
// other set of common words fills the same grid.
import { makeRng, randInt, shuffle, type Rng } from '../rng.ts';
import type { Difficulty, Grade } from '../types.ts';
import { randomPath } from '../trace/generate.ts';
import { solveAllWind, type WindDict, type WindPuzzle } from './solve.ts';
import { THEMES } from './themes.ts';
import { WORDS_PACKED } from './words.ts';

export interface WindGamePuzzle extends WindPuzzle {
  theme: string;
  /** easy: the first tile of each word is marked; hard: the theme is hidden */
  showStarts: boolean;
  showTheme: boolean;
}
export interface WindGame { puzzle: WindGamePuzzle; /** paths and words, longest word first */ solution: { paths: number[][]; words: string[] }; grade: Grade }
export const WIND_SIZES = [4, 5, 6];

let cached: WindDict | null = null;
export function windDict(): WindDict {
  if (cached) return cached;
  const set = new Set<string>();
  let prev = '', i = 0;
  const b = WORDS_PACKED;
  while (i < b.length) {
    const k = b.charCodeAt(i++) - 48;
    let j = i;
    while (j < b.length && b.charCodeAt(j) >= 97) j++;
    prev = prev.slice(0, k) + b.slice(i, j);
    set.add(prev.toUpperCase());
    i = j;
  }
  for (const t of THEMES) for (const w of t.words) set.add(w);
  return (cached = { words: [...set] });
}

/** Words from `pool` whose lengths add up to `total`, using `min`..`max` words. */
function pickWords(pool: string[], total: number, min: number, max: number, r: Rng): string[] | null {
  const words = shuffle(r, pool.slice()), out: string[] = [];
  const go = (i: number, left: number): boolean => {
    if (left === 0) return out.length >= min;
    if (i === words.length || out.length === max || left < 3) return false;
    if (words[i].length <= left) { out.push(words[i]); if (go(i + 1, left - words[i].length)) return true; out.pop(); }
    return go(i + 1, left);
  };
  return go(0, total) ? out : null;
}

const COUNT: Record<number, [number, number]> = { 4: [3, 3], 5: [4, 5], 6: [5, 7] };
const key = (path: number[]) => path.slice().sort((a, b) => a - b).join(',');

export function generateWind(size: number, difficulty: Difficulty, seed: string): WindGame {
  const r = makeRng(`wind/${size}/${difficulty}/${seed}`), N = size, n = N * N, dict = windDict();
  const [min, max] = COUNT[N] ?? [Math.round(n / 7), Math.round(n / 5)];
  for (let attempt = 0; attempt < 400; attempt++) {
    const theme = THEMES[randInt(r, THEMES.length)];
    const words = pickWords(theme.words, n, min, max, r);
    if (!words) continue;
    const path = randomPath(N, r), letters = new Array<string>(n), paths: number[][] = [];
    let at = 0;
    for (const w of words) {
      const cells = path.slice(at, at + w.length);
      at += w.length;
      if (r() < 0.5) cells.reverse();
      cells.forEach((c, j) => { letters[c] = w[j]; });
      paths.push(cells);
    }
    const order = words.map((_, i) => i).sort((a, b) => words[b].length - words[a].length || (words[a] < words[b] ? -1 : 1));
    const puzzle: WindGamePuzzle = {
      rows: N, cols: N, letters, lengths: order.map((i) => words[i].length), theme: theme.title,
      showStarts: difficulty === 'easy', showTheme: difficulty !== 'hard',
    };
    const mine = new Set(paths.map(key));
    const covers = solveAllWind(puzzle, dict, { maxCovers: 2, timeoutMs: 400 });
    if (covers.length !== 1 || !covers[0].paths.every((p) => mine.has(key(p)))) continue;
    return {
      puzzle, solution: { paths: order.map((i) => paths[i]), words: order.map((i) => words[i]) },
      grade: { solved: true, level: 0, counts: [words.length], difficulty },
    };
  }
  throw new Error('wind: no puzzle found');
}

/** True if only one set of common words fills the grid. */
export function isUniqueWind(p: WindPuzzle): boolean {
  const covers = solveAllWind(p, windDict(), { maxCovers: 3, timeoutMs: 3000 });
  const sets = new Set(covers.map((c) => c.paths.map(key).sort().join('|')));
  return sets.size === 1;
}
