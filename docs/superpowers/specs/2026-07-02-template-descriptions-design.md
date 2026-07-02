# Ausführliche Template-Beschreibungen — Design

**Datum:** 2026-07-02
**Status:** Freigegeben (Brainstorming)

## Kontext & Ausgangslage

Jedes Template hat im `manifest.yaml` ein mehrsprachiges `description`-Feld (de/en).
Aktuell sind diese Texte **18–37 Wörter** lang und rein sachlich (ein bis drei Sätze).

Konsumenten der Beschreibung:

- **Lokaler Store** (`index.html`, generiert aus `generate-index.sh`) — zeigt `description.de` im Modal, aktuell als Plain-Text via `innerHTML`.
- Die künftige (eigene) Anzeige-Pipeline von mittwald.

**Nicht-Ziel / außerhalb Scope:** mStudio wird für die Anzeige dieser Beschreibungen **nicht mehr** verwendet und ist daher irrelevant. Wie mStudio die Beschreibung rendert, spielt keine Rolle.

## Ziel

Die `description` aller 20 Templates (je de **und** en) durch **ausführliche Katalogtexte von ~230–240 Wörtern** (Minimum 200) ersetzen. Die Texte stellen das Tool vor und erklären seine Relevanz für **Werbe-, Web- und Digitalagenturen**.

## Entscheidungen

| Aspekt | Entscheidung |
|--------|--------------|
| Roter Faden | Ausgewogen: Tool → Funktionen → Agentur-Relevanz → Betrieb/DSGVO/Wirtschaftlichkeit. Kein dominanter Werbe-Winkel. |
| Tonalität | Neutral, dritte Person, **sachlich-informativ (keine Werbung)**. |
| SaaS-Alternativen | **Konkret benennen** (z. B. „Alternative zu Google Analytics"). |
| Format | **Leichtes Markdown**: fett angeführter Einstieg, eine kurze Feature-Liste, Absätze. |
| Länge | ~230–240 Wörter je Sprache (Minimum 200). |
| Sprachen | de **und** en, inhaltlich parallel. |
| Platzierung | Ersetzt das bestehende `description`-Feld. Die kurze `tagline` bleibt als Einzeiler erhalten. |
| Schema | Keine Änderung nötig (`description` bleibt i18n-String; Markdown ist gültiger String-Inhalt). YAML-Block-Scalar (`|`) für den mehrzeiligen Inhalt. |

## Text-Skelett (für alle Templates gleich)

1. **Einordnung** — fett angeführter Toolname, was es ist, Kategorie, konkrete self-hosted SaaS-Alternative.
2. **Feature-Liste** — „Zentrale Funktionen:" + 4–6 Bullet-Points mit konkreten Fähigkeiten.
3. **Agentur-Relevanz** — Einsatz im Agenturalltag / in Kundenprojekten (Absatz, „**Werbe-, Web- und Digitalagenturen**" hervorgehoben).
4. **Betrieb & Datensouveränität** — self-hosted bei mittwald (deutsche Rechenzentren), DSGVO, Template-Inhalt (gebündelte Services), Wirtschaftlichkeit (keine nutzungsabhängigen/Seat-Lizenzkosten).

**Anpassung für `component`-Templates** (Datenbanken, Such-/Vektor-Engines, Office-Backends): Block 3 stellt das Tool als **Baustein hinter Kundenanwendungen** dar (Backend/Infrastruktur), nicht als Endnutzer-App.

## Musterbeispiel (Umami, DE, ~230 Wörter)

```markdown
**Umami** ist eine datenschutzfreundliche Web-Analytics-Lösung und eine
self-hosted Alternative zu Google Analytics oder Matomo. Sie erfasst
Seitenaufrufe, Besucherquellen, Events und Conversions in einem übersichtlichen
Dashboard, ohne Cookies zu setzen oder personenbezogene Daten an Dritte
weiterzugeben.

Zentrale Funktionen:

- Echtzeit-Auswertung von Traffic, Quellen und Geräten
- Benutzerdefinierte Events und Conversion-Ziele
- Getrennte Auswertung beliebig vieler Websites in einer Installation
- Öffentlich teilbare Dashboards und abgestufte Zugriffsrechte
- Leichtgewichtiges Tracking-Skript ohne spürbaren Einfluss auf die Ladezeit

Für **Werbe-, Web- und Digitalagenturen** ist Umami vor allem im Betrieb vieler
Kundenprojekte interessant: Sämtliche Kundenseiten laufen über eine zentrale
Instanz und lassen sich dort getrennt auswerten und als Reporting an die
jeweiligen Kunden weitergeben. Neue Kundenseiten sind in wenigen Minuten
angebunden. Da Umami ohne Cookie-Banner auskommt, vereinfacht es zugleich die
DSGVO-Konformität der betreuten Websites.

Bei mittwald läuft Umami als self-hosted Container in deutschen Rechenzentren;
die erfassten Daten bleiben vollständig unter Kontrolle der Agentur
beziehungsweise ihrer Kunden und werden nicht in Drittländer übertragen. Dieses
Template enthält Umami mit einer PostgreSQL-Datenbank und ist sofort
einsatzbereit. Da keine nutzungsabhängigen Lizenzkosten anfallen, bleibt die
Lösung auch über viele Websites und Kundenprojekte hinweg wirtschaftlich.
```

Die englische Fassung ist eine inhaltlich gleichwertige, idiomatische Übersetzung (keine 1:1-Wort-Übersetzung).

## Inhalts-Inputs je Template

Grundlage: bestehende `description`/`tagline`, `docker-compose.yml` (gebündelte Services) und Fachwissen. Genannte SaaS-Alternativen als Ausgangspunkt (bei Bedarf verfeinern):

| Template | Typ | SaaS-Alternative (Bezug) | Agentur-Winkel |
|----------|-----|--------------------------|----------------|
| anythingllm | standalone | Cloud-RAG-/Chatbot-Dienste | Wissens-Chatbot über Kundendokumente (RAG) |
| changedetection | standalone | Visualping, Distill.io | Monitoring von Kunden-/Wettbewerber-Websites |
| chroma | component | Pinecone, Weaviate Cloud | Vektor-Backend für KI-Features in Kundenprojekten |
| collabora | component | Microsoft 365 / Google Docs (Office online) | Kollaborative Dokumentbearbeitung (z. B. in Nextcloud) |
| directus | standalone | Contentful, Strapi Cloud | Headless-CMS-Backend für Kunden-Websites/Apps |
| docmost | standalone | Notion, Confluence | Internes Wiki, Kundendokumentation |
| euro-office | component | Microsoft Office Online, ONLYOFFICE Cloud | Office-Bearbeitung als Backend (z. B. in Nextcloud) |
| mariadb | component | Managed MySQL (AWS RDS, PlanetScale) | Datenbank-Backend für Kundenanwendungen |
| n8n | standalone | Zapier, Make | Automatisierung: Onboarding, Reporting, Lead-Routing |
| nextcloud-euro-office | standalone | Google Workspace, Microsoft 365, Dropbox | Datei-/Kollaborationsplattform für Team & Kunden |
| opensearch | component | Elastic Cloud, Algolia | Such-/Log-Analyse-Backend |
| openwebui | standalone | ChatGPT (hosted) | Eigenes Chat-Interface, an mittwald AI Hosting angebunden |
| paperless | standalone | DocuWare, Cloud-DMS | Dokumentenverwaltung/Rechnungen mit OCR |
| password-pusher | standalone | 1Password Send, SaaS-Secret-Sharing | Sicheres Teilen von Zugangsdaten mit Kunden |
| postgresql | component | Managed Postgres (RDS, Supabase, Neon) | Datenbank-Backend für Kundenanwendungen |
| qdrant | component | Pinecone | Vektor-Backend für RAG/Semantische Suche |
| solr | component | Algolia, Elastic Cloud | Such-Backend für Shops/Websites |
| umami | standalone | Google Analytics, Matomo | Analytics über viele Kundenseiten |
| vaultwarden | standalone | 1Password, LastPass, Bitwarden (hosted) | Team-Passwortverwaltung, Kundenzugänge |
| yopass | standalone | One-Time-Secret-Dienste | Verschlüsseltes Teilen sensibler Daten |

## Konsumenten & Rendering

### Lokaler Store (`generate-index.sh` / `index.html`)

Zwei notwendige Anpassungen:

1. **Mehrzeiliges Parsen:** Der aktuelle grep/sed-basierte Parser in `generate-index.sh` liest `description.de` als **eine Zeile**. Mit mehrzeiligem Markdown (YAML-Block-Scalar) funktioniert das nicht mehr. Der Extraktions-Mechanismus muss den mehrzeiligen Wert korrekt einlesen (robustes YAML-Parsing statt `grep -m1`) und als JSON-String (mit `\n`) einbetten.
2. **Markdown-Rendering:** Das Modal (`.modal-desc`) muss den Text als Markdown darstellen (fett, Listen, Absätze) statt als Plain-Text. Ein minimaler Markdown-Renderer im generierten JavaScript genügt (bold, Bullet-Listen, Absätze) — keine externe Abhängigkeit nötig.

### Künftige mittwald-Pipeline

Muss die Beschreibung als Markdown rendern. Liegt außerhalb dieses Repos; hier nur als Anforderung notiert.

## Umfang

- **40 Texte** (20 Templates × de/en), je ~230–240 Wörter.
- 20 `manifest.yaml` geändert (`description`-Feld).
- `generate-index.sh` + `index.html` angepasst (mehrzeiliges Parsen + Markdown-Rendering).
- Schema unverändert; CI-Validierung muss weiter grün sein.

## Offene Punkte / Risiken

- **YAML-Block-Scalar + bash-Parsing:** Der bestehende Store-Generator ist bash/grep-basiert. Mehrzeilige Werte robust zu lesen ist in reinem bash aufwändig; ggf. ein kleiner Parsing-Helfer. Im Implementierungsplan zu entscheiden.
- **Konsistenz über 40 Texte:** Gleiches Skelett, aber je Tool inhaltlich korrekt (Features, Alternativen). Review empfohlen.
- **SaaS-Alternativen** sind Vorschläge; einzelne können fachlich noch angepasst werden.
