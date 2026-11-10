// Pairs, solved with the deductions a person uses. Grades puzzles and explains hints.
import type { Difficulty, Grade, Step } from '../types.ts';
import type { PairsPuzzle } from './solve.ts';

export interface PairsState { size: number; edges: PairsPuzzle['edges']; g: Int8Array }

export function stateFrom(p: PairsPuzzle, filled?: ArrayLike<number>): PairsState {
  const g = new Int8Array(p.size * p.size).fill(-1);
  for (const [c, v] of Object.entries(p.given)) g[+c] = v;
  if (filled) for (let i = 0; i < g.length; i++) if (filled[i] === 0 || filled[i] === 1) g[i] = filled[i];
  return { size: p.size, edges: p.edges, g };
}

const lineCells = (N: number, i: number, col: boolean) => Array.from({ length: N }, (_, j) => (col ? j * N + i : i * N + j));
/** names of the two symbols, used in hint text */
export const SYMBOL = ['circle', 'square'];
const plural = (v: number) => `${SYMBOL[v]}s`;

export function nextStep(st: PairsState): Step | null {
  const { size: N, g, edges } = st;
  // 1a. two alike next to each other, or with a gap between them
  for (let col = 0; col < 2; col++) {
    for (let i = 0; i < N; i++) {
      const L = lineCells(N, i, !!col);
      for (let j = 0; j + 2 < N; j++) {
        const [a, b, c] = [L[j], L[j + 1], L[j + 2]];
        const t = [[a, b, c], [b, c, a], [a, c, b]];
        for (let k = 0; k < 3; k++) {
          const [x, y, z] = t[k];
          if (g[x] !== -1 && g[x] === g[y] && g[z] === -1) {
            return { level: 1, kind: k === 2 ? 'gap' : 'pair', value: 1 - g[x], cells: [z], because: [x, y],
              text: k === 2
                ? `Two ${plural(g[x])} with one cell between them: the middle must be a ${SYMBOL[1 - g[x]]}, or there would be three in a row.`
                : `Two ${plural(g[x])} side by side: the next cell must be a ${SYMBOL[1 - g[x]]}, or there would be three in a row.` };
          }
        }
      }
    }
  }
  // 1b. a link with one end known
  for (const [a, b, t] of edges) {
    for (const [x, y] of [[a, b], [b, a]]) {
      if (g[x] !== -1 && g[y] === -1) {
        const v = t === '=' ? g[x] : 1 - g[x];
        return { level: 1, kind: 'link', value: v, cells: [y], because: [x],
          text: t === '=' ? `The = sign means these two cells match, so this is a ${SYMBOL[v]}.` : `The × sign means these two cells differ, so this is a ${SYMBOL[v]}.` };
      }
    }
  }
  // 2. a line that already has its share of one symbol
  for (let col = 0; col < 2; col++) {
    for (let i = 0; i < N; i++) {
      const L = lineCells(N, i, !!col);
      for (let v = 0; v < 2; v++) {
        const have = L.filter((c) => g[c] === v), empty = L.filter((c) => g[c] === -1);
        if (have.length === N / 2 && empty.length) {
          return { level: 2, kind: 'count', value: 1 - v, cells: empty, because: have,
            text: `This ${col ? 'column' : 'row'} already has its ${N / 2} ${plural(v)}, so the rest are ${plural(1 - v)}.` };
        }
      }
    }
  }
  // 3. list the ways to finish a line; a cell that is the same in all of them is settled
  let best: Step | null = null, bestWays = Infinity;
  for (let col = 0; col < 2; col++) {
    for (let i = 0; i < N; i++) {
      const L = lineCells(N, i, !!col), pos = new Map(L.map((c, j) => [c, j]));
      if (L.every((c) => g[c] !== -1)) continue;
      const links = edges.filter(([a, b]) => pos.has(a) && pos.has(b)).map(([a, b, t]) => [pos.get(a)!, pos.get(b)!, t === '='] as const);
      const fills: number[][] = [];
      const cur: number[] = [];
      const go = (j: number, ones: number) => {
        if (j === N) { if (ones === N / 2 && links.every(([a, b, eq]) => (cur[a] === cur[b]) === eq)) fills.push(cur.slice()); return; }
        for (let v = 0; v < 2; v++) {
          if (g[L[j]] !== -1 && g[L[j]] !== v) continue;
          if (j >= 2 && cur[j - 1] === v && cur[j - 2] === v) continue;
          if (ones + v > N / 2 || j + 1 - ones - v > N / 2) continue;
          cur[j] = v; go(j + 1, ones + v);
        }
        cur.length = j;
      };
      go(0, 0);
      if (!fills.length) continue;
      const cells: number[] = [];
      let value = -1;
      for (let j = 0; j < N && value === -1; j++) {
        if (g[L[j]] === -1 && fills.every((f) => f[j] === fills[0][j])) { cells.push(L[j]); value = fills[0][j]; }
      }
      if (value !== -1 && fills.length < bestWays) {
        bestWays = fills.length;
        best = { level: 3, kind: 'line', value, cells, because: L.filter((c) => g[c] !== -1 || links.some(([a, b]) => L[a] === c || L[b] === c)),
          text: `Look at this whole ${col ? 'column' : 'row'}: with ${N / 2} of each, no three in a row and its signs, every way to finish it puts a ${SYMBOL[value]} here.` };
      }
    }
  }
  return best;
}

export function difficultyOf(level: number, counts: number[]): Difficulty {
  if (level <= 2) return 'easy';
  return (counts[3] ?? 0) <= 2 ? 'medium' : 'hard';
}

export function gradePairs(p: PairsPuzzle, maxLevel = 3): Grade {
  const st = stateFrom(p);
  const counts = [0, 0, 0, 0];
  let level = 0;
  for (;;) {
    const s = nextStep(st);
    if (!s || s.level > maxLevel) break;
    for (const c of s.cells) st.g[c] = s.value;
    counts[s.level]++;
    if (s.level > level) level = s.level;
  }
  return { solved: st.g.every((v) => v !== -1), level, counts, difficulty: difficultyOf(level, counts) };
}
