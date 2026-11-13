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
