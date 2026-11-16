import type { CSSProperties } from 'react';
import { Difficulty, DIFFICULTIES, MAX_LEVEL } from '../game/levels';
import { WinInfo } from '../hooks/useGame';
import { formatTime } from './Hud';

interface Props {
  win: WinInfo;
  difficulty: Difficulty;
  level: number;
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

export function WinOverlay({ win, difficulty, level, hasNext, onNext, onReplay, onMenu }: Props) {
  const cfg = DIFFICULTIES[difficulty];
  const isMax = level >= MAX_LEVEL;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Level geschafft">
      <div className="overlay-card">
        <div className="win-burst" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
        <h2 className="win-title">Level {level} geschafft!</h2>
        <p className="win-sub">
          {cfg.label} · {isMax ? 'Schwerster Level gemeistert – Respekt!' : 'Bereit für die nächste Runde?'}
        </p>
        <div className="win-stats">
          <div>
            <span>Zeit</span>
            <strong className="mono">{formatTime(win.timeMs)}</strong>
          </div>
          <div>
            <span>Züge</span>
            <strong className="mono">{win.moves}</strong>
          </div>
        </div>
        {win.isBest && <div className="win-best">🏆 Neue Bestzeit!</div>}
        <div className="win-actions">
          {hasNext && !isMax && (
            <button type="button" className="btn btn-primary" onClick={onNext} autoFocus>
              Level {level + 1} ▸
            </button>
          )}
          {isMax && (
            <button type="button" className="btn btn-primary" onClick={onReplay} autoFocus>
              Nochmal spielen ▸
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onReplay}>
            ↻ Wiederholen
          </button>
          <button type="button" className="btn btn-ghost" onClick={onMenu}>
            Menü
          </button>
        </div>
      </div>
    </div>
  );
}
