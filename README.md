# Container Templates

Container-Vorlagen für die mStudio Container-Vorlagen-Funktion.

## Struktur

Jedes Template liegt in einem eigenen Ordner und besteht aus zwei Dateien:

```
<template-name>/
├── docker-compose.yml    # Docker Compose Konfiguration
├── manifest.yaml         # Metadaten, Inputs und Konfiguration
└── icon.svg              # Icon (SVG) für die Anzeige im mStudio
```

### docker-compose.yml

Standard Docker Compose Datei mit den Services, Volumes und Netzwerken des Templates. Umgebungsvariablen werden über `${VARIABLE}` referenziert und durch die im Manifest definierten User- und System-Inputs befüllt.

### manifest.yaml

Beschreibt das Template mit folgenden Feldern:

| Feld | Beschreibung |
|------|-------------|
| `manifestVersion` | Version der Manifest-Syntax (aktuell `1.0`) |
| `name` | Technischer Name des Templates |
| `version` | Angezeigte Version (z.B. `"2.x.x"`) |
| `tagline` | Kurzbeschreibung (de/en) |
| `description` | Ausführliche Beschreibung (de/en) |
| `developer` | Name des Entwicklers/Herstellers |
| `website` | Projekt-Website |
| `repository` | Source-Code Repository |
| `support` | Support-URL |
| `license` | Lizenz der Software |
| `icon` | Pfad zum Icon (SVG), z.B. `icon.svg` |
| `categories` | Kategorien (z.B. `productivity`, `ai`, `development`) |
| `domains` | Domain-Zuordnung zu Services und Ports |
| `userInputs` | Vom Benutzer konfigurierte Werte |
| `systemInputs` | Automatisch vom System generierte Werte (Passwörter, Tokens) |

## Vorhandene Templates

| | Template | Beschreibung |
|---|----------|-------------|
| <img src="changedetection/icon.svg" width="24"> | [changedetection](changedetection/) | Website-Änderungen automatisch erkennen |
| <img src="chroma/icon.svg" width="24"> | [chroma](chroma/) | Vektordatenbank für KI-Anwendungen |
| <img src="directus/icon.svg" width="24"> | [directus](directus/) | Headless CMS mit PostgreSQL und Redis |
| <img src="mariadb/icon.svg" width="24"> | [mariadb](mariadb/) | Relationale Datenbank (MySQL-kompatibel) |
| <img src="n8n/icon.svg" width="24"> | [n8n](n8n/) | Workflow-Automatisierung mit PostgreSQL-Backend |
| <img src="opensearch/icon.svg" width="24"> | [opensearch](opensearch/) | Verteilte Such- und Analyse-Engine |
| <img src="paperless/icon.svg" width="24"> | [paperless](paperless/) | Dokumentenmanagement mit OCR |
| <img src="postgresql/icon.svg" width="24"> | [postgresql](postgresql/) | Relationale Datenbank |
| <img src="solr/icon.svg" width="24"> | [solr](solr/) | Enterprise-Suchplattform |
| <img src="umami/icon.svg" width="24"> | [umami](umami/) | Datenschutzfreundliche Web-Analytics |
| <img src="vaultwarden/icon.svg" width="24"> | [vaultwarden](vaultwarden/) | Selbst gehosteter Passwort-Manager |

## Neues Template anlegen

1. Ordner mit dem Template-Namen erstellen
2. `docker-compose.yml` mit den benötigten Services anlegen
3. `manifest.yaml` mit allen Metadaten und Input-Definitionen erstellen
4. `icon.svg` hinzufügen (Quelle: [dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0)
5. Variablen in der `docker-compose.yml` über `userInputs` und `systemInputs` im Manifest definieren