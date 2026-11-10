import type { GameId } from '../../engine/index.ts';
import type { GameUI } from './common.tsx';
import { crownsUI } from './Crowns.tsx';
import { pairsUI } from './Pairs.tsx';
import { plotsUI } from './Plots.tsx';
import { traceUI } from './Trace.tsx';
import { windUI } from './Wind.tsx';

export const UI: Record<GameId, GameUI> = { trace: traceUI, crowns: crownsUI, pairs: pairsUI, plots: plotsUI, wind: windUI };
