import type { GameId } from './engine/index.ts';
import type { Difficulty } from './engine/types.ts';

export interface GameMeta {
  id: GameId;
  name: string;
  /** one line, shown on the home screen */
  rule: string;
  /** shown in "How to play" */
  how: string[];
  sizes: number[];
  defaultSize: number;
  sizeLabel: (n: number) => string;
}

const grid = (n: number) => `${n}×${n}`;

export const META: Record<GameId, GameMeta> = {
  trace: {
    id: 'trace', name: 'Trace', rule: 'One line through every cell, numbers in order.',
    how: ['Start on 1 and drag a line from cell to cell.', 'Pass the numbers in order and finish on the last one.', 'Fill every cell. The line cannot cross itself or a wall.', 'Drag back along the line, or grab it anywhere, to rewind.'],
    sizes: [6, 7, 8], defaultSize: 7, sizeLabel: grid,
  },
  crowns: {
    id: 'crowns', name: 'Crowns', rule: 'One crown in every row, column and colour.',
    how: ['Place one crown in each row, each column and each colour region.', 'Two crowns can never touch, not even at a corner.', 'Tap once to cross a cell out, twice for a crown. Drag to cross out several, or start a drag on a cross to clear them.'],
    sizes: [7, 8, 9, 10, 11], defaultSize: 8, sizeLabel: grid,
  },
  pairs: {
    id: 'pairs', name: 'Pairs', rule: 'Fill the grid with two shapes, evenly.',
    how: ['Every row and column holds the same number of circles and squares.', 'Never three of the same shape in a line.', 'Cells joined by = match. Cells joined by × differ.', 'Tap once for a circle, twice for a square.'],
    sizes: [6], defaultSize: 6, sizeLabel: grid,
  },
  plots: {
    id: 'plots', name: 'Plots', rule: 'Cut the grid into rectangles, one clue each.',
    how: ['Drag to draw a rectangle. Every rectangle holds exactly one clue.', 'The number is how many cells it covers. The outline shows its shape: square, tall or wide.', 'Cover the whole grid with no overlaps. Tap a rectangle to remove it.'],
    sizes: [5, 6, 7, 8], defaultSize: 6, sizeLabel: grid,
  },
  wind: {
    id: 'wind', name: 'Wind', rule: 'Find the hidden words that fill the grid.',
    how: ['Drag through neighbouring tiles to spell a word. Words bend up, down, left and right.', 'All the words share one theme, and together they use every tile once.', 'The bars under the grid show how long each word is.'],
    sizes: [4, 5, 6], defaultSize: 5, sizeLabel: grid,
  },
};

export const GAME_IDS: GameId[] = ['trace', 'crowns', 'pairs', 'plots', 'wind'];
export const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Local date as YYYY-MM-DD. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The daily puzzle gets harder through the week. */
export function dailySpec(id: GameId, day = dayKey()): { size: number; difficulty: Difficulty; seed: string } {
  const wd = new Date(`${day}T12:00:00`).getDay();
  const difficulty: Difficulty = wd === 1 || wd === 2 ? 'easy' : wd === 0 || wd === 6 ? 'hard' : 'medium';
  // boards grow through the week too, within the sizes the daily games use
  const span = META[id].sizes, step = [2, -1, -1, 0, 0, 1, 2][wd];
  const size = span[Math.max(0, Math.min(span.length - 1, span.indexOf(META[id].defaultSize) + step))];
  return { size, difficulty, seed: `daily-${day}` };
}
