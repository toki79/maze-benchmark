import { useEffect, useRef } from 'react';
import { Maze, Vec } from '../game/maze';

interface Props {
  maze: Maze;
  player: Vec;
  frozen?: boolean; // kein Trail/Animation mehr (Gewinn-Screen)
}

/**
 * Rendert das Labyrinth auf ein Canvas (HiDPI-fähig) mit Neon-Look:
 * leuchtende Wände, gestufter Weg, animierter Spieler und pulsierendes Ziel.
 */
export function MazeCanvas({ maze, player, frozen = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Vec>(player);
  const trailRef = useRef<Vec[]>([]);
  const pulseRef = useRef(0);
  const rafRef = useRef(0);

  // Spielerposition für den Renderer aktualisieren + Trail sammeln.
  useEffect(() => {
    const prev = playerRef.current;
    if (prev.x !== player.x || prev.y !== player.y) {
      if (!frozen) {
        trailRef.current = [...trailRef.current, prev].slice(-14);
      }
      playerRef.current = { ...player };
    }
  }, [player, frozen]);

  // Bei neuem Labyrinth Trail leeren.
  useEffect(() => {
    trailRef.current = [];
    playerRef.current = { ...maze.start };
  }, [maze]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let size = 0;
    const dpr = () => Math.min(2.5, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      size = Math.max(120, Math.floor(Math.min(rect.width, rect.height)));
      const d = dpr();
      canvas.width = size * d;
      canvas.height = size * d;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const render = (t: number) => {
      const d = dpr();
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const { width: cols, height: rows, walls } = maze;
      const cell = size / cols;
      ctx.clearRect(0, 0, size, size);

      // Hintergrund-Panel
      const bg = ctx.createLinearGradient(0, 0, size, size);
      bg.addColorStop(0, '#0b1226');
      bg.addColorStop(1, '#0a0f22');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      // Subtiles Gitter (Zellmitte-Punkte)
      ctx.fillStyle = 'rgba(94, 234, 212, 0.05)';
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          ctx.beginPath();
          ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, Math.max(1, cell * 0.05), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Trail (Verlauf des Spielers, verblassend)
      const trail = trailRef.current;
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const a = ((i + 1) / trail.length) * 0.35;
        ctx.fillStyle = `rgba(56, 225, 255, ${a})`;
        ctx.beginPath();
        ctx.arc((p.x + 0.5) * cell, (p.y + 0.5) * cell, cell * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ziel: pulsierender Ring + Kern
      const pulse = 0.5 + 0.5 * Math.sin(t / 260);
      const ex = (maze.end.x + 0.5) * cell;
      const ey = (maze.end.y + 0.5) * cell;
      const goalGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, cell * (0.55 + 0.25 * pulse));
      goalGrad.addColorStop(0, `rgba(167, 139, 250, ${0.95})`);
      goalGrad.addColorStop(0.6, 'rgba(139, 92, 246, 0.55)');
      goalGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = goalGrad;
      ctx.beginPath();
      ctx.arc(ex, ey, cell * (0.55 + 0.25 * pulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(196, 181, 253, ${0.65 + 0.35 * pulse})`;
      ctx.lineWidth = Math.max(1.5, cell * 0.08);
      ctx.beginPath();
      ctx.arc(ex, ey, cell * (0.3 + 0.1 * pulse), 0, Math.PI * 2);
      ctx.stroke();

      // Wände mit Neon-Glow
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, cell * 0.16);
      ctx.strokeStyle = 'rgba(56, 225, 255, 0.92)';
      ctx.shadowColor = 'rgba(56, 225, 255, 0.55)';
      ctx.shadowBlur = Math.min(10, cell * 0.3);
      ctx.beginPath();
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = x + y * cols;
          const px = x * cell;
          const py = y * cell;
          if (walls.top[i]) {
            ctx.moveTo(px, py);
            ctx.lineTo(px + cell, py);
          }
          if (walls.left[i]) {
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + cell);
          }
          if (x === cols - 1 && walls.right[i]) {
            ctx.moveTo(px + cell, py);
            ctx.lineTo(px + cell, py + cell);
          }
          if (y === rows - 1 && walls.bottom[i]) {
            ctx.moveTo(px, py + cell);
            ctx.lineTo(px + cell, py + cell);
          }
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Spieler
      const pp = playerRef.current;
      const cx = (pp.x + 0.5) * cell;
      const cy = (pp.y + 0.5) * cell;
      const playerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.42);
      playerGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      playerGrad.addColorStop(0.4, 'rgba(94, 234, 212, 0.95)');
      playerGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
      ctx.fillStyle = playerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ecfeff';
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.18, 0, Math.PI * 2);
      ctx.fill();

      if (!frozen) {
        pulseRef.current = t;
        rafRef.current = requestAnimationFrame(render);
      }
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [maze, frozen]);

  return (
    <div ref={wrapRef} className="maze-frame" aria-label="Labyrinth" role="img">
      <canvas ref={canvasRef} className="maze-canvas" />
    </div>
  );
}
