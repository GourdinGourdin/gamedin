// Puzzles are generated off the main thread and cached, so the next one is
// usually ready before it is asked for.
import type { GameId } from './engine/index.ts';
import type { Difficulty, Grade } from './engine/types.ts';
import { newSeed } from './engine/rng.ts';

export interface Generated { puzzle: any; solution: any; grade: Grade }
export interface Spec { game: GameId; size: number; difficulty: Difficulty; seed: string }

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (g: Generated) => void; reject: (e: Error) => void }>();
const cache = new Map<string, Promise<Generated>>();
const upcoming = new Map<string, string>();

export const specKey = (s: Spec) => `${s.game}/${s.size}/${s.difficulty}/${s.seed}`;

function ask(spec: Spec): Promise<Generated> {
  if (!worker) {
    worker = new Worker(new URL('./gen.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; result?: Generated; error?: string }>) => {
      const w = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      if (e.data.result) w?.resolve(e.data.result); else w?.reject(new Error(e.data.error));
    };
  }
  return new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject });
    worker!.postMessage({ id, ...spec });
  });
}

export function generate(spec: Spec): Promise<Generated> {
  const k = specKey(spec);
  let p = cache.get(k);
  if (!p) {
    cache.set(k, (p = ask(spec)));
    if (cache.size > 24) cache.delete(cache.keys().next().value!);
  }
  return p;
}

/** The seed the next puzzle with these settings will use; generation starts now. */
export function nextSeed(game: GameId, size: number, difficulty: Difficulty): string {
  const k = `${game}/${size}/${difficulty}`;
  let seed = upcoming.get(k);
  if (!seed) { seed = newSeed(); upcoming.set(k, seed); void generate({ game, size, difficulty, seed }); }
  return seed;
}

/** Use up the prepared seed and start preparing another. */
export function takeSeed(game: GameId, size: number, difficulty: Difficulty): string {
  const seed = nextSeed(game, size, difficulty);
  upcoming.delete(`${game}/${size}/${difficulty}`);
  return seed;
}
