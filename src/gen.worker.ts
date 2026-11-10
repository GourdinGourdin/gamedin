import { GAMES, type GameId } from './engine/index.ts';
import type { Difficulty } from './engine/types.ts';

self.onmessage = (e: MessageEvent<{ id: number; game: GameId; size: number; difficulty: Difficulty; seed: string }>) => {
  const { id, game, size, difficulty, seed } = e.data;
  try {
    (self as unknown as Worker).postMessage({ id, result: GAMES[game].generate(size, difficulty, seed) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
