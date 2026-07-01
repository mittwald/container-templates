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

Beschreibt das Template mit folgenden Feldern. Die maschinenlesbare, per CI validierte Definition (Typen, Pflichtfelder, erlaubte Werte) steht in [`manifest.schema.json`](manifest.schema.json).

| Feld              | Beschreibung                                                                                                     |
|-------------------|------------------------------------------------------------------------------------------------------------------|
| `manifestVersion` | Version der Manifest-Syntax (aktuell `1.0`)                                                                      |
| `name`            | Menschenlesbarer Name des Templates (mehrsprachig)                                                               |
| `version`         | Angezeigte Version (z.B. `"2.x.x"`)                                                                              |
| `tagline`         | Kurzbeschreibung (mehrsprachig)                                                                                  |
| `description`     | Ausführliche Beschreibung (mehrsprachig)                                                                         |
| `developer`       | Name des Entwicklers/Herstellers                                                                                 |
| `website`         | Projekt-Website                                                                                                  |
| `repository`      | Source-Code Repository                                                                                           |
| `support`         | Support-URL                                                                                                      |
| `license`         | Lizenz der Software, besteht aus `name` und `link`.                                                              |
| `icon`            | Pfad zum Icon (SVG bevorzugt, PNG als Fallback)                                                                  |
| `categories`      | Kategorien: `productivity`, `development`, `ai`, `security`, `monitoring`, `communication`, `media`, `ecommerce` |
| `domains`         | Domain-Zuordnung zu Services und Ports; je Eintrag ein `purpose` als Referenz (z.B. in `help`)                   |
| `userInputs`      | Vom Benutzer konfigurierte Werte                                                                                 |
| `systemInputs`    | Automatisch vom System generierte Werte (Passwörter, Tokens)                                                     |
| `type`            | Gibt an, ob das Template als eigenständige Anwendung in einem neuen Stack (`standalone`) oder als Baustein in einen bestehenden Stack (`component`) deployt wird |
| `help`            | Optionale Kontext-Hilfe nach dem Deployment: technische Details (`technicalDetails`) und Hinweise (`alerts`)     |

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
    dataType: "text"
    required: true
    dataSource: "ingress.paths"
    positionMeta: { step: "common", index: 1 }
    validationSchema: '{ "type": "string", "minLength": 1 }'
  - name: "ADMIN_PASSWORD"
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
3. `manifest.yaml` erstellen — Felder und Beispiele in den Abschnitten oben, die verbindliche Struktur in [`manifest.schema.json`](manifest.schema.json)
4. `icon.svg` hinzufügen (Quelle: [dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0)
5. Variablen in der `docker-compose.yml` über `userInputs` und `systemInputs` im Manifest definieren
6. Konventionen in [`AGENTS.md`](AGENTS.md) beachten (sichere Defaults, Zeitzone, Backups, `help`-Platzhalter-Regeln)

Vor dem Commit wird das Manifest per CI gegen das Schema validiert. Lokal:

```bash
pipx run check-jsonschema --schemafile manifest.schema.json <ordner>/manifest.yaml
```
