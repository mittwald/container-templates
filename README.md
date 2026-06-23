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
| <img src="anythingllm/icon.svg" width="24" height="24" style="object-fit:contain"> | [anythingllm](anythingllm/) | All-in-One KI-Desktop- und Server-Anwendung mit RAG |
| <img src="changedetection/icon.svg" width="24" height="24" style="object-fit:contain"> | [changedetection](changedetection/) | Website-Änderungen automatisch erkennen |
| <img src="chroma/icon.svg" width="24" height="24" style="object-fit:contain"> | [chroma](chroma/) | Open-Source Vektordatenbank für KI-Anwendungen |
| <img src="collabora/icon.svg" width="24" height="24" style="object-fit:contain"> | [collabora](collabora/) | Online-Office-Suite für kollaboratives Arbeiten |
| <img src="directus/icon.svg" width="24" height="24" style="object-fit:contain"> | [directus](directus/) | Headless CMS und Datenplattform |
| <img src="docmost/icon.png" width="24" height="24" style="object-fit:contain"> | [docmost](docmost/) | Kollaborative Wiki- und Dokumentationsplattform |
| <img src="euro-office/icon.svg" width="24" height="24" style="object-fit:contain"> | [euro-office](euro-office/) | Europäischer Online-Dokumentenserver |
| <img src="mariadb/icon.svg" width="24" height="24" style="object-fit:contain"> | [mariadb](mariadb/) | Relationale Open-Source Datenbank |
| <img src="n8n/icon.svg" width="24" height="24" style="object-fit:contain"> | [n8n](n8n/) | Automatisierung für deine Geschäftsprozesse |
| <img src="nextcloud-euro-office/icon.svg" width="24" height="24" style="object-fit:contain"> | [nextcloud-euro-office](nextcloud-euro-office/) | Nextcloud mit integriertem Euro-Office |
| <img src="opensearch/icon.svg" width="24" height="24" style="object-fit:contain"> | [opensearch](opensearch/) | Verteilte Such- und Analyse-Engine |
| <img src="openwebui/icon.svg" width="24" height="24" style="object-fit:contain"> | [openwebui](openwebui/) | Selbstgehostete Oberfläche für KI-Modelle |
| <img src="paperless/icon.svg" width="24" height="24" style="object-fit:contain"> | [paperless](paperless/) | Dokumentenmanagement mit OCR |
| <img src="password-pusher/icon.svg" width="24" height="24" style="object-fit:contain"> | [password-pusher](password-pusher/) | Passwörter und Geheimnisse sicher teilen |
| <img src="postgresql/icon.svg" width="24" height="24" style="object-fit:contain"> | [postgresql](postgresql/) | Leistungsstarke relationale Open-Source Datenbank |
| <img src="qdrant/icon.svg" width="24" height="24" style="object-fit:contain"> | [qdrant](qdrant/) | Hochperformante Vektordatenbank für KI-Anwendungen |
| <img src="solr/icon.svg" width="24" height="24" style="object-fit:contain"> | [solr](solr/) | Enterprise-Suchplattform |
| <img src="umami/icon.svg" width="24" height="24" style="object-fit:contain"> | [umami](umami/) | Datenschutzfreundliche Web-Analytics |
| <img src="vaultwarden/icon.svg" width="24" height="24" style="object-fit:contain"> | [vaultwarden](vaultwarden/) | Selbst gehosteter Passwort-Manager |
| <img src="yopass/icon.svg" width="24" height="24" style="object-fit:contain"> | [yopass](yopass/) | Geheimnisse sicher und verschlüsselt teilen |

## Neues Template anlegen

1. Ordner mit dem Template-Namen erstellen
2. `docker-compose.yml` mit den benötigten Services anlegen
3. `manifest.yaml` mit allen Metadaten und Input-Definitionen erstellen
4. `icon.svg` hinzufügen (Quelle: [dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0)
5. Variablen in der `docker-compose.yml` über `userInputs` und `systemInputs` im Manifest definieren
