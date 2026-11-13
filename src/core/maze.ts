import { randomInt, type Rng } from './rng';

export type Direction = 'up' | 'right' | 'down' | 'left';
export interface Point {
  x: number;
  y: number;
}

export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];

export const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
};

const BIT: Record<Direction, number> = { up: 1, right: 2, down: 4, left: 8 };

/**
 * Ein Labyrinth als Gitter. `passages[y * cols + x]` ist eine Bitmaske der
 * Richtungen, in die man von dieser Zelle aus gehen darf (Durchgänge).
 * Alle anderen Seiten sind Wände. Start ist oben links, Ziel unten rechts.
 */
export interface Maze {
  cols: number;
  rows: number;
  passages: Uint8Array;
  start: Point;
  goal: Point;
}

export function inBounds(maze: Pick<Maze, 'cols' | 'rows'>, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < maze.cols && p.y < maze.rows;
}

export function hasPassage(maze: Maze, p: Point, dir: Direction): boolean {
  if (!inBounds(maze, p)) return false;
  return (maze.passages[p.y * maze.cols + p.x] & BIT[dir]) !== 0;
}

export function neighbor(p: Point, dir: Direction): Point {
  return { x: p.x + DELTA[dir].x, y: p.y + DELTA[dir].y };
}

/** Prüft, ob ein Schritt von `p` in Richtung `dir` erlaubt ist (keine Wand, im Feld). */
export function canMove(maze: Maze, p: Point, dir: Direction): boolean {
  return hasPassage(maze, p, dir) && inBounds(maze, neighbor(p, dir));
}

function carve(maze: Maze, p: Point, dir: Direction): void {
  const q = neighbor(p, dir);
  maze.passages[p.y * maze.cols + p.x] |= BIT[dir];
  maze.passages[q.y * maze.cols + q.x] |= BIT[OPPOSITE[dir]];
}

function openCount(maze: Maze, p: Point): number {
  return DIRECTIONS.filter((d) => hasPassage(maze, p, d)).length;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface GenerateOptions {
  cols: number;
  rows: number;
  /**
   * Anteil (0..1) der Sackgassen, die zusätzlich aufgebrochen werden. Erzeugt
   * Schleifen und alternative Wege – 0 ergibt ein „perfektes“ Labyrinth.
   */
  braid?: number;
}

/** Erzeugt ein zufälliges, immer lösbares Labyrinth (Depth-First-Search + optionales Braiding). */
export function generateMaze(opts: GenerateOptions, rng: Rng): Maze {
  const cols = Math.floor(opts.cols);
  const rows = Math.floor(opts.rows);
  if (!(cols >= 2 && rows >= 2)) throw new RangeError('Labyrinth muss mindestens 2x2 Zellen haben');
  const maze: Maze = {
    cols,
    rows,
    passages: new Uint8Array(cols * rows),
    start: { x: 0, y: 0 },
    goal: { x: cols - 1, y: rows - 1 },
  };

  // Iterative DFS – kein Rekursions-Limit bei großen Feldern.
  const visited = new Uint8Array(cols * rows);
  const stack: Point[] = [{ ...maze.start }];
  visited[0] = 1;
  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const options = shuffle([...DIRECTIONS], rng).filter((d) => {
      const n = neighbor(cur, d);
      return inBounds(maze, n) && !visited[n.y * cols + n.x];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const dir = options[0];
    const next = neighbor(cur, dir);
    carve(maze, cur, dir);
    visited[next.y * cols + next.x] = 1;
    stack.push(next);
  }

  const braid = Math.min(1, Math.max(0, opts.braid ?? 0));
  if (braid > 0) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = { x, y };
        if (openCount(maze, p) !== 1 || rng() >= braid) continue;
        const closed = shuffle(
          DIRECTIONS.filter((d) => !hasPassage(maze, p, d) && inBounds(maze, neighbor(p, d))),
          rng,
        );
        if (closed.length > 0) carve(maze, p, closed[0]);
      }
    }
  }
  return maze;
}

/** Kürzester Weg (BFS) von `from` nach `to`, inklusive beider Endpunkte; `null`, wenn unerreichbar. */
export function solveMaze(maze: Maze, from: Point = maze.start, to: Point = maze.goal): Point[] | null {
  if (!inBounds(maze, from) || !inBounds(maze, to)) return null;
  const idx = (p: Point) => p.y * maze.cols + p.x;
  const prev = new Int32Array(maze.cols * maze.rows).fill(-2);
  const queue: Point[] = [from];
  prev[idx(from)] = -1;
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur.x === to.x && cur.y === to.y) {
      const path: Point[] = [];
      let i = idx(cur);
      while (i !== -1) {
        path.push({ x: i % maze.cols, y: Math.floor(i / maze.cols) });
        i = prev[i];
      }
      return path.reverse();
    }
    for (const d of DIRECTIONS) {
      if (!canMove(maze, cur, d)) continue;
      const n = neighbor(cur, d);
      if (prev[idx(n)] !== -2) continue;
      prev[idx(n)] = idx(cur);
      queue.push(n);
    }
  }
  return null;
}

export function isSolvable(maze: Maze): boolean {
  return solveMaze(maze) !== null;
}

/** Anzahl der Zellen, die vom Start aus erreichbar sind. */
export function reachableCount(maze: Maze): number {
  const seen = new Uint8Array(maze.cols * maze.rows);
  const stack: Point[] = [maze.start];
  seen[maze.start.y * maze.cols + maze.start.x] = 1;
  let count = 0;
  while (stack.length) {
    const cur = stack.pop()!;
    count++;
    for (const d of DIRECTIONS) {
      if (!canMove(maze, cur, d)) continue;
      const n = neighbor(cur, d);
      const i = n.y * maze.cols + n.x;
      if (seen[i]) continue;
      seen[i] = 1;
      stack.push(n);
    }
  }
  return count;
}

export function countDeadEnds(maze: Maze): number {
  let n = 0;
  for (let y = 0; y < maze.rows; y++)
    for (let x = 0; x < maze.cols; x++) if (openCount(maze, { x, y }) === 1) n++;
  return n;
}
