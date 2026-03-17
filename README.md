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
| <img src="anythingllm/icon.svg" width="24" height="24" style="object-fit:contain"> | [anythingllm](anythingllm/) | All-in-One KI-Anwendung mit RAG |
| <img src="bentopdf/icon.svg" width="24" height="24" style="object-fit:contain"> | [bentopdf](bentopdf/) | PDF-Generierung als Service |
| <img src="changedetection/icon.svg" width="24" height="24" style="object-fit:contain"> | [changedetection](changedetection/) | Website-Änderungen automatisch erkennen |
| <img src="chatwoot/icon.svg" width="24" height="24" style="object-fit:contain"> | [chatwoot](chatwoot/) | Open-Source Kundenkommunikationsplattform |
| <img src="chroma/icon.svg" width="24" height="24" style="object-fit:contain"> | [chroma](chroma/) | Vektordatenbank für KI-Anwendungen |
| <img src="collabora/icon.svg" width="24" height="24" style="object-fit:contain"> | [collabora](collabora/) | Online-Office-Suite für kollaboratives Arbeiten |
| <img src="databasus/icon.svg" width="24" height="24" style="object-fit:contain"> | [databasus](databasus/) | Einfacher Datenbank-Client im Browser |
| <img src="directus/icon.svg" width="24" height="24" style="object-fit:contain"> | [directus](directus/) | Headless CMS mit PostgreSQL und Redis |
| <img src="docmost/icon.png" width="24" height="24" style="object-fit:contain"> | [docmost](docmost/) | Kollaborative Wiki- und Dokumentationsplattform |
| <img src="docuseal/icon.svg" width="24" height="24" style="object-fit:contain"> | [docuseal](docuseal/) | Open-Source Plattform für digitale Dokumentensignaturen |
| <img src="dozzle/icon.svg" width="24" height="24" style="object-fit:contain"> | [dozzle](dozzle/) | Echtzeit Log-Viewer für Docker Container |
| <img src="excalidraw/icon.svg" width="24" height="24" style="object-fit:contain"> | [excalidraw](excalidraw/) | Virtuelles Whiteboard zum Skizzieren |
| <img src="gitea/icon.svg" width="24" height="24" style="object-fit:contain"> | [gitea](gitea/) | Leichtgewichtiger selbst gehosteter Git-Service |
| <img src="gotenberg/icon.png" width="24" height="24" style="object-fit:contain"> | [gotenberg](gotenberg/) | Dokumentenkonvertierung als API |
| <img src="healthchecks/icon.svg" width="24" height="24" style="object-fit:contain"> | [healthchecks](healthchecks/) | Cron-Job und Hintergrundprozess-Monitoring |
| <img src="hedgedoc/icon.svg" width="24" height="24" style="object-fit:contain"> | [hedgedoc](hedgedoc/) | Kollaborativer Markdown-Editor |
| <img src="hoppscotch/icon.svg" width="24" height="24" style="object-fit:contain"> | [hoppscotch](hoppscotch/) | Open-Source API-Entwicklungsplattform |
| <img src="immich/icon.svg" width="24" height="24" style="object-fit:contain"> | [immich](immich/) | Selbst gehostete Foto- und Videoverwaltung |
| <img src="infisical/icon.svg" width="24" height="24" style="object-fit:contain"> | [infisical](infisical/) | Open-Source Secret Management Plattform |
| <img src="it-tools/icon.svg" width="24" height="24" style="object-fit:contain"> | [it-tools](it-tools/) | Praktische Online-Tools für Entwickler |
| <img src="keycloak/icon.svg" width="24" height="24" style="object-fit:contain"> | [keycloak](keycloak/) | Open-Source Identity und Access Management |
| <img src="langfuse/icon.svg" width="24" height="24" style="object-fit:contain"> | [langfuse](langfuse/) | Open-Source LLM-Observability und Analyse |
| <img src="librechat/icon.svg" width="24" height="24" style="object-fit:contain"> | [librechat](librechat/) | Multi-Provider KI-Chat-Plattform |
| <img src="linkwarden/icon.svg" width="24" height="24" style="object-fit:contain"> | [linkwarden](linkwarden/) | Kollaborativer Lesezeichen-Manager |
| <img src="listmonk/icon.svg" width="24" height="24" style="object-fit:contain"> | [listmonk](listmonk/) | Newsletter und Mailing-Listen |
| <img src="mailpit/icon.svg" width="24" height="24" style="object-fit:contain"> | [mailpit](mailpit/) | E-Mail-Test-Tool mit Web-Oberfläche |
| <img src="mariadb/icon.svg" width="24" height="24" style="object-fit:contain"> | [mariadb](mariadb/) | Relationale Datenbank (MySQL-kompatibel) |
| <img src="mautic/icon.svg" width="24" height="24" style="object-fit:contain"> | [mautic](mautic/) | Open-Source Marketing-Automatisierung |
| <img src="mealie/icon.svg" width="24" height="24" style="object-fit:contain"> | [mealie](mealie/) | Selbst gehostete Rezeptverwaltung |
| <img src="memos/icon.svg" width="24" height="24" style="object-fit:contain"> | [memos](memos/) | Leichtgewichtiger selbst gehosteter Notiz-Service |
| <img src="miniflux/icon.svg" width="24" height="24" style="object-fit:contain"> | [miniflux](miniflux/) | Minimalistischer RSS-Feed-Reader |
| <img src="n8n/icon.svg" width="24" height="24" style="object-fit:contain"> | [n8n](n8n/) | Workflow-Automatisierung mit PostgreSQL-Backend |
| <img src="nocodb/icon.svg" width="24" height="24" style="object-fit:contain"> | [nocodb](nocodb/) | Open-Source Airtable-Alternative |
| <img src="ntfy/icon.svg" width="24" height="24" style="object-fit:contain"> | [ntfy](ntfy/) | Push-Benachrichtigungsdienst mit HTTP-API |
| <img src="opencloud/icon.svg" width="24" height="24" style="object-fit:contain"> | [opencloud](opencloud/) | Open-Source Cloud-Plattform für Dateien und Zusammenarbeit |
| <img src="opensearch/icon.svg" width="24" height="24" style="object-fit:contain"> | [opensearch](opensearch/) | Verteilte Such- und Analyse-Engine |
| <img src="outline/icon.svg" width="24" height="24" style="object-fit:contain"> | [outline](outline/) | Kollaboratives Wissensmanagement und Wiki |
| <img src="paperless/icon.svg" width="24" height="24" style="object-fit:contain"> | [paperless](paperless/) | Dokumentenmanagement mit OCR |
| <img src="papra/icon.svg" width="24" height="24" style="object-fit:contain"> | [papra](papra/) | Minimalistisches Dokumentenmanagement |
| <img src="penpot/icon.svg" width="24" height="24" style="object-fit:contain"> | [penpot](penpot/) | Open-Source Design- und Prototyping-Plattform |
| <img src="planka/icon.svg" width="24" height="24" style="object-fit:contain"> | [planka](planka/) | Open-Source Kanban-Board für Projektmanagement |
| <img src="plausible/icon.svg" width="24" height="24" style="object-fit:contain"> | [plausible](plausible/) | Datenschutzfreundliche Web-Analytics |
| <img src="pocket-id/icon.svg" width="24" height="24" style="object-fit:contain"> | [pocket-id](pocket-id/) | Einfacher OpenID Connect Provider mit Passkeys |
| <img src="postgresql/icon.svg" width="24" height="24" style="object-fit:contain"> | [postgresql](postgresql/) | Relationale Datenbank |
| <img src="qdrant/icon.svg" width="24" height="24" style="object-fit:contain"> | [qdrant](qdrant/) | Hochperformante Vektordatenbank für KI-Anwendungen |
| <img src="rallly/icon.svg" width="24" height="24" style="object-fit:contain"> | [rallly](rallly/) | Open-Source Terminplanung und Abstimmungen |
| <img src="reactive-resume/icon.svg" width="24" height="24" style="object-fit:contain"> | [reactive-resume](reactive-resume/) | Open-Source Lebenslauf-Builder |
| <img src="rybbit/icon.svg" width="24" height="24" style="object-fit:contain"> | [rybbit](rybbit/) | Open-Source Web-Analytics Alternative |
| <img src="solidtime/icon.svg" width="24" height="24" style="object-fit:contain"> | [solidtime](solidtime/) | Open-Source Zeiterfassung |
| <img src="solr/icon.svg" width="24" height="24" style="object-fit:contain"> | [solr](solr/) | Enterprise-Suchplattform |
| <img src="umami/icon.svg" width="24" height="24" style="object-fit:contain"> | [umami](umami/) | Datenschutzfreundliche Web-Analytics |
| <img src="uptime-kuma/icon.svg" width="24" height="24" style="object-fit:contain"> | [uptime-kuma](uptime-kuma/) | Uptime-Monitoring für Websites und Services |
| <img src="vaultwarden/icon.svg" width="24" height="24" style="object-fit:contain"> | [vaultwarden](vaultwarden/) | Selbst gehosteter Passwort-Manager |
| <img src="vikunja/icon.svg" width="24" height="24" style="object-fit:contain"> | [vikunja](vikunja/) | Open-Source Task- und Projektmanagement |

## Neues Template anlegen

1. Ordner mit dem Template-Namen erstellen
2. `docker-compose.yml` mit den benötigten Services anlegen
3. `manifest.yaml` mit allen Metadaten und Input-Definitionen erstellen
4. `icon.svg` hinzufügen (Quelle: [dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0)
5. Variablen in der `docker-compose.yml` über `userInputs` und `systemInputs` im Manifest definieren