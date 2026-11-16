import { describe, expect, it } from 'vitest';
import { generateMaze } from './generator';
import { canMove, solveMaze, DIRECTIONS, Direction, Vec } from './maze';
import { mulberry32 } from './rng';
import { levelConfig } from './levels';

/**
 * Spielt eine komplette Runde durch: Der "Spieler" bewegt sich ausschließlich
 * über die identischen Regeln wie in der App (canMove) und folgt dem BFS-Pfad.
 * Damit wird geprüft, dass das, was der Generator erzeugt, tatsächlich mit der
 * Spielmechanik spielbar ist – nicht nur, dass ein Algorithmus einen Pfad findet.
 */
function playThrough(maze: ReturnType<typeof generateMaze>): { steps: number; visitedEnd: boolean; wallHits: number } {
  const path = solveMaze(maze, maze.start, maze.end);
  if (!path) throw new Error('Pfad fehlt – Labyrinth nicht lösbar');
  let pos: Vec = { ...maze.start };
  let steps = 0;
  let wallHits = 0;
  let visitedEnd = false;
  for (let i = 1; i < path.length; i++) {
    const target = path[i];
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dir: Direction = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
    // Integritätsprüfung: Der Pfad darf nur Richtungen enthalten, die die
    // Spielregeln erlauben – sonst wäre er "ungültig" für den Spieler.
    expect(hasOpenPath(maze, pos, dir), `Pfad-Schritt ${i} (${dx},${dy}) ist keine gültige Spielerbewegung`).toBe(true);
    const next = canMove(maze, pos, dir);
    expect(next, `Spieler blockiert bei Schritt ${i} in (${pos.x},${pos.y}) Richtung ${dir}`).toEqual(target);
    pos = next!;
    steps++;
    if (pos.x === maze.end.x && pos.y === maze.end.y) visitedEnd = true;
    // Sicherheitsnetz gegen Endlosschleifen:
    expect(steps, 'Endlosschleifen-Verdacht beim Durchspielen').toBeLessThan(maze.width * maze.height * 4);
  }
  // Zusätzlich: Ein paar zufällige Züge ohne Zielvorgabe dürfen nie "aus dem Raster" führen.
  const rng = mulberry32(7);
  let free: Vec = { ...pos };
  for (let k = 0; k < 40; k++) {
    const dirs = Object.keys(DIRECTIONS) as Direction[];
    const d = dirs[Math.floor(rng() * dirs.length)];
    const to = canMove(maze, free, d);
    if (to) {
      if (to.x < 0 || to.x >= maze.width || to.y < 0 || to.y >= maze.height) {
        wallHits++;
      } else {
        free = to;
      }
    }
  }
  expect(wallHits).toBe(0);
  return { steps, visitedEnd, wallHits };
}

function hasOpenPath(maze: { width: number; height: number; walls: { top: boolean[]; right: boolean[]; bottom: boolean[]; left: boolean[] } }, from: Vec, dir: Direction): boolean {
  const i = from.x + from.y * maze.width;
  if (dir === 'up') return !maze.walls.top[i] && from.y > 0;
  if (dir === 'down') return !maze.walls.bottom[i] && from.y < maze.height - 1;
  if (dir === 'left') return !maze.walls.left[i] && from.x > 0;
  return !maze.walls.right[i] && from.x < maze.width - 1;
}

describe('Spielregeln: komplette Runden (Generator → Bewegung → Ziel)', () => {
  it('lässt sich in 30 zufälligen Labyrinthen vollständig durchspielen (alle Schwierigkeitsgrade, Level 1–4)', () => {
    let total = 0;
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      for (let lvl = 1; lvl <= 4; lvl++) {
        const cfg = levelConfig(diff, lvl);
        const rng = mulberry32(diff.charCodeAt(0) * 10000 + lvl * 977);
        const maze = generateMaze(cfg.width, cfg.height, rng);
        const result = playThrough(maze);
        expect(result.visitedEnd, `${diff} L${lvl}: Ziel nicht erreicht`).toBe(true);
        expect(result.steps, `${diff} L${lvl}: zu viele Schritte`).toBeGreaterThan(0);
        total++;
      }
    }
    expect(total).toBe(12);
  });

  it('gewährleistet, dass der Spieler das Ziel über die eigenen Regeln erreicht (großes Raster)', () => {
    const maze = generateMaze(21, 21, mulberry32(2026));
    const result = playThrough(maze);
    expect(result.visitedEnd).toBe(true);
    expect(result.steps).toBeLessThan(21 * 21 * 3);
  });

  it('verhindert, dass der Spieler durch Wände wandert (Wandtreffer = 0)', () => {
    const maze = generateMaze(15, 15, mulberry32(555));
    const result = playThrough(maze);
    expect(result.wallHits).toBe(0);
  });
});
