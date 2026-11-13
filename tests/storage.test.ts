import { describe, expect, it } from 'vitest';
import {
  defaultProgress,
  getBest,
  loadProgress,
  recordWin,
  sanitizeProgress,
  saveProgress,
  STORAGE_KEY,
} from '../src/core/storage';

class MemStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

describe('Fortschritt', () => {
  it('Bestzeit wird nur bei Verbesserung ersetzt; nächstes Level wird freigeschaltet', () => {
    let p = defaultProgress();
    let r = recordWin(p, 'easy', 1, 20000);
    expect(r.newBest).toBe(true);
    expect(r.progress.levels.easy.unlocked).toBe(2);
    p = r.progress;
    r = recordWin(p, 'easy', 1, 25000);
    expect(r.newBest).toBe(false);
    expect(getBest(r.progress, 'easy', 1)).toBe(20000);
    r = recordWin(r.progress, 'easy', 1, 15000);
    expect(r.newBest).toBe(true);
    expect(getBest(r.progress, 'easy', 1)).toBe(15000);
    expect(r.progress.levels.easy.unlocked).toBe(2);
  });

  it('Bestzeiten sind pro Schwierigkeit und Level getrennt', () => {
    const p = recordWin(defaultProgress(), 'hard', 3, 9000).progress;
    expect(getBest(p, 'hard', 3)).toBe(9000);
    expect(getBest(p, 'hard', 2)).toBeNull();
    expect(getBest(p, 'easy', 3)).toBeNull();
    expect(p.levels.hard.unlocked).toBe(4);
  });

  it('Speichern und Laden ergibt denselben Stand (Reload)', () => {
    const store = new MemStore();
    let p = recordWin(defaultProgress(), 'medium', 1, 12345).progress;
    p.difficulty = 'medium';
    p.levels.medium.current = 2;
    p.run = { difficulty: 'medium', level: 2, seed: 99, pos: { x: 1, y: 2 }, moves: 4, elapsedMs: 3000 };
    expect(saveProgress(store, p)).toBe(true);
    expect(loadProgress(store)).toEqual(p);
  });

  it('übersteht beschädigte oder manipulierte Daten', () => {
    const store = new MemStore();
    store.setItem(STORAGE_KEY, '{nicht json');
    expect(loadProgress(store)).toEqual(defaultProgress());
    const s = sanitizeProgress({
      difficulty: 'bogus',
      levels: { easy: { current: 50, unlocked: 3, best: { '1': -4, x: 5, '2': 800 } } },
      run: { difficulty: 'easy' },
    });
    expect(s.difficulty).toBe('easy');
    expect(s.levels.easy.current).toBe(3);
    expect(s.levels.easy.best).toEqual({ '2': 800 });
    expect(s.run).toBeNull();
    expect(sanitizeProgress(null)).toEqual(defaultProgress());
  });

  it('funktioniert ohne verfügbaren Speicher', () => {
    expect(loadProgress(null)).toEqual(defaultProgress());
    expect(saveProgress(null, defaultProgress())).toBe(false);
    const throwing = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(loadProgress(throwing)).toEqual(defaultProgress());
    expect(saveProgress(throwing, defaultProgress())).toBe(false);
  });
});
