import type { Maze, Point } from '../core/maze';

export interface Frame {
  /** Spielerposition in (fließenden) Zellkoordinaten */
  player: { x: number; y: number };
  trail: Point[];
  hint: Point[] | null;
  fogRadius: number | null;
  time: number;
  bump: number; // 0..1 – Wand-Feedback
}

const COLORS = {
  bg0: '#050816',
  bg1: '#0b1230',
  floor: 'rgba(94, 242, 255, 0.035)',
  wall: '#5ef2ff',
  wallGlow: 'rgba(94, 242, 255, 0.28)',
  start: '#5dffb0',
  goal: '#ff4fd8',
  player: '#ffffff',
  trail: 'rgba(94, 242, 255, 0.22)',
  hint: '#ffc857',
};

/** Zeichnet das Labyrinth auf ein Canvas. Statische Teile werden einmalig vorgerendert. */
export class MazeRenderer {
  private ctx: CanvasRenderingContext2D | null;
  private layer: HTMLCanvasElement;
  private maze: Maze | null = null;
  private cell = 0;
  private ox = 0;
  private oy = 0;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.layer = document.createElement('canvas');
  }

  get available(): boolean {
    return this.ctx !== null;
  }

  setMaze(maze: Maze): void {
    this.maze = maze;
    this.resize();
  }

  /** Passt die Canvas-Auflösung an die aktuelle Anzeigegröße an. */
  resize(): void {
    if (!this.ctx || !this.maze) return;
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.max(120, Math.floor(Math.min(rect.width, rect.height || rect.width)));
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    const px = Math.floor(size * this.dpr);
    this.canvas.width = px;
    this.canvas.height = px;
    this.layer.width = px;
    this.layer.height = px;
    const { cols, rows } = this.maze;
    this.cell = Math.floor((px * 0.97) / Math.max(cols, rows));
    this.ox = Math.floor((px - this.cell * cols) / 2);
    this.oy = Math.floor((px - this.cell * rows) / 2);
    this.paintStatic();
  }

  private paintStatic(): void {
    const maze = this.maze;
    const g = this.layer.getContext('2d');
    if (!g || !maze) return;
    const { cell, ox, oy } = this;
    const w = this.layer.width;
    g.clearRect(0, 0, w, w);

    const bg = g.createLinearGradient(0, 0, w, w);
    bg.addColorStop(0, COLORS.bg1);
    bg.addColorStop(1, COLORS.bg0);
    g.fillStyle = bg;
    g.fillRect(ox - cell * 0.25, oy - cell * 0.25, cell * maze.cols + cell * 0.5, cell * maze.rows + cell * 0.5);

    // Zellen-Boden im Schachbrett-Muster
    g.fillStyle = COLORS.floor;
    for (let y = 0; y < maze.rows; y++)
      for (let x = 0; x < maze.cols; x++) if ((x + y) % 2 === 0) g.fillRect(ox + x * cell, oy + y * cell, cell, cell);

    // Start- und Zielfelder
    this.tile(g, maze.start, COLORS.start, 0.22);
    this.tile(g, maze.goal, COLORS.goal, 0.22);

    // Wände als ein Pfad
    g.beginPath();
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        const i = y * maze.cols + x;
        const px = ox + x * cell;
        const py = oy + y * cell;
        const open = maze.passages[i];
        if (y === 0) this.line(g, px, py, px + cell, py);
        if (x === 0) this.line(g, px, py, px, py + cell);
        if (!(open & 2)) this.line(g, px + cell, py, px + cell, py + cell);
        if (!(open & 4)) this.line(g, px, py + cell, px + cell, py + cell);
      }
    }
    g.lineCap = 'round';
    g.strokeStyle = COLORS.wallGlow;
    g.lineWidth = Math.max(3, cell * 0.22);
    g.stroke();
    g.strokeStyle = COLORS.wall;
    g.lineWidth = Math.max(1.5, cell * 0.075);
    g.stroke();
  }

  private line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
  }

  private tile(g: CanvasRenderingContext2D, p: Point, color: string, alpha: number): void {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillRect(this.ox + p.x * this.cell, this.oy + p.y * this.cell, this.cell, this.cell);
    g.restore();
  }

  private center(x: number, y: number): [number, number] {
    return [this.ox + (x + 0.5) * this.cell, this.oy + (y + 0.5) * this.cell];
  }

  draw(f: Frame): void {
    const g = this.ctx;
    const maze = this.maze;
    if (!g || !maze || this.cell === 0) return;
    const w = this.canvas.width;
    g.clearRect(0, 0, w, w);
    g.drawImage(this.layer, 0, 0);
    const { cell } = this;

    // Spur
    if (f.trail.length > 1) {
      g.strokeStyle = COLORS.trail;
      g.lineWidth = cell * 0.3;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      f.trail.forEach((p, i) => {
        const [cx, cy] = this.center(p.x, p.y);
        if (i === 0) g.moveTo(cx, cy);
        else g.lineTo(cx, cy);
      });
      g.stroke();
    }

    // Lösungshilfe
    if (f.hint && f.hint.length > 1) {
      g.save();
      g.strokeStyle = COLORS.hint;
      g.globalAlpha = 0.85;
      g.lineWidth = Math.max(2, cell * 0.14);
      g.setLineDash([cell * 0.28, cell * 0.22]);
      g.lineDashOffset = -f.time / 40;
      g.beginPath();
      f.hint.forEach((p, i) => {
        const [cx, cy] = this.center(p.x, p.y);
        if (i === 0) g.moveTo(cx, cy);
        else g.lineTo(cx, cy);
      });
      g.stroke();
      g.restore();
    }

    // Nebel (vor Ziel und Spieler, damit diese sichtbar bleiben)
    const [px, py] = this.center(f.player.x, f.player.y);
    if (f.fogRadius !== null) {
      const r = f.fogRadius * cell;
      const grad = g.createRadialGradient(px, py, r * 0.45, px, py, r);
      grad.addColorStop(0, 'rgba(5, 8, 22, 0)');
      grad.addColorStop(1, 'rgba(5, 8, 22, 0.97)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, w);
    }

    // Start-/Zielmarkierung
    const pulse = 0.5 + 0.5 * Math.sin(f.time / 260);
    const [gx, gy] = this.center(maze.goal.x, maze.goal.y);
    g.save();
    g.shadowColor = COLORS.goal;
    g.shadowBlur = cell * (0.5 + 0.5 * pulse);
    g.fillStyle = COLORS.goal;
    g.beginPath();
    this.diamond(g, gx, gy, cell * (0.26 + 0.04 * pulse));
    g.fill();
    g.restore();
    const [sx, sy] = this.center(maze.start.x, maze.start.y);
    g.save();
    g.strokeStyle = COLORS.start;
    g.lineWidth = Math.max(1.5, cell * 0.07);
    g.beginPath();
    g.arc(sx, sy, cell * 0.3, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    // Spieler
    const shake = f.bump > 0 ? Math.sin(f.time / 18) * f.bump * cell * 0.1 : 0;
    g.save();
    g.shadowColor = f.bump > 0 ? '#ff5d73' : COLORS.wall;
    g.shadowBlur = cell * 0.9;
    g.fillStyle = f.bump > 0.4 ? '#ffb3bd' : COLORS.player;
    g.beginPath();
    g.arc(px + shake, py, cell * 0.24, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  private diamond(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    g.moveTo(x, y - r);
    g.lineTo(x + r, y);
    g.lineTo(x, y + r);
    g.lineTo(x - r, y);
    g.closePath();
  }
}
