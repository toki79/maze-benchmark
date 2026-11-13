import type { Direction } from '../core/maze';

export const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  w: 'up',
  d: 'right',
  s: 'down',
  a: 'left',
  W: 'up',
  D: 'right',
  S: 'down',
  A: 'left',
};

/** Richtung aus einer Wischgeste; `null`, wenn die Bewegung zu kurz ist. */
export function swipeDirection(dx: number, dy: number, threshold = 24): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export interface InputHandlers {
  onMove(dir: Direction): void;
  onRestart(): void;
  onNewRound(): void;
  onHint(): void;
}

/** Bindet Tastatur-, Touch- und D-Pad-Steuerung. Gibt eine Aufräumfunktion zurück. */
export function bindInput(root: HTMLElement, surface: HTMLElement, h: InputHandlers): () => void {
  const cleanup: Array<() => void> = [];
  const on = <T extends EventTarget>(t: T, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, opts);
    cleanup.push(() => t.removeEventListener(type, fn, opts));
  };

  on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    const dir = KEY_MAP[e.key];
    if (dir) {
      e.preventDefault();
      h.onMove(dir);
      return;
    }
    if (e.repeat) return;
    if (e.key === 'r' || e.key === 'R') h.onRestart();
    else if (e.key === 'n' || e.key === 'N') h.onNewRound();
    else if (e.key === 'h' || e.key === 'H') h.onHint();
  });

  // Wischen auf dem Spielfeld
  let start: { x: number; y: number } | null = null;
  on(surface, 'touchstart', (e: TouchEvent) => {
    const t = e.touches[0];
    start = t ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });
  on(surface, 'touchmove', (e: TouchEvent) => {
    if (!start) return;
    const t = e.touches[0];
    if (!t) return;
    const dir = swipeDirection(t.clientX - start.x, t.clientY - start.y, 28);
    if (dir) {
      h.onMove(dir);
      start = { x: t.clientX, y: t.clientY }; // kontinuierliches Wischen
    }
    e.preventDefault();
  }, { passive: false });
  on(surface, 'touchend', () => {
    start = null;
  });

  // D-Pad mit Halten-zum-Wiederholen
  root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((btn) => {
    const dir = btn.dataset.dir as Direction;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    on(btn, 'pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      h.onMove(dir);
      stop();
      timer = setInterval(() => h.onMove(dir), 170);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) on(btn, ev, stop);
    // Tastaturbedienung der Buttons (Enter/Space erzeugen click ohne pointerdown)
    on(btn, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        h.onMove(dir);
      }
    });
    cleanup.push(stop);
  });

  return () => cleanup.forEach((fn) => fn());
}
