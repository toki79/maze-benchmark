export type Difficulty = 'easy' | 'medium' | 'hard';

/** Randwerte pro Schwierigkeitsgrad (Basis-Größe, mit Level wächst die Größe). */
export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; description: string; base: number; growth: number; max: number }
> = {
  easy: {
    label: 'Leicht',
    description: 'Kleines Labyrinth, breite Wege – ideal zum Einstieg.',
    base: 7,
    growth: 1,
    max: 13,
  },
  medium: {
    label: 'Mittel',
    description: 'Großes Labyrinth mit vielen Sackgassen.',
    base: 11,
    growth: 2,
    max: 21,
  },
  hard: {
    label: 'Schwer',
    description: 'Sehr dichtes Labyrinth – nur für erfahrene Navigator:innen.',
    base: 15,
    growth: 2,
    max: 31,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export interface LevelConfig {
  difficulty: Difficulty;
  level: number;
  width: number;
  height: number;
}

export const MAX_LEVEL = 10;

/**
 * Größe für einen Level: wächst je Level um `growth`, begrenzt durch `max`.
 * Start bei der Basisebene des Schwierigkeitsgrads.
 */
export function levelSize(difficulty: Difficulty, level: number): { width: number; height: number } {
  const cfg = DIFFICULTIES[difficulty];
  const size = Math.min(cfg.base + (level - 1) * cfg.growth, cfg.max);
  return { width: size, height: size };
}

export function levelConfig(difficulty: Difficulty, level: number): LevelConfig {
  const { width, height } = levelSize(difficulty, level);
  return { difficulty, level, width, height };
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
}
