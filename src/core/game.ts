import { canMove, neighbor, type Direction, type Maze, type Point } from './maze';

export type GameStatus = 'ready' | 'playing' | 'won';

export interface GameState {
  maze: Maze;
  pos: Point;
  moves: number;
  status: GameStatus;
  /** Bereits angesammelte Spielzeit in ms (bei laufendem Spiel bis `startedAt`) */
  elapsedMs: number;
  /** Zeitstempel (ms) des Laufstarts oder `null`, wenn die Uhr steht */
  startedAt: number | null;
}

export type MoveResult = 'moved' | 'blocked' | 'won' | 'ignored';

export function createGame(maze: Maze): GameState {
  return { maze, pos: { ...maze.start }, moves: 0, status: 'ready', elapsedMs: 0, startedAt: null };
}

/** Setzt die Runde auf dieselbe Karte zurück. */
export function restartGame(state: GameState): GameState {
  return createGame(state.maze);
}

/** Wiederherstellung eines gespeicherten Zwischenstands. Ungültige Positionen werden verworfen. */
export function resumeGame(
  maze: Maze,
  saved: { pos: Point; moves: number; elapsedMs: number },
  now: number,
): GameState {
  const { pos } = saved;
  const valid =
    Number.isInteger(pos.x) && Number.isInteger(pos.y) && pos.x >= 0 && pos.y >= 0 && pos.x < maze.cols && pos.y < maze.rows;
  if (!valid || (pos.x === maze.goal.x && pos.y === maze.goal.y)) return createGame(maze);
  const started = saved.moves > 0;
  return {
    maze,
    pos: { ...pos },
    moves: Math.max(0, Math.floor(saved.moves)),
    status: started ? 'playing' : 'ready',
    elapsedMs: Math.max(0, saved.elapsedMs),
    startedAt: started ? now : null,
  };
}

/** Gesamte verstrichene Spielzeit zum Zeitpunkt `now`. */
export function getElapsed(state: GameState, now: number): number {
  if (state.status === 'playing' && state.startedAt !== null) {
    return state.elapsedMs + Math.max(0, now - state.startedAt);
  }
  return state.elapsedMs;
}

/**
 * Führt einen Zug aus. Wände blockieren; die Uhr startet beim ersten gültigen Zug.
 * Gibt den neuen Zustand (unverändert bei `blocked`/`ignored`) und das Ergebnis zurück.
 */
export function move(state: GameState, dir: Direction, now: number): { state: GameState; result: MoveResult } {
  if (state.status === 'won') return { state, result: 'ignored' };
  if (!canMove(state.maze, state.pos, dir)) return { state, result: 'blocked' };
  const pos = neighbor(state.pos, dir);
  const startedAt = state.status === 'ready' ? now : state.startedAt;
  const base = { ...state, pos, moves: state.moves + 1 };
  const reachedGoal = pos.x === state.maze.goal.x && pos.y === state.maze.goal.y;
  if (reachedGoal) {
    const elapsed = state.elapsedMs + (startedAt === null ? 0 : Math.max(0, now - startedAt));
    return { state: { ...base, status: 'won', elapsedMs: elapsed, startedAt: null }, result: 'won' };
  }
  return { state: { ...base, status: 'playing', startedAt }, result: 'moved' };
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}
