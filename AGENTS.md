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
- `domains` verknüpft User-Inputs mit Services und Ports für automatisches Domain-Routing.
- `userInputs` definiert Werte, die der Benutzer bei der Installation konfiguriert.
- `systemInputs` definiert Werte, die das System automatisch generiert (z.B. Passwörter, Tokens), mit Regeln für Länge, Zeichenklassen und Muster.
- `type` gibt an, ob es sich um eine vollständige Anwendung (`standalone`) oder einen Baustein (`component`) handelt.

### Allgemein

- Sprache in Code und Konfiguration: Englisch.
- Sprache in Beschreibungen und Texten: Deutsch und Englisch (mehrsprachig).
- Jedes Template ist eigenständig und hat keine Abhängigkeiten zu anderen Templates.
- Sichere Defaults verwenden: Produktionsmodus, restriktive Berechtigungen, keine Debug-Optionen.

## Pflege

- Wenn Templates hinzugefügt, umbenannt oder entfernt werden, muss die Template-Tabelle in der `README.md` aktualisiert werden (inkl. Icon-Referenz).
- Änderungen an der Manifest-Struktur oder Konventionen müssen sowohl in `README.md` als auch in `AGENTS.md` nachgezogen werden.
