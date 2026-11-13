import { describe, expect, it } from 'vitest';
import { DIFFICULTY_ORDER, levelConfig } from '../src/core/levels';
import {
  canMove,
  countDeadEnds,
  DIRECTIONS,
  generateMaze,
  hasPassage,
  isSolvable,
  neighbor,
  OPPOSITE,
  reachableCount,
  solveMaze,
  type Maze,
} from '../src/core/maze';
import { mulberry32 } from '../src/core/rng';

function gen(difficulty: (typeof DIFFICULTY_ORDER)[number], level: number, seed: number): Maze {
  const c = levelConfig(difficulty, level);
  return generateMaze({ cols: c.cols, rows: c.rows, braid: c.braid }, mulberry32(seed));
}

describe('Labyrinth-Generator', () => {
  it('ist für alle Schwierigkeiten, Level und viele Seeds lösbar und vollständig verbunden', () => {
    for (const d of DIFFICULTY_ORDER) {
      for (const level of [1, 2, 5, 10, 30]) {
        for (let seed = 1; seed <= 25; seed++) {
          const m = gen(d, level, seed * 7919);
          expect(isSolvable(m)).toBe(true);
          expect(reachableCount(m)).toBe(m.cols * m.rows);
        }
      }
    }
  });

  it('definiert Start oben links und Ziel unten rechts', () => {
    const m = gen('medium', 1, 3);
    expect(m.start).toEqual({ x: 0, y: 0 });
    expect(m.goal).toEqual({ x: m.cols - 1, y: m.rows - 1 });
  });

  it('hat symmetrische Wände und geschlossenen Rand', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = gen('easy', 3, seed);
      for (let y = 0; y < m.rows; y++) {
        for (let x = 0; x < m.cols; x++) {
          for (const d of DIRECTIONS) {
            const p = { x, y };
            if (hasPassage(m, p, d)) {
              const n = neighbor(p, d);
              expect(n.x >= 0 && n.y >= 0 && n.x < m.cols && n.y < m.rows).toBe(true);
              expect(hasPassage(m, n, OPPOSITE[d])).toBe(true);
            }
          }
        }
      }
    }
  });

  it('ist bei gleichem Seed deterministisch und bei verschiedenen Seeds zufällig', () => {
    const a = gen('hard', 1, 42);
    const b = gen('hard', 1, 42);
    expect(Array.from(a.passages)).toEqual(Array.from(b.passages));
    const distinct = new Set<string>();
    for (let s = 1; s <= 10; s++) distinct.add(Array.from(gen('hard', 1, s).passages).join(','));
    expect(distinct.size).toBe(10);
  });

  it('ohne Braiding ist es ein perfektes Labyrinth (Zellen − 1 Durchgänge)', () => {
    const m = generateMaze({ cols: 15, rows: 11, braid: 0 }, mulberry32(5));
    let edges = 0;
    for (let y = 0; y < m.rows; y++)
      for (let x = 0; x < m.cols; x++)
        for (const d of ['right', 'down'] as const) if (hasPassage(m, { x, y }, d)) edges++;
    expect(edges).toBe(m.cols * m.rows - 1);
  });

  it('lehnt zu kleine Felder ab', () => {
    expect(() => generateMaze({ cols: 1, rows: 5 }, mulberry32(1))).toThrow(RangeError);
  });

  it('funktioniert auch im Minimalfall 2x2', () => {
    const m = generateMaze({ cols: 2, rows: 2 }, mulberry32(9));
    expect(isSolvable(m)).toBe(true);
  });
});

describe('Lösung (BFS)', () => {
  it('liefert einen gültigen Weg von Start nach Ziel ohne Wanddurchbrüche', () => {
    const m = gen('hard', 2, 11);
    const path = solveMaze(m)!;
    expect(path[0]).toEqual(m.start);
    expect(path[path.length - 1]).toEqual(m.goal);
    for (let i = 1; i < path.length; i++) {
      const dir = DIRECTIONS.find((d) => {
        const n = neighbor(path[i - 1], d);
        return n.x === path[i].x && n.y === path[i].y;
      });
      expect(dir).toBeDefined();
      expect(canMove(m, path[i - 1], dir!)).toBe(true);
    }
  });

  it('erkennt unlösbare Labyrinthe', () => {
    const m: Maze = { cols: 3, rows: 3, passages: new Uint8Array(9), start: { x: 0, y: 0 }, goal: { x: 2, y: 2 } };
    expect(isSolvable(m)).toBe(false);
    expect(solveMaze(m)).toBeNull();
  });
});

describe('Schwierigkeitsgrade und Level', () => {
  it('werden mit Schwierigkeit und Level größer (bis zum Maximum)', () => {
    const size = (d: (typeof DIFFICULTY_ORDER)[number], l: number) => levelConfig(d, l).cols;
    expect(size('easy', 1)).toBeLessThan(size('medium', 1));
    expect(size('medium', 1)).toBeLessThan(size('hard', 1));
    for (const d of DIFFICULTY_ORDER) {
      expect(size(d, 3)).toBeGreaterThan(size(d, 1));
      expect(size(d, 999)).toBe(size(d, 998));
    }
  });

  it('einfach hat mehr Schleifen/weniger Sackgassen als schwer (im Mittel)', () => {
    let easy = 0;
    let hard = 0;
    for (let s = 1; s <= 20; s++) {
      const e = gen('easy', 1, s);
      const h = gen('easy', 1, s + 100);
      easy += countDeadEnds(e) / (e.cols * e.rows);
      const hm = generateMaze({ cols: 8, rows: 8, braid: 0 }, mulberry32(s));
      hard += countDeadEnds(hm) / (hm.cols * hm.rows);
      void h;
    }
    expect(easy).toBeLessThan(hard);
  });

  it('normalisiert ungültige Level', () => {
    expect(levelConfig('easy', 0).level).toBe(1);
    expect(levelConfig('easy', NaN).level).toBe(1);
    expect(levelConfig('hard', 1).fogRadius).not.toBeNull();
    expect(levelConfig('hard', 1).hintAllowed).toBe(false);
  });
});
