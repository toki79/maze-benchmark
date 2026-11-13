export type DifficultyId = 'easy' | 'medium' | 'hard';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  description: string;
  /** Kantenlänge auf Level 1 */
  baseSize: number;
  /** Zuwachs je Level */
  step: number;
  /** Maximale Kantenlänge */
  maxSize: number;
  /** Anteil aufgebrochener Sackgassen (mehr Schleifen = leichter) */
  braid: number;
  /** Sichtradius in Zellen (Nebel); `null` = volle Sicht */
  fogRadius: number | null;
  /** Ist die Lösungshilfe erlaubt? */
  hintAllowed: boolean;
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  easy: {
    id: 'easy',
    label: 'Leicht',
    description: 'Kleines Feld, viele Schleifen, Lösungshilfe erlaubt',
    baseSize: 8,
    step: 1,
    maxSize: 20,
    braid: 0.3,
    fogRadius: null,
    hintAllowed: true,
  },
  medium: {
    id: 'medium',
    label: 'Mittel',
    description: 'Größeres Feld, einzelne Schleifen, Lösungshilfe erlaubt',
    baseSize: 12,
    step: 1,
    maxSize: 30,
    braid: 0.08,
    fogRadius: null,
    hintAllowed: true,
  },
  hard: {
    id: 'hard',
    label: 'Schwer',
    description: 'Großes Feld ohne Schleifen, Sichtnebel, keine Hilfe',
    baseSize: 16,
    step: 2,
    maxSize: 40,
    braid: 0,
    fogRadius: 6,
    hintAllowed: false,
  },
};

export const DIFFICULTY_ORDER: readonly DifficultyId[] = ['easy', 'medium', 'hard'];

export interface LevelConfig {
  difficulty: DifficultyId;
  level: number;
  cols: number;
  rows: number;
  braid: number;
  fogRadius: number | null;
  hintAllowed: boolean;
}

export function isDifficultyId(v: unknown): v is DifficultyId {
  return v === 'easy' || v === 'medium' || v === 'hard';
}

export function normalizeLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

/** Leitet Größe und Regeln eines Levels ab; höhere Level werden größer, bis `maxSize` erreicht ist. */
export function levelConfig(difficulty: DifficultyId, level: number): LevelConfig {
  const d = DIFFICULTIES[difficulty];
  const lvl = normalizeLevel(level);
  const size = Math.min(d.maxSize, d.baseSize + (lvl - 1) * d.step);
  // Ab Maximalgröße steigt die Schwierigkeit weiter, indem Schleifen seltener werden.
  const capped = d.baseSize + (lvl - 1) * d.step - d.maxSize;
  const braid = capped > 0 ? Math.max(0, d.braid - capped * 0.01) : d.braid;
  return {
    difficulty,
    level: lvl,
    cols: size,
    rows: size,
    braid,
    fogRadius: d.fogRadius,
    hintAllowed: d.hintAllowed,
  };
}
