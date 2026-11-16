import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Maze, Vec, canMove, Direction } from '../game/maze';
import { generateMaze } from '../game/generator';
import { Difficulty, MAX_LEVEL, levelConfig } from '../game/levels';
import { SaveData, loadSave, saveGame, clearSave, applyCompletion, defaultSave } from '../game/storage';

export type GamePhase = 'menu' | 'playing' | 'won';

export interface WinInfo {
  level: number;
  timeMs: number;
  moves: number;
  isBest: boolean;
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  level: number;
  maze: Maze;
  player: Vec;
  elapsedMs: number;
  moves: number;
  win: WinInfo | null;
}

type Action =
  | { type: 'NEW_GAME'; difficulty: Difficulty; level: number }
  | { type: 'MOVE'; dir: Direction }
  | { type: 'TICK'; now: number }
  | { type: 'RESTART' }
  | { type: 'SET_WIN'; win: WinInfo }
  | { type: 'GO_MENU' };

function freshGame(difficulty: Difficulty, level: number): Pick<GameState, 'maze' | 'player'> {
  const cfg = levelConfig(difficulty, level);
  const maze = generateMaze(cfg.width, cfg.height);
  return { maze, player: { ...maze.start } };
}

function initState(): GameState {
  const maze = generateMaze(9, 9);
  return {
    phase: 'menu',
    difficulty: 'easy',
    level: 1,
    maze,
    player: { ...maze.start },
    elapsedMs: 0,
    moves: 0,
    win: null,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      const { maze, player } = freshGame(action.difficulty, action.level);
      return { ...state, phase: 'playing', difficulty: action.difficulty, level: action.level, maze, player, elapsedMs: 0, moves: 0, win: null };
    }
    case 'RESTART': {
      const { maze, player } = freshGame(state.difficulty, state.level);
      return { ...state, phase: 'playing', maze, player, elapsedMs: 0, moves: 0, win: null };
    }
    case 'GO_MENU':
      return { ...state, phase: 'menu' };
    case 'TICK': {
      if (state.phase !== 'playing') return state;
      return { ...state, elapsedMs: Math.max(0, action.now) };
    }
    case 'SET_WIN': {
      if (state.phase !== 'won') return state;
      return { ...state, win: action.win };
    }
    case 'MOVE': {
      if (state.phase !== 'playing') return state;
      const to = canMove(state.maze, state.player, action.dir);
      if (!to) return state;
      const reachedEnd = to.x === state.maze.end.x && to.y === state.maze.end.y;
      return {
        ...state,
        player: to,
        moves: state.moves + 1,
        phase: reachedEnd ? 'won' : 'playing',
      };
    }
  }
}

export interface GameControls {
  state: GameState;
  save: SaveData;
  startGame: (difficulty: Difficulty, level: number) => void;
  move: (dir: Direction) => void;
  restart: () => void;
  nextLevel: () => void;
  replayLevel: () => void;
  goMenu: () => void;
  resetProgress: () => void;
}

export function useGame(): GameControls {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const startRef = useRef<number>(Date.now());
  const completedRef = useRef(false);

  // Zeitstempel beim Start einer (neuen) Runde setzen.
  useEffect(() => {
    if (state.phase === 'playing') {
      startRef.current = Date.now() - state.elapsedMs;
      completedRef.current = false;
    }
  }, [state.phase, state.maze, state.elapsedMs]);

  // Timer während des Spiels (10 Hz – ausreichend für die Anzeige).
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const id = window.setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() - startRef.current });
    }, 100);
    return () => window.clearInterval(id);
  }, [state.phase, state.maze]);

  // Beim Gewinnen: Endzeit bestimmen, Fortschritt + Bestzeit aktualisieren, speichern.
  useEffect(() => {
    if (state.phase !== 'won' || completedRef.current) return;
    completedRef.current = true;
    const timeMs = Math.max(state.elapsedMs, Date.now() - startRef.current);
    const prevBest = save.progress[state.difficulty].bestTimeMs;
    const isBest = prevBest === null || timeMs < prevBest;
    const updated = applyCompletion(save, state.difficulty, state.level, timeMs);
    setSave(updated);
    saveGame(updated);
    dispatch({ type: 'SET_WIN', win: { level: state.level, timeMs, moves: state.moves, isBest } });
  }, [state.phase, state.difficulty, state.level, state.elapsedMs, state.moves, save]);

  const startGame = useCallback((difficulty: Difficulty, level: number) => {
    dispatch({ type: 'NEW_GAME', difficulty, level: Math.max(1, Math.min(MAX_LEVEL, level)) });
  }, []);

  const move = useCallback((dir: Direction) => dispatch({ type: 'MOVE', dir }), []);
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);

  const nextLevel = useCallback(() => {
    dispatch({ type: 'NEW_GAME', difficulty: state.difficulty, level: Math.min(MAX_LEVEL, state.level + 1) });
  }, [state.difficulty, state.level]);

  const replayLevel = useCallback(() => dispatch({ type: 'RESTART' }), []);
  const goMenu = useCallback(() => dispatch({ type: 'GO_MENU' }), []);

  const resetProgress = useCallback(() => {
    const fresh = defaultSave();
    setSave(fresh);
    clearSave();
  }, []);

  return { state, save, startGame, move, restart, nextLevel, replayLevel, goMenu, resetProgress };
}
