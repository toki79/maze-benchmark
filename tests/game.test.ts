import { describe, expect, it } from 'vitest';
import { createGame, formatTime, getElapsed, move, restartGame, resumeGame } from '../src/core/game';
import { DIRECTIONS, generateMaze, solveMaze, type Maze } from '../src/core/maze';
import { pathToDirs } from './helpers';
import { mulberry32 } from '../src/core/rng';

const maze = (): Maze => generateMaze({ cols: 8, rows: 8, braid: 0.1 }, mulberry32(77));

describe('Spielregeln', () => {
  it('startet am Start mit stehender Uhr', () => {
    const g = createGame(maze());
    expect(g.pos).toEqual({ x: 0, y: 0 });
    expect(g.status).toBe('ready');
    expect(getElapsed(g, 5000)).toBe(0);
  });

  it('Wände blockieren: Position, Züge und Uhr bleiben unverändert', () => {
    const m = maze();
    const g = createGame(m);
    const blocked = DIRECTIONS.find((d) => !(m.passages[0] & { up: 1, right: 2, down: 4, left: 8 }[d]))!;
    const r = move(g, blocked, 100);
    expect(r.result).toBe('blocked');
    expect(r.state).toBe(g);
    expect(r.state.status).toBe('ready');
  });

  it('läuft nie aus dem Spielfeld', () => {
    const g = createGame(maze());
    expect(move(g, 'up', 0).result).toBe('blocked');
    expect(move(g, 'left', 0).result).toBe('blocked');
  });

  it('der erste gültige Zug startet die Uhr, Zeit läuft weiter', () => {
    const m = maze();
    const first = pathToDirs(solveMaze(m)!)[0];
    const r = move(createGame(m), first, 1000);
    expect(r.result).toBe('moved');
    expect(r.state.status).toBe('playing');
    expect(r.state.moves).toBe(1);
    expect(getElapsed(r.state, 3500)).toBe(2500);
  });

  it('Folgen der Lösung führt zum Sieg mit korrekter Zeit; danach sind Züge wirkungslos', () => {
    const m = maze();
    const dirs = pathToDirs(solveMaze(m)!);
    let g = createGame(m);
    let t = 0;
    let last = 'moved';
    for (const d of dirs) {
      t += 500;
      const r = move(g, d, t);
      g = r.state;
      last = r.result;
    }
    expect(last).toBe('won');
    expect(g.status).toBe('won');
    expect(g.pos).toEqual(m.goal);
    expect(g.moves).toBe(dirs.length);
    expect(g.elapsedMs).toBe(500 * (dirs.length - 1));
    expect(getElapsed(g, t + 99999)).toBe(g.elapsedMs);
    expect(move(g, 'left', t + 10).result).toBe('ignored');
  });

  it('Neustart setzt auf dieselbe Karte zurück', () => {
    const m = maze();
    const g = move(createGame(m), pathToDirs(solveMaze(m)!)[0], 10).state;
    const r = restartGame(g);
    expect(r.maze).toBe(m);
    expect(r.pos).toEqual(m.start);
    expect(r.moves).toBe(0);
    expect(r.status).toBe('ready');
  });

  it('Wiederherstellung übernimmt Position/Zeit und verwirft ungültige Stände', () => {
    const m = maze();
    const p = solveMaze(m)![1];
    const g = resumeGame(m, { pos: p, moves: 3, elapsedMs: 4000 }, 9000);
    expect(g.status).toBe('playing');
    expect(getElapsed(g, 10000)).toBe(5000);
    expect(resumeGame(m, { pos: { x: 99, y: 0 }, moves: 3, elapsedMs: 1 }, 0).status).toBe('ready');
    expect(resumeGame(m, { pos: m.goal, moves: 3, elapsedMs: 1 }, 0).pos).toEqual(m.start);
  });

  it('formatiert Zeiten', () => {
    expect(formatTime(0)).toBe('00:00.0');
    expect(formatTime(65432)).toBe('01:05.4');
    expect(formatTime(-5)).toBe('00:00.0');
  });
});
