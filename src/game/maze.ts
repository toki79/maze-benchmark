export interface Vec {
  x: number;
  y: number;
}

/** Ränder eines Labyrinths. true = Wand vorhanden. */
export interface Walls {
  top: boolean[];
  right: boolean[];
  bottom: boolean[];
  left: boolean[];
}

export interface Maze {
  width: number;
  height: number;
  walls: Walls;
  start: Vec;
  end: Vec;
}

export type Direction = 'up' | 'right' | 'down' | 'left';

export const DIRECTIONS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

/** Prüft, ob eine Bewegung von `from` in `dir` durch eine Wand blockiert ist. */
export function hasWall(maze: Maze, from: Vec, dir: Direction): boolean {
  const { walls, width, height } = maze;
  if (dir === 'up') return walls.top[from.x + from.y * width];
  if (dir === 'right') return from.x >= width - 1 || walls.right[from.x + from.y * width];
  if (dir === 'down') return from.y >= height - 1 || walls.bottom[from.x + from.y * width];
  return from.x <= 0 || walls.left[from.x + from.y * width];
}

/** Zelle `to` nur wenn innerhalb des Rasters und keine Wand zwischen from und to. */
export function canMove(maze: Maze, from: Vec, dir: Direction): Vec | null {
  if (hasWall(maze, from, dir)) return null;
  const to = { x: from.x + DIRECTIONS[dir].x, y: from.y + DIRECTIONS[dir].y };
  if (to.x < 0 || to.x >= maze.width || to.y < 0 || to.y >= maze.height) return null;
  return to;
}

/** Kürzester Weg (BFS) von start nach end; null wenn nicht erreichbar. */
export function solveMaze(maze: Maze, start: Vec, end: Vec): Vec[] | null {
  if (start.x === end.x && start.y === end.y) return [start];
  const { width, height } = maze;
  const index = (v: Vec) => v.x + v.y * width;
  const prev = new Int32Array(width * height).fill(-1);
  const visited = new Uint8Array(width * height);
  visited[index(start)] = 1;
  const queue: Vec[] = [start];
  let head = 0;
  const endIdx = index(end);
  while (head < queue.length) {
    const cur = queue[head++];
    const curIdx = index(cur);
    for (const dir of Object.keys(DIRECTIONS) as Direction[]) {
      const next = canMove(maze, cur, dir);
      if (!next) continue;
      const nextIdx = index(next);
      if (visited[nextIdx]) continue;
      visited[nextIdx] = 1;
      prev[nextIdx] = curIdx;
      if (nextIdx === endIdx) {
        // Pfad rekonstruieren
        const path: Vec[] = [next];
        let i = curIdx;
        while (i !== -1) {
          path.push({ x: i % width, y: Math.floor(i / width) });
          i = prev[i];
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

export function isSolvable(maze: Maze): boolean {
  return solveMaze(maze, maze.start, maze.end) !== null;
}
