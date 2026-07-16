# Agents

## Projektbeschreibung

Dieses Repository enthält Container-Vorlagen (Templates) für die mStudio Container-Vorlagen-Funktion. Jedes Template liegt in einem eigenen Ordner und besteht aus `docker-compose.yml`, `manifest.yaml` und `icon.svg`, optional ergänzt um Screenshot-Bilder. Aufbau, Feld-Dokumentation und Beispiele stehen in der `README.md`; die maschinenlesbare, CI-validierte Feldstruktur in `manifest.schema.json`.

## Konventionen

### docker-compose.yml

- Alle Umgebungsvariablen, die vom Benutzer oder System konfiguriert werden, nutzen die `${VARIABLE}` Syntax.
- Volumes für persistente Daten werden als Named Volumes definiert.
- Zeitzone ist standardmäßig `Europe/Berlin`.
- Services, die Backups unterstützen, verwenden das Label `backup.command` mit dem entsprechenden Backup-Befehl.
- Ports werden nur für den Hauptservice exponiert, der über die Domain erreichbar sein soll.

### manifest.yaml

Struktur, Typen und erlaubte Werte definiert `manifest.schema.json`; die ausführliche Feld-Doku mit Beispielen steht in `README.md`. Ergänzend gelten Konventionen, die das Schema nicht ausdrückt:

- **`help`-Platzhalter:** Die Werte werden auch **nach** der Installation angezeigt, es dürfen daher nur dann noch verfügbare Platzhalter verwendet werden — `${<service>.env.NAME}` und `${<service>.hostname}` (Env-Variablen hängen am Service, deshalb mit Service-Namen) sowie `${domain.<purpose>}` für die Domain. `userInputs` (`${HOST}` etc.) sind nach der Installation **nicht** mehr verfügbar; stattdessen die Ziel-Service-Env referenzieren. Ausführlich: `README.md`, Abschnitt `help`.
- **`categories`** als Auswahlhilfe:
  - `productivity` — Workflow-Automatisierung, Dokumentenmanagement, Projekttools
  - `development` — CMS, Dev-Tools, Test- und Build-Infrastruktur
  - `database` — Datenbanken und Suchplattformen (relational, Vektor, Dokumenten-Store, Such-Index). **Nur intern:** Die Kategorie dient dazu, gezielt Template-Listen im „Datenbanken"-Bereich anzuzeigen; im Store ist sie keine offizielle Kategorie. Sie **steht deshalb nie allein**, sondern ergänzt die fachliche Kategorie: eine relationale Datenbank ist `development` **und** `database`, eine Vektordatenbank `ai` **und** `database`. Das Schema erzwingt das (`database` ⇒ mindestens zwei Kategorien).
  - `ai` — KI/ML-spezifische Tools und Infrastruktur
  - `security` — Passwort-Manager, Authentifizierung, Verschlüsselung
  - `monitoring` — Analytics, Uptime-Monitoring, Observability
  - `communication` — Chat, Messaging, Kollaboration
  - `media` — Foto-/Video-/Dateiverwaltung
  - `ecommerce` — Shops, Payment, POS
- **Icon:** Die Datei heißt **immer** `icon.svg` im Template-Ordner (kein Manifest-Feld). Bevorzugt von [dashboard-icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0).
- **`screenshots`:** Optional. Die Bilder liegen flach im Template-Ordner neben `icon.svg`; im Manifest steht nur der Dateiname, kein Pfad. Erlaubt sind `jpg`, `jpeg`, `png` und `webp`. Beide Bilder müssen mindestens **1500 px breit** sein — das verhindert unscharfes Hochskalieren beim Rendern.
  - `bg` — dekorative Bühne im Seitenverhältnis **exakt 3:2** (aus 1500 px Breite folgt damit 1000 px Höhe). Trägt keine Information, da nur der Screenshot darüber inhaltlich gelesen wird.
  - `screenshot` — die echte Anwendungsoberfläche, kein Mockup und keine Montage. Wird auf `bg` platziert und hat deshalb kein festes Seitenverhältnis.
  - `text` — eine **Bildüberschrift**: Sie steht über dem Screenshot, nicht darunter. Ein knapper, neutraler Satz in dritter Person, tonal wie `description` (keine Werbung), der zeigt, was auf dem Screenshot zu sehen ist.
  - Existenz, Lesbarkeit, Mindestbreite und das 3:2-Verhältnis werden per CI durch `validate-screenshots.py` geprüft.
- `description` ist ein Katalogtext von **~175 Wörtern** je Sprache, als **Markdown** (fett angeführter Toolname, eine „Zentrale Funktionen:"-Bullet-Liste, Absätze). Neutral, dritte Person, sachlich-informativ (keine Werbung). Aufbau: (1) Einordnung + konkret benannte self-hosted SaaS-Alternative, (2) Feature-Liste, (3) Relevanz für **Agenturen** (Use-Cases in Kundenprojekten; die Zielgruppe wird als „Agenturen" zusammengefasst, nicht nach Typen aufgeschlüsselt), (4) Betrieb bei mittwald (deutsche Rechenzentren) + DSGVO + Template-Inhalt + Wirtschaftlichkeit. Bei `component`-Templates stellt Block 3 das Tool als Baustein/Backend hinter Kundenanwendungen dar.

### Allgemein

- Sprache in Code und Konfiguration: Englisch.
- Sprache in Beschreibungen und Texten: Deutsch und Englisch (mehrsprachig).
- Jedes Template ist eigenständig und hat keine Abhängigkeiten zu anderen Templates.
- Sichere Defaults verwenden: Produktionsmodus, restriktive Berechtigungen, keine Debug-Optionen.
- Jeder Unterordner muss einem Template entsprechen. Es darf keine Unterordner geben, die andere Dateien enthalten (z.B. `docs`, `scripts`). Ausgenommen sind versteckte Ordner wie `.github` (Workflows). `generate-index.sh` und `validate-screenshots.py` verlassen sich darauf: Sie iterieren über `*/manifest.yaml` und behandeln damit jeden sichtbaren Unterordner als Template.

## Pflege

- Wenn Templates hinzugefügt, umbenannt oder entfernt werden, muss die Template-Tabelle in der `README.md` aktualisiert werden (inkl. Icon-Referenz).
- Änderungen an der Manifest-**Struktur** in `manifest.schema.json` pflegen (wird per CI gegen alle `manifest.yaml` validiert) und die Feld-Doku in der `README.md` nachziehen.
- Regeln zu Screenshot-Bildern (Mindestbreite, Seitenverhältnis) stehen in `validate-screenshots.py` als Konstanten; bei Änderungen die Konvention oben und die `README.md` nachziehen.
- **Konventionen** werden hier in `AGENTS.md` gepflegt.
