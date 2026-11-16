import { Difficulty, DIFFICULTIES, DIFFICULTY_ORDER, MAX_LEVEL, levelSize } from '../game/levels';
import { SaveData } from '../game/storage';

interface Props {
  save: SaveData;
  onStart: (difficulty: Difficulty, level: number) => void;
}

function formatTime(ms: number | null): string {
  if (ms === null) return '–:––';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function MainMenu({ save, onStart }: Props) {
  return (
    <div className="menu">
      <div className="menu-logo" aria-hidden="true">
        <span className="logo-maze">
          <i /><i /><i /><i />
        </span>
        MAZE<span>LAB</span>
      </div>
      <p className="menu-subtitle">Finde den Weg durchs Labyrinth – Level für Level.</p>

      <div className="difficulty-grid">
        {DIFFICULTY_ORDER.map((d) => {
          const cfg = DIFFICULTIES[d];
          const progress = save.progress[d];
          const { width } = levelSize(d, Math.min(progress.level, MAX_LEVEL));
          const isUnlocked = d === 'easy' || save.unlockedLevel >= 2;
          return (
            <div key={d} className={`diff-card ${!isUnlocked ? 'locked' : ''}`}>
              <div className="diff-head">
                <h2>{cfg.label}</h2>
                <span className="diff-size">{width}×{width}</span>
              </div>
              <p className="diff-desc">{cfg.description}</p>
              <div className="diff-progress">
                <div className="progress-track" aria-hidden="true">
                  <span style={{ width: `${(Math.min(progress.level, MAX_LEVEL) / MAX_LEVEL) * 100}%` }} />
                </div>
                <span className="diff-meta">
                  Level {Math.min(progress.level, MAX_LEVEL)}/{MAX_LEVEL}
                  {progress.bestTimeMs !== null && (
                    <>
                      {' · Bestzeit '}
                      <strong>{formatTime(progress.bestTimeMs)}</strong>
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!isUnlocked}
                onClick={() => onStart(d, Math.min(progress.level, MAX_LEVEL))}
              >
                {isUnlocked ? 'Spielen' : '🔒 Gesperrt'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="menu-hint">
        Steuerung: <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> oder <kbd>W</kbd><kbd>A</kbd>
        <kbd>S</kbd><kbd>D</kbd> · Auf dem Handy per D-Pad oder Wischen
      </p>
    </div>
  );
}
