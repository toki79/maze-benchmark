# Maze Lab — KI-Coding-Benchmark

Vergleich von drei Coding-Agent-Konfigurationen anhand derselben Aufgabe: einer visuell hochwertigen, responsiven Labyrinth-Web-App.

## Ziel

Alle drei Kandidaten entwickeln unabhängig voneinander anhand von [SPEC.md](SPEC.md) eine vollständige Anwendung. Die Ergebnisse werden nach den Regeln in [BENCHMARK.md](BENCHMARK.md) bewertet.

## Branches

- `benchmark/claude` — Claude-basierter Coding-Agent
- `benchmark/rtx5090-32gb` — lokales Modell auf der RTX 5090 (32 GB VRAM)
- `benchmark/large-model-ram` — größeres lokales Modell mit GPU-/RAM-Offloading (32 GB VRAM + 64 GB System-RAM)

Alle drei Branches gehen vom gleichen Baseline-Commit aus. Der Ausgangszustand enthält keinen Anwendungscode. Modelldetails, Zeitbudgets und Laufzeiten werden vor den Durchläufen dokumentiert.

**Wichtig:** Die Baseline darf nach Beginn der Durchläufe nicht mehr verändert werden. Kein Ergebnis eines Kandidaten darf als Input für einen anderen Kandidaten dienen.

---

## Anwendung: Maze Lab

Diese Sektion dokumentiert die auf diesem Branch implementierte Maze-Lab-App (Ergebnis des Kandidaten `benchmark/qwen3.8-27b-opencode`).

### Funktionen

- Zufällige Labyrinthe pro Spielrunde (iterative randomisierte DFS, perfektes Labyrinth ⇒ garantiert lösbar; optionale Loops durch begrenzte Lockerschleife).
- Drei Schwierigkeitsgrade (Leicht 7×7 → 13×13, Mittel 11×11 → 21×21, Schwer 15×15 → 31×31), jeweils 10 Level mit wachsender Größe.
- Steuerung per Pfeiltasten und WASD, auf Mobilgeräten per Touch-D-Pad oder Wischgeste.
- Timer, Zähler, Bestzeiten, Gewinn-Anzeige, Neustart und Menü-Navigation.
- Fortschritt (Bestzeiten, freigeschaltete Schwierigkeitsgrade) wird in `localStorage` (Schlüssel `maze-lab-save-v1`) persistiert.
- Responsives, dunkles Neon-Design (Desktop, Tablet, Smartphone), HiDPI-Canvas-Rendering.

### Tech-Stack

Vite + React 18 + TypeScript (strict) + Canvas 2D + Vitest (Node). Keine externen UI-Bibliotheken, keine externen Dienste — die App läuft vollständig lokal.

### Aufbau

- `src/game/` — reine Spiellogik (Wandmodell, Generator, BFS-Lösung/Solvability-Check, Level-Konfiguration, Seed-PRNG, Persistenz).
- `src/hooks/useGame.ts` — Zustandsmaschine (Phasen `menu`/`playing`/`won`, Timer, Einmal-Speicherung bei Sieg).
- `src/components/` — Darstellungs-Komponenten (Menü, HUD, Canvas, D-Pad, Win-Overlay).
- `src/App.tsx` — Verdrahtung (Tastatur, Swipe, Phasen-Rendering).

### Befehle

```bash
npm install          # Abhängigkeiten
npm run dev          # Dev-Server (http://localhost:5173)
npm test             # Vitest-Suites (25 Tests)
npm run build        # Typecheck (tsc --noEmit) + Produktions-Build nach dist/
npm run preview      # Produktions-Build ausliefern (http://localhost:4173)
```

### Tests

Vier Vitest-Suites decken die Spiellogik funktional ab:

- `generator.test.ts` — Gültigkeit generierter Labyrinthe (Symmetrie, geschlossene Ränder, Zellgrenzen) und Lösbbarkeit per BFS.
- `maze.test.ts` — Wandmodell, `canMove`, BFS-`solveMaze`/`isSolvable`.
- `storage.test.ts` — Persistenz (Versionierung, Defekte Daten, Bestzeiten, Freischaltung).
- `gameplay.test.ts` — komplette, durchgespielte Runden (Züge über `canMove` bis zum Ziel).

### Bekannte Einschränkungen

- Der Debug-Hook `window.__mazeLab.getState()` in `src/App.tsx` ist QA-Infrastruktur, kein Spiel-Feature.
- Kein Multiplayer, keine Sound-Effekte, keine i18n (nur Deutsch).
- Fortschritt wird pro Browser (localStorage) gespeichert; ein Reset-Button steht im Footer bereit.
