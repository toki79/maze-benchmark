# Maze Lab

Ein futuristisches Labyrinth-Spiel für den Browser – zufällige, immer lösbare Labyrinthe, drei Schwierigkeitsgrade, Level-System, Bestzeiten und Touch-Steuerung. Entstanden als Beitrag des Kandidaten **Claude** im KI-Coding-Benchmark (Aufgabe: [SPEC.md](SPEC.md), Regeln: [BENCHMARK.md](BENCHMARK.md)).

## Installation und Start

Voraussetzung: Node.js ≥ 20.19 (getestet mit 22) und npm.

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # Entwicklungsserver: http://127.0.0.1:5173
npm run build        # Typprüfung + Produktions-Build nach dist/
npm start            # Produktions-Build ausliefern: http://127.0.0.1:4173 (vorher npm run build)
npm test             # automatisierte Tests (Vitest)
```

Es werden keine externen Dienste, APIs oder Web-Fonts benötigt; die App läuft vollständig offline.

## Spielanleitung

- **Ziel:** Bringe den leuchtenden Punkt vom Start (oben links, grüner Ring) zum Ziel (unten rechts, magentafarbener Diamant).
- **Steuerung:** Pfeiltasten oder WASD · Wischen auf dem Spielfeld · Steuerkreuz auf Touch-/kleinen Geräten.
- **Tasten:** `R` Neustart (gleiches Labyrinth) · `N` neue Runde (neues Labyrinth) · `H` Lösungshilfe.
- Die Zeit startet mit dem ersten gültigen Zug. Wände blockieren und geben Rückmeldung (Wackeln, Statusmeldung).

| Schwierigkeit | Start-Größe | Besonderheit |
|---|---|---|
| Leicht | 8×8 (+1 je Level, max. 20) | viele Schleifen, Lösungshilfe |
| Mittel | 12×12 (+1 je Level, max. 30) | wenige Schleifen, Lösungshilfe |
| Schwer | 16×16 (+2 je Level, max. 40) | keine Schleifen, Sichtnebel, keine Hilfe |

Ein Level wird mit dem Erreichen des Ziels abgeschlossen und schaltet das nächste frei. Bestzeiten werden je Schwierigkeit und Level gespeichert.

## Persistenz

Fortschritt (freigeschaltete Level, aktuelles Level, Bestzeiten) und die laufende Runde (Seed, Position, Züge, Zeit) liegen im `localStorage` unter dem Schlüssel `mazelab:v1`. Nach einem Neuladen wird dasselbe Labyrinth am selben Punkt fortgesetzt. Beschädigte Daten werden validiert und auf Standardwerte zurückgesetzt.

## Technologie

TypeScript (strict), Vite 7, Canvas 2D für die Darstellung, reines DOM/CSS für die Oberfläche (kein UI-Framework), Vitest + jsdom für Tests.

## Projektstruktur

```
src/core/   Reine Logik ohne DOM
  rng.ts      Seed-basierter Zufall (mulberry32)
  maze.ts     Generator (iterative DFS + Braiding), BFS-Löser, Bewegungsprüfung
  levels.ts   Schwierigkeitsgrade und Level-Konfiguration
  game.ts     Spielzustand, Züge, Zeitmessung (pure Funktionen)
  storage.ts  Fortschritt/Bestzeiten, Validierung, localStorage-Zugriff
src/ui/     Oberfläche
  app.ts      Zusammenbau, Ereignisse, HUD, Gewinn-Dialog
  renderer.ts Canvas-Rendering (vorgerenderte Wände, Spur, Hilfe, Nebel)
  input.ts    Tastatur, Wischen, Steuerkreuz
src/style.css Gestaltung (responsive, reduzierte Bewegung berücksichtigt)
tests/      Vitest-Tests
```

## Tests

`npm test` prüft u. a.: Lösbarkeit und vollständige Verbundenheit für alle Schwierigkeiten/Level über viele Seeds, symmetrische Wände und geschlossenen Rand, Determinismus pro Seed, Größen-/Schwierigkeitsstaffelung, Wandkollision, Zeitmessung, Sieg, Neustart, Bestzeit-Logik, Persistenz inkl. beschädigter Daten sowie DOM-Tests der App (Tastatur, D-Pad, Schwierigkeitswechsel, Gewinn-Dialog, Level-Freischaltung, Wiederherstellung nach Reload).

## Bekannte Einschränkungen

- Das Canvas-Rendering wird in den automatisierten Tests nicht pixelgenau geprüft (jsdom ohne Canvas); die Optik wurde nur manuell begutachtet.
- Wischsteuerung und Steuerkreuz sind per Ereignis-Tests abgedeckt, aber nicht auf echten Touch-Geräten getestet.
- Die Zeit läuft nur bei geöffnetem Tab; beim Schließen wird der Stand mit der bis dahin verstrichenen Zeit gesichert, Pausen im Hintergrund-Tab werden nicht erkannt.
- Bestzeiten sind lokal pro Browser; kein Export/Import, keine Online-Bestenliste.
- Keine Sounds; Screenreader-Unterstützung beschränkt sich auf Statusansagen und beschriftete Bedienelemente (Canvas selbst ist nicht beschreibbar).
