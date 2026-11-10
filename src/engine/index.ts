import type { Difficulty, Grade } from './types.ts';
import { CROWNS_SIZES, generateCrowns } from './crowns/generate.ts';
import { countCrowns } from './crowns/solve.ts';
import { PAIRS_SIZES, generatePairs } from './pairs/generate.ts';
import { countPairsSolutions } from './pairs/solve.ts';
import { PLOTS_SIZES, generatePlots } from './plots/generate.ts';
import { countPlots } from './plots/solve.ts';
import { WIND_SIZES, generateWind, isUniqueWind } from './wind/generate.ts';
import { TRACE_SIZES, generateTrace, solveAllTrace } from './trace/generate.ts';

export type GameId = 'trace' | 'crowns' | 'pairs' | 'plots' | 'wind';

export interface GameDef {
  id: GameId;
  sizes: number[];
  defaultSize: number;
  generate(size: number, difficulty: Difficulty, seed: string): { puzzle: any; solution: any; grade: Grade };
  isUnique(puzzle: any): boolean;
}

export const GAMES: Record<GameId, GameDef> = {
  trace: { id: 'trace', sizes: TRACE_SIZES, defaultSize: 7, generate: generateTrace, isUnique: (p) => solveAllTrace(p, 2, 2e6)?.length === 1 },
  crowns: { id: 'crowns', sizes: CROWNS_SIZES, defaultSize: 8, generate: generateCrowns, isUnique: (p) => countCrowns(p, 2) === 1 },
  pairs: { id: 'pairs', sizes: PAIRS_SIZES, defaultSize: 6, generate: generatePairs, isUnique: (p) => countPairsSolutions(p, 2) === 1 },
  plots: { id: 'plots', sizes: PLOTS_SIZES, defaultSize: 6, generate: generatePlots, isUnique: (p) => countPlots(p, 2) === 1 },
  wind: { id: 'wind', sizes: WIND_SIZES, defaultSize: 5, generate: generateWind, isUnique: isUniqueWind },
};
