// Words that search engines, link previews and the game pages share.
// Used by the app (GamePage) and by the build (scripts/pages.ts), so keep it
// free of browser and node APIs.
import type { GameId } from './engine/index.ts';

export const GAME_PATHS: GameId[] = ['trace', 'crowns', 'pairs', 'plots', 'wind'];

export const HOME_SEO = {
  title: 'GamedIn: unlimited logic puzzles, free',
  description: 'Five free logic puzzles with no daily limit: Trace, Crowns, Pairs, Plots and Wind. Every board is made on your device, has one solution and works offline.',
  ogTitle: 'GamedIn: five puzzles, no daily limit',
  ogDescription: 'Trace, Crowns, Pairs, Plots and Wind. Every board is made on your device, has exactly one solution, and never needs a guess. Free, no account, works offline.',
  ogAlt: 'GamedIn: five puzzles, no daily limit, with a solved board of each game',
};

export interface GameSeo {
  /** the LinkedIn daily game this one plays like */
  family: string;
  /** one line under the name */
  pitch: string;
  title: string;
  /** 140 to 160 characters */
  description: string;
  /** 100 to 180 words, one paragraph */
  about: string;
}

export const SEO: Record<GameId, GameSeo> = {
  trace: {
    family: 'Zip',
    pitch: 'Draw one line through every cell, passing the numbers in order.',
    title: 'Trace: draw one line through every cell | GamedIn',
    description: 'Play Trace free online: draw one line through every cell and pass the numbers in order. Plays like LinkedIn\'s Zip, with unlimited puzzles and no account.',
    about: 'Trace is a path puzzle. The grid holds a few numbered cells, and your job is to draw one unbroken line that starts on 1, passes the numbers in order and covers every cell exactly once. Walls block the way, and the line can never cross itself. It plays like LinkedIn\'s Zip, but there is no daily limit, so you can start another board the moment you finish one. Boards come in three sizes, from 6×6 to 8×8, and three difficulties. Every board is generated on your device and has exactly one solution, so you never have to guess. If you get stuck, a hint shows the next step and why it follows. Your times stay on this device, and Trace keeps working offline once the page has loaded.',
  },
  crowns: {
    family: 'Queens',
    pitch: 'Place one crown in every row, column and colour.',
    title: 'Crowns: one crown per row, column and colour | GamedIn',
    description: 'Play Crowns free online: place one crown in every row, column and colour region, with none touching. Plays like LinkedIn\'s Queens. Unlimited boards.',
    about: 'Crowns is a logic puzzle about placement. The board is split into coloured regions, and you place exactly one crown in every row, every column and every region. Two crowns may never touch, not even at a corner. It plays like LinkedIn\'s Queens, but there is no daily limit and no account to make. Boards run from 7×7 up to 11×11, in three difficulties, so there is always a harder one waiting. Every board is generated on your device and has exactly one solution, which means each step can be reasoned out and none needs a guess. Tap once to cross a cell out and twice to place a crown, or drag to cross out many cells at once. The game can cross out the cells a crown rules out for you. Crowns works offline and keeps your scores private.',
  },
  pairs: {
    family: 'Tango',
    pitch: 'Fill the grid with circles and squares, evenly.',
    title: 'Pairs: fill the grid with two shapes | GamedIn',
    description: 'Play Pairs free online: fill the grid with circles and squares, evenly, never three in a row. Plays like LinkedIn\'s Tango. Unlimited puzzles, no account.',
    about: 'Pairs is a balance puzzle played with two shapes, circles and squares. Fill the grid so that every row and every column holds the same number of each, and never put three of the same shape in a line. Some neighbouring cells are joined by a sign: an equals sign means the two shapes match, and a cross means they differ. It plays like LinkedIn\'s Tango, with no daily limit, so you can keep going as long as you like. Boards are 6×6 and come in three difficulties. Every board is generated on your device and has exactly one solution, so it can always be solved by reasoning alone. Tap a cell once for a circle and twice for a square. If you get stuck, a hint shows the next step and why it follows. Pairs works offline and your times stay private.',
  },
  plots: {
    family: 'Patches',
    pitch: 'Cut the grid into rectangles, one clue in each.',
    title: 'Plots: cut the grid into rectangles | GamedIn',
    description: 'Play Plots free online: cut the grid into rectangles so each one holds a single clue. Plays like LinkedIn\'s Patches. Unlimited boards, free, no account.',
    about: 'Plots is a puzzle about dividing space. The grid holds a handful of clues, and you cut it into rectangles so that every rectangle contains exactly one clue. The number is how many cells the rectangle covers, and its outline tells you whether it is a square, a tall rectangle or a wide one. Rectangles may not overlap, and together they must cover the whole grid. It plays like LinkedIn\'s Patches, but there is no daily limit and nothing to sign up for. Boards run from 5×5 to 8×8 in three difficulties. Every board is generated on your device and has exactly one solution, so you never have to guess. Drag to draw a rectangle, drag from an edge to stretch or shrink it, and tap it to remove it. Plots works offline and keeps your times on your device.',
  },
  wind: {
    family: 'Wend',
    pitch: 'Find the hidden words that fill the grid.',
    title: 'Wind: find the hidden words in the grid | GamedIn',
    description: 'Play Wind free online: find the hidden words that bend through the grid and fill every tile. Plays like LinkedIn\'s Wend. Unlimited word puzzles, no account.',
    about: 'Wind is a word puzzle. A grid of letter tiles hides several words that share one theme. Drag through neighbouring tiles to spell a word, and bend it up, down, left and right as you go. Together the words use every letter tile exactly once, and grey blocks belong to no word. Bars under the grid show how long each word is, which is often enough to work out where one ends and the next begins. It plays like LinkedIn\'s Wend, but there is no daily limit, so there is always another grid. Boards are 5×5, 6×6 or 7×7 in three difficulties. Every board is generated on your device and has exactly one solution. If you get stuck, a hint shows the next step. Wind works offline and keeps your times private.',
  },
};

/** The game a path belongs to: `/gamedin/trace/` and `/trace/index.html` are both Trace. */
export function gameFromPath(pathname: string): GameId | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[parts.length - 1] === 'index.html') parts.pop();
  const last = parts[parts.length - 1];
  return GAME_PATHS.find((g) => g === last) ?? null;
}

/** The site root for a game page path, so `/gamedin/trace/` becomes `/gamedin/`. */
export function rootPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[parts.length - 1] === 'index.html') parts.pop();
  if (gameFromPath(pathname)) parts.pop();
  return `/${parts.map((p) => `${p}/`).join('')}`;
}
