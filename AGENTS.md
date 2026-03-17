# Agents

## Projektbeschreibung

Dieses Repository enthält Container-Vorlagen (Templates) für die mStudio Container-Vorlagen-Funktion. Jedes Template besteht aus einer `docker-compose.yml` und einer `manifest.yaml` in einem eigenen Ordner.

## Verzeichnisstruktur

```
<template-name>/
├── docker-compose.yml
├── manifest.yaml
└── icon.svg
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
- `tagline` und `description` sind zweisprachig (de/en).
- `version` ist eine Anzeige-Version (z.B. `"2.x.x"`), keine exakte Versionspinning.
- `icon` verweist auf eine SVG-Datei im Template-Ordner (üblicherweise `icon.svg`). Icons stammen bevorzugt von [dashboard-icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0).
- `categories` sind auf vordefinierte Werte beschränkt.
- `domains` verknüpft User-Inputs mit Services und Ports für automatisches Domain-Routing.
- `userInputs` definiert Werte, die der Benutzer bei der Installation konfiguriert.
- `systemInputs` definiert Werte, die das System automatisch generiert (z.B. Passwörter, Tokens), mit Regeln für Länge, Zeichenklassen und Muster.

### Allgemein

- Sprache in Code und Konfiguration: Englisch.
- Sprache in Beschreibungen und Texten: Deutsch und Englisch (zweisprachig).
- Jedes Template ist eigenständig und hat keine Abhängigkeiten zu anderen Templates.
- Sichere Defaults verwenden: Produktionsmodus, restriktive Berechtigungen, keine Debug-Optionen.

## Pflege

- Wenn Templates hinzugefügt, umbenannt oder entfernt werden, muss die Template-Tabelle in der `README.md` aktualisiert werden (inkl. Icon-Referenz).
- Änderungen an der Manifest-Struktur oder Konventionen müssen sowohl in `README.md` als auch in `AGENTS.md` nachgezogen werden.