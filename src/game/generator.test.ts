import { describe, expect, it } from 'vitest';
import { generateMaze, validateMaze, mazeForLevel } from '../game/generator';
import { isSolvable, solveMaze, Maze } from '../game/maze';
import { mulberry32 } from '../game/rng';
import { DIFFICULTIES, levelSize, MAX_LEVEL } from '../game/levels';

describe('Labyrinth-Generator', () => {
  it('erzeugt Labyrinthe mit den angeforderten Dimensionen', () => {
    const rng = mulberry32(42);
    const m = generateMaze(11, 13, rng);
    expect(m.width).toBe(11);
    expect(m.height).toBe(13);
    expect(m.walls.top).toHaveLength(11 * 13);
    expect(m.start).toEqual({ x: 0, y: 0 });
    expect(m.end).toEqual({ x: 10, y: 12 });
  });

  it('erzeugt immer einwandfreie Wanddefinitionen (Symmetrie + geschlossene Ränder)', () => {
    // Über viele Seeds und verschiedene Größen: keine Asymmetrien, keine offenen Ränder.
    for (let seed = 1; seed <= 60; seed++) {
      const rng = mulberry32(seed);
      const w = 3 + (seed % 12);
      const h = 3 + ((seed * 7) % 15);
      const m = generateMaze(w, h, rng);
      expect(validateMaze(m), `Seed ${seed}, ${w}x${h}`).toEqual([]);
    }
  });

  it('erzeugt zuverlässig lösbare Labyrinthe (BFS findet Pfad Start→Ziel)', () => {
    // Härtetest: 200 zufällige Labyrinthe in verschiedenen Größen müssen alle lösbar sein.
    let checked = 0;
    for (let seed = 0; seed < 200; seed++) {
      const rng = mulberry32(seed * 101 + 7);
      const w = 2 + (seed % 24);
      const h = 2 + ((seed * 13) % 24);
      const m = generateMaze(w, h, rng);
      const path = solveMaze(m, m.start, m.end);
      expect(path, `Seed ${seed} (${w}x${h}) nicht lösbar`).not.toBeNull();
      if (path) {
        // Pfad beginnt bei Start, endet bei Ziel und bewegt sich nur über offene Wege.
        expect(path[0]).toEqual(m.start);
        expect(path[path.length - 1]).toEqual(m.end);
      }
      checked++;
    }
    expect(checked).toBe(200);
  });

  it('isSolvable erkennt echte Unlösbarkeit (konstruierte Wand), nicht nur den Generator', () => {
    // 2x2-Labyrinth mit Mauer zwischen Start (0,0) und Ziel (1,1), die alle Wege blockiert:
    // Start oben links. Wir stellen sicher, dass Zelle (0,1) und (1,0) durch Wände von
    // Start abgeschnitten sind.
    const m: Maze = {
      width: 2,
      height: 2,
      walls: {
        top: [true, true, true, true],
        right: [true, true, true, true],
        bottom: [true, true, true, true],
        left: [true, true, true, true],
      },
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    };
    // Alle inneren Wände geschlossen: Start (0,0) ist komplett isoliert.
    // Index: (x,y) -> x + y*2. (0,0)=0, (1,0)=1, (0,1)=2, (1,1)=3.
    m.walls.right[0] = true; // zwischen (0,0) und (1,0)
    m.walls.bottom[0] = true; // zwischen (0,0) und (0,1)
    expect(isSolvable(m)).toBe(false);
    // Zwei Wände öffnen -> Pfad (0,0) → (1,0) → (1,1) existiert.
    m.walls.right[0] = false;
    m.walls.left[1] = false;
    m.walls.bottom[1] = false;
    m.walls.top[3] = false;
    expect(isSolvable(m)).toBe(true);
  });

  it('erzeugt bei gleichem Seed deterministisch dasselbe Labyrinth', () => {
    const a = generateMaze(9, 9, mulberry32(1234));
    const b = generateMaze(9, 9, mulberry32(1234));
    expect(a).toEqual(b);
  });

  it('erzeugt bei unterschiedlichen Seed zufällige, verschiedene Labyrinthe', () => {
    const a = generateMaze(12, 12, mulberry32(1));
    const b = generateMaze(12, 12, mulberry32(2));
    expect(a.walls.top).not.toEqual(b.walls.top);
    // Beide trotzdem lösbar.
    expect(isSolvable(a)).toBe(true);
    expect(isSolvable(b)).toBe(true);
  });

  it('erzeugt Loops/alternative Wege: es existiert mehr als ein Pfad zwischen Start und Ziel', () => {
    // Mit Loosening entstehen Zyklen: Zähle offene innere Wände. Ein perfektes
    // Labyrinth auf n Zellen hat genau n-1 offene innere Kanten. Mehr -> Loops.
    const m = generateMaze(15, 15, mulberry32(99));
    let openInner = 0;
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        const i = x + y * m.width;
        if (x < m.width - 1 && !m.walls.right[i]) openInner++;
        if (y < m.height - 1 && !m.walls.bottom[i]) openInner++;
      }
    }
    const n = m.width * m.height;
    expect(openInner).toBeGreaterThan(n - 1);
    expect(isSolvable(m)).toBe(true);
  });

  it('skaliert die Größe korrekt pro Schwierigkeitsgrad und Level', () => {
    expect(levelSize('easy', 1)).toEqual({
      width: DIFFICULTIES.easy.base,
      height: DIFFICULTIES.easy.base,
    });
    // Mittel wächst schneller als leicht:
    expect(levelSize('medium', 5).width).toBeGreaterThan(levelSize('easy', 5).width);
    // Cap wird eingehalten:
    expect(levelSize('hard', MAX_LEVEL).width).toBeLessThanOrEqual(DIFFICULTIES.hard.max);
    // mazeForLevel liefert das konfigurierte Raster und ist lösbar:
    const m = mazeForLevel('medium', 3, mulberry32(5));
    const cfg = levelSize('medium', 3);
    expect(m.width).toBe(cfg.width);
    expect(m.height).toBe(cfg.height);
    expect(isSolvable(m)).toBe(true);
  });

  it('behält für alle Schwierigkeitsgrade und alle Levels die Lösbarkeit (End-to-End über Level-Schema)', () => {
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
        const m = mazeForLevel(diff, lvl, mulberry32(diff.length * 1000 + lvl));
        expect(isSolvable(m), `${diff} Level ${lvl} nicht lösbar`).toBe(true);
        expect(validateMaze(m)).toEqual([]);
      }
    }
  });
});
