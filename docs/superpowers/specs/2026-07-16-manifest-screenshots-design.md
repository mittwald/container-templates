# Design: `screenshots` im manifest.yaml

**Datum:** 2026-07-16
**Status:** Entwurf zur Umsetzung

## Ziel

Container-Templates um Katalog-Screenshots erweitern. Jeder Eintrag besteht aus einem
dekorativen Hintergrundbild (Bühne), dem darüber platzierten Screenshot der
Anwendungsoberfläche und einer zweisprachigen Bildüberschrift.

```yaml
screenshots:
  - bg: bg.jpg
    screenshot: screenshot.jpg
    text:
      de: Posteingang mit Echtzeit-Anzeige eingehender Nachrichten
      en: Inbox with real-time display of incoming messages
```

Darstellung im Renderer:

```
┌──────────────────────────────┐
│ bg.jpg (Bühne, ganzflächig)  │
│  „Lorem ipsum" (text.de)     │
│    ┌────────────────────┐    │
│    │  screenshot.jpg    │    │
│    └────────────────────┘    │
└──────────────────────────────┘
```

`text` steht **über** dem Screenshot, ist also eine Bildüberschrift, keine Bildunterschrift.

## Umfang

Enthalten:

1. `manifest.schema.json` — optionales `screenshots`-Feld
2. `README.md` — Struktur-Block, Feldtabelle, Abschnitt `### screenshots`
3. `AGENTS.md` — Projektbeschreibung und Konventions-Bullet
4. `validate-screenshots.py` + Workflow-Schritt — prüft, dass referenzierte Dateien existieren,
   lesbar sind, mindestens 1500 px breit sind und `bg` exakt im Seitenverhältnis 3:2 vorliegt

Nicht enthalten (bewusst ausgeklammert):

- Rendering in `index.html` / `generate-index.sh`
- Beispiel-Screenshots für konkrete Templates

## Entscheidungen

| Entscheidung | Begründung |
|---|---|
| `bg` = dekorativer Hintergrund, `screenshot` liegt darüber | Marketing-Slide-Muster; `bg` trägt keine Information |
| Bilder flach im Template-Ordner, neben `icon.svg` | Konsistent mit der bisherigen flachen Ablage |
| Dateiname im Manifest, kein Pfad | Verhindert Pfad-Traversal und Unterordner |
| `bg`, `screenshot`, `text` alle Pflicht | Renderer braucht keine Fallback-Logik; einheitliche Darstellung |
| Feld optional, aber `minItems: 1` | Ein leeres `screenshots: []` ist stiller Unsinn |
| Kein `maxItems` | YAGNI, solange der Renderer keine Obergrenze vorgibt |
| Formate: jpg, jpeg, png, webp | Deckt die vorgesehenen Fälle ab, schließt exotische Formate aus |
| `bg` exakt 3:2, per CI geprüft | Konvention ohne Prüfung ist eine Bitte, keine Regel — verhindert Wildwuchs |
| Prüfung per Integer-Arithmetik, keine Toleranz | „Exakt" ohne Toleranzfenster; Fließkomma-Vergleiche würden Ausreißer durchlassen |
| Kein Ratio-Check für `screenshot` | Wird frei auf der Bühne platziert und hat bewusst kein festes Verhältnis |
| Mindestbreite 1500 px für `bg` **und** `screenshot` | Verhindert unscharfes Hochskalieren beim Rendern; ein Wert für beide ist leichter zu merken als zwei |
| Nur Breite geprüft, keine Mindesthöhe | Bei `bg` folgt die Höhe zwingend aus 3:2 (1500 → 1000); ein zweiter Check wäre redundant. Bei `screenshot` gibt es kein festes Verhältnis, also auch keine ableitbare Höhe |

## 1. Schema

Neues Top-Level-Feld nach `categories` (Katalog-/Präsentationsdaten), **nicht** in `required`:

```json
"screenshots": {
  "type": "array",
  "description": "Katalog-Screenshots: je Eintrag ein Hintergrundbild, der darüber gelegte Screenshot und eine mehrsprachige Bildüberschrift. Dateien liegen im Template-Ordner.",
  "minItems": 1,
  "items": {
    "type": "object",
    "additionalProperties": false,
    "required": ["bg", "screenshot", "text"],
    "properties": {
      "bg": { "$ref": "#/$defs/imageFile", "description": "Hintergrundbild (Bühne) hinter dem Screenshot." },
      "screenshot": { "$ref": "#/$defs/imageFile", "description": "Screenshot der Anwendungsoberfläche." },
      "text": { "$ref": "#/$defs/i18n", "description": "Mehrsprachige Bildüberschrift, wird über dem Screenshot angezeigt." }
    }
  }
}
```

Neues `$def`, damit das Pattern nicht doppelt steht:

```json
"imageFile": {
  "type": "string",
  "pattern": "^[A-Za-z0-9._-]+\\.(jpe?g|png|webp)$",
  "description": "Dateiname einer Bilddatei im Template-Ordner (ohne Pfadangabe)."
}
```

Das Pattern erlaubt keine Unterordner und kein `/`, womit `../` implizit ausgeschlossen ist.
`..jpg` wäre formal gültig, scheitert aber am Datei-Existenz-Check.

## 2. CI-Check

Neue Datei `validate-screenshots.py` im Repo-Root. JSON-Schema kann weder Dateiexistenz noch
Bildmaße prüfen, deshalb ein eigener Schritt. Python, weil der Workflow bereits Python 3.12
einrichtet und `generate-index.sh` dasselbe Idiom (PyYAML) nutzt.

Der Check deckt vier Fehlerklassen ab:

1. **Existenz** — referenzierte Datei liegt nicht im Template-Ordner (Tippfehler, vergessenes Bild)
2. **Lesbarkeit** — Datei ist kein gültiges Bild (z. B. umbenanntes `.txt` mit Endung `.jpg`)
3. **Mindestbreite** — Bild ist schmaler als 1500 px (gilt für `bg` und `screenshot`)
4. **Seitenverhältnis** — `bg` liegt nicht exakt in 3:2 vor

```python
#!/usr/bin/env python3
"""Verify that images referenced in manifest screenshots exist and are well-formed."""
import glob, sys, yaml
from pathlib import Path
from PIL import Image

MIN_WIDTH = 1500
BG_RATIO_WIDTH, BG_RATIO_HEIGHT = 3, 2

errors = []
for manifest_path in sorted(glob.glob("*/manifest.yaml")):
    folder = Path(manifest_path).parent
    manifest = yaml.safe_load(folder.joinpath("manifest.yaml").read_text(encoding="utf-8"))
    for index, shot in enumerate(manifest.get("screenshots") or [], start=1):
        for field in ("bg", "screenshot"):
            location = f"{manifest_path}: screenshots[{index}].{field}"
            filename = shot.get(field)
            if not filename:
                continue
            path = folder / filename
            if not path.is_file():
                errors.append(f"{location} -> {path} not found")
                continue
            try:
                with Image.open(path) as image:
                    width, height = image.size
            except OSError:
                errors.append(f"{location} -> {path} is not a readable image")
                continue
            if width < MIN_WIDTH:
                errors.append(
                    f"{location} -> {path} is {width}x{height}, "
                    f"expected a width of at least {MIN_WIDTH}px"
                )
            if field == "bg" and width * BG_RATIO_HEIGHT != height * BG_RATIO_WIDTH:
                errors.append(
                    f"{location} -> {path} is {width}x{height}, "
                    f"expected an aspect ratio of exactly {BG_RATIO_WIDTH}:{BG_RATIO_HEIGHT}"
                )

for error in errors:
    print(f"error: {error}", file=sys.stderr)
print(f"{len(errors)} error(s)")
sys.exit(1 if errors else 0)
```

Breite und Seitenverhältnis sind bewusst **kein** `elif`: ein `bg` mit 800x800 verletzt beides und
soll auch beides melden, damit der Autor nicht zweimal nachbessert.

Eigenschaften:

- Sammelt **alle** Fehler statt beim ersten abzubrechen — ein PR mit drei vergessenen Bildern
  braucht keine drei CI-Runden.
- Der Ratio-Vergleich nutzt **Integer-Arithmetik** (`width * 2 == height * 3`) statt
  `width / height == 1.5`. Kein Toleranzfenster, keine Fließkomma-Überraschungen.
- `Image.open()` liest nur den Header; das Bild wird nicht dekodiert. Der Check bleibt schnell,
  auch wenn später viele Templates Screenshots haben.
- `shot.get(field)` ist gegen fehlende Schlüssel abgesichert, damit das Skript auch isoliert
  gegen ein unvalidiertes Manifest laufen kann; die Pflichtfelder erzwingt das Schema.
- `except OSError` statt `except UnidentifiedImageError`: Letzteres erbt von `OSError`, und eine
  abgeschnittene Datei kann ein einfaches `OSError` werfen. Die breitere Klausel deckt beide
  Fälle ab.
- Lokal ohne CI ausführbar.

Änderungen an `.github/workflows/validate-manifests.yml`:

- `pip install check-jsonschema pyyaml pillow` (PyYAML und Pillow kommen dazu)
- Neuer Schritt **nach** der Schema-Validierung:
  ```yaml
  - name: Validate screenshot images
    run: python validate-screenshots.py
  ```
- `paths`-Filter für `pull_request` und `push` erweitern um `"**/*.jpg"`, `"**/*.jpeg"`,
  `"**/*.png"`, `"**/*.webp"` und `validate-screenshots.py`, damit ein PR, der nur ein
  Bild löscht, den Check ebenfalls auslöst.

Die Schritt-Reihenfolge macht den Screenshot-Check von der Schema-Validierung abhängig.
Das ist beabsichtigt: ein strukturell kaputtes Manifest muss ohnehin zuerst repariert werden.

## 3. Dokumentation

### README.md

**Struktur-Block** um die optionalen Bilder ergänzen:

```
<template-name>/
├── docker-compose.yml    # Docker Compose Konfiguration
├── manifest.yaml         # Metadaten, Inputs und Konfiguration
├── icon.svg              # Icon (muss immer icon.svg heißen)
├── bg.jpg                # optional: Hintergrundbild für Screenshots
└── screenshot.jpg        # optional: Screenshot der Oberfläche
```

**Feldtabelle** — neue Zeile nach `categories`, passend zur Schema-Reihenfolge:

| `screenshots` | Optionale Katalog-Screenshots: Hintergrundbild, Screenshot und mehrsprachige Bildüberschrift |

**Neuer Abschnitt `### screenshots`** vor `### domains` (die Abschnitte folgen der
Tabellenreihenfolge): Aufbau erklären, Beispiel wie oben, Verweis auf die Ablage im
Template-Ordner.

### AGENTS.md

- **Projektbeschreibung** (nennt aktuell nur die drei Dateien) um die optionalen Screenshots ergänzen.
- **Neuer Konventions-Bullet** unter `manifest.yaml`, analog zum Icon-Bullet:
  - Bilder liegen flach im Template-Ordner, Formate `jpg`, `jpeg`, `png`, `webp`
  - Beide Bilder mindestens **1500 px breit** (per CI geprüft)
  - `bg`: dekorative Bühne im Seitenverhältnis **exakt 3:2** (per CI geprüft), trägt keine
    Information; aus 1500 px Breite folgt damit 1000 px Höhe
  - `screenshot`: echte Anwendungsoberfläche (kein Mockup), wird auf `bg` platziert und hat
    deshalb kein festes Seitenverhältnis, bleibt aber mit Rand innerhalb der Bühne
  - `text`: knappe, neutrale Bildüberschrift (steht **über** dem Screenshot) in dritter Person,
    tonal wie `description`
- **Abschnitt `Pflege`**: Hinweis, dass `validate-screenshots.py` Referenzen, Lesbarkeit,
  Mindestbreite und das 3:2-Verhältnis von `bg` prüft.

## Offene Punkte

- **Keine Obergrenze für die Bildgröße.** Ein 6000 px breites `bg` ist gültig und landet als
  Binary im Repo. Bisher kein Problem, aber wenn die Repo-Größe auffällig wird, wäre ein
  `MAX_WIDTH` neben `MIN_WIDTH` die naheliegende Ergänzung.
- **Die 1500 px sind gesetzt, nicht hergeleitet** — der mStudio-Renderer gibt bisher keine
  Zielmaße vor. Wenn dazu etwas feststeht, `MIN_WIDTH` und `AGENTS.md` nachziehen.
- **Rendering im Katalog** (`generate-index.sh`, `index.html`) ist bewusst nicht Teil dieser
  Änderung und wäre ein eigener Durchgang.

## Verifikation

- `check-jsonschema --schemafile manifest.schema.json */manifest.yaml` läuft weiterhin grün
  (alle 21 bestehenden Manifeste haben kein `screenshots`-Feld — es ist optional).
- `python validate-screenshots.py` meldet `0 error(s)`, solange kein Template Screenshots hat.
- **Gegenproben mit temporären Dateien**, jede muss rot werden — ein Check, der nie fehlschlägt,
  ist von einem funktionierenden nicht zu unterscheiden:
  - Schema: `bg.gif`, `sub/bg.jpg` und `../x.jpg` scheitern am Pattern; ein Eintrag ohne `text`
    scheitert an `required`.
  - Existenz: Manifest referenziert `fehlt.jpg`, Datei nicht vorhanden.
  - Lesbarkeit: eine Textdatei, die `kaputt.jpg` heißt.
  - Ratio: ein `bg` mit 1500x1500 muss als Fehler erscheinen, ein `bg` mit 1500x1000 nicht.
  - Mindestbreite: ein `bg` mit 900x600 (korrektes 3:2!) muss an der Breite scheitern — das
    trennt den Breiten- vom Ratio-Check.
  - Beide zugleich: ein `bg` mit 800x800 muss **zwei** Fehler melden, nicht einen.
  - Ein `screenshot` mit 1500x1500 muss **grün** bleiben (kein Ratio-Zwang, Breite erfüllt).
  - Ein `screenshot` mit 1400x1000 muss an der Breite scheitern.
- Danach alle temporären Dateien und Manifest-Einträge zurückbauen und beide Checks erneut
  grün sehen.
