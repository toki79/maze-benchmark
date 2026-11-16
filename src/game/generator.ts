import { Maze, Vec, canMove, DIRECTIONS, Direction, hasWall } from './maze';
import { Difficulty, levelSize } from './levels';

/**
 * Erzeugt ein zufälliges, vollständig vernetztes (also lösbares) Labyrinth
 * mit dem iterative Randomized-Depth-First-Algorithmus (iterativ, keine
 * Rekursionstiefen-Probleme) plus optionalem "Loosening": zusätzliche
 * Wände werden geöffnet, um Loops zu erzeugen (mehrere Wege, kürzere Wege).
 */
export function generateMaze(width: number, height: number, rng: () => number = Math.random): Maze {
  const cols = Math.max(2, Math.floor(width));
  const rows = Math.max(2, Math.floor(height));
  const index = (x: number, y: number) => x + y * cols;

  // Jede Zelle startet mit allen vier Wänden.
  const walls: Maze['walls'] = {
    top: new Array(cols * rows).fill(true),
    right: new Array(cols * rows).fill(true),
    bottom: new Array(cols * rows).fill(true),
    left: new Array(cols * rows).fill(true),
  };

  const visited = new Uint8Array(cols * rows);

  function removeWallBetween(a: Vec, b: Vec): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dy === -1) {
      walls.top[index(a.x, a.y)] = false;
      walls.bottom[index(b.x, b.y)] = false;
    } else if (dy === 1) {
      walls.bottom[index(a.x, a.y)] = false;
      walls.top[index(b.x, b.y)] = false;
    } else if (dx === 1) {
      walls.right[index(a.x, a.y)] = false;
      walls.left[index(b.x, b.y)] = false;
    } else if (dx === -1) {
      walls.left[index(a.x, a.y)] = false;
      walls.right[index(b.x, b.y)] = false;
    }
  }

  // Iterative DFS, Start oben links.
  const stack: Vec[] = [{ x: 0, y: 0 }];
  visited[index(0, 0)] = 1;
  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const neighbors: Vec[] = [];
    for (const dir of Object.keys(DIRECTIONS) as Direction[]) {
      const n = { x: cur.x + DIRECTIONS[dir].x, y: cur.y + DIRECTIONS[dir].y };
      if (n.x < 0 || n.x >= cols || n.y < 0 || n.y >= rows) continue;
      if (visited[index(n.x, n.y)]) continue;
      neighbors.push(n);
    }
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const next = neighbors[Math.floor(rng() * neighbors.length)];
    removeWallBetween(cur, next);
    visited[index(next.x, next.y)] = 1;
    stack.push(next);
  }

  // Alle Zellen besucht -> perfektes Labyrinth -> genau ein Pfad zwischen
  // Start und Ziel -> garantiert lösbar.

  // Loosening: für schwerere Labyrinthe/Loops ein paar zusätzliche Wände öffnen.
  // `loops` > 0 öffnet zufällig vorhandene innere Wände, erzeugt alternative Wege.
  const loosen = Math.floor((cols * rows) / 14);
  let opened = 0;
  let guard = 0;
  const guardMax = cols * rows * 4;
  while (opened < loosen && guard < guardMax) {
    guard++;
    const x = Math.floor(rng() * cols);
    const y = Math.floor(rng() * rows);
    const candidates: Direction[] = [];
    for (const dir of Object.keys(DIRECTIONS) as Direction[]) {
      const n = { x: x + DIRECTIONS[dir].x, y: y + DIRECTIONS[dir].y };
      if (n.x < 0 || n.x >= cols || n.y < 0 || n.y >= rows) continue;
      if (!hasWall({ width: cols, height: rows, walls, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, { x, y }, dir)) {
        continue;
      }
      // nur innere Wände (Rand bleibt zu)
      if (dir === 'up' && y === 0) continue;
      if (dir === 'down' && y === rows - 1) continue;
      if (dir === 'left' && x === 0) continue;
      if (dir === 'right' && x === cols - 1) continue;
      candidates.push(dir);
    }
    if (candidates.length === 0) continue;
    const dir = candidates[Math.floor(rng() * candidates.length)];
    const n = { x: x + DIRECTIONS[dir].x, y: y + DIRECTIONS[dir].y };
    removeWallBetween({ x, y }, n);
    opened++;
  }

  return {
    width: cols,
    height: rows,
    walls,
    start: { x: 0, y: 0 },
    end: { x: cols - 1, y: rows - 1 },
  };
}

/**
 * Konstruiert ein deterministisches Labyrinth über den Level-Schema,
 * unabhängig von `generateMaze` (nützlich für Tests).
 */
export function mazeForLevel(difficulty: Difficulty, level: number, rng: () => number = Math.random): Maze {
  const { width, height } = levelSize(difficulty, level);
  return generateMaze(width, height, rng);
}

/** Prüft Konsistenz: Symmetrie der Wände (A rechts == B links usw.). */
export function validateMaze(maze: Maze): string[] {
  const problems: string[] = [];
  const { walls, width, height } = maze;
  const index = (x: number, y: number) => x + y * width;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(x, y);
      if (x < width - 1) {
        const aRight = walls.right[i];
        const bLeft = walls.left[index(x + 1, y)];
        if (aRight !== bLeft) problems.push(`Asymmetrie right/left bei (${x},${y})`);
      }
      if (y < height - 1) {
        const aBottom = walls.bottom[i];
        const bTop = walls.top[index(x, y + 1)];
        if (aBottom !== bTop) problems.push(`Asymmetrie bottom/top bei (${x},${y})`);
      }
    }
  }
  // Randwände müssen geschlossen sein.
  for (let x = 0; x < width; x++) {
    if (!walls.top[index(x, 0)]) problems.push(`Randwand oben offen bei (${x},0)`);
    if (!walls.bottom[index(x, height - 1)]) problems.push(`Randwand unten offen bei (${x},${height - 1})`);
  }
  for (let y = 0; y < height; y++) {
    if (!walls.left[index(0, y)]) problems.push(`Randwand links offen bei (0,${y})`);
    if (!walls.right[index(width - 1, y)]) problems.push(`Randwand rechts offen bei (${width - 1},${y})`);
  }
  // canMove darf niemals außerhalb des Rasters führen.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (const dir of Object.keys(DIRECTIONS) as Direction[]) {
        const to = canMove(maze, { x, y }, dir);
        if (to && (to.x < 0 || to.x >= width || to.y < 0 || to.y >= height)) {
          problems.push(`canMove führt außerhalb des Rasters von (${x},${y}) ${dir}`);
        }
      }
    }
  }
  return problems;
}
