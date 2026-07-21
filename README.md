# Container Templates

Container-Vorlagen für die mStudio Container-Vorlagen-Funktion.

## Struktur

Jedes Template liegt in einem eigenen Ordner und besteht aus drei Pflichtdateien, optional
ergänzt um Screenshots:

```
<template-name>/
├── docker-compose.yml    # Docker Compose Konfiguration
├── manifest.yaml         # Metadaten, Inputs und Konfiguration
├── icon.svg              # Icon (muss immer icon.svg heißen)
├── background.jpg        # optional: Hintergrundbild (siehe screenshots)
└── screenshot-*.jpg      # optional: Screenshot der Oberfläche (siehe screenshots)
```

### docker-compose.yml

Standard Docker Compose Datei mit den Services, Volumes und Netzwerken des Templates. Umgebungsvariablen werden über `${VARIABLE}` referenziert und durch die im Manifest definierten User- und System-Inputs befüllt.

### manifest.yaml

Beschreibt das Template mit folgenden Feldern. Die maschinenlesbare, per CI validierte Definition (Typen, Pflichtfelder, erlaubte Werte) steht in [`manifest.schema.json`](manifest.schema.json).

| Feld              | Beschreibung                                                                                                     |
|-------------------|------------------------------------------------------------------------------------------------------------------|
| `manifestVersion` | Version der Manifest-Syntax (aktuell `1.0`)                                                                      |
| `name`            | Menschenlesbarer Name des Templates (mehrsprachig)                                                               |
| `version`         | Angezeigte Version (z.B. `"2.x.x"`)                                                                              |
| `tagline`         | Kurzbeschreibung (mehrsprachig)                                                                                  |
| `description`     | Beschreibung (mehrsprachig, Markdown, ~175 Wörter)                                                               |
| `developer`       | Name des Entwicklers/Herstellers                                                                                 |
| `website`         | Projekt-Website                                                                                                  |
| `repository`      | Source-Code Repository                                                                                           |
| `support`         | Support-URL                                                                                                      |
| `license`         | Lizenz der Software, besteht aus `name` und `link`.                                                              |
| `categories`      | Kategorien: `productivity`, `development`, `database`, `ai`, `security`, `monitoring`, `communication`, `media`, `ecommerce`. `database` ist keine offizielle Store-Kategorie, sondern nur intern für Template-Listen im „Datenbanken"-Bereich |
| `screenshots`     | Optionale Katalog-Screenshots: Hintergrundbild, Screenshot und mehrsprachige Bildüberschrift                     |
| `domains`         | Domain-Zuordnung zu Services und Ports; je Eintrag ein `purpose` als Referenz (z.B. in `help`)                   |
| `userInputs`      | Vom Benutzer konfigurierte Werte                                                                                 |
| `systemInputs`    | Automatisch vom System generierte Werte (Passwörter, Tokens)                                                     |
| `type`            | Gibt an, ob das Template als eigenständige Anwendung in einem neuen Stack (`standalone`) oder als Baustein in einen bestehenden Stack (`component`) deployt wird |
| `help`            | Optionale Kontext-Hilfe nach dem Deployment: technische Details (`technicalDetails`) und Hinweise (`alerts`)     |

### screenshots

Optionale Katalog-Screenshots. Jeder Eintrag besteht aus einem dekorativen Hintergrundbild (`bg`), dem darauf platzierten Screenshot der Anwendungsoberfläche (`screenshot`) und einer mehrsprachigen Überschrift (`text`), die **über** dem Screenshot angezeigt wird.

```yaml
screenshots:
  - bg: background.jpg
    screenshot: screenshot-workflow-editor.jpg
    text:
      de: Workflows im visuellen Editor per Drag-and-drop erstellen
      en: Building workflows by drag and drop in the visual editor
```

Beide Bilder liegen als Datei im Template-Ordner; im Manifest steht nur der Dateiname, keine Pfadangabe. Es gelten folgende Regeln, die per CI geprüft werden:

| | Regel |
|---|---|
| Format | `jpg`, `jpeg`, `png` oder `webp` |
| Breite | mindestens 1500 px (beide Bilder) |
| `bg` | Seitenverhältnis **exakt 3:2** (z.B. 3000×2000) |
| `screenshot` | kein festes Seitenverhältnis |

Lokal prüfen:

```bash
pnpm validate
```

### domains

Verknüpft einen `userInput` (Host) mit einem Service und Port für automatisches Domain-Routing. Jeder Eintrag hat ein `purpose`, über das die zugewiesene Domain an anderer Stelle referenziert werden kann (z.B. in `help` via `${domain.<purpose>}`). Bei einer einzelnen Domain ist `purpose` üblicherweise `main`; bei mehreren Domains je Eintrag ein eigener, sprechender Wert.

```yaml
domains:
  - userInput: HOST
    service: n8n
    port: 5678
    purpose: main
```

### userInputs

`userInputs` ist eine Liste von Werten, die der Benutzer bei der Installation eingibt. Jeder Eintrag kann folgende Felder haben:

| Feld | Pflicht | Beschreibung |
|------|---------|--------------|
| `name` | ja | Technischer Schlüssel; in der `docker-compose.yml` als `${name}` referenzierbar |
| `label` | ja | Mehrsprachiger Anzeigename des Feldes (de/en) für die Oberfläche |
| `dataType` | nein | Datentyp: `text`, `number`, `boolean` oder `select` (Standard: `text`) |
| `required` | ja | Ob der Wert zwingend ausgefüllt werden muss |
| `validationSchema` | ja | Validierung als JSON-Schema-String (siehe [json-schema.org](https://json-schema.org/)) |
| `format` | nein | Eingabeformat/Maskierung: `email`, `password`, `url` oder `uri` |
| `dataSource` | nein | Verknüpft den Input mit einer Systemquelle, z.B. `ingress.paths` (Domain) oder `aiHosting.apiKey` |
| `positionMeta` | nein | Platzierung im Installations-Assistenten: `{ step, index, section }` |
| `defaultValue` | nein | Vorbelegter Standardwert |

```yaml
userInputs:
  - name: "HOST"
    label:
      de: Domain
      en: Domain
    dataType: "text"
    required: true
    dataSource: "ingress.paths"
    positionMeta: { step: "common", index: 1 }
    validationSchema: '{ "type": "string", "minLength": 1 }'
  - name: "ADMIN_PASSWORD"
    label:
      de: Admin Passwort
      en: Admin Password
    dataType: "text"
    format: "password"
    required: true
    validationSchema: '{ "type": "string", "minLength": 12 }'
```

### help

Optionale Kontext-Hilfe, die dem Benutzer nach dem Deployment angezeigt wird. Sie besteht aus zwei Bereichen:

- `technicalDetails` — Liste technischer Detailinfos (z.B. Zugangsdaten, Connection-String, Hostname/Port). Jeder Eintrag hat ein mehrsprachiges Label `key` und einen `value`.
- `alerts` — Liste von Hinweisen/Warnungen. Pro Eintrag: `status` (`danger`, `info`, `success` oder `warning`) sowie die mehrsprachigen Texte `heading` und `content`; optional zusätzlich ein Link über `linkText` und `link`.

**Wichtig zu den Platzhaltern:** Die Werte werden auch **nach** der Installation angezeigt. Es dürfen daher nur Platzhalter verwendet werden, die dann noch verfügbar sind. Da Umgebungsvariablen immer an einem einzelnen Service hängen (nicht am Stack), muss der Service-Name Teil des Platzhalters sein:

- `${<service>.env.NAME}` — die Umgebungsvariable `NAME` des Services `<service>` (persistiert).
- `${<service>.hostname}` — der Laufzeit-Hostname des Services `<service>`.
- `${domain.<purpose>}` — der zugewiesene Host der Domain mit diesem `purpose` (siehe `domains`), z.B. `https://${domain.main}`.

`userInputs` selbst (z.B. `${HOST}`, `${ADMIN_PASSWORD}`) sind nach der Installation **nicht** mehr verfügbar und dürfen hier nicht referenziert werden. Wenn ein Eingabewert angezeigt werden soll, muss die Service-Umgebungsvariable referenziert werden, in die er fließt (z.B. `${postgres.env.POSTGRES_PASSWORD}`); die öffentliche Domain wird über `${domain.<purpose>}` referenziert.

```yaml
help:
  technicalDetails:
    - key:
        de: Hostname
        en: Hostname
      value: ${postgres.hostname}
    - key:
        de: Verbindungsstring
        en: Connection string
      value: postgresql://${postgres.env.POSTGRES_USER}:${postgres.env.POSTGRES_PASSWORD}@${postgres.hostname}/${postgres.env.POSTGRES_DB}
  alerts:
    - status: info
      heading:
        de: Admin-Benutzer manuell einrichten
        en: Set up admin user manually
      content:
        de: Der Admin-Benutzer wird nicht automatisch angelegt. Richte ihn nach der Installation beim ersten Aufruf manuell ein.
        en: The admin user is not created automatically. Set it up manually after installation on the first launch.
```

## Apps lokal testen

Ein manifestbasierter Dev-Runner erzeugt lokale Eingabewerte und System-Secrets, rendert eine nur lokal verwendete Compose-Konfiguration und stellt die im Manifest definierten Domains über einen gemeinsamen Caddy-Reverse-Proxy mit HTTPS bereit. Die Originaldateien der Templates bleiben unverändert.

Voraussetzungen sind Docker mit Docker Compose sowie die für die Validierung benötigte Node.js- und pnpm-Version. Eine App wird mit folgendem Befehl gestartet:

```bash
pnpm app n8n up
```

Danach ist sie unter `https://n8n.localhost` erreichbar. Templates mit mehreren Domains erhalten pro `purpose` eine Subdomain, beispielsweise `https://dashboard.shlink.localhost`. Mehrere Templates können gleichzeitig laufen, da nur der gemeinsame Proxy die Host-Ports 80 und 443 belegt.

Neben Caddy läuft ein globales Mailpit für lokale E-Mail-Tests. Die Web-Oberfläche ist unter `https://mail.localhost` erreichbar; Apps im gemeinsamen Dev-Netz erreichen SMTP unter `ct-mail:1025` ohne TLS. Das eigenständige Mailpit-Template bleibt davon getrennt und läuft wie jedes andere Template unter `https://mailpit.localhost`.

Eine optionale `docker-compose.dev.yml` im Template-Ordner wird nach der generierten Compose-Datei als lokaler Override geladen und nicht produktiv verwendet.

Beim ersten Einsatz muss Caddys lokale Entwicklungs-CA einmalig als vertrauenswürdig installiert werden. Unter macOS landet sie ohne Administratorrechte im Keychain des angemeldeten Benutzers. Unter Debian/Ubuntu und Fedora/RHEL wird sie mit `sudo` in den systemweiten CA-Store aufgenommen:

```bash
pnpm app trust
```

Die CA und alle Zertifikate bleiben in einem persistenten Docker-Volume erhalten. App-spezifische Werte werden mit restriktiven Dateirechten unter `.dev/apps/<template>/values.json` gespeichert, damit Passwörter und Encryption Keys über Neustarts hinweg stabil bleiben. `.dev/` wird nicht versioniert.

Weitere Befehle:

```bash
pnpm app n8n logs                 # Logs verfolgen
pnpm app n8n down                 # Container stoppen, Daten behalten
pnpm app n8n reset                # Container und App-Volumes löschen
pnpm app n8n config               # generierte Compose-Datei nur prüfen
pnpm app n8n values               # lokale Eingabewerte anzeigen
pnpm app status                   # laufende Compose-Projekte und URLs
pnpm app validate                 # Basis- und lokale Compose-Konfigurationen aller Templates prüfen
pnpm app proxy down               # Caddy und Mailpit stoppen, CA und Zertifikate behalten
pnpm app untrust                  # lokale CA wieder aus dem Trust Store entfernen
```

`untrust` entfernt die CA unter macOS beziehungsweise Linux wieder aus dem verwendeten Trust Store. Anwendungen mit eigenem Zertifikatsspeicher, insbesondere einzelne Firefox- oder Snap-Installationen, können zusätzlich einen manuellen Import von `.dev/proxy/root.crt` benötigen.

Pflichtwerte werden für die lokale Entwicklung sinnvoll vorbelegt. Abweichende Werte lassen sich beim Start setzen und werden anschließend ebenfalls persistent verwendet:

```bash
pnpm app bugsink up \
  --set ADMIN_EMAIL=me@example.test \
  --set ADMIN_PASSWORD='MyLocalPassword123!'
```

Mit `--pull` werden Images vor dem Start aktualisiert; `--no-wait` überspringt das Warten auf den laufenden beziehungsweise gesunden Containerzustand.

Component-Templates besitzen absichtlich keine öffentliche Domain. Für lokale Verbindungen kann ein Container-Port ausschließlich auf `127.0.0.1` veröffentlicht werden. Bei einem einzelnen Service genügt der Port; ein abweichender Host-Port oder der Service eines Templates mit mehreren Services kann explizit angegeben werden:

```bash
pnpm app postgresql up --publish 5432
pnpm app postgresql up --publish 15432:5432
pnpm app <template> up --publish <service>=15432:5432
```

Vor dem Start prüft der Runner die Docker-Verbindung, die benötigten Host-Ports und doppelt registrierte Domains. Schlägt der Start fehl, zeigt er Containerstatus und die letzten Logs an und stellt die vorherige Caddy-Konfiguration wieder her. `pnpm app status` zeigt nur die vom Runner verwalteten `ct-*`-Projekte.

## Vorhandene Templates

| | Template | Beschreibung |
|---|----------|-------------|
| <img src="anythingllm/icon.svg" width="24" height="24" style="object-fit:contain"> | [anythingllm](anythingllm/) | All-in-One KI-Desktop- und Server-Anwendung mit RAG |
| <img src="bentopdf/icon.svg" width="24" height="24" style="object-fit:contain"> | [bentopdf](bentopdf/) | PDF-Werkzeugkasten direkt im Browser |
| <img src="bugsink/icon.svg" width="24" height="24" style="object-fit:contain"> | [bugsink](bugsink/) | Sentry-kompatibles Error-Tracking |
| <img src="changedetection/icon.svg" width="24" height="24" style="object-fit:contain"> | [changedetection](changedetection/) | Website-Änderungen automatisch erkennen |
| <img src="chroma/icon.svg" width="24" height="24" style="object-fit:contain"> | [chroma](chroma/) | Open-Source Vektordatenbank für KI-Anwendungen |
| <img src="collabora/icon.svg" width="24" height="24" style="object-fit:contain"> | [collabora](collabora/) | Online-Office-Suite für kollaboratives Arbeiten |
| <img src="directus/icon.svg" width="24" height="24" style="object-fit:contain"> | [directus](directus/) | Headless CMS und Datenplattform |
| <img src="docmost/icon.svg" width="24" height="24" style="object-fit:contain"> | [docmost](docmost/) | Kollaborative Wiki- und Dokumentationsplattform |
| <img src="easyappointments/icon.svg" width="24" height="24" style="object-fit:contain"> | [easyappointments](easyappointments/) | Online-Terminplanung für Dienstleistungen |
| <img src="euro-office/icon.svg" width="24" height="24" style="object-fit:contain"> | [euro-office](euro-office/) | Europäischer Online-Dokumentenserver |
| <img src="excalidraw/icon.svg" width="24" height="24" style="object-fit:contain"> | [excalidraw](excalidraw/) | Whiteboard für Skizzen und Diagramme |
| <img src="fider/icon.svg" width="24" height="24" style="object-fit:contain"> | [fider](fider/) | Kundenfeedback sammeln und priorisieren |
| <img src="flowise/icon.svg" width="24" height="24" style="object-fit:contain"> | [flowise](flowise/) | KI-Workflows visuell entwickeln |
| <img src="hoppscotch/icon.svg" width="24" height="24" style="object-fit:contain"> | [hoppscotch](hoppscotch/) | APIs entwickeln und testen |
| <img src="immich/icon.svg" width="24" height="24" style="object-fit:contain"> | [immich](immich/) | Self-hosted Foto- und Videoverwaltung |
| <img src="infisical/icon.svg" width="24" height="24" style="object-fit:contain"> | [infisical](infisical/) | Secrets zentral verwalten |
| <img src="kimai/icon.svg" width="24" height="24" style="object-fit:contain"> | [kimai](kimai/) | Zeiterfassung und Projektcontrolling |
| <img src="kutt/icon.svg" width="24" height="24" style="object-fit:contain"> | [kutt](kutt/) | Kurzlinks unter eigener Domain verwalten |
| <img src="listmonk/icon.svg" width="24" height="24" style="object-fit:contain"> | [listmonk](listmonk/) | Newsletter und Mailinglisten verwalten |
| <img src="mailpit/icon.svg" width="24" height="24" style="object-fit:contain"> | [mailpit](mailpit/) | E-Mail-Testserver für Entwicklung und Staging |
| <img src="mariadb/icon.svg" width="24" height="24" style="object-fit:contain"> | [mariadb](mariadb/) | Relationale Open-Source Datenbank |
| <img src="n8n/icon.svg" width="24" height="24" style="object-fit:contain"> | [n8n](n8n/) | Automatisierung für deine Geschäftsprozesse |
| <img src="nextcloud-euro-office/icon.svg" width="24" height="24" style="object-fit:contain"> | [nextcloud-euro-office](nextcloud-euro-office/) | Nextcloud mit integriertem Euro-Office |
| <img src="opensearch/icon.svg" width="24" height="24" style="object-fit:contain"> | [opensearch](opensearch/) | Verteilte Such- und Analyse-Engine |
| <img src="openwebui/icon.svg" width="24" height="24" style="object-fit:contain"> | [openwebui](openwebui/) | Selbstgehostete Oberfläche für KI-Modelle |
| <img src="paperless/icon.svg" width="24" height="24" style="object-fit:contain"> | [paperless](paperless/) | Dokumentenmanagement mit OCR |
| <img src="password-pusher/icon.svg" width="24" height="24" style="object-fit:contain"> | [password-pusher](password-pusher/) | Passwörter und Geheimnisse sicher teilen |
| <img src="pocket-id/icon.svg" width="24" height="24" style="object-fit:contain"> | [pocket-id](pocket-id/) | OIDC-Provider mit Passkeys |
| <img src="postgresql/icon.svg" width="24" height="24" style="object-fit:contain"> | [postgresql](postgresql/) | Leistungsstarke relationale Open-Source Datenbank |
| <img src="qdrant/icon.svg" width="24" height="24" style="object-fit:contain"> | [qdrant](qdrant/) | Hochperformante Vektordatenbank für KI-Anwendungen |
| <img src="shlink/icon.svg" width="24" height="24" style="object-fit:contain"> | [shlink](shlink/) | Kurzlinks erstellen und analysieren |
| <img src="solr/icon.svg" width="24" height="24" style="object-fit:contain"> | [solr](solr/) | Enterprise-Suchplattform |
| <img src="stirling-pdf/icon.svg" width="24" height="24" style="object-fit:contain"> | [stirling-pdf](stirling-pdf/) | Umfangreicher PDF-Werkzeugkasten |
| <img src="umami/icon.svg" width="24" height="24" style="object-fit:contain"> | [umami](umami/) | Datenschutzfreundliche Web-Analytics |
| <img src="uptime-kuma/icon.svg" width="24" height="24" style="object-fit:contain"> | [uptime-kuma](uptime-kuma/) | Monitoring und Statusseiten |
| <img src="vaultwarden/icon.svg" width="24" height="24" style="object-fit:contain"> | [vaultwarden](vaultwarden/) | Selbst gehosteter Passwort-Manager |
| <img src="weblate/icon.svg" width="24" height="24" style="object-fit:contain"> | [weblate](weblate/) | Software gemeinsam übersetzen |
| <img src="yopass/icon.svg" width="24" height="24" style="object-fit:contain"> | [yopass](yopass/) | Geheimnisse sicher und verschlüsselt teilen |

## Neues Template anlegen

1. Ordner mit dem Template-Namen erstellen
2. `docker-compose.yml` mit den benötigten Services anlegen
3. `manifest.yaml` erstellen — Felder und Beispiele in den Abschnitten oben, die verbindliche Struktur in [`manifest.schema.json`](manifest.schema.json)
4. `icon.svg` hinzufügen (Quelle: [dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0)
5. Variablen in der `docker-compose.yml` über `userInputs` und `systemInputs` im Manifest definieren
6. Optional Screenshots ergänzen (siehe Abschnitt [screenshots](#screenshots))
7. Konventionen in [`AGENTS.md`](AGENTS.md) beachten (sichere Defaults, Zeitzone, Backups, `help`-Platzhalter-Regeln)

Vor dem Commit werden Pflichtdateien, Manifest und Screenshots per CI geprüft. Lokal:

Voraussetzung sind Node.js 24 und die in `package.json` festgelegte pnpm-Version.

```bash
pnpm install
pnpm test
```
