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
| `categories`      | Kategorien: `productivity`, `development`, `database`, `ai`, `security`, `monitoring`, `communication`, `media`. `database` ist keine offizielle Store-Kategorie, sondern nur intern für Template-Listen im „Datenbanken"-Bereich |
| `screenshots`     | Optionale Katalog-Screenshots: Hintergrundbild, Screenshot und mehrsprachige Bildüberschrift                     |
| `domains`         | Domain-Zuordnung zu Services und Ports; Map mit dem `purpose` als Schlüssel und Referenz (z.B. in `help`)        |
| `userInputs`      | Vom Benutzer konfigurierte Werte                                                                                 |
| `systemInputs`    | Automatisch vom System generierte Werte (Passwörter, Tokens)                                                     |
| `deliveryBoxes`   | Postausgänge für den Mailversand; die Zugangsdaten legt das System an                                            |
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

Für die Bildüberschrift `text` gilt zusätzlich eine Längenvorgabe, die der Validator **nicht** erzwingt: höchstens **70 Zeichen je Sprache**, ein Satz ohne Punkt am Ende, kürzer ist besser.

Das Hintergrundbild wird nicht von Hand gebaut, sondern aus den Farben des Templates erzeugt:

```bash
pnpm gen:background bugsink              # Farben aus dem ersten Screenshot
pnpm gen:background bugsink --from icon  # Farben aus icon.svg
pnpm gen:background --all --dry-run      # nur die Paletten anzeigen
```

Das Ergebnis ist ein weicher Verlauf als `<template>/background.jpg` mit 3000×2000 px. Der Verlauf ist deterministisch aus dem Templatenamen abgeleitet, dasselbe Template erhält also immer dieselbe Bühne. Ein vorhandenes `background.jpg` wird nur mit `--force` überschrieben.

Lokal prüfen:

```bash
pnpm validate
```

### domains

Verknüpft einen `userInput` (Host) mit einem Service und Port für automatisches Domain-Routing. `domains` ist eine Map, deren Schlüssel der `purpose` ist — darüber wird die zugewiesene Domain an anderer Stelle referenziert (z.B. in `help` via `${domain.<purpose>}`). Bei einer einzelnen Domain ist der Schlüssel üblicherweise `main`; bei mehreren Domains je Eintrag ein eigener, sprechender Wert.

```yaml
domains:
  main:
    userInput: HOST
    service: n8n
    port: 5678
```

```yaml
domains:
  nextcloud:
    userInput: HOST
    service: nextcloud-euro-office
    port: 80
  eurooffice:
    userInput: EUROOFFICE_HOST
    service: eurooffice
    port: 80
```

### userInputs

`userInputs` ist eine Liste von Werten, die der Benutzer bei der Installation eingibt. Jeder Eintrag kann folgende Felder haben:

| Feld | Pflicht | Beschreibung |
|------|---------|--------------|
| `name` | ja | Technischer Schlüssel; in der `docker-compose.yml` als `${name}` referenzierbar |
| `label` | ja | Mehrsprachiger Anzeigename des Feldes (de/en) für die Oberfläche |
| `required` | ja | Ob der Wert zwingend ausgefüllt werden muss |
| `validationSchema` | ja | Validierung als JSON-Schema-String (siehe [json-schema.org](https://json-schema.org/)); enthält nur Validierung, keine Darstellung |
| `dataType` | nein | Art des Eingabeelements: `text` (Standard), `boolean`, `consent`, `select`; siehe [Darstellung im Installations-Assistenten](#darstellung-im-installations-assistenten) |
| `format` | nein | Eingabeart eines Textfeldes: `email`, `password`, `url`, `textarea` |
| `description` | nein | Mehrsprachiger Hinweis unter dem Feld (de/en) |
| `errorMessage` | nein | Mehrsprachige Meldung, wenn das `pattern` nicht passt (de/en); Pflicht zu jedem `pattern` |
| `options` | nein | Auswahlmöglichkeiten bei `dataType: select`, je `{ value, label }` |
| `dataSource` | nein | Verknüpft den Input mit einer Systemquelle, z.B. `ingress.paths` (Domain) oder `aiHosting.apiKey` |
| `positionMeta` | nein | Platzierung im Installations-Assistenten: `{ step, index }` (siehe unten) |
| `defaultValue` | nein | Vorbelegter Standardwert; kann Platzhalter enthalten (siehe unten) |

```yaml
userInputs:
  - name: "HOST"
    label:
      de: Domain
      en: Domain
    required: true
    dataSource: "ingress.paths"
    positionMeta: { step: "domain", index: 1 }
    validationSchema: '{ "type": "string", "minLength": 1 }'
  - name: "ADMIN_PASSWORD"
    label:
      de: Admin Passwort
      en: Admin Password
    required: true
    positionMeta: { step: "adminUser", index: 1 }
    format: password
    validationSchema: '{ "type": "string", "minLength": 12 }'
```

#### Darstellung im Installations-Assistenten

Welches Eingabeelement erscheint, legen die Felder `dataType` und `format` fest; `description`, `errorMessage` und `options` liefern die Texte. Das `validationSchema` enthält nur die Validierung: Das Backend prüft die Eingaben dagegen, und zwar immer als String – `"type"` ist daher stets `"string"`. Eigene Schlüsselwörter wie `x-…` gehören nicht hinein.

| Eingabe | Manifest | `validationSchema` | Darstellung |
|---|---|---|---|
| Text | – | beliebig | Textfeld |
| Passwort | `format: password` | z. B. `"minLength": 12` | Passwortfeld mit Generator |
| E-Mail | `format: email` | `"format": "email"` | E-Mail-Feld; das Backend prüft die Adresse |
| URL | `format: url` | beliebig | URL-Feld |
| Mehrzeiliger Text | `format: textarea` | beliebig | Textbereich |
| Boolean | `dataType: boolean` | `"enum": ["true", "false"]` | Checkbox; der Wert ist der String `true` oder `false` |
| Zustimmung | `dataType: consent` | `"enum": ["true"]` | Checkbox, die gesetzt sein muss (z. B. Lizenzbedingungen); der Wert ist immer `true` |
| Auswahl | `dataType: select` mit `options` | `"enum"` mit denselben Werten | Ab drei Werten Dropdown, sonst Radio-Buttons |

`format` gibt es nur bei Textfeldern. Ein Boolean bleibt `"type": "string"`, weil alle Werte als String in die `docker-compose.yml` gelangen. Ohne `defaultValue` ist die Checkbox nicht gesetzt. Das `enum` bleibt bei Boolean, Zustimmung und Auswahl im Schema, damit das Backend nur die erlaubten Werte annimmt; der Container-Service lehnt ein Manifest ab, dessen `enum` nicht zum `dataType` bzw. zu den `options` passt.

Für jede Eingabe gibt es zwei Texte `{ de: …, en: … }`:

- `description` — Hinweis unter dem Feld, etwa woher ein Wert stammt. Erklärungen gehören hierhin statt in Klammern ins Label.
- `errorMessage` — Meldung, wenn der Wert nicht zum `pattern` passt. Ohne sie zeigt das mStudio den regulären Ausdruck an; `validate.mjs` verlangt sie deshalb zu jedem `pattern`.

```yaml
    errorMessage: { de: "Erwartet wird eine Zeitzone wie Europe/Berlin", en: "Expected a time zone such as Europe/Berlin" }
    validationSchema: '{ "type": "string", "pattern": "^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$" }'
```

Bei einer Auswahl beschriftet `options` jeden Wert zweisprachig:

```yaml
  - name: "DEFAULT_NOTE_TTL_SECONDS"
    label:
      de: Standard-Ablaufzeit neuer Notizen
      en: Default expiry of new notes
    positionMeta: { step: "common", index: 1 }
    required: true
    defaultValue: "86400"
    dataType: select
    options:
      - { value: "3600", label: { de: "1 Stunde", en: "1 hour" } }
      - { value: "86400", label: { de: "1 Tag", en: "1 day" } }
    validationSchema: '{ "type": "string", "enum": ["3600", "86400"] }'
  - name: "ALLOW_NO_EXPIRATION"
    label:
      de: Notizen ohne Ablaufzeit erlauben
      en: Allow notes without expiry
    positionMeta: { step: "common", index: 2 }
    required: true
    defaultValue: "false"
    dataType: boolean
    validationSchema: '{ "type": "string", "enum": ["true", "false"] }'
```

#### Steps in `positionMeta`

`step` ordnet den Input einem Schritt des Installations-Assistenten zu. Die Auswahl ist **abschließend** — für jeden Schritt pflegt das Frontend eine Übersetzung, neue Werte müssen dort zuerst angelegt werden:

| Step | Inhalt |
|---|---|
| `domain` | Domains des Stacks — alle Inputs mit `dataSource: "ingress.paths"` |
| `adminUser` | Zugangsdaten des Administrators: Benutzername, E-Mail-Adresse, Passwort, Token |
| `ai` | Anbindung an das mittwald AI Hosting: Endpunkt und API-Key |
| `license` | Zustimmung zu Lizenzbedingungen, AGB oder Datenschutzerklärung des Herstellers; steht immer am Ende des Formulars |
| `common` | Alles Übrige, also templatespezifische Einstellungen |

`index` bestimmt die Reihenfolge **innerhalb** eines Steps und beginnt je Step bei 1.

#### Platzhalter in `defaultValue`

`defaultValue` kann Platzhalter enthalten, die beim Öffnen des Installations-Assistenten mit Werten des angemeldeten Benutzers bzw. des Projekts vorbelegt werden. Der Benutzer kann den vorbelegten Wert anschließend überschreiben.

| Platzhalter | Wert |
|---|---|
| `${user.email}` | E-Mail-Adresse des angemeldeten Benutzers |
| `${user.username}` | Benutzername |
| `${user.firstName}` | Vorname |
| `${user.lastName}` | Nachname |
| `${user.fullName}` | Vor- und Nachname |
| `${aiHosting.llmEndpoint}` | Endpunkt-URL des mittwald AI Hostings |

```yaml
userInputs:
  - name: "ADMIN_EMAIL"
    label:
      de: Admin E-Mail-Adresse
      en: Admin email address
    positionMeta: { step: "adminUser", index: 1 }
    defaultValue: "${user.email}"
    required: true
    format: email
    validationSchema: '{ "type": "string", "format": "email" }'
```

Sie werden nur zur Installationszeit aufgelöst und stehen — anders als die Platzhalter in `help` — danach nicht mehr zur Verfügung.

### systemInputs

`systemInputs` sind Werte, die das System bei der Installation selbst erzeugt — Passwörter, Schlüssel und Tokens. Im Installations-Assistenten tauchen sie nicht auf.

| Feld | Pflicht | Beschreibung |
|------|---------|--------------|
| `name` | ja | Technischer Schlüssel; in der `docker-compose.yml` als `${name}` referenzierbar |
| `schema.kind` | ja | Art des Regelsatzes; für generierte Werte immer `1` |
| `schema.schema` | ja | Regelliste, aus der der Wert erzeugt **und** gegen die er validiert wird |

Erzeugt werden die Werte vom Password-Service auf Basis von [`@mittwald/password-tools-js`](https://github.com/mittwald/password-tools-js). Es gibt keine getrennte Konfiguration für Generierung und Validierung — dieselbe Regelliste tut beides.

#### Regeltypen

| `ruleType` | Felder | Bedeutung |
|---|---|---|
| `length` | `min`, `max` | Zeichenzahl. `min` bestimmt zugleich, wie lang der erzeugte Wert wird |
| `charPool` | `charPools`, `min`, `max` | Zählt Zeichen aus den genannten Pools: `lowercase`, `uppercase`, `numbers`, `special`, `nonAscii` |
| `char` | `chars`, `min`, `max` | Dasselbe für eine explizit aufgezählte Zeichenmenge |
| `regex` | `pattern`, `min`, `max` | Zählt die Treffer des Musters |

`identifier` ist überall optional und dient nur als Label.

#### `min` fordert, `max: 0` verbietet

Eine Regel mit `min` ist eine **Untergrenze, keine Einschränkung**: `charPools: [numbers]` mit `min: 1` verlangt mindestens eine Ziffer, sagt über den Rest des Werts aber nichts. Ausgeschlossen wird ein Pool nur mit `max: 0` — und nur das nimmt ihn auch aus dem Zeichenvorrat der Generierung heraus.

Fehlen `min` **und** `max`, gilt `min: 1`. Eine Regel ohne beides *erzwingt* das Zeichen also, statt es zu verbieten.

#### Passwörter: alphanumerisch

Datenbank-Passwörter landen oft in einer DSN wie `postgres://user:${POSTGRES_PASSWORD}@postgres:5432/db`. Zeichen wie `@`, `#` oder `%` zerlegen diese URL. Deshalb bekommt **jedes** Passwort den Sonderzeichen-Ausschluss:

```yaml
systemInputs:
  - name: "POSTGRES_PASSWORD"
    schema:
      kind: 1
      schema:
        - ruleType: length
          min: 24
        - identifier: numbers
          ruleType: charPool
          charPools:
            - numbers
          min: 1
        - ruleType: regex
          pattern: "[A-Z]"
          min: 1
        - ruleType: regex
          pattern: "[a-z]"
          min: 1
        - identifier: noSpecial
          ruleType: charPool
          charPools:
            - special
            - nonAscii
          max: 0
```

#### Hex-Werte

Verlangt eine Anwendung einen Hex-String — erkennbar daran, dass die Upstream-Doku `openssl rand -hex N` nennt —, genügen zwei Ausschlüsse: ohne `uppercase` bleibt `a-z0-9`, ohne `g-z` bleibt `[0-9a-f]`. Die Länge wird auf `min` = `max` = 2 × N fixiert:

```yaml
systemInputs:
  - name: "CREDS_KEY" # openssl rand -hex 32
    schema:
      kind: 1
      schema:
        - ruleType: length
          min: 64
          max: 64
        - identifier: hexOnly
          ruleType: charPool
          charPools:
            - uppercase
            - special
            - nonAscii
          max: 0
        - identifier: hexOnlyLetters
          ruleType: char
          chars: "ghijklmnopqrstuvwxyz"
          max: 0
```

#### Fallstricke

- **`char` mit `min` ≥ 1 zerstört die Generierung.** Geforderte Einzelzeichen überschreiben intern Muster *und* Länge des erzeugten Werts. Er wird dann so lang wie die `chars`-Angabe, scheitert an der `length`-Regel, und die Generierung läuft in den Timeout. `char` ist nur mit `max: 0` gefahrlos.
- **Base64 lässt sich nicht abbilden.** Pools können nur vollständig verboten werden; einzelne Sonderzeichen wie `+` und `/` gezielt zu erlauben, geht nicht. Wo die Doku `openssl rand -base64 N` empfiehlt, ist ein alphanumerischer Wert gleicher Länge der richtige Ersatz.
- **Die Länge folgt der Doku, nicht dem Minimum.** `openssl rand -base64 32` ergibt 44 Zeichen, `openssl rand -hex 32` ergibt 64. Diese Zahl gehört in `length`, auch wenn die Anwendung nominell weniger verlangt.

### deliveryBoxes

Versendet ein Template Mails, deklariert es dafür einen Postausgang statt SMTP-Zugangsdaten abzufragen. Das System legt den Postausgang beim Deployment an und stellt die Zugangsdaten als Umgebungsvariablen bereit:

```yaml
deliveryBoxes:
  - purpose: main
```

Der `purpose` bestimmt den Namen der Variablen — aus `main` wird `${MW_DELIVERYBOX_MAIN_USERNAME}` und `${MW_DELIVERYBOX_MAIN_PASSWORD}`. Der Mailserver ist fest `mail.agenturserver.de` auf Port `587` mit STARTTLS:

```yaml
services:
  kimai:
    environment:
      - MAILER_URL=smtp://${MW_DELIVERYBOX_MAIN_USERNAME}:${MW_DELIVERYBOX_MAIN_PASSWORD}@mail.agenturserver.de?encryption=tls
```

Die Absenderadresse bleibt ein `userInput` (`SMTP_FROM`), weil sie eine inhaltliche Entscheidung ist und nicht zu den Zugangsdaten gehört.

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

Danach ist sie unter `https://n8n.localhost` erreichbar. Templates mit mehreren Domains erhalten pro `purpose` eine Subdomain, beispielsweise `https://eurooffice.nextcloud-euro-office.localhost`. Mehrere Templates können gleichzeitig laufen, da nur der gemeinsame Proxy die Host-Ports 80 und 443 belegt.

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

<!-- templates:start -->
<!-- AUTO-GENERATED from each template's manifest (tagline.de) by gen-readme.mjs. Do NOT edit by hand — it is regenerated automatically when changes are merged to main. -->
| | Template | Beschreibung |
|---|----------|-------------|
| <img src="anythingllm/icon.svg" width="24" height="24" style="object-fit:contain"> | [anythingllm](anythingllm/) | All-in-One KI-Desktop- und Server-Anwendung mit RAG |
| <img src="apprise/icon.svg" width="24" height="24" style="object-fit:contain"> | [apprise](apprise/) | Benachrichtigungen über eine API verteilen |
| <img src="bentopdf/icon.svg" width="24" height="24" style="object-fit:contain"> | [bentopdf](bentopdf/) | PDF-Werkzeugkasten direkt im Browser |
| <img src="bitwarden/icon.svg" width="24" height="24" style="object-fit:contain"> | [bitwarden](bitwarden/) | Offizieller Bitwarden-Server zum Selbsthosten |
| <img src="bookstack/icon.svg" width="24" height="24" style="object-fit:contain"> | [bookstack](bookstack/) | Wiki und Dokumentation in Regalen, Büchern und Seiten |
| <img src="bugsink/icon.svg" width="24" height="24" style="object-fit:contain"> | [bugsink](bugsink/) | Sentry-kompatibles Error-Tracking |
| <img src="changedetection/icon.svg" width="24" height="24" style="object-fit:contain"> | [changedetection](changedetection/) | Website-Änderungen automatisch erkennen |
| <img src="chatwoot/icon.svg" width="24" height="24" style="object-fit:contain"> | [chatwoot](chatwoot/) | Kundensupport und Live-Chat |
| <img src="checkmk/icon.svg" width="24" height="24" style="object-fit:contain"> | [checkmk](checkmk/) | IT-Monitoring für Server, Dienste und Anwendungen |
| <img src="chroma/icon.svg" width="24" height="24" style="object-fit:contain"> | [chroma](chroma/) | Open-Source Vektordatenbank für KI-Anwendungen |
| <img src="clickhouse/icon.svg" width="24" height="24" style="object-fit:contain"> | [clickhouse](clickhouse/) | Spaltenorientierte Datenbank für schnelle Analysen großer Datenmengen |
| <img src="collabora/icon.svg" width="24" height="24" style="object-fit:contain"> | [collabora](collabora/) | Online-Office-Suite für kollaboratives Arbeiten |
| <img src="databasus/icon.svg" width="24" height="24" style="object-fit:contain"> | [databasus](databasus/) | Datenbank-Backups automatisieren |
| <img src="directus/icon.svg" width="24" height="24" style="object-fit:contain"> | [directus](directus/) | Headless CMS und Datenplattform |
| <img src="docmost/icon.svg" width="24" height="24" style="object-fit:contain"> | [docmost](docmost/) | Kollaborative Wiki- und Dokumentationsplattform |
| <img src="easyappointments/icon.svg" width="24" height="24" style="object-fit:contain"> | [easyappointments](easyappointments/) | Termine online koordinieren |
| <img src="enclosed/icon.svg" width="24" height="24" style="object-fit:contain"> | [enclosed](enclosed/) | Notizen und Dateien Ende-zu-Ende-verschlüsselt teilen |
| <img src="euro-office/icon.svg" width="24" height="24" style="object-fit:contain"> | [euro-office](euro-office/) | Dokumente gemeinsam im Browser bearbeiten |
| <img src="excalidraw/icon.svg" width="24" height="24" style="object-fit:contain"> | [excalidraw](excalidraw/) | Whiteboard für Skizzen und Diagramme |
| <img src="fider/icon.svg" width="24" height="24" style="object-fit:contain"> | [fider](fider/) | Kundenfeedback sammeln und priorisieren |
| <img src="ghost/icon.svg" width="24" height="24" style="object-fit:contain"> | [ghost](ghost/) | Publishing-Plattform für Blogs, Magazine und Newsletter |
| <img src="glitchtip/icon.svg" width="24" height="24" style="object-fit:contain"> | [glitchtip](glitchtip/) | Sentry-kompatibles Error-Tracking mit Uptime-Monitoring |
| <img src="gotenberg/icon.svg" width="24" height="24" style="object-fit:contain"> | [gotenberg](gotenberg/) | Dokumente per API in PDF umwandeln |
| <img src="grafana/icon.svg" width="24" height="24" style="object-fit:contain"> | [grafana](grafana/) | Dashboards und Alerting für Metriken, Logs und Datenbanken |
| <img src="healthchecks/icon.svg" width="24" height="24" style="object-fit:contain"> | [healthchecks](healthchecks/) | Cronjobs und geplante Aufgaben überwachen |
| <img src="hermes-agent/icon.svg" width="24" height="24" style="object-fit:contain"> | [hermes-agent](hermes-agent/) | Selbstgehosteter KI-Agent mit dauerhaftem Gedächtnis |
| <img src="immich/icon.svg" width="24" height="24" style="object-fit:contain"> | [immich](immich/) | Foto- und Videoverwaltung |
| <img src="infisical/icon.svg" width="24" height="24" style="object-fit:contain"> | [infisical](infisical/) | Secrets zentral verwalten |
| <img src="invoiceninja/icon.svg" width="24" height="24" style="object-fit:contain"> | [invoiceninja](invoiceninja/) | Rechnungen, Angebote und Zeiterfassung inklusive E-Rechnung |
| <img src="kaneo/icon.svg" width="24" height="24" style="object-fit:contain"> | [kaneo](kaneo/) | Projektmanagement mit Board, Backlog und Zeiterfassung |
| <img src="karakeep/icon.svg" width="24" height="24" style="object-fit:contain"> | [karakeep](karakeep/) | Lesezeichen und Notizen sammeln |
| <img src="kimai/icon.svg" width="24" height="24" style="object-fit:contain"> | [kimai](kimai/) | Zeiterfassung und Projektcontrolling |
| <img src="kirby/icon.svg" width="24" height="24" style="object-fit:contain"> | [kirby](kirby/) | Dateibasiertes CMS mit anpassbarem Panel für individuelle Websites |
| <img src="kutt/icon.svg" width="24" height="24" style="object-fit:contain"> | [kutt](kutt/) | Kurzlinks unter eigener Domain verwalten |
| <img src="librechat/icon.svg" width="24" height="24" style="object-fit:contain"> | [librechat](librechat/) | Selbstgehostete Chat-Oberfläche für KI-Modelle |
| <img src="linkwarden/icon.svg" width="24" height="24" style="object-fit:contain"> | [linkwarden](linkwarden/) | Lesezeichen sammeln und archivieren |
| <img src="listmonk/icon.svg" width="24" height="24" style="object-fit:contain"> | [listmonk](listmonk/) | Newsletter und Mailinglisten verwalten |
| <img src="mailpit/icon.svg" width="24" height="24" style="object-fit:contain"> | [mailpit](mailpit/) | E-Mail-Testserver für Entwicklung und Staging |
| <img src="mariadb/icon.svg" width="24" height="24" style="object-fit:contain"> | [mariadb](mariadb/) | Relationale Open-Source Datenbank |
| <img src="mautic/icon.svg" width="24" height="24" style="object-fit:contain"> | [mautic](mautic/) | Marketing-Automatisierung mit Kampagnen, Segmenten und E-Mails |
| <img src="meilisearch/icon.svg" width="24" height="24" style="object-fit:contain"> | [meilisearch](meilisearch/) | Schnelle Volltextsuche für Anwendungen |
| <img src="memos/icon.svg" width="24" height="24" style="object-fit:contain"> | [memos](memos/) | Notizen und Gedanken schnell festhalten |
| <img src="n8n/icon.svg" width="24" height="24" style="object-fit:contain"> | [n8n](n8n/) | Automatisierung für deine Geschäftsprozesse |
| <img src="neofire-core/icon.svg" width="24" height="24" style="object-fit:contain"> | [neofire-core](neofire-core/) | Shopsystem mit Kasse, Terminbuchung und Layout-Editor |
| <img src="nextcloud-euro-office/icon.svg" width="24" height="24" style="object-fit:contain"> | [nextcloud-euro-office](nextcloud-euro-office/) | Cloud-Speicher und Zusammenarbeit mit Online-Office |
| <img src="nocodb/icon.svg" width="24" height="24" style="object-fit:contain"> | [nocodb](nocodb/) | No-Code-Datenbank mit Tabellen-, Kanban- und Formularansichten |
| <img src="odoo/icon.svg" width="24" height="24" style="object-fit:contain"> | [odoo](odoo/) | Modulare Unternehmenssoftware für CRM, Verkauf, Projekte und mehr |
| <img src="openclaw/icon.svg" width="24" height="24" style="object-fit:contain"> | [openclaw](openclaw/) | Selbstgehosteter KI-Agent mit Automatisierungen und Messenger-Anbindung |
| <img src="openproject/icon.svg" width="24" height="24" style="object-fit:contain"> | [openproject](openproject/) | Projektmanagement und Teamarbeit |
| <img src="opensearch/icon.svg" width="24" height="24" style="object-fit:contain"> | [opensearch](opensearch/) | Verteilte Such- und Analyse-Engine |
| <img src="openseo/icon.svg" width="24" height="24" style="object-fit:contain"> | [openseo](openseo/) | SEO-Analysen, Rankings und Site-Audits |
| <img src="openwebui/icon.svg" width="24" height="24" style="object-fit:contain"> | [openwebui](openwebui/) | Selbstgehostete Oberfläche für KI-Modelle |
| <img src="outline/icon.svg" width="24" height="24" style="object-fit:contain"> | [outline](outline/) | Wissensdatenbank für Teams mit Echtzeit-Editor und Volltextsuche |
| <img src="paperclip/icon.svg" width="24" height="24" style="object-fit:contain"> | [paperclip](paperclip/) | Steuerzentrale für Teams aus KI-Agenten |
| <img src="paperless/icon.svg" width="24" height="24" style="object-fit:contain"> | [paperless](paperless/) | Dokumentenmanagement mit OCR |
| <img src="papra/icon.svg" width="24" height="24" style="object-fit:contain"> | [papra](papra/) | Dokumente archivieren und verwalten |
| <img src="password-pusher/icon.svg" width="24" height="24" style="object-fit:contain"> | [password-pusher](password-pusher/) | Passwörter und Geheimnisse sicher teilen |
| <img src="pgvector/icon.svg" width="24" height="24" style="object-fit:contain"> | [pgvector](pgvector/) | PostgreSQL mit Vektorsuche für KI |
| <img src="pocket-id/icon.svg" width="24" height="24" style="object-fit:contain"> | [pocket-id](pocket-id/) | OIDC-Provider mit Passkeys |
| <img src="postgresql/icon.svg" width="24" height="24" style="object-fit:contain"> | [postgresql](postgresql/) | Leistungsstarke relationale Open-Source Datenbank |
| <img src="qdrant/icon.svg" width="24" height="24" style="object-fit:contain"> | [qdrant](qdrant/) | Hochperformante Vektordatenbank für KI-Anwendungen |
| <img src="rallly/icon.svg" width="24" height="24" style="object-fit:contain"> | [rallly](rallly/) | Terminabstimmung ohne Konto für Teilnehmende |
| <img src="searxng/icon.svg" width="24" height="24" style="object-fit:contain"> | [searxng](searxng/) | Metasuchmaschine für die private Websuche |
| <img src="silo/icon.svg" width="24" height="24" style="object-fit:contain"> | [silo](silo/) | S3-kompatibler Objektspeicher (MinIO-Fork) |
| <img src="solidtime/icon.svg" width="24" height="24" style="object-fit:contain"> | [solidtime](solidtime/) | Moderne Zeiterfassung für Teams |
| <img src="solr/icon.svg" width="24" height="24" style="object-fit:contain"> | [solr](solr/) | Enterprise-Suchplattform |
| <img src="stirling-pdf/icon.svg" width="24" height="24" style="object-fit:contain"> | [stirling-pdf](stirling-pdf/) | Umfangreicher PDF-Werkzeugkasten |
| <img src="tideways/icon.svg" width="24" height="24" style="object-fit:contain"> | [tideways](tideways/) | Profiling-Daemon für PHP-Anwendungen |
| <img src="typemill/icon.svg" width="24" height="24" style="object-fit:contain"> | [typemill](typemill/) | Flat-File-CMS für Manuals, Nutzerhandbücher und Dokumentationen. |
| <img src="umami/icon.svg" width="24" height="24" style="object-fit:contain"> | [umami](umami/) | Datenschutzfreundliche Web-Analytics |
| <img src="uptime-kuma/icon.svg" width="24" height="24" style="object-fit:contain"> | [uptime-kuma](uptime-kuma/) | Monitoring und Statusseiten |
| <img src="valkey/icon.svg" width="24" height="24" style="object-fit:contain"> | [valkey](valkey/) | Redis-kompatibler In-Memory-Datenspeicher für Caches, Queues und Sessions |
| <img src="vaults3/icon.svg" width="24" height="24" style="object-fit:contain"> | [vaults3](vaults3/) | Leichtgewichtiger S3-Objektspeicher mit Dashboard |
| <img src="vaultwarden/icon.svg" width="24" height="24" style="object-fit:contain"> | [vaultwarden](vaultwarden/) | Selbst gehosteter Passwort-Manager |
| <img src="vikunja/icon.svg" width="24" height="24" style="object-fit:contain"> | [vikunja](vikunja/) | Aufgaben und Projekte selbst verwalten |
| <img src="weaviate/icon.svg" width="24" height="24" style="object-fit:contain"> | [weaviate](weaviate/) | Vektordatenbank mit hybrider Suche für KI-Anwendungen |
| <img src="weblate/icon.svg" width="24" height="24" style="object-fit:contain"> | [weblate](weblate/) | Software gemeinsam übersetzen |
| <img src="wikijs/icon.svg" width="24" height="24" style="object-fit:contain"> | [wikijs](wikijs/) | Wiki mit Markdown-Editor, Rechteverwaltung und Git-Synchronisation |
| <img src="yopass/icon.svg" width="24" height="24" style="object-fit:contain"> | [yopass](yopass/) | Geheimnisse sicher und verschlüsselt teilen |
<!-- templates:end -->

## Neues Template anlegen

1. Ordner mit dem Template-Namen erstellen
2. `docker-compose.yml` mit den benötigten Services anlegen — am besten zuerst als Stack auf der mittwald-Plattform aufbauen, bis die Anwendung dort läuft (siehe [Auf der mittwald-Plattform aufbauen und testen](#auf-der-mittwald-plattform-aufbauen-und-testen))
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

### Auf der mittwald-Plattform aufbauen und testen

**Empfohlener Weg:** Den Stack zuerst auf der mittwald-Plattform aufbauen und erst daraus das Template machen. Eine Compose-Datei, die im mStudio bzw. per `mw` bereits läuft und benutzbar ist, wird anschließend nur noch um Manifest, Icon und Screenshots ergänzt. So landen Plattform-Eigenheiten gar nicht erst im Template, statt erst nach dem Merge aufzufallen. Für NocoDB, Outline und Odoo hat dieser Weg in einem Durchgang zu installierbaren Templates geführt.

`pnpm app` zeigt, ob ein Template unter Docker Compose läuft. Die Plattform verhält sich aber in einigen Punkten anders: Init-Container, `$$` in `command`, Argumentlängen und Schreibrechte auf Volumes fallen erst dort auf (siehe [`AGENTS.md`](AGENTS.md)). Gearbeitet wird deshalb in einem eigenen Testprojekt: Compose-Datei deployen, Logs lesen, anpassen, erneut deployen, bis die Anwendung läuft. Das geht mit der [mittwald CLI](https://github.com/mittwald/cli) (`mw`), ohne dass das Template schon im Katalog sein muss:

```bash
# Einmalig: Testprojekt anlegen, Short-ID und Domain notieren
mw project create -s <server-id> -d "Container-Template Tests" -w

# Je Template: Stack anlegen und die Compose-Datei mit Testwerten deployen
mw stack create -p <project> -d nocodb -q          # gibt die Stack-ID aus
mw stack deploy -s <stack-id> -c nocodb/docker-compose.yml --env-file nocodb.env -f

# Container-ID des Hauptservice ermitteln und eine Subdomain darauf zeigen lassen
mw stack ps -s <stack-id> -o json | jq -r '.[] | "\(.id) \(.serviceName)"'
mw domain virtualhost create -p <project> \
  --hostname nocodb.<project>.project.space \
  --path-to-container /:<container-id>:8080/tcp
```

Die `.env`-Datei enthält einen Wert für jeden `userInput` und jedes `systemInput` des Manifests, also auch `HOST` mit der Subdomain. Für Templates mit `deliveryBoxes` legt man im Testprojekt einen Postausgang an (`mw mail deliverybox create`) und trägt dessen Zugangsdaten als `MW_DELIVERYBOX_MAIN_USERNAME` und `MW_DELIVERYBOX_MAIN_PASSWORD` ein. Bis die Subdomain erreichbar ist und ein Zertifikat hat, können einige Minuten vergehen.

Zur Fehlersuche:

```bash
mw container logs <container-id> -p <project>
mw container exec <container-id> -p <project> -q 'id; ls -ld /pfad/zum/volume'
```

Getestet wird nicht nur, ob der Container startet, sondern ob die Anwendung benutzbar ist: Login mit den Werten aus dem Assistenten, ein paar Datensätze anlegen, Seite neu laden, Container neu starten (`mw container restart`) und prüfen, ob die Daten noch da sind. Für Uploads zusätzlich prüfen, ob das Datenverzeichnis beschreibbar ist.

### Screenshots aufnehmen

Screenshots zeigen die echte Oberfläche mit realistischen Beispieldaten (z. B. Kundenprojekte einer Agentur), keine leeren Startseiten. Die Daten lassen sich meist schneller über die API der Anwendung anlegen als von Hand.

Aufgenommen wird mit einem Headless-Browser bei normaler Fensterbreite und doppelter Pixeldichte, statt das Fenster zu verkleinern oder zu vergrößern. Mit Playwright:

```js
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // ergibt 2880 px Breite, Mindestbreite sind 1500 px
  colorScheme: "light",
  locale: "de-DE",
});
await page.mouse.move(1430, 890); // Tooltips und Hover-Effekte vermeiden
await page.screenshot({ path: "nocodb/screenshot-grid.png" });
```

Vor dem Übernehmen jeden Screenshot ansehen: keine Tooltips, Onboarding-Hinweise oder Änderungsprotokolle aus dem Anlegen der Testdaten. Drei Screenshots je Template zeigen unterschiedliche Funktionen, etwa Liste, Board und Detailansicht. Danach den Hintergrund aus dem ersten Screenshot erzeugen:

```bash
pnpm gen:background nocodb            # --force, wenn sich der erste Screenshot geändert hat
```

### Im mStudio testen

Nach dem Merge nach `dev` stehen die Vorlagen nach wenigen Minuten zum Testen bereit. Dann wird jedes neue Template einmal über **Container → Vorlagen** installiert, so wie Nutzende es tun: Formular ausfüllen, Passwort generieren, Subdomain anlegen. Danach die Zugangsdaten aus den **Stack Informationen** (`help`) übernehmen, einloggen und die Anwendung kurz benutzen. Dabei fallen auch Fehler in Bezeichnungen, Beschreibungen, `help`-Platzhaltern und der Reihenfolge der Steps auf. Erst danach geht `dev` per Pull Request nach `main`.

Hinweise für den Test:

- Im Assistenten wird die Subdomain mit dem vollständigen Domainnamen angelegt, also Subdomain samt Projekt-Domain.
- Generierte Passwörter lassen sich in den **Stack Informationen** über die Schaltfläche „Kopieren“ übernehmen; so werden auch Passwörter mit Sonderzeichen sicher getestet.
- `component`-Templates haben keine Domain und fragen im Assistenten nach einem Stack.
- Für Templates mit AI-Hosting genügt zum Starttest ein Platzhalter-Key. Die KI-Funktionen selbst sind damit nicht getestet.
- Wie viele Container gleichzeitig laufen können, hängt von den Ressourcen des Servers ab. Werden Container wegen Ressourcenmangel beendet, liegt das am Server und nicht am Template. Deshalb nicht alle Stacks auf einmal laufen lassen, sondern in Gruppen testen und jeden Stack nach dem Test stoppen oder löschen.

## Templates aktuell halten

Die Templates werden regelmäßig gegen ihre Upstream-Projekte geprüft. Bei einer solchen Prüfung geht es um mehr als neue Image-Tags: Umgebungsvariablen werden umbenannt oder entfernt, Projekte ziehen in andere Registries um, Funktionen kommen hinzu oder fallen weg, und Texte oder Screenshots veralten.

### Vorgehen

1. **Je Template recherchieren**, was sich seit der letzten Prüfung geändert hat: Release Notes bzw. Changelog, verfügbare Image-Tags in der Registry und die Installationsdoku des Projekts (meist die Beispiel-`docker-compose.yml` des Upstreams). Die Checkliste unten zeigt, worauf zu achten ist.
2. **Änderungen umsetzen**, ein Commit je Template. Konventionen in [`AGENTS.md`](AGENTS.md) beachten, insbesondere die Regeln und Ausnahmen bei Image-Tags.
3. **Lokal prüfen** mit `pnpm test` und `pnpm app <template> up`. Bei Versionssprüngen zusätzlich mit Daten der alten Version starten (`pnpm app <template> up` auf dem alten Stand, Daten anlegen, dann auf den neuen Stand wechseln), damit Migrationen auffallen.
4. **Nach `dev` pushen und im mStudio testen** (siehe [Im mStudio testen](#im-mstudio-testen)): alle Templates mit Änderungen an `docker-compose.yml` oder an den `userInputs` installieren und benutzen. Reine Textänderungen brauchen keinen Plattform-Test.
5. **Pull Request `dev` → `main`**. GitHub löscht den Branch `dev` nach dem Merge automatisch; für die nächste Runde wird er neu von `main` abgezweigt.

### Checkliste

- **Image:** Gibt es eine neue Major-Version, und läuft der gepinnte Tag noch? Ist das Image in eine andere Registry oder einen anderen Namespace umgezogen? Wird `latest` pro Release oder bei jedem Commit gebaut? Hat das Projekt ein offizielles Image für eine bisher fremde Komponente (z. B. Browser-Container)?
- **Konfiguration:** Sind Variablen umbenannt, veraltet oder entfernt? Gibt es neue Pflichtvariablen (z. B. Secrets für neue Funktionen)? Hat sich ein Port, Pfad, Volume oder Healthcheck-Endpunkt geändert?
- **Sicherheit:** Gibt es neue Optionen für Authentifizierung oder Zugriffsbeschränkung, die als sicherer Default eingeschaltet werden sollten? Ein Login, der neu verpflichtend wird, ist eine Verhaltensänderung für bestehende Clients und gehört in den Pull Request.
- **Funktionen:** Gibt es neue Funktionen, die zusätzliche Services oder Domains brauchen (z. B. einen Collaboration-Server)? Sind Funktionen weggefallen oder kostenpflichtig geworden, und stehen sie noch in `description` oder `help`?
- **Upgrades:** Braucht der Sprung von der alten Version eine Migration oder einen Zwischenschritt? Dann gehört ein Hinweis in `help` bzw. die Migration in den Start (z. B. `MARIADB_AUTO_UPGRADE`, `MEILI_UPGRADE_DB`).
- **Texte:** Stimmen Versionsangaben, Funktionslisten und die genannten Alternativen noch? Werden eingestellte Dienste erwähnt (z. B. Import aus Pocket)? Stimmen Links (z. B. Repository-Umzug zu Codeberg)?
- **Bilder:** Hat das Projekt ein neues Logo? Zeigen die Screenshots noch die aktuelle Oberfläche? Nach neuen Screenshots `pnpm gen:background <template> --force` ausführen.

### Von Hand gepflegte Versionen

Diese Versionen aktualisieren sich nicht über einen floatenden Tag und werden bei jeder Prüfung einzeln angesehen:

| Template | Image | Grund |
|---|---|---|
| `vaults3` | volle Release-Version | `latest` wird bei jedem Commit gebaut |
| `yopass` | volle Release-Version | `latest` wird bei jedem Commit gebaut |
| `meilisearch`, `karakeep`, `linkwarden` | Meilisearch auf den Minor | Datenmigration bei jedem Minor |
| `librechat` | Meilisearch `v1.35` | vom Upstream vorgegeben |
| `paperless` | `apache/tika:3.x.x.x` | Paperless unterstützt Tika 4 nicht |
| `paperless`, `solidtime` | `gotenberg/gotenberg:8` | Clients nutzen die v8-API |
| `immich` | vorbereitetes PostgreSQL-Image | fest verdrahtete Extension-Versionen |
| `openseo` | `rustfs/rustfs` volle Release-Version | vom Upstream mit celld getestete Version, kein Major-Tag |
