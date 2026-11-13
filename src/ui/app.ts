import { createGame, formatTime, getElapsed, move, resumeGame, restartGame, type GameState } from '../core/game';
import { DIFFICULTIES, DIFFICULTY_ORDER, levelConfig, type DifficultyId } from '../core/levels';
import { generateMaze, solveMaze, type Direction, type Point } from '../core/maze';
import { mulberry32, randomSeed } from '../core/rng';
import {
  getBest,
  loadProgress,
  recordWin,
  saveProgress,
  type Progress,
} from '../core/storage';
import { bindInput } from './input';
import { MazeRenderer } from './renderer';

export interface AppOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  now?: () => number;
  seed?: () => number;
}

export interface AppHandle {
  getState(): GameState;
  getProgress(): Progress;
  getSeed(): number;
  destroy(): void;
}

const TEMPLATE = `
<div class="app">
  <header class="topbar">
    <h1 class="logo"><span class="logo-mark" aria-hidden="true"></span>Maze <em>Lab</em></h1>
    <div class="segmented" role="radiogroup" aria-label="Schwierigkeitsgrad" data-testid="difficulty"></div>
  </header>
  <section class="hud" aria-label="Spielstatus">
    <div class="stat"><span class="stat-label">Level</span><span class="stat-value" data-testid="level">1</span></div>
    <div class="stat"><span class="stat-label">Zeit</span><span class="stat-value mono" data-testid="timer">00:00.0</span></div>
    <div class="stat"><span class="stat-label">Züge</span><span class="stat-value mono" data-testid="moves">0</span></div>
    <div class="stat"><span class="stat-label">Bestzeit</span><span class="stat-value mono" data-testid="best">–</span></div>
  </section>
  <main class="stage">
    <div class="board" data-testid="board">
      <canvas tabindex="-1" role="img" aria-label="Labyrinth-Spielfeld. Start oben links, Ziel unten rechts (magenta)."></canvas>
      <div class="overlay" data-testid="win" role="dialog" aria-modal="true" aria-labelledby="win-title" hidden>
        <div class="card">
          <p class="badge" data-role="newbest" hidden>Neue Bestzeit!</p>
          <h2 id="win-title">Geschafft!</h2>
          <p class="win-stats"><span data-role="wintime" class="mono"></span> · <span data-role="winmoves"></span></p>
          <div class="card-actions">
            <button class="btn primary" data-action="next">Nächstes Level</button>
            <button class="btn" data-action="again">Nochmal spielen</button>
          </div>
        </div>
      </div>
    </div>
    <p class="status" role="status" aria-live="polite" data-testid="status"></p>
  </main>
  <nav class="levelnav" aria-label="Levelauswahl">
    <button class="btn small" data-action="prev" aria-label="Vorheriges Level">‹ Level</button>
    <span class="mono" data-testid="size"></span>
    <button class="btn small" data-action="nextlevel" aria-label="Nächstes Level">Level ›</button>
  </nav>
  <section class="controls" aria-label="Aktionen">
    <button class="btn" data-action="restart" title="Neustart (R)">↺ Neustart</button>
    <button class="btn" data-action="new" title="Neue Runde (N)">✦ Neue Runde</button>
    <button class="btn" data-action="hint" aria-pressed="false" title="Lösungshilfe (H)">◇ Hilfe</button>
  </section>
  <section class="dpad" aria-label="Steuerkreuz">
    <button class="pad up" data-dir="up" aria-label="Hoch">▲</button>
    <button class="pad left" data-dir="left" aria-label="Links">◀</button>
    <button class="pad right" data-dir="right" aria-label="Rechts">▶</button>
    <button class="pad down" data-dir="down" aria-label="Runter">▼</button>
  </section>
  <footer class="foot">Steuerung: Pfeiltasten / WASD · Wischen · R Neustart · N Neue Runde · H Hilfe</footer>
</div>`;

const MESSAGES = {
  ready: 'Erreiche das magentafarbene Ziel. Die Zeit startet mit deinem ersten Zug.',
  playing: 'Weiter so!',
  blocked: 'Wand! Dort geht es nicht weiter.',
  won: 'Ziel erreicht!',
  hintOff: 'In diesem Schwierigkeitsgrad gibt es keine Lösungshilfe.',
};

export function mountApp(root: HTMLElement, options: AppOptions = {}): AppHandle {
  const storage = options.storage === undefined ? safeLocalStorage() : options.storage;
  const now = options.now ?? (() => performance.now());
  const nextSeed = options.seed ?? randomSeed;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.innerHTML = TEMPLATE;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = q<HTMLCanvasElement>('canvas');
  const overlay = q<HTMLElement>('[data-testid="win"]');
  const el = {
    level: q('[data-testid="level"]'),
    timer: q('[data-testid="timer"]'),
    moves: q('[data-testid="moves"]'),
    best: q('[data-testid="best"]'),
    status: q('[data-testid="status"]'),
    size: q('[data-testid="size"]'),
    diff: q('[data-testid="difficulty"]'),
    hintBtn: q<HTMLButtonElement>('[data-action="hint"]'),
    prev: q<HTMLButtonElement>('[data-action="prev"]'),
    nextLevel: q<HTMLButtonElement>('[data-action="nextlevel"]'),
    newBest: q('[data-role="newbest"]'),
    winTime: q('[data-role="wintime"]'),
    winMoves: q('[data-role="winmoves"]'),
    nextBtn: q<HTMLButtonElement>('[data-action="next"]'),
  };

  let progress = loadProgress(storage);
  let seed = 0;
  let state!: GameState;
  let trail: Point[] = [];
  let showHint = false;
  let hintPath: Point[] | null = null;
  let display = { x: 0, y: 0 };
  let bumpUntil = 0;
  let storageWarned = false;
  let destroyed = false;

  const renderer = new MazeRenderer(canvas);
  const diff = () => DIFFICULTIES[progress.difficulty];
  const level = () => progress.levels[progress.difficulty].current;

  const persist = () => {
    const ok = saveProgress(storage, progress);
    if (!ok && !storageWarned) {
      storageWarned = true;
      setStatus('Hinweis: Fortschritt kann in diesem Browser nicht gespeichert werden.');
    }
  };

  const setStatus = (text: string) => {
    el.status.textContent = text;
  };

  function buildDifficultyButtons() {
    el.diff.innerHTML = '';
    for (const id of DIFFICULTY_ORDER) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg';
      b.setAttribute('role', 'radio');
      b.dataset.difficulty = id;
      b.title = DIFFICULTIES[id].description;
      b.textContent = DIFFICULTIES[id].label;
      b.addEventListener('click', () => setDifficulty(id));
      el.diff.appendChild(b);
    }
  }

  function syncChrome() {
    const lp = progress.levels[progress.difficulty];
    el.diff.querySelectorAll<HTMLButtonElement>('.seg').forEach((b) => {
      const active = b.dataset.difficulty === progress.difficulty;
      b.setAttribute('aria-checked', String(active));
      b.classList.toggle('active', active);
    });
    el.level.textContent = String(lp.current);
    const cfg = levelConfig(progress.difficulty, lp.current);
    el.size.textContent = `${cfg.cols}×${cfg.rows}`;
    const best = getBest(progress, progress.difficulty, lp.current);
    el.best.textContent = best === null ? '–' : formatTime(best);
    el.prev.disabled = lp.current <= 1;
    el.nextLevel.disabled = lp.current >= lp.unlocked;
    el.nextLevel.title = lp.current >= lp.unlocked ? 'Schließe dieses Level ab, um das nächste freizuschalten' : '';
    el.hintBtn.disabled = !diff().hintAllowed;
    el.hintBtn.setAttribute('aria-pressed', String(showHint));
    el.hintBtn.classList.toggle('on', showHint);
    el.moves.textContent = String(state.moves);
    root.dataset.status = state.status;
    root.dataset.difficulty = progress.difficulty;
  }

  function startLevel(newSeed: number, resume?: { pos: Point; moves: number; elapsedMs: number }) {
    seed = newSeed >>> 0;
    const cfg = levelConfig(progress.difficulty, level());
    const maze = generateMaze({ cols: cfg.cols, rows: cfg.rows, braid: cfg.braid }, mulberry32(seed));
    state = resume ? resumeGame(maze, resume, now()) : createGame(maze);
    trail = state.moves > 0 ? [{ ...maze.start }, { ...state.pos }] : [{ ...maze.start }];
    display = { ...state.pos };
    showHint = false;
    hintPath = null;
    overlay.hidden = true;
    renderer.setMaze(maze);
    setStatus(MESSAGES.ready);
    syncChrome();
    saveRun();
    updateTimer();
  }

  function saveRun() {
    progress.run =
      state.status === 'playing'
        ? {
            difficulty: progress.difficulty,
            level: level(),
            seed,
            pos: { ...state.pos },
            moves: state.moves,
            elapsedMs: getElapsed(state, now()),
          }
        : state.status === 'ready'
          ? { difficulty: progress.difficulty, level: level(), seed, pos: { ...state.pos }, moves: 0, elapsedMs: 0 }
          : null;
    persist();
  }

  function newRound() {
    startLevel(nextSeed());
  }

  function restart() {
    state = restartGame(state);
    trail = [{ ...state.maze.start }];
    display = { ...state.pos };
    overlay.hidden = true;
    setStatus('Runde neu gestartet.');
    syncChrome();
    saveRun();
    updateTimer();
  }

  function setDifficulty(id: DifficultyId) {
    if (id === progress.difficulty) return;
    progress.difficulty = id;
    newRound();
  }

  function changeLevel(delta: number) {
    const lp = progress.levels[progress.difficulty];
    const target = Math.min(lp.unlocked, Math.max(1, lp.current + delta));
    if (target === lp.current) return;
    lp.current = target;
    newRound();
  }

  function toggleHint() {
    if (!diff().hintAllowed) {
      setStatus(MESSAGES.hintOff);
      return;
    }
    showHint = !showHint;
    hintPath = showHint ? solveMaze(state.maze, state.pos) : null;
    syncChrome();
  }

  function handleMove(dir: Direction) {
    if (destroyed) return;
    const { state: next, result } = move(state, dir, now());
    if (result === 'ignored') return;
    if (result === 'blocked') {
      bumpUntil = now() + 260;
      setStatus(MESSAGES.blocked);
      return;
    }
    state = next;
    // Spur: bei Rückwärtsgehen die Spur kürzen
    const last2 = trail[trail.length - 2];
    if (last2 && last2.x === state.pos.x && last2.y === state.pos.y) trail.pop();
    else trail.push({ ...state.pos });
    if (showHint) hintPath = solveMaze(state.maze, state.pos);
    if (result === 'won') {
      finish();
    } else {
      if (state.moves === 1) setStatus(MESSAGES.playing);
      saveRun();
      syncChrome();
    }
  }

  function finish() {
    const time = state.elapsedMs;
    const res = recordWin(progress, progress.difficulty, level(), time);
    progress = res.progress;
    persist();
    showHint = false;
    hintPath = null;
    el.winTime.textContent = formatTime(time);
    el.winMoves.textContent = `${state.moves} Züge`;
    el.newBest.hidden = !res.newBest;
    overlay.hidden = false;
    el.nextBtn.focus({ preventScroll: true });
    setStatus(`${MESSAGES.won} Zeit ${formatTime(time)}${res.newBest ? ' – neue Bestzeit!' : ''}`);
    syncChrome();
  }

  function advanceLevel() {
    const lp = progress.levels[progress.difficulty];
    lp.current = Math.min(lp.unlocked, lp.current + 1);
    newRound();
    persist();
  }

  function updateTimer() {
    el.timer.textContent = formatTime(getElapsed(state, now()));
  }

  // ---- Ereignisse ----
  const actions: Record<string, () => void> = {
    restart,
    new: newRound,
    hint: toggleHint,
    prev: () => changeLevel(-1),
    nextlevel: () => changeLevel(1),
    next: advanceLevel,
    again: newRound,
  };
  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((b) => {
    b.addEventListener('click', () => actions[b.dataset.action!]?.());
  });

  const unbind = bindInput(root, canvas, {
    onMove: handleMove,
    onRestart: restart,
    onNewRound: newRound,
    onHint: toggleHint,
  });

  const onResize = () => renderer.resize();
  window.addEventListener('resize', onResize);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
  ro?.observe(canvas);

  const timerId = setInterval(() => {
    if (state.status === 'playing') {
      updateTimer();
    }
  }, 100);

  // Spielstand beim Verlassen sichern, damit die Zeit stimmt.
  const onHide = () => {
    if (state.status === 'playing') saveRun();
  };
  window.addEventListener('pagehide', onHide);

  let raf = 0;
  const loop = (t: number) => {
    if (destroyed) return;
    const k = reduceMotion ? 1 : 0.35;
    display.x += (state.pos.x - display.x) * k;
    display.y += (state.pos.y - display.y) * k;
    if (Math.abs(state.pos.x - display.x) < 0.002) display.x = state.pos.x;
    if (Math.abs(state.pos.y - display.y) < 0.002) display.y = state.pos.y;
    const remaining = bumpUntil - now();
    renderer.draw({
      player: display,
      trail,
      hint: hintPath,
      fogRadius: diff().fogRadius,
      time: t,
      bump: remaining > 0 ? remaining / 260 : 0,
    });
    raf = requestAnimationFrame(loop);
  };

  // ---- Start ----
  buildDifficultyButtons();
  const run = progress.run;
  if (run && run.difficulty === progress.difficulty && run.level === level()) {
    startLevel(run.seed, { pos: run.pos, moves: run.moves, elapsedMs: run.elapsedMs });
    if (state.moves > 0) setStatus('Spielstand wiederhergestellt – weiter geht es!');
  } else {
    newRound();
  }
  if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);

  return {
    getState: () => state,
    getProgress: () => progress,
    getSeed: () => seed,
    destroy() {
      destroyed = true;
      cancelAnimationFrame?.(raf);
      clearInterval(timerId);
      unbind();
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pagehide', onHide);
    },
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
