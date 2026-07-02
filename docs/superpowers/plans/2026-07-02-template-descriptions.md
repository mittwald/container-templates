# Ausführliche Template-Beschreibungen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die `description` aller 20 Templates (de + en) durch ~230–240-Wörter-Markdown-Texte ersetzen, die das Tool vorstellen und die Relevanz für Werbe-/Web-/Digitalagenturen erklären; den lokalen Store an mehrzeilige Beschreibungen + Markdown-Rendering anpassen.

**Architecture:** Beschreibungen liegen als mehrzeiliger YAML-Block-Scalar (`|`) im `description`-Feld jedes Manifests. Der Store-Generator (`generate-index.sh`) extrahiert die Manifest-Daten künftig per Python (PyYAML) statt per grep/sed und rendert die Beschreibung im Modal als Markdown. Das JSON-Schema bleibt unverändert (Markdown ist ein gültiger String).

**Tech Stack:** YAML-Manifeste, bash + python3/PyYAML (Store-Generator), Vanilla-JS (Store-Frontend), check-jsonschema (CI).

## Global Constraints

- **Länge:** Jede Beschreibung (de und en) ~230–240 Wörter, **Minimum 200**.
- **Tonalität:** neutral, dritte Person, sachlich-informativ — **keine Werbung**.
- **SaaS-Alternativen:** konkret benennen (Markennamen erlaubt).
- **Format:** leichtes Markdown — fett angeführter Toolname, eine Bullet-Feature-Liste, Absätze.
- **Sprachen:** de **und** en, inhaltlich gleichwertig (idiomatisch, keine Wort-für-Wort-Übersetzung).
- **Skelett je Text (4 Blöcke):** (1) Einordnung + konkrete SaaS-Alternative → (2) „Zentrale Funktionen:" + 4–6 Bullets → (3) Agentur-Relevanz/Use-Cases (mit hervorgehobenem „**Werbe-, Web- und Digitalagenturen**") → (4) Betrieb bei mittwald (deutsche Rechenzentren) + DSGVO + Template-Inhalt + Wirtschaftlichkeit (keine Seat-/Nutzungslizenzen).
- **`component`-Templates** (Datenbanken, Such-/Vektor-Engines, Office-Backends): Block 3 stellt das Tool als **Baustein/Backend hinter Kundenanwendungen** dar, nicht als Endnutzer-App.
- **Platzierung:** ersetzt `description`; `tagline` bleibt unverändert. Schema nicht ändern. CI muss grün bleiben.

---

## Description Task Procedure (gemeinsam für alle Beschreibungs-Tasks 3–22)

Jeder Beschreibungs-Task ändert **nur** das `description`-Feld eines Manifests. YAML-Form (Block-Scalar `|`, 2 Leerzeichen Basis-Einrückung, Markdown-Inhalt weitere 2 Leerzeichen tiefer):

```yaml
description:
  de: |
    **<Tool>** ist ... (Einordnung + SaaS-Alternative)

    Zentrale Funktionen:

    - ...
    - ...

    Für **Werbe-, Web- und Digitalagenturen** ... (Use-Cases)

    Bei mittwald läuft **<Tool>** als self-hosted Container in deutschen
    Rechenzentren; ... (DSGVO) Dieses Template enthält <gebündelte Services>.
    ... (Wirtschaftlichkeit)
  en: |
    **<Tool>** is ... (parallel content, idiomatic English)
    ...
```

**Schritte (identisch für jeden Beschreibungs-Task):**

- [ ] **Step 1:** `description.de` als Block-Scalar (`|`) nach obigem Skelett schreiben (~230–240 Wörter), mit den im Task genannten Inputs (SaaS-Alternative, Agentur-Winkel, gebündelte Services). `tagline` unverändert lassen.
- [ ] **Step 2:** `description.en` als inhaltlich gleichwertige englische Fassung schreiben (~230–240 Wörter).
- [ ] **Step 3: Wortzahl prüfen.** Run: `python3 scripts/check_descriptions.py <template>`. Expected: `OK` für de und en (beide ≥ 200 Wörter).
- [ ] **Step 4: Schema-Validierung.** Run: `check-jsonschema --schemafile manifest.schema.json <template>/manifest.yaml`. Expected: `ok -- validation done`.
- [ ] **Step 5: Commit.**
  ```bash
  git add <template>/manifest.yaml
  git commit -m "content: ausführliche Beschreibung für <template>"
  ```

---

### Task 1: Wortzahl-Checker

**Files:**
- Create: `scripts/check_descriptions.py`

**Interfaces:**
- Produces: CLI `python3 scripts/check_descriptions.py [template ...]` — prüft, dass `description.de` und `description.en` jeweils ≥ 200 Wörter haben. Exit 0 + `OK`-Zeilen bei Erfolg, Exit 1 + Fehlermeldung sonst. Ohne Argumente: alle Templates.

- [ ] **Step 1: Checker schreiben**

```python
#!/usr/bin/env python3
"""Prüft, dass description.de/en jedes Templates mindestens MIN_WORDS Wörter hat."""
import glob
import sys

import yaml

MIN_WORDS = 200


def word_count(text: str) -> int:
    return len(text.split())


def main() -> int:
    targets = sys.argv[1:] or sorted(
        p.split("/")[0] for p in glob.glob("*/manifest.yaml")
    )
    failed = False
    for name in targets:
        path = f"{name}/manifest.yaml"
        data = yaml.safe_load(open(path, encoding="utf-8"))
        desc = data.get("description") or {}
        for lang in ("de", "en"):
            n = word_count(desc.get(lang, ""))
            status = "OK" if n >= MIN_WORDS else "ZU KURZ"
            print(f"{name:24} {lang}: {n:3} Wörter  {status}")
            if n < MIN_WORDS:
                failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Gegen ein aktuelles (kurzes) Template laufen lassen — muss FEHLSCHLAGEN**

Run: `python3 scripts/check_descriptions.py umami; echo "exit=$?"`
Expected: `umami ... de: 22 Wörter ZU KURZ` und `exit=1` (aktuelle Beschreibung ist noch kurz).

- [ ] **Step 3: Commit**

```bash
git add scripts/check_descriptions.py
git commit -m "tooling: Wortzahl-Checker für Template-Beschreibungen"
```

---

### Task 2: Store-Generator auf Python-Extraktion + Markdown-Rendering umstellen

**Files:**
- Modify: `generate-index.sh`

**Interfaces:**
- Consumes: alle `*/manifest.yaml` (via PyYAML).
- Produces: `index.html` mit `const templates = [...]` (inkl. mehrzeiliger `description.de` als JSON-String mit `\n`) und einem Markdown-gerenderten Modal.

- [ ] **Step 1: Daten-Sammlung (bash grep/sed-Schleife) durch Python ersetzen.**

Ersetze in `generate-index.sh` den kompletten Block von `TEMPLATES="["` bis `TEMPLATES+="]"` (die `for dir`-Schleife samt `get`/`get_nested`/`esc`/Kategorie-Parsing) durch:

```bash
TEMPLATES=$(python3 <<'PY'
import glob, yaml, json
out = []
for m in sorted(glob.glob("*/manifest.yaml")):
    d = yaml.safe_load(open(m, encoding="utf-8"))
    name = m.split("/")[0]
    out.append({
        "name": name,
        "displayName": d.get("name", {"de": name, "en": name}),
        "version": str(d.get("version", "")),
        "icon": "icon.svg",
        "developer": d.get("developer", ""),
        "website": d.get("website", ""),
        "repository": d.get("repository", ""),
        "license": (d.get("license") or {}).get("name", ""),
        "tagline": d.get("tagline", {}),
        "description": {"de": (d.get("description") or {}).get("de", "")},
        "categories": d.get("categories", []),
    })
print(json.dumps(out, ensure_ascii=False))
PY
)
```

(`json.dumps` escaped Zeilenumbrüche in der Beschreibung korrekt als `\n`. Die Zeile `echo "const templates = ${TEMPLATES};" >> index.html` bleibt unverändert bestehen.)

- [ ] **Step 2: Markdown-Renderer im generierten JavaScript ergänzen.**

Direkt nach `const catLabels = {...};` (im zweiten HTML-Heredoc) einfügen:

```javascript
function mdToHtml(md) {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const blocks = md.trim().split(/\n\s*\n/);
  return blocks.map(b => {
    const lines = b.split('\n');
    if (lines.every(l => l.trim().startsWith('- '))) {
      return '<ul>' + lines.map(l => `<li>${inline(l.trim().slice(2))}</li>`).join('') + '</ul>';
    }
    return `<p>${inline(b.replace(/\n/g, ' '))}</p>`;
  }).join('');
}
```

- [ ] **Step 3: Modal-Beschreibung als Markdown rendern.**

Ändere im Modal-Template die Zeile
`<div class="modal-desc">${t.description.de}</div>`
zu
`<div class="modal-desc">${mdToHtml(t.description.de)}</div>`

- [ ] **Step 4: Generator laufen lassen — kein Regressions-Fehler (Beschreibungen noch kurz).**

Run: `./generate-index.sh`
Expected: `index.html generated with 20 templates.` und `index.html` enthält `const templates = [` sowie `function mdToHtml`.

- [ ] **Step 5: Commit**

```bash
git add generate-index.sh index.html
git commit -m "chore: Store-Generator auf Python-Extraktion + Markdown-Rendering umstellen"
```

---

### Task 3: Beschreibung — umami (Referenz, vollständige Copy)

**Files:**
- Modify: `umami/manifest.yaml` (`description`)

Vollständige Copy (ersetzt das `description`-Feld):

```yaml
description:
  de: |
    **Umami** ist eine datenschutzfreundliche Web-Analytics-Lösung und eine self-hosted Alternative zu Google Analytics oder Matomo. Sie erfasst Seitenaufrufe, Besucherquellen, Events und Conversions in einem übersichtlichen Dashboard, ohne Cookies zu setzen oder personenbezogene Daten an Dritte weiterzugeben.

    Zentrale Funktionen:

    - Echtzeit-Auswertung von Traffic, Quellen und Geräten
    - Benutzerdefinierte Events und Conversion-Ziele
    - Getrennte Auswertung beliebig vieler Websites in einer Installation
    - Öffentlich teilbare Dashboards und abgestufte Zugriffsrechte
    - Leichtgewichtiges Tracking-Skript ohne spürbaren Einfluss auf die Ladezeit

    Für **Werbe-, Web- und Digitalagenturen** ist Umami vor allem im Betrieb vieler Kundenprojekte interessant: Sämtliche Kundenseiten laufen über eine zentrale Instanz und lassen sich dort getrennt auswerten und als Reporting an die jeweiligen Kunden weitergeben. Neue Kundenseiten sind in wenigen Minuten angebunden. Da Umami ohne Cookie-Banner auskommt, vereinfacht es zugleich die DSGVO-Konformität der betreuten Websites.

    Bei mittwald läuft Umami als self-hosted Container in deutschen Rechenzentren; die erfassten Daten bleiben vollständig unter Kontrolle der Agentur beziehungsweise ihrer Kunden und werden nicht in Drittländer übertragen. Dieses Template enthält Umami mit einer PostgreSQL-Datenbank und ist sofort einsatzbereit. Da keine nutzungsabhängigen Lizenzkosten anfallen, bleibt die Lösung auch über viele Websites und Kundenprojekte hinweg wirtschaftlich.
  en: |
    **Umami** is a privacy-friendly web analytics solution and a self-hosted alternative to Google Analytics or Matomo. It records page views, traffic sources, events and conversions in a clear dashboard without setting cookies or passing personal data to third parties.

    Key features:

    - Real-time analysis of traffic, sources and devices
    - Custom events and conversion goals
    - Separate analysis of any number of websites from a single installation
    - Publicly shareable dashboards and granular access rights
    - Lightweight tracking script with no noticeable impact on page load times

    For **advertising, web and digital agencies**, Umami is particularly useful when running many client projects: all client sites run through a single central instance, where they can be analysed separately and shared as reporting with the respective clients. New client sites are connected within minutes. Because Umami works without a cookie banner, it also simplifies GDPR compliance for the managed websites.

    At mittwald, Umami runs as a self-hosted container in German data centres; the collected data stays fully under the control of the agency or its clients and is not transferred to third countries. This template includes Umami with a PostgreSQL database and is ready to use immediately. As there are no usage-based licence costs, the solution remains economical even across many websites and client projects.
```

- [ ] **Step 1:** Obige Copy in `umami/manifest.yaml` einsetzen (`tagline` unverändert).
- [ ] **Step 2:** `python3 scripts/check_descriptions.py umami` → beide ≥ 200 Wörter (`OK`).
- [ ] **Step 3:** `check-jsonschema --schemafile manifest.schema.json umami/manifest.yaml` → `ok`.
- [ ] **Step 4: End-to-End-Rendering prüfen.** Run: `./generate-index.sh` und danach `grep -c '\\n' index.html` (>0, mehrzeilige Beschreibung ist als `\n` eingebettet). Optional Store im Browser öffnen: Modal zeigt Fettschrift + Bullet-Liste.
- [ ] **Step 5: Commit** — `git add umami/manifest.yaml index.html && git commit -m "content: ausführliche Beschreibung für umami"`

---

## Tasks 4–22: Restliche Templates (Description Task Procedure anwenden)

Jeder folgende Task: **Modify `<template>/manifest.yaml`**, Schritte = *Description Task Procedure* (oben). Inputs je Template:

### Task 4: anythingllm  *(standalone, ai)*
- SaaS-Alternative: Cloud-RAG-/KI-Assistenz-Dienste (z. B. gehostete ChatGPT-Enterprise-/Custom-GPT-Angebote).
- Gebündelte Services: AnythingLLM + Qdrant (Vektordatenbank).
- Agentur-Winkel: interner Wissens-Chatbot über Kundendokumente, RAG-gestützte Recherche/Support; anbindbar an mittwald AI Hosting.
- Feature-Hinweise: Dokumenten-Upload & RAG, KI-Agenten, mehrere Workspaces, Chat-Verlauf, Anbindung eigener LLM-/Embedding-Endpunkte.

### Task 5: changedetection  *(standalone, productivity)*
- SaaS-Alternative: Visualping, Distill.io.
- Gebündelte Services: changedetection.io + Browser (sockpuppetbrowser für JS-Seiten).
- Agentur-Winkel: Überwachung von Kunden- und Wettbewerber-Websites (Content-, Preis-, SEO-Änderungen), Benachrichtigung bei Änderungen.
- Feature-Hinweise: visuelle/Text-Diffs, CSS/XPath-Selektoren, Benachrichtigungen, geplante Prüfintervalle, Browser-Rendering für dynamische Seiten.

### Task 6: chroma  *(component, ai)*
- SaaS-Alternative: Pinecone, Weaviate Cloud.
- Gebündelte Services: Chroma (allein).
- Agentur-Winkel: Vektor-Backend hinter KI-Features in Kundenprojekten (Semantische Suche, RAG); als Baustein in bestehende Stacks.
- Feature-Hinweise: Embeddings speichern/abfragen, Collections, Metadaten-Filter, einfache API.

### Task 7: collabora  *(component, productivity)*
- SaaS-Alternative: Microsoft 365 / Google Docs (Office online).
- Gebündelte Services: Collabora Online (allein; WOPI-Backend).
- Agentur-Winkel: kollaborative Office-Bearbeitung als Baustein, typischerweise in Nextcloud eingebunden; für Team- und Kundendokumente.
- Feature-Hinweise: gemeinsame Bearbeitung von Text/Tabellen/Präsentationen im Browser, LibreOffice-Basis, WOPI-Integration.

### Task 8: directus  *(standalone, development)*
- SaaS-Alternative: Contentful, Strapi Cloud.
- Gebündelte Services: Directus + PostgreSQL + Redis.
- Agentur-Winkel: Headless-CMS-/Content-Backend für Kunden-Websites und Apps; API-first für beliebige Frontends.
- Feature-Hinweise: REST/GraphQL-API, Rollen/Rechte, Datenmodellierung auf beliebigen SQL-Datenbanken, Admin-Oberfläche, Assets/Uploads.

### Task 9: docmost  *(standalone, productivity)*
- SaaS-Alternative: Notion, Confluence.
- Gebündelte Services: Docmost + PostgreSQL + Redis.
- Agentur-Winkel: internes Wiki/Wissensmanagement, Kundendokumentation, Projekt-Handbücher.
- Feature-Hinweise: Echtzeit-Kollaboration, Spaces/Berechtigungen, Kommentare, Seitenhierarchie, Suche.

### Task 10: euro-office  *(component, productivity)*
- SaaS-Alternative: Microsoft Office Online, ONLYOFFICE Cloud.
- Gebündelte Services: Euro-Office Document Server (allein).
- Agentur-Winkel: Office-Dokumentbearbeitung als Baustein/Backend (europäischer ONLYOFFICE-Fork), z. B. in Nextcloud; Fokus Datensouveränität.
- Feature-Hinweise: Bearbeitung von Text/Tabellen/Präsentationen, JWT-gesicherte Integration, kompatibel zu gängigen Office-Formaten.

### Task 11: mariadb  *(component, development)*
- SaaS-Alternative: Managed MySQL (AWS RDS, PlanetScale).
- Gebündelte Services: MariaDB (allein).
- Agentur-Winkel: relationales Datenbank-Backend für Kundenanwendungen/CMS/Shops; als Baustein in bestehende Stacks.
- Feature-Hinweise: MySQL-kompatibel, Transaktionen, Replikation, breite Framework-Unterstützung, automatische Backups (Template-Cronjob).

### Task 12: n8n  *(standalone, productivity)*
- SaaS-Alternative: Zapier, Make.
- Gebündelte Services: n8n + externer Task-Runner + PostgreSQL.
- Agentur-Winkel: Automatisierung von Kunden-Onboarding, Reporting, Lead-Routing zwischen CRM/Newsletter/Tools; wiederkehrende Agentur-Workflows.
- Feature-Hinweise: 400+ Integrationen, visueller Workflow-Editor, eigener Code in Nodes, Webhooks, sichere Code-Ausführung im externen Runner.

### Task 13: nextcloud-euro-office  *(standalone, productivity)*
- SaaS-Alternative: Google Workspace, Microsoft 365, Dropbox.
- Gebündelte Services: Nextcloud + Euro-Office + MariaDB + Redis.
- Agentur-Winkel: Datei-/Kollaborationsplattform für Team und Kunden inkl. Online-Office; Datenaustausch in Kundenprojekten.
- Feature-Hinweise: Dateispeicher/Sync, Freigaben, integrierte Office-Bearbeitung (Euro-Office), Kalender/Kontakte, Versionierung.

### Task 14: opensearch  *(component, development)*
- SaaS-Alternative: Elastic Cloud, Algolia.
- Gebündelte Services: OpenSearch (allein).
- Agentur-Winkel: Such- und Log-/Analyse-Backend hinter Kundenanwendungen (Volltextsuche, Observability); als Baustein.
- Feature-Hinweise: Volltextsuche auf Lucene-Basis, Aggregationen, Log-Analyse, REST-API, Skalierung.

### Task 15: openwebui  *(standalone, ai)*
- SaaS-Alternative: gehostetes ChatGPT.
- Gebündelte Services: Open WebUI (allein).
- Agentur-Winkel: eigenes Chat-Interface für Teams/Kunden, angebunden an mittwald AI Hosting; KI-Nutzung ohne Weitergabe an Drittanbieter.
- Feature-Hinweise: Chat-Oberfläche für LLMs, mehrere Modelle/Endpunkte, Benutzerverwaltung, Prompt-/Verlaufsverwaltung.

### Task 16: paperless  *(standalone, productivity)*
- SaaS-Alternative: DocuWare, Cloud-DMS.
- Gebündelte Services: Paperless-ngx + PostgreSQL + Redis + Gotenberg + Tika.
- Agentur-Winkel: papierloses Dokumenten-/Rechnungsmanagement mit OCR und Volltextsuche für die Agentur.
- Feature-Hinweise: OCR (deu+eng), automatische Verschlagwortung, Volltextsuche, Korrespondenten/Dokumenttypen, Posteingang/Consume-Ordner.

### Task 17: password-pusher  *(standalone, security)*
- SaaS-Alternative: 1Password Send, SaaS-Secret-Sharing.
- Gebündelte Services: Password Pusher (allein).
- Agentur-Winkel: sicheres, ablaufendes Teilen von Zugangsdaten/Geheimnissen mit Kunden und im Team; eigenes Branding.
- Feature-Hinweise: selbstzerstörende Links, Ablauf nach Zeit/Aufrufen, Audit-Log, anpassbares Branding (Titel/Tagline).

### Task 18: postgresql  *(component, development)*
- SaaS-Alternative: Managed Postgres (AWS RDS, Supabase, Neon).
- Gebündelte Services: PostgreSQL (allein).
- Agentur-Winkel: leistungsfähiges relationales Datenbank-Backend für Kundenanwendungen; als Baustein in bestehende Stacks.
- Feature-Hinweise: ACID-Transaktionen, JSON/JSONB, Erweiterungen, Views/Trigger, breite Framework-Unterstützung, automatische Backups (Template-Cronjob).

### Task 19: qdrant  *(component, ai)*
- SaaS-Alternative: Pinecone.
- Gebündelte Services: Qdrant (allein).
- Agentur-Winkel: Vektor-Backend für RAG/Semantische Suche/Empfehlungen in KI-Kundenprojekten; als Baustein.
- Feature-Hinweise: schnelle Vektorähnlichkeitssuche, Metadaten-Filter, REST/gRPC-API, Dashboard, in Rust geschrieben.

### Task 20: solr  *(component, development)*
- SaaS-Alternative: Algolia, Elastic Cloud.
- Gebündelte Services: Apache Solr (allein).
- Agentur-Winkel: Such-Backend für Shops/Websites/Portale in Kundenprojekten; als Baustein.
- Feature-Hinweise: Volltext-/Facettensuche, Lucene-Basis, Ranking/Relevanz, Skalierung, breite Konnektoren.

### Task 21: vaultwarden  *(standalone, security)*
- SaaS-Alternative: 1Password, LastPass, Bitwarden (gehostet).
- Gebündelte Services: Vaultwarden + PostgreSQL.
- Agentur-Winkel: Team-Passwortverwaltung inkl. Kundenzugängen; Organisationen/Collections für getrennte Kundenkontexte.
- Feature-Hinweise: Bitwarden-kompatibel (alle Clients/Browser-Erweiterungen), Organisationen/Freigaben, 2FA, Admin-Bereich.

### Task 22: yopass  *(standalone, security)*
- SaaS-Alternative: One-Time-Secret-Dienste.
- Gebündelte Services: Yopass + Redis.
- Agentur-Winkel: verschlüsseltes, einmaliges Teilen sensibler Daten (Passwörter, Keys) mit Kunden/Team.
- Feature-Hinweise: Ende-zu-Ende-Verschlüsselung im Browser, Ablauf nach Zeit/einmaligem Abruf, keine dauerhafte Speicherung.

---

### Task 23: Konvention in AGENTS.md (+ README-Notiz) dokumentieren

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: AGENTS.md — Beschreibungs-Konvention ergänzen.**

Im Abschnitt `### manifest.yaml` (nach dem `help`-/categories-Block, vor `### Allgemein`) einfügen:

```markdown
- **`description`:** ausführlicher Katalogtext (~230–240 Wörter, mindestens 200) je Sprache, als **Markdown** (fett angeführter Toolname, eine „Zentrale Funktionen:"-Bullet-Liste, Absätze). Neutral, dritte Person, sachlich-informativ (keine Werbung). Aufbau: (1) Einordnung + konkret benannte self-hosted SaaS-Alternative, (2) Feature-Liste, (3) Relevanz für Werbe-/Web-/Digitalagenturen (Use-Cases in Kundenprojekten), (4) Betrieb bei mittwald (deutsche Rechenzentren) + DSGVO + Template-Inhalt + Wirtschaftlichkeit. Bei `component`-Templates stellt Block 3 das Tool als Baustein/Backend hinter Kundenanwendungen dar. Wortzahl prüfbar mit `python3 scripts/check_descriptions.py`.
```

- [ ] **Step 2: README.md — Feldtabelle präzisieren.**

Ersetze in der Feldtabelle die `description`-Zeile
`| \`description\`     | Ausführliche Beschreibung (mehrsprachig) ... |`
durch
`| \`description\`     | Ausführliche Beschreibung (mehrsprachig, Markdown, ~230–240 Wörter) |`

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: Beschreibungs-Konvention in AGENTS.md und README dokumentieren"
```

---

### Task 24: Abschluss — Gesamt-Validierung, PR

- [ ] **Step 1: Alle Beschreibungen ≥ 200 Wörter.** Run: `python3 scripts/check_descriptions.py` — alle 20 × de/en `OK`.
- [ ] **Step 2: Schema/CI grün.** Run: `check-jsonschema --schemafile manifest.schema.json */manifest.yaml` → `ok`.
- [ ] **Step 3: Store baubar.** Run: `./generate-index.sh` → `index.html generated with 20 templates.`
- [ ] **Step 4: Push + PR.**
  ```bash
  git push -u origin template-descriptions
  gh pr create --base main --title "Ausführliche Template-Beschreibungen (de/en, Markdown)" --body "..."
  ```

## Self-Review

- **Spec coverage:** Skelett (Global Constraints + Procedure), Tonalität/Alternativen/Format/Länge/Sprachen (Global Constraints), component-Sonderfall (Constraints + je Task-Typ markiert), Platzierung/Schema (Constraints), Store-Rendering (Task 2), mehrzeiliges Parsen (Task 2), Wortzahl-Sicherung (Task 1), AGENTS.md (Task 23, vom Nutzer explizit gefordert), alle 20 Templates (Tasks 3–22). Abgedeckt.
- **Placeholder scan:** Keine TBD/TODO. Copy für umami vollständig; übrige Templates mit konkreten Inputs (Alternative, Services, Winkel, Feature-Hinweise) — die Prosa wird bei Ausführung erzeugt (das ist die Arbeit), Vorgaben sind vollständig.
- **Type consistency:** Checker-CLI `python3 scripts/check_descriptions.py [template]` in allen Tasks konsistent referenziert; `mdToHtml` in Task 2 definiert und im Modal genutzt.
