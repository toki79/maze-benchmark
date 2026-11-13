import { DIRECTIONS, neighbor, type Direction, type Point } from '../src/core/maze';

/** Wandelt einen Zellenpfad in die Folge der Bewegungsrichtungen um. */
export function pathToDirs(path: Point[]): Direction[] {
  const out: Direction[] = [];
  for (let i = 1; i < path.length; i++) {
    out.push(
      DIRECTIONS.find((d) => {
        const n = neighbor(path[i - 1], d);
        return n.x === path[i].x && n.y === path[i].y;
      })!,
    );
  }
  return out;
}
