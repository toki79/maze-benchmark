import { describe, expect, it } from 'vitest';
import {
  SaveData,
  StorageLike,
  defaultSave,
  loadSave,
  saveGame,
  clearSave,
  applyCompletion,
} from './storage';

function memStorage(seed?: string): StorageLike & { _mem: Map<string, string> } {
  const mem = new Map<string, string>();
  if (seed) mem.set('maze-lab-save-v1', seed);
  return {
    _mem: mem,
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}

describe('Persistenz: lokale Speicherung & Wiederherstellung', () => {
  it('liefert bei leerem Speicher den Standardstand', () => {
    const s = loadSave(memStorage());
    expect(s).toEqual(defaultSave());
    expect(s.unlockedLevel).toBe(1);
    expect(s.progress.easy.level).toBe(1);
    expect(s.progress.easy.bestTimeMs).toBeNull();
  });

  it('speichert und stellt den Fortschritt nach einem "Reload" wieder her (Roundtrip)', () => {
    const storage = memStorage();
    let save: SaveData = loadSave(storage);
    // Level 3 (einfach) in 42.5 s geschafft:
    save = applyCompletion(save, 'easy', 3, 42500);
    saveGame(save, storage);

    // Simulation eines Neuladens: komplett neuer Ladevorgang aus demselben Speicher.
    const reloaded = loadSave(storage);
    expect(reloaded).toEqual(save);
    expect(reloaded.progress.easy.completed).toBe(true);
    expect(reloaded.progress.easy.bestTimeMs).toBe(42500);
    expect(reloaded.progress.easy.level).toBe(4); // nächster Level freigeschaltet
    expect(reloaded.unlockedLevel).toBe(4);
  });

  it('übernimmt die schnellere Bestzeit und behält die langsamere bei', () => {
    let save = defaultSave();
    save = applyCompletion(save, 'medium', 2, 30000);
    expect(save.progress.medium.bestTimeMs).toBe(30000);
    save = applyCompletion(save, 'medium', 2, 35000);
    expect(save.progress.medium.bestTimeMs).toBe(30000); // langsamer: keine Änderung
    save = applyCompletion(save, 'medium', 2, 25000);
    expect(save.progress.medium.bestTimeMs).toBe(25000); // schneller: neue Bestzeit
  });

  it('schaltet die nächste Level-Reihe frei, wenn der globale Stand steigt', () => {
    let save = defaultSave();
    expect(save.progress.hard.level).toBe(1);
    // "hard" ist standardmäßig gesperrt, bis unlockedLevel >= 2. Wir simulieren,
    // dass durch Fortschritt auf einfach der globale Stand auf 2 steigt.
    save = { ...save, unlockedLevel: 2 };
    // Abschließen eines harten Levels muss den globalen Stand nicht senken.
    const after = applyCompletion(save, 'hard', 1, 9999);
    expect(after.unlockedLevel).toBeGreaterThanOrEqual(2);
    expect(after.progress.hard.completed).toBe(true);
    expect(after.progress.hard.level).toBe(2);
  });

  it('ignoriert korrupte Daten und fällt auf den Standardstand zurück', () => {
    const corrupted = memStorage('{ "version": 1, "unlockedLevel": "oops", "progress": null }');
    const s = loadSave(corrupted);
    expect(s).toEqual(defaultSave());
    const notJson = memStorage('definitiv kein JSON <<<');
    expect(loadSave(notJson)).toEqual(defaultSave());
    const wrongVersion = memStorage('{"version": 99}');
    expect(loadSave(wrongVersion)).toEqual(defaultSave());
  });

  it('lässt Level-Werte außerhalb des gültigen Bereichs clampen', () => {
    const s = memStorage(
      JSON.stringify({
        version: 1,
        unlockedLevel: 999,
        progress: {
          easy: { level: 999, bestTimeMs: 1000, completed: true },
          medium: { level: -5, bestTimeMs: null, completed: false },
          hard: { level: 4, bestTimeMs: 12.5, completed: true },
        },
      }),
    );
    const loaded = loadSave(s);
    expect(loaded.unlockedLevel).toBeLessThanOrEqual(10);
    expect(loaded.progress.easy.level).toBeLessThanOrEqual(10);
    expect(loaded.progress.medium.level).toBeGreaterThanOrEqual(1);
    expect(loaded.progress.hard.bestTimeMs).toBe(12.5);
  });

  it('clearSave entfernt den gespeicherten Stand', () => {
    const storage = memStorage();
    saveGame(applyCompletion(defaultSave(), 'easy', 5, 1000), storage);
    expect(loadSave(storage).progress.easy.completed).toBe(true);
    clearSave(storage);
    expect(loadSave(storage)).toEqual(defaultSave());
  });
});
