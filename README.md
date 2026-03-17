# Container Templates

Container-Vorlagen für die mStudio Container-Vorlagen-Funktion.

## Struktur

Jedes Template liegt in einem eigenen Ordner und besteht aus zwei Dateien:

```
<template-name>/
├── docker-compose.yml    # Docker Compose Konfiguration
├── manifest.yaml         # Metadaten, Inputs und Konfiguration
└── icon.svg / icon.png   # Icon (SVG bevorzugt, PNG als Fallback)
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
| `icon` | Pfad zum Icon (SVG bevorzugt, PNG als Fallback) |
| `categories` | Kategorien: `productivity`, `development`, `ai`, `security`, `monitoring`, `communication`, `media`, `ecommerce` |
| `domains` | Domain-Zuordnung zu Services und Ports |
| `userInputs` | Vom Benutzer konfigurierte Werte |
| `systemInputs` | Automatisch vom System generierte Werte (Passwörter, Tokens) |

## Vorhandene Templates

| | Template | Beschreibung |
|---|----------|-------------|
| <img src="bentopdf/icon.svg" width="24" height="24"> | [bentopdf](bentopdf/) | PDF-Generierung als Service |
| <img src="changedetection/icon.svg" width="24" height="24"> | [changedetection](changedetection/) | Website-Änderungen automatisch erkennen |
| <img src="chroma/icon.svg" width="24" height="24"> | [chroma](chroma/) | Vektordatenbank für KI-Anwendungen |
| <img src="directus/icon.svg" width="24" height="24"> | [directus](directus/) | Headless CMS mit PostgreSQL und Redis |
| <img src="docmost/icon.png" width="24" height="24"> | [docmost](docmost/) | Kollaborative Wiki- und Dokumentationsplattform |
| <img src="gotenberg/icon.png" width="24" height="24"> | [gotenberg](gotenberg/) | Dokumentenkonvertierung als API |
| <img src="hedgedoc/icon.svg" width="24" height="24"> | [hedgedoc](hedgedoc/) | Kollaborativer Markdown-Editor |
| <img src="listmonk/icon.svg" width="24" height="24"> | [listmonk](listmonk/) | Newsletter und Mailing-Listen |
| <img src="mariadb/icon.svg" width="24" height="24"> | [mariadb](mariadb/) | Relationale Datenbank (MySQL-kompatibel) |
| <img src="n8n/icon.svg" width="24" height="24"> | [n8n](n8n/) | Workflow-Automatisierung mit PostgreSQL-Backend |
| <img src="nocodb/icon.svg" width="24" height="24"> | [nocodb](nocodb/) | Open-Source Airtable-Alternative |
| <img src="opensearch/icon.svg" width="24" height="24"> | [opensearch](opensearch/) | Verteilte Such- und Analyse-Engine |
| <img src="paperless/icon.svg" width="24" height="24"> | [paperless](paperless/) | Dokumentenmanagement mit OCR |
| <img src="postgresql/icon.svg" width="24" height="24"> | [postgresql](postgresql/) | Relationale Datenbank |
| <img src="solr/icon.svg" width="24" height="24"> | [solr](solr/) | Enterprise-Suchplattform |
| <img src="umami/icon.svg" width="24" height="24"> | [umami](umami/) | Datenschutzfreundliche Web-Analytics |
| <img src="uptime-kuma/icon.svg" width="24" height="24"> | [uptime-kuma](uptime-kuma/) | Uptime-Monitoring für Websites und Services |
| <img src="vikunja/icon.svg" width="24" height="24"> | [vikunja](vikunja/) | Open-Source Task- und Projektmanagement |
| <img src="vaultwarden/icon.svg" width="24" height="24"> | [vaultwarden](vaultwarden/) | Selbst gehosteter Passwort-Manager |

## Neues Template anlegen

1. Ordner mit dem Template-Namen erstellen
2. `docker-compose.yml` mit den benötigten Services anlegen
3. `manifest.yaml` mit allen Metadaten und Input-Definitionen erstellen
4. `icon.svg` hinzufügen (Quelle: [dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0)
5. Variablen in der `docker-compose.yml` über `userInputs` und `systemInputs` im Manifest definieren