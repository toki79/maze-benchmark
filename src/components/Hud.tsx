import { Difficulty, DIFFICULTIES, MAX_LEVEL, levelSize } from '../game/levels';
import { SaveData } from '../game/storage';

interface Props {
  difficulty: Difficulty;
  level: number;
  elapsedMs: number;
  moves: number;
  save: SaveData;
  onRestart: () => void;
  onMenu: () => void;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const t = s % 60;
  const cs = Math.floor((ms % 1000) / 100);
  return `${m}:${String(t).padStart(2, '0')}.${cs}`;
}

export function Hud({ difficulty, level, elapsedMs, moves, save, onRestart, onMenu }: Props) {
  const cfg = DIFFICULTIES[difficulty];
  const { width, height } = levelSize(difficulty, level);
  const best = save.progress[difficulty].bestTimeMs;
  return (
    <div className="hud">
      <button type="button" className="btn btn-ghost" onClick={onMenu} aria-label="Zurück zum Menü">
        ← Menü
      </button>
      <div className="hud-stats" role="status" aria-live="off">
        <div className="stat">
          <span className="stat-label">Zeit</span>
          <span className="stat-value mono">{formatTime(elapsedMs)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Züge</span>
          <span className="stat-value mono">{moves}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Level</span>
          <span className="stat-value mono">
            {level}/{MAX_LEVEL}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Bestzeit</span>
          <span className="stat-value mono">{best === null ? '–:––' : formatTime(best)}</span>
        </div>
      </div>
      <div className="hud-meta">
        <span className="badge badge-diff">{cfg.label}</span>
        <span className="badge">{width}×{height}</span>
        <button type="button" className="btn btn-ghost" onClick={onRestart} aria-label="Runde neu starten">
          ↻ Neustart
        </button>
      </div>
    </div>
  );
}
