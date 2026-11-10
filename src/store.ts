// Everything the app remembers lives in localStorage, on this device only.
import { useSyncExternalStore } from 'react';
import type { GameId } from './engine/index.ts';
import type { Difficulty } from './engine/types.ts';
import { dayKey } from './games.ts';

export interface Result { game: GameId; size: number; difficulty: Difficulty; ms: number; at: number; hints: number; daily?: string }
export interface Progress { key: string; state: unknown; history: unknown[]; ms: number; hints: number }
export interface Settings {
  theme: 'auto' | 'light' | 'dark';
  autoCross: boolean;
  showErrors: boolean;
  prefs: Partial<Record<GameId, { size: number; difficulty: Difficulty }>>;
  seenHow: Partial<Record<GameId, boolean>>;
}
interface Data { settings: Settings; results: Result[]; progress: Partial<Record<GameId, Progress>> }

const KEY = 'gamedin/v1';
const fresh = (): Data => ({ settings: { theme: 'auto', autoCross: true, showErrors: true, prefs: {}, seenHow: {} }, results: [], progress: {} });

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); return { ...fresh(), ...d, settings: { ...fresh().settings, ...d.settings } }; }
  } catch { /* private mode or bad data: start clean */ }
  return fresh();
}

let data = load();
const subs = new Set<() => void>();
function commit(next: Data) {
  data = next;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const useStore = () => useSyncExternalStore(subscribe, () => data);
export const getStore = () => data;
export const setSettings = (patch: Partial<Settings>) => commit({ ...data, settings: { ...data.settings, ...patch } });
export const setPref = (game: GameId, size: number, difficulty: Difficulty) =>
  setSettings({ prefs: { ...data.settings.prefs, [game]: { size, difficulty } } });
export const saveProgress = (game: GameId, p: Progress | null) => {
  const progress = { ...data.progress };
  if (p) progress[game] = p; else delete progress[game];
  commit({ ...data, progress });
};
export const addResult = (r: Result) => commit({ ...data, results: [...data.results, r].slice(-2000) });
export const resetAll = () => commit(fresh());

export const dailyDone = (results: Result[], game: GameId, day = dayKey()) => results.some((r) => r.game === game && r.daily === day);

/** Days in a row, up to today (or yesterday), with at least one daily solved. */
export function streak(results: Result[]): number {
  const days = new Set(results.filter((r) => r.daily).map((r) => r.daily!));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function summary(results: Result[], game: GameId) {
  const mine = results.filter((r) => r.game === game);
  const times = mine.map((r) => r.ms);
  return {
    played: mine.length,
    best: times.length ? Math.min(...times) : 0,
    average: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    recent: mine.slice(-20),
  };
}
