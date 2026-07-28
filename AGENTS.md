# Agents

## Projektbeschreibung

Dieses Repository enthält Container-Vorlagen (Templates) für die mStudio Container-Vorlagen-Funktion. Jedes Template liegt in einem eigenen Ordner und besteht aus `docker-compose.yml`, `manifest.yaml` und `icon.svg`, optional ergänzt um `docker-compose.dev.yml` und Screenshot-Bilder. `validate.mjs` prüft die Pflichtdateien, das Manifest-Schema und die Screenshot-Regeln. Aufbau, Feld-Dokumentation und Beispiele stehen in der `README.md`; die maschinenlesbare Feldstruktur in `manifest.schema.json`.

## Konventionen

### docker-compose.yml

- Alle Umgebungsvariablen, die vom Benutzer oder System konfiguriert werden, nutzen die `${VARIABLE}` Syntax.
- Volumes für persistente Daten werden als Named Volumes definiert.
- Zeitzone ist standardmäßig `Europe/Berlin`.
- **Image-Tags:** Anwendungen und Datenbanken werden bevorzugt auf die **Major-Version** gepinnt (z. B. `postgres:18`, `redis:8`, `vikunja:2`). Bietet das Projekt keinen floatenden Major-Tag an — etwa weil es nur volle Semver-Tags oder ein Datums-/CalVer-Schema (`2026.6.1`) veröffentlicht —, wird `latest` verwendet. Ungetaggte Images (implizit `latest`) sind zu vermeiden. Ausnahme: Images, die eine bestimmte, vom Upstream vorgegebene kompatible Version voraussetzen (z. B. das für Immich vorbereitete PostgreSQL-Image mit fest verdrahteten Extension-Versionen), werden auf genau diesen Tag gepinnt.
- Abhängige Services warten über `depends_on` mit `condition: service_healthy`; Datenbanken/Caches (postgres, mariadb, redis/valkey, meilisearch …) definieren dazu einen `healthcheck`.
- Services, die Backups unterstützen, verwenden das Label `backup.command` mit dem entsprechenden Backup-Befehl.
- Ports werden nur für den Hauptservice exponiert, der über die Domain erreichbar sein soll.
- `docker-compose.dev.yml` ist ein optionaler lokaler Override, den `dev.mjs` nach der generierten Compose-Datei lädt; beim produktiven Template-Deployment wird die Datei nicht verwendet.

Beispiel für einen lokalen Mailpit-Override:

```yaml
services:
  easyappointments:
    environment:
      MAIL_SMTP_HOST: ct-mail
      MAIL_SMTP_PORT: 1025
      MAIL_SMTP_CRYPTO: ""
```

### manifest.yaml

Struktur, Typen und erlaubte Werte definiert `manifest.schema.json`; die ausführliche Feld-Doku mit Beispielen steht in `README.md`. Ergänzend gelten Konventionen, die das Schema nicht ausdrückt:

- **`help`-Platzhalter:** Die Werte werden auch **nach** der Installation angezeigt, es dürfen daher nur dann noch verfügbare Platzhalter verwendet werden — `${<service>.env.NAME}` und `${<service>.hostname}` (Env-Variablen hängen am Service, deshalb mit Service-Namen) sowie `${domain.<purpose>}` für die Domain. `userInputs` (`${HOST}` etc.) sind nach der Installation **nicht** mehr verfügbar; stattdessen die Ziel-Service-Env referenzieren. Ausführlich: `README.md`, Abschnitt `help`.
- **`positionMeta.step`:** Die vier Steps `domain`, `adminUser`, `ai` und `common` sind im Schema abschließend festgelegt, weil das Frontend je Step eine Übersetzung pflegt. Zuordnung: Inputs mit `dataSource: "ingress.paths"` → `domain`, Admin-Zugangsdaten (`ADMIN_USER`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_TOKEN`, UI-Logins) → `adminUser`, AI-Hosting (`AI_ENDPOINT`, `AI_API_KEY`) → `ai`, alles Übrige → `common`. `index` zählt je Step ab 1, nicht über das ganze Manifest.
- **Mailversand:** Templates fragen keine SMTP-Zugangsdaten ab, sondern deklarieren eine Delivery-Box (`deliveryBoxes: [{ purpose: main }]`). Die `docker-compose.yml` verdrahtet `mail.agenturserver.de` auf Port `587` mit STARTTLS fest und nutzt `${MW_DELIVERYBOX_MAIN_USERNAME}` / `${MW_DELIVERYBOX_MAIN_PASSWORD}`. Die Absenderadresse bleibt als `SMTP_FROM` ein `userInput` im Step `common`. Ausnahme: `mailpit` betreibt den SMTP-Endpunkt selbst, dessen Zugangsdaten bleiben Eingabefelder.
- **`defaultValue`-Platzhalter:** In `defaultValue` stehen Platzhalter zur Verfügung, die zur Installationszeit aufgelöst werden: `${user.email}`, `${user.username}`, `${user.firstName}`, `${user.lastName}`, `${user.fullName}` und `${aiHosting.llmEndpoint}`. Sie werden konsistent eingesetzt: E-Mail-Felder (`ADMIN_EMAIL`, `SMTP_FROM`) → `${user.email}`, Benutzernamen von Anwendungs-Admins (`ADMIN_USER`) → `${user.username}`. Datenbank-Templates behalten ihre technischen Vorgaben (kein `${user.username}` als DB-Benutzer). Der Endpunkt des mittwald AI Hostings wird nicht in der `docker-compose.yml` hart verdrahtet, sondern über einen `userInput` mit `defaultValue: "${aiHosting.llmEndpoint}"` neben dem `aiHosting.apiKey`-Input geführt. Ausführlich: `README.md`, Abschnitt `userInputs`.
- **`categories`** als Auswahlhilfe:
  - `productivity` — Workflow-Automatisierung, Dokumentenmanagement, Projekttools
  - `development` — CMS, Dev-Tools, Test- und Build-Infrastruktur
  - `database` — Datenbanken und Suchplattformen (relational, Vektor, Dokumenten-Store, Such-Index). **Nur intern:** Die Kategorie dient dazu, gezielt Template-Listen im „Datenbanken"-Bereich anzuzeigen; im Store ist sie keine offizielle Kategorie. Sie **steht deshalb nie allein**, sondern ergänzt die fachliche Kategorie: eine relationale Datenbank ist `development` **und** `database`, eine Vektordatenbank `ai` **und** `database`. Das Schema erzwingt das (`database` ⇒ mindestens zwei Kategorien).
  - `ai` — KI/ML-spezifische Tools und Infrastruktur
  - `security` — Passwort-Manager, Authentifizierung, Verschlüsselung
  - `monitoring` — Analytics, Uptime-Monitoring, Observability
  - `communication` — Chat, Messaging, Kollaboration
  - `media` — Foto-/Video-/Dateiverwaltung
- **Icon:** Die Datei heißt **immer** `icon.svg` im Template-Ordner (kein Manifest-Feld). Bevorzugt von [dashboard-icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0).
- **`screenshots`:** Optional. Die Bilder liegen flach im Template-Ordner neben `icon.svg`; im Manifest steht nur der Dateiname, kein Pfad. Erlaubt sind `jpg`, `jpeg`, `png` und `webp`. Beide Bilder müssen mindestens **1500 px breit** sein — das verhindert unscharfes Hochskalieren beim Rendern.
  - `bg` — dekorative Bühne im Seitenverhältnis **exakt 3:2** (aus 1500 px Breite folgt damit 1000 px Höhe). Trägt keine Information, da nur der Screenshot darüber inhaltlich gelesen wird. Die Bühne wird **je Template aus dessen eigenen Farben** erzeugt, nicht über alle Templates hinweg geteilt: `pnpm gen:background <template>` leitet einen weichen Verlauf aus `icon.svg` ab. Ist das Icon einfarbig, greift eine neutrale Ersatzpalette — dann `--from screenshot` verwenden, das die Farben aus dem ersten Screenshot des Manifests zieht.
  - `screenshot` — die echte Anwendungsoberfläche, kein Mockup und keine Montage. Wird auf `bg` platziert und hat deshalb kein festes Seitenverhältnis.
  - `text` — eine **Bildüberschrift**: Sie steht über dem Screenshot, nicht darunter. Ein knapper, neutraler Satz in dritter Person, tonal wie `description` (keine Werbung), der zeigt, was auf dem Screenshot zu sehen ist. **Höchstens 70 Zeichen je Sprache**, ohne Punkt am Ende; kürzer ist besser. Das Schema erzwingt die Länge nicht, sie ist beim Schreiben einzuhalten.
  - Existenz, Lesbarkeit, Mindestbreite und das 3:2-Verhältnis werden per CI durch `validate.mjs` geprüft.
- `description` ist ein Katalogtext von **~175 Wörtern** je Sprache, als **Markdown** (fett angeführter Toolname, eine „Zentrale Funktionen:"-Bullet-Liste, Absätze). Neutral, dritte Person, sachlich-informativ (keine Werbung). Aufbau: (1) Einordnung + konkret benannte self-hosted SaaS-Alternative, (2) Feature-Liste, (3) Relevanz für **Agenturen** (Use-Cases in Kundenprojekten; die Zielgruppe wird als „Agenturen" zusammengefasst, nicht nach Typen aufgeschlüsselt), (4) Betrieb bei mittwald (deutsche Rechenzentren) + DSGVO + Template-Inhalt + Wirtschaftlichkeit. Bei `component`-Templates stellt Block 3 das Tool als Baustein/Backend hinter Kundenanwendungen dar.
- **Code/Env in Texten:** In `description`, `tagline` und `help` werden Env-Variablennamen, CLI-Befehle, Datei-/Pfadnamen und sonstige technische Bezeichner als Markdown-Code in Backticks gesetzt (z. B. `` `DISABLE_SIGNUPS` ``, `` `CREATE EXTENSION vector;` ``), nicht als Fließtext oder in Anführungszeichen.

### Allgemein

- Sprache in Code und Konfiguration: Englisch.
- Sprache in Beschreibungen und Texten: Deutsch und Englisch (mehrsprachig).
- Jedes Template ist eigenständig und hat keine Abhängigkeiten zu anderen Templates.
- Sichere Defaults verwenden: Produktionsmodus, restriktive Berechtigungen, keine Debug-Optionen.
- Jeder versionierte sichtbare Unterordner muss einem Template entsprechen. Es darf keine Unterordner geben, die andere Dateien enthalten (z.B. `docs`, `scripts`). Ausgenommen sind versteckte Ordner wie `.github` (Workflows) und der lokal erzeugte, ignorierte Ordner `node_modules`. `validate.mjs` berücksichtigt direkte Unterordner mit einer `manifest.yaml` als Templates.

## Pflege

- Die Template-Tabelle in der `README.md` wird aus den Manifesten generiert (Ordnername + `tagline.de`) und **nicht** von Hand gepflegt. Sie wird bei jedem Merge auf `main` automatisch durch die GitHub-Action `.github/workflows/update-readme.yml` (`gen-readme.mjs`) regeneriert und per `github-actions[bot]` committet. Pull Requests fassen die Tabelle also **nicht** an und können nicht darauf konflikten. Lokal lässt sie sich mit `pnpm gen:readme` erzeugen; sie steht zwischen den Markern `<!-- templates:start -->` und `<!-- templates:end -->`.
- Änderungen an der Manifest-**Struktur** in `manifest.schema.json` pflegen (wird per CI gegen alle `manifest.yaml` validiert) und die Feld-Doku in der `README.md` nachziehen.
- Regeln zu Screenshot-Bildern (Mindestbreite, Seitenverhältnis) stehen in `validate.mjs` als Konstanten; bei Änderungen die Konvention oben und die `README.md` nachziehen.
- Die in `defaultValue` erlaubten Platzhalter stehen als `DEFAULT_VALUE_PLACEHOLDERS` in `validate.mjs` (unbekannte Platzhalter sind ein CI-Fehler) und mit lokalen Ersatzwerten als `defaultValuePlaceholders` in `dev.mjs`. Kommt ein Platzhalter hinzu, sind beide Stellen sowie die Konvention oben und die `README.md` nachzuziehen.
- **Konventionen** werden hier in `AGENTS.md` gepflegt.
