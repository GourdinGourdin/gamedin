export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** One logical deduction, used for grading and for hints. */
export interface Step {
  /** 1 = obvious, higher = harder */
  level: number;
  /** short technique name */
  kind: string;
  /** plain-language explanation shown as a hint */
  text: string;
  /** cells that justify the step (highlighted) */
  because: number[];
  /** cells the step acts on */
  cells: number[];
  /** value set on `cells` (game specific) */
  value: number;
}

export interface Grade {
  solved: boolean;
  /** hardest technique level needed */
  level: number;
  /** number of steps at each level (index = level) */
  counts: number[];
  difficulty: Difficulty;
}
