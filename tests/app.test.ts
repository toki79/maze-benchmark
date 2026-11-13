import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp, type AppHandle } from '../src/ui/app';
import { solveMaze } from '../src/core/maze';
import { swipeDirection } from '../src/ui/input';
import { pathToDirs } from './helpers';

class MemStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}
const KEYS = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' } as const;
const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

let root: HTMLElement;
let app: AppHandle | null = null;
let clock = 0;
const mount = (store: MemStore, seed = 1234) => {
  app = mountApp(root, { storage: store, now: () => clock, seed: () => seed });
  return app;
};

beforeEach(() => {
  // jsdom bietet kein Canvas – der Renderer muss damit umgehen können.
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  root = document.createElement('div');
  document.body.appendChild(root);
  clock = 0;
});
afterEach(() => {
  app?.destroy();
  app = null;
  root.remove();
});

const q = (sel: string) => root.querySelector(sel) as HTMLElement;

describe('App (DOM)', () => {
  it('rendert Bedienelemente und startet im Ausgangszustand', () => {
    mount(new MemStore());
    expect(root.querySelectorAll('[data-difficulty]').length).toBeGreaterThanOrEqual(3);
    expect(q('[data-testid="level"]').textContent).toBe('1');
    expect(q('[data-testid="timer"]').textContent).toBe('00:00.0');
    expect(q('[data-testid="win"]').hidden).toBe(true);
    expect(root.querySelectorAll('[data-dir]').length).toBe(4);
  });

  it('steuert per Pfeiltasten und WASD; Wände blockieren mit Rückmeldung', () => {
    const a = mount(new MemStore());
    press('ArrowUp'); // Wand am Rand
    expect(a.getState().moves).toBe(0);
    expect(q('[data-testid="status"]').textContent).toMatch(/Wand/);
    const first = pathToDirs(solveMaze(a.getState().maze)!)[0];
    const wasd = { up: 'w', right: 'd', down: 's', left: 'a' } as const;
    press(wasd[first]);
    expect(a.getState().moves).toBe(1);
    expect(a.getState().status).toBe('playing');
  });

  it('Gewinnen zeigt Dialog, speichert Bestzeit und schaltet Level 2 frei; Reload stellt Stand wieder her', () => {
    const store = new MemStore();
    const a = mount(store);
    const dirs = pathToDirs(solveMaze(a.getState().maze)!);
    for (const d of dirs) {
      clock += 400;
      press(KEYS[d]);
    }
    expect(a.getState().status).toBe('won');
    expect(q('[data-testid="win"]').hidden).toBe(false);
    expect(q('[data-testid="best"]').textContent).not.toBe('–');
    expect(a.getProgress().levels.easy.unlocked).toBe(2);
    a.destroy();

    const b = mount(store, 999);
    expect(b.getProgress().levels.easy.unlocked).toBe(2);
    expect(q('[data-testid="best"]').textContent).not.toBe('–');
    q('[data-action="next"]').click();
    expect(q('[data-testid="level"]').textContent).toBe('2');
  });

  it('stellt eine laufende Runde nach Reload (gleiches Labyrinth, Position, Züge) wieder her', () => {
    const store = new MemStore();
    const a = mount(store, 4321);
    const dirs = pathToDirs(solveMaze(a.getState().maze)!);
    clock = 100;
    press(KEYS[dirs[0]]);
    clock = 2100;
    press(KEYS[dirs[1]]);
    const pos = a.getState().pos;
    a.destroy();
    const b = mount(store, 1);
    expect(b.getSeed()).toBe(4321);
    expect(b.getState().pos).toEqual(pos);
    expect(b.getState().moves).toBe(2);
  });

  it('Schwierigkeit wechseln lädt größeres Feld; Hilfe ist bei „Schwer“ gesperrt', () => {
    const a = mount(new MemStore());
    const easyCols = a.getState().maze.cols;
    q('[data-difficulty="hard"]').click();
    expect(a.getState().maze.cols).toBeGreaterThan(easyCols);
    expect((q('[data-action="hint"]') as HTMLButtonElement).disabled).toBe(true);
    q('[data-difficulty="easy"]').click();
    q('[data-action="hint"]').click();
    expect(q('[data-action="hint"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('Neustart setzt zurück, Neue Runde erzeugt anderes Labyrinth; gesperrte Level sind nicht anwählbar', () => {
    let s = 10;
    const store = new MemStore();
    const a = mountApp(root, { storage: store, now: () => clock, seed: () => s++ });
    app = a;
    const first = pathToDirs(solveMaze(a.getState().maze)!)[0];
    press(KEYS[first]);
    q('[data-action="restart"]').click();
    expect(a.getState().moves).toBe(0);
    const before = Array.from(a.getState().maze.passages).join();
    q('[data-action="new"]').click();
    expect(Array.from(a.getState().maze.passages).join()).not.toBe(before);
    expect((q('[data-action="nextlevel"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('übersteht nicht verfügbaren Speicher', () => {
    expect(() => {
      app = mountApp(root, { storage: null, now: () => 0, seed: () => 5 });
    }).not.toThrow();
  });
});

describe('Touch', () => {
  it('erkennt Wischrichtungen', () => {
    expect(swipeDirection(40, 5)).toBe('right');
    expect(swipeDirection(-40, 5)).toBe('left');
    expect(swipeDirection(3, 50)).toBe('down');
    expect(swipeDirection(3, -50)).toBe('up');
    expect(swipeDirection(5, 5)).toBeNull();
  });

  it('D-Pad-Tasten bewegen den Spieler', () => {
    vi.useFakeTimers();
    const a = mount(new MemStore());
    const first = pathToDirs(solveMaze(a.getState().maze)!)[0];
    const btn = q(`[data-dir="${first}"]`);
    btn.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    btn.dispatchEvent(new Event('pointerup', { bubbles: true }));
    expect(a.getState().moves).toBe(1);
    vi.useRealTimers();
  });
});
