# Agents

## Projektbeschreibung

Dieses Repository enthält Container-Vorlagen (Templates) für die mStudio Container-Vorlagen-Funktion. Jedes Template besteht aus einer `docker-compose.yml` und einer `manifest.yaml` in einem eigenen Ordner.

## Verzeichnisstruktur

```
<template-name>/
├── docker-compose.yml
├── manifest.yaml
└── icon.svg / icon.png
```

## Konventionen

### docker-compose.yml

- Alle Umgebungsvariablen, die vom Benutzer oder System konfiguriert werden, nutzen die `${VARIABLE}` Syntax.
- Volumes für persistente Daten werden als Named Volumes definiert.
- Zeitzone ist standardmäßig `Europe/Berlin`.
- Services, die Backups unterstützen, verwenden das Label `backup.command` mit dem entsprechenden Backup-Befehl.
- Ports werden nur für den Hauptservice exponiert, der über die Domain erreichbar sein soll.

### manifest.yaml

- `manifestVersion` ist aktuell immer `1.0`.
- `name`, `tagline` und `description` sind mehrsprachig (aktuell deutsch und englisch).
- `version` ist eine Anzeige-Version (z.B. `"2.x.x"`), keine exakte Versionspinning.
- `icon` verweist auf eine Bilddatei im Template-Ordner. Bevorzugt SVG (`icon.svg`), alternativ PNG (`icon.png`) falls kein SVG verfügbar ist. Icons stammen bevorzugt von [dashboard-icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0).
- `categories` sind auf folgende Werte beschränkt:
  - `productivity` — Workflow-Automatisierung, Dokumentenmanagement, Projekttools
  - `development` — Datenbanken, Suchplattformen, CMS, Dev-Tools
  - `ai` — KI/ML-spezifische Tools und Infrastruktur
  - `security` — Passwort-Manager, Authentifizierung, Verschlüsselung
  - `monitoring` — Analytics, Uptime-Monitoring, Observability
  - `communication` — Chat, Messaging, Kollaboration
  - `media` — Foto-/Video-/Dateiverwaltung
  - `ecommerce` — Shops, Payment, POS
- `domains` verknüpft User-Inputs mit Services und Ports für automatisches Domain-Routing. Jeder Eintrag hat ein `purpose` (z.B. `main`), über das die zugewiesene Domain referenziert werden kann (z.B. in `help` via `${domain.<purpose>}`).
- `userInputs` definiert Werte, die der Benutzer bei der Installation konfiguriert. Jeder Eintrag hat `name`, `dataType` (`text`/`number`/`boolean`/`select`, Standard `text`), `required` und `validationSchema` (JSON-Schema); optional `format` (`email`/`password`/`url`/`uri`), `dataSource` (z.B. `ingress.paths`), `positionMeta` (`step`/`index`/`section`) und `defaultValue`.
- `systemInputs` definiert Werte, die das System automatisch generiert (z.B. Passwörter, Tokens), mit Regeln für Länge, Zeichenklassen und Muster.
- `type` gibt an, ob das Template als eigenständige Anwendung in einem neuen Stack (`standalone`) oder als Baustein in einen bestehenden Stack (`component`) deployt wird.
- `help` (optional) liefert Kontext-Hilfe nach dem Deployment: `technicalDetails` (Liste aus mehrsprachigem `key` + `value`, z.B. Zugangsdaten, Connection-String, Hostname/Port) und `alerts` (Liste mit `status` = `danger`/`info`/`success`/`warning`, mehrsprachigem `heading` und `content`, optional `linkText` + `link`). In `value` dürfen nur nach der Installation persistierende Platzhalter stehen, und da Env-Variablen an einem Service (nicht am Stack) hängen, muss der Service-Name mit rein: `${<service>.env.NAME}` (Umgebungsvariable eines Services) und `${<service>.hostname}`. `userInputs` (`${HOST}` etc.) sind nach der Installation nicht mehr verfügbar — stattdessen die Service-Env-Variable referenzieren, in die der Wert fließt. Die öffentliche Domain wird über `${domain.<purpose>}` referenziert (siehe `domains`).

### Allgemein

- Sprache in Code und Konfiguration: Englisch.
- Sprache in Beschreibungen und Texten: Deutsch und Englisch (mehrsprachig).
- Jedes Template ist eigenständig und hat keine Abhängigkeiten zu anderen Templates.
- Sichere Defaults verwenden: Produktionsmodus, restriktive Berechtigungen, keine Debug-Optionen.

## Pflege

- Wenn Templates hinzugefügt, umbenannt oder entfernt werden, muss die Template-Tabelle in der `README.md` aktualisiert werden (inkl. Icon-Referenz).
- Änderungen an der Manifest-Struktur oder Konventionen müssen sowohl in `README.md` als auch in `AGENTS.md` nachgezogen werden.
- Jede `manifest.yaml` wird per CI gegen `manifest.schema.json` (im Repo-Root) validiert (Workflow `.github/workflows/validate-manifests.yml`). Bei Schema-Änderungen das JSON Schema mitziehen.
