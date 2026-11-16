import { describe, expect, it } from 'vitest';
import { Maze, Vec, canMove, hasWall, solveMaze, isSolvable, DIRECTIONS } from './maze';

function corridorMaze(): Maze {
  // 4x1 Korridor ohne Innenwände: (0,0) - (1,0) - (2,0) - (3,0)
  return {
    width: 4,
    height: 1,
    walls: {
      top: [true, true, true, true],
      right: [false, false, false, true], // Innenwände (0-1),(1-2),(2-3) offen; 3 = Außenrand
      bottom: [true, true, true, true],
      left: [true, false, false, false],
    },
    start: { x: 0, y: 0 },
    end: { x: 3, y: 0 },
  };
}

describe('Spielregeln: Bewegung & Wände', () => {
  it('blockiert Bewegungen in Wände (alle vier Richtungen am Rand)', () => {
    const m = corridorMaze();
    // Von (0,0) nach oben/unten/links = Wand bzw. Rand.
    expect(canMove(m, { x: 0, y: 0 }, 'up')).toBeNull();
    expect(canMove(m, { x: 0, y: 0 }, 'down')).toBeNull();
    expect(canMove(m, { x: 0, y: 0 }, 'left')).toBeNull();
    expect(hasWall(m, { x: 0, y: 0 }, 'up')).toBe(true);
    expect(hasWall(m, { x: 0, y: 0 }, 'left')).toBe(true);
    // Rechts ist offen.
    expect(canMove(m, { x: 0, y: 0 }, 'right')).toEqual({ x: 1, y: 0 });
  });

  it('erlaubt Bewegungen nur entlang offener Wege (Korridor-Ende stoppt)', () => {
    const m = corridorMaze();
    let pos: Vec = { x: 0, y: 0 };
    for (let i = 0; i < 3; i++) {
      const next = canMove(m, pos, 'right');
      expect(next).not.toBeNull();
      pos = next!;
    }
    expect(pos).toEqual({ x: 3, y: 0 });
    // Am Ende: nach rechts ist Außenwand/Rand.
    expect(canMove(m, { x: 3, y: 0 }, 'right')).toBeNull();
    expect(hasWall(m, { x: 3, y: 0 }, 'right')).toBe(true);
    // Nach links ist aber offen (Zurückbewegung).
    expect(canMove(m, { x: 3, y: 0 }, 'left')).toEqual({ x: 2, y: 0 });
  });

  it('führt niemals außerhalb des Rasters (Randsicher für jede Zelle & Richtung)', () => {
    const m = corridorMaze();
    for (let x = 0; x < m.width; x++) {
      for (const dir of Object.keys(DIRECTIONS) as (keyof typeof DIRECTIONS)[]) {
        const to = canMove(m, { x, y: 0 }, dir);
        if (to) {
          expect(to.x).toBeGreaterThanOrEqual(0);
          expect(to.x).toBeLessThan(m.width);
          expect(to.y).toBeGreaterThanOrEqual(0);
          expect(to.y).toBeLessThan(m.height);
        }
      }
    }
  });

  it('BFS-Lösung liefert einen gültigen, kürzesten, wandkonformen Pfad', () => {
    const m = corridorMaze();
    const path = solveMaze(m, { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path).not.toBeNull();
    expect(path).toHaveLength(4); // 4 Zellen = 3 Schritte in gerader Linie
    // Jeder Schritt ist ein offener Nachbar.
    for (let i = 1; i < path!.length; i++) {
      const from = path![i - 1];
      const to = path![i];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      expect(Math.abs(dx) + Math.abs(dy)).toBe(1); // nur orthogonal, ein Feld
      const dir = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
      expect(hasWall(m, from, dir as 'right' | 'left' | 'up' | 'down')).toBe(false);
    }
  });

  it('solveMaze liefert null bei unerreichbarem Ziel und [start] bei Start==End', () => {
    const closed: Maze = {
      width: 2,
      height: 1,
      walls: {
        top: [true, true],
        right: [true, true],
        bottom: [true, true],
        left: [true, true],
      },
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    };
    expect(solveMaze(closed, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
    expect(isSolvable(closed)).toBe(false);
    const trivial: Maze = {
      width: 1,
      height: 1,
      walls: { top: [true], right: [true], bottom: [true], left: [true] },
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    };
    expect(solveMaze(trivial, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([{ x: 0, y: 0 }]);
    expect(isSolvable(trivial)).toBe(true);
  });

  it('findet im 2D-Raster den kürzesten Weg um eine Sackgasse herum', () => {
    // 3x3: Sackgasse bei (1,0); der Weg muss unten herum.
    const m: Maze = {
      width: 3,
      height: 3,
      walls: {
        top: new Array(9).fill(true),
        right: new Array(9).fill(true),
        bottom: new Array(9).fill(true),
        left: new Array(9).fill(true),
      },
      start: { x: 0, y: 0 },
      end: { x: 2, y: 2 },
    };
    const i = (x: number, y: number) => x + y * 3;
    // Offene Pfade: (0,0)->(1,0)->(2,0)->(2,1)->(2,2) und alternativ (0,0)->(0,1)->(0,2)->(1,2)->(2,2)
    m.walls.right[i(0, 0)] = false; m.walls.left[i(1, 0)] = false;
    m.walls.right[i(1, 0)] = false; m.walls.left[i(2, 0)] = false;
    m.walls.bottom[i(2, 0)] = false; m.walls.top[i(2, 1)] = false;
    m.walls.bottom[i(2, 1)] = false; m.walls.top[i(2, 2)] = false;
    const path = solveMaze(m, m.start, m.end);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(5); // 4 Schritte – kürzester Weg
  });
});
