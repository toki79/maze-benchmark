import { Difficulty, DIFFICULTY_ORDER, MAX_LEVEL, clampLevel } from './levels';

export interface LevelProgress {
  /** Höchster freigeschalteter Level für diesen Schwierigkeitsgrad (1..MAX_LEVEL). */
  level: number;
  /** Bestzeit in ms für den letzten abgeschlossenen Level; null wenn noch keiner geschafft. */
  bestTimeMs: number | null;
  completed: boolean;
}

export interface SaveData {
  version: 1;
  /** Global erreichter höchster Level-Stand (max über alle Schwierigkeitsgrade). */
  unlockedLevel: number;
  progress: Record<Difficulty, LevelProgress>;
}

const KEY = 'maze-lab-save-v1';

export type LevelProgressMap = Record<Difficulty, LevelProgress>;

function defaultProgress(): LevelProgressMap {
  return {
    easy: { level: 1, bestTimeMs: null, completed: false },
    medium: { level: 1, bestTimeMs: null, completed: false },
    hard: { level: 1, bestTimeMs: null, completed: false },
  };
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    unlockedLevel: 1,
    progress: defaultProgress(),
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Liest den gespeicherten Stand; bei Korruption/Fehlern liefert Standard. */
export function loadSave(storage: StorageLike = safeStorage()): SaveData {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (!parsed || parsed.version !== 1 || typeof parsed.unlockedLevel !== 'number') {
      return defaultSave();
    }
    const base = defaultSave();
    const progress: Partial<Record<Difficulty, Partial<LevelProgress>>> = parsed.progress ?? {};
    for (const d of DIFFICULTY_ORDER) {
      const p = progress[d];
      if (p && typeof p.level === 'number') {
        base.progress[d] = {
          level: clampLevel(p.level),
          bestTimeMs: typeof p.bestTimeMs === 'number' && p.bestTimeMs > 0 ? p.bestTimeMs : null,
          completed: Boolean(p.completed),
        };
      }
    }
    base.unlockedLevel = clampLevel(parsed.unlockedLevel);
    return base;
  } catch {
    return defaultSave();
  }
}

/** Speichert; bei Fehlern (z. B. Privacy-Mode) wird stillschweigend ignoriert. */
export function saveGame(save: SaveData, storage: StorageLike = safeStorage()): void {
  try {
    storage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Speicher nicht verfügbar – das Spiel bleibt trotzdem lauffähig.
  }
}

export function clearSave(storage: StorageLike = safeStorage()): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // ignorieren
  }
}

/** Reines Update-Logik: Abschluss eines Levels in den Fortschritt übernehmen. */
export function applyCompletion(save: SaveData, difficulty: Difficulty, level: number, timeMs: number): SaveData {
  const cur = save.progress[difficulty];
  const bestTimeMs = cur.bestTimeMs === null ? timeMs : Math.min(cur.bestTimeMs, timeMs);
  const newLevel = level >= MAX_LEVEL ? MAX_LEVEL : level + 1;
  const progress = {
    ...save.progress,
    [difficulty]: {
      level: newLevel,
      bestTimeMs,
      completed: true,
    },
  };
  return {
    ...save,
    progress,
    unlockedLevel: Math.max(save.unlockedLevel, newLevel),
  };
}

function safeStorage(): StorageLike {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}
