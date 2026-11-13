# Benchmark-Protokoll v1.0

## Kandidaten
1. **Claude:** Claude-basierter Coding-Agent
2. **RTX 5090 / 32 GB VRAM:** lokales Modell, das ohne relevantes CPU-Offloading vollständig in den GPU-Speicher passt
3. **Großes lokales Modell:** GPU-/RAM-Offloading mit derselben RTX 5090 (32 GB VRAM) plus vorhandenem 64-GB-System-RAM

Für jeden Durchlauf **vorab** erfassen: Modellname und Version/Quantisierung, Agent-Harness und Version, Backend/Inference-Engine, Kontextfenster, Hardware, Betriebssystem, Startzeit, festes Zeitlimit, erlaubte Tools und Netzwerkzugriff. 64 GB RAM sind **kein** 64-GB-VRAM.

## Fairness
- Alle Kandidaten starten vom selben, unveränderten Baseline-Commit und erhalten wortgleich `SPEC.md` als Aufgabe.
- Jeder Kandidat bekommt seinen eigenen Branch und ein isoliertes Arbeitsverzeichnis (z. B. Git Worktree). Kein Zugang zu Ergebnissen der anderen.
- Idealerweise gleicher Agent-Harness und gleiche Werkzeugberechtigungen; falls technisch nicht möglich, Unterschiede offen dokumentieren. Das Ergebnis ist dann ein **Systemvergleich**, kein reiner Modellvergleich.
- Gleiches Zeitbudget, gleiche Hardware-Ressourcen soweit praktikabel, gleiches Verfahren bei Rückfragen und Fehlversuchen.
- Kein manuelles Debugging, keine nachträglichen menschlichen Codekorrekturen während der gemessenen Läufe.
- Prompt, Zeitbudget, Bewertungsrubrik und unabhängige Tests **vor** dem ersten Durchlauf fixieren. Das Modell soll nicht die konkreten versteckten Tests sehen.
- Keine Vermischung zwischen den drei Ergebnissen und keine Zusammenführung in `main` vor Abschluss.

## Bewertungsrubrik (100 Punkte)
- **Funktion (40):** korrekte Generierung, Lösbarkeit, Spielsteuerung, Fortschritt und Persistenz
- **Automatisierte Qualitätsprüfung (25):** externe, identische Akzeptanztests plus Build/Start; eigene Tests getrennt protokollieren
- **Visuelle Qualität und UX (20):** Konsistenz, Lesbarkeit, Responsivität, Animationen, Accessibility-Grundlagen
- **Codequalität (10):** Struktur, Wartbarkeit, Fehlerbehandlung, Dokumentation
- **Lieferfähigkeit (5):** reproduzierbarer Start, klare Anleitung, ehrlicher Abschlussbericht

Gleiche feste Testumgebung und Bewertungsanweisungen; bei subjektiven Bewertungen möglichst Blindvergleich anhand neutral benannter Screenshots.

## Separat erfassen (nicht automatisch Teil der Punktzahl)
- Gesamtdauer, aktive Agent-Zeit, fehlgeschlagene Kommandos, notwendige menschliche Eingriffe
- Test-/Build-Resultate, Antwortgeschwindigkeit (Tokens/s), Kontextnutzung
- RAM-/VRAM-Maximum und Energieverbrauch soweit messbar; bei Cloud-Kandidat ggf. Nutzungslimits

## Reproduzierbarkeit
Dokumentiere nach jedem Lauf die genaue Git-Commit-SHA, Umgebungsdaten und Ergebnisse. Die endgültigen externen Tests werden unabhängig von den Kandidaten geschrieben und auf die drei Ergebnisse identisch angewendet.
