import { DIFFICULTY_ORDER, isDifficultyId, normalizeLevel, type DifficultyId } from './levels';

export const STORAGE_KEY = 'mazelab:v1';

export interface SavedRun {
  difficulty: DifficultyId;
  level: number;
  seed: number;
  pos: { x: number; y: number };
  moves: number;
  elapsedMs: number;
}

export interface DifficultyProgress {
  /** Aktuell gewähltes Level */
  current: number;
  /** Höchstes freigeschaltetes Level */
  unlocked: number;
  /** Bestzeiten in ms je Level (Schlüssel = Levelnummer) */
  best: Record<string, number>;
}

export interface Progress {
  version: 1;
  difficulty: DifficultyId;
  levels: Record<DifficultyId, DifficultyProgress>;
  run: SavedRun | null;
}

export function defaultProgress(): Progress {
  const levels = {} as Record<DifficultyId, DifficultyProgress>;
  for (const id of DIFFICULTY_ORDER) levels[id] = { current: 1, unlocked: 1, best: {} };
  return { version: 1, difficulty: 'easy', levels, run: null };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Wandelt beliebige (ggf. beschädigte) Daten in einen gültigen Fortschritt um. */
export function sanitizeProgress(raw: unknown): Progress {
  const out = defaultProgress();
  if (!isObj(raw)) return out;
  if (isDifficultyId(raw.difficulty)) out.difficulty = raw.difficulty;
  const levels = isObj(raw.levels) ? raw.levels : {};
  for (const id of DIFFICULTY_ORDER) {
    const src = levels[id];
    if (!isObj(src)) continue;
    const unlocked = isNum(src.unlocked) ? normalizeLevel(src.unlocked) : 1;
    const current = isNum(src.current) ? Math.min(normalizeLevel(src.current), unlocked) : 1;
    const best: Record<string, number> = {};
    if (isObj(src.best)) {
      for (const [k, v] of Object.entries(src.best)) {
        if (/^[1-9]\d*$/.test(k) && isNum(v) && v > 0) best[k] = v;
      }
    }
    out.levels[id] = { current, unlocked, best };
  }
  const run = raw.run;
  if (
    isObj(run) &&
    isDifficultyId(run.difficulty) &&
    isNum(run.level) &&
    isNum(run.seed) &&
    isObj(run.pos) &&
    isNum(run.pos.x) &&
    isNum(run.pos.y) &&
    isNum(run.moves) &&
    isNum(run.elapsedMs)
  ) {
    out.run = {
      difficulty: run.difficulty,
      level: normalizeLevel(run.level),
      seed: run.seed >>> 0,
      pos: { x: run.pos.x, y: run.pos.y },
      moves: Math.max(0, Math.floor(run.moves)),
      elapsedMs: Math.max(0, run.elapsedMs),
    };
  }
  return out;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadProgress(storage: StorageLike | null): Progress {
  if (!storage) return defaultProgress();
  try {
    const text = storage.getItem(STORAGE_KEY);
    return text ? sanitizeProgress(JSON.parse(text)) : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

/** Speichert den Fortschritt; gibt `false` zurück, wenn der Speicher nicht verfügbar ist. */
export function saveProgress(storage: StorageLike | null, progress: Progress): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function getBest(progress: Progress, difficulty: DifficultyId, level: number): number | null {
  return progress.levels[difficulty].best[String(level)] ?? null;
}

/** Verbucht einen Sieg: Bestzeit aktualisieren, nächstes Level freischalten. Reine Funktion. */
export function recordWin(
  progress: Progress,
  difficulty: DifficultyId,
  level: number,
  timeMs: number,
): { progress: Progress; newBest: boolean } {
  const next = structuredClone(progress);
  const entry = next.levels[difficulty];
  const prev = entry.best[String(level)];
  const newBest = prev === undefined || timeMs < prev;
  if (newBest) entry.best[String(level)] = timeMs;
  entry.unlocked = Math.max(entry.unlocked, level + 1);
  next.run = null;
  return { progress: next, newBest };
}
