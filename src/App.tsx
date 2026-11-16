import { useCallback, useEffect, useRef } from 'react';
import { Direction } from './game/maze';
import { useGame } from './hooks/useGame';
import { MainMenu } from './components/MainMenu';
import { Hud } from './components/Hud';
import { MazeCanvas } from './components/MazeCanvas';
import { DPad } from './components/DPad';
import { WinOverlay } from './components/WinOverlay';
import { MAX_LEVEL } from './game/levels';

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};

export default function App() {
  const game = useGame();
  const { state } = game;
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Debug-Hook (nur für manuelle QA-/Browser-Tests, kein Teil der Spiellogik):
  // Ermöglicht extern die Zustandsabfrage, z. B. window.__mazeLab.getState().
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__mazeLab = {
      getState: () => stateRef.current,
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__mazeLab;
    };
  }, []);

  // Tastatursteuerung (globale Shortcuts auch im Menü).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.phase !== 'menu') {
        game.goMenu();
        return;
      }
      if (state.phase === 'menu') {
        if (e.key === 'Enter' || e.key === ' ') {
          game.startGame('easy', 1);
        }
        return;
      }
      const dir = KEY_DIRS[e.key];
      if (dir) {
        e.preventDefault();
        game.move(dir);
      }
      if (state.phase === 'won' && (e.key === 'Enter' || e.key === ' ')) {
        if (state.level < MAX_LEVEL) game.nextLevel();
        else game.replayLevel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, state.phase, state.level]);

  // Swipe-Steuerung auf dem Spielfeld (und überall auf der Stage).
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchRef.current;
      touchRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // zu kurz -> kein Swipe
      let dir: Direction;
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
      else dir = dy > 0 ? 'down' : 'up';
      if (state.phase === 'playing') game.move(dir);
    },
    [game, state.phase],
  );

  const hasNext = state.level < MAX_LEVEL;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">
          <span className="logo-mini" aria-hidden="true" />
          MAZE<span>LAB</span>
        </div>
        {state.phase !== 'menu' && (
          <nav className="topbar-nav" aria-label="Spielstand">
            <span className="topbar-progress" aria-hidden="true">
              {Array.from({ length: MAX_LEVEL }).map((_, i) => (
                <i key={i} className={i + 1 <= state.level ? 'on' : ''} />
              ))}
            </span>
          </nav>
        )}
      </header>

      <main className="stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {state.phase === 'menu' ? (
          <MainMenu save={game.save} onStart={game.startGame} />
        ) : (
          <div className="play-area">
            <Hud
              difficulty={state.difficulty}
              level={state.level}
              elapsedMs={state.elapsedMs}
              moves={state.moves}
              save={game.save}
              onRestart={game.restart}
              onMenu={game.goMenu}
            />
            <MazeCanvas maze={state.maze} player={state.player} frozen={state.phase === 'won'} />
            <div className="mobile-controls">
              <DPad onMove={game.move} />
              <p className="swipe-hint">Oder aufs Feld wischen</p>
            </div>
            {state.phase === 'won' && state.win && (
              <WinOverlay
                win={state.win}
                difficulty={state.difficulty}
                level={state.level}
                hasNext={hasNext}
                onNext={game.nextLevel}
                onReplay={game.replayLevel}
                onMenu={game.goMenu}
              />
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <button type="button" className="link-btn" onClick={game.resetProgress}>
          Fortschritt zurücksetzen
        </button>
      </footer>
    </div>
  );
}
