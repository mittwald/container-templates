# Schema-Roadmap & Zukunftsfähigkeit

Dieses Dokument hält offene Architektur- und Zukunftsfähigkeits-Fragen zum
Manifest-Schema fest — Dinge, die die **aktuellen** Templates noch nicht
brauchen, aber nötig werden können, wenn der Katalog wächst. Es ist bewusst
ein lebendes Backlog, kein Blocker für bestehende Templates.

Grundlage ist die Diskussion rund um die Schema-Erweiterung (mehrsprachiger
`name`, `license`-Objekt, `type`, `help`, `domains.purpose`).

## Gesamteinschätzung

Das Schema ist für den aktuellen Stand solide und gut lesbar. Die größten
Risiken sind **nicht** einzelne fehlende Felder, sondern **Prozess und
Struktur**: Wie evolviert das Schema, und wo liegt die Quelle der Wahrheit?

## 1. Strukturelles Fundament (die teuren Themen)

- [ ] **Single Source of Truth klären.** Es gibt zwei Repräsentationen:
  `manifest.yaml` / `docker-compose.yml` hier und `templates.ts`
  (+ `configInfo`, i18n) in mStudio. Beobachtete Drift: Servicename `postgres`
  vs. Template `postgresql`, `dataType` mal vorhanden/mal nicht, `HOST` vs.
  `host`, Inline-de/en vs. i18n-Keys. Solange beide Seiten von Hand gepflegt
  werden, driften sie. Ziel: `templates.ts` / `configInfo` / i18n aus den
  Manifesten **generieren**, damit dieses Repo die Wahrheit ist.
- [ ] **JSON Schema + CI-Validierung.** Es gibt keine formale Schema-Definition
  für `manifest.yaml`. Genau die Inkonsistenzen, die wir gefunden haben
  (Lizenz-Format, `dataType`, Domain-`purpose`), würde ein Schema-Check im PR
  sofort fangen. Günstigste große Absicherung fürs Wachstum.
- [ ] **Versionierungs-Disziplin.** `manifestVersion` steht auf `1.0`, obwohl es
  bereits Breaking Changes gab (`name` String→Objekt, `license` String→Objekt).
  Nötig: Regeln, wann `manifestVersion` steigt und wie alte Manifeste weiter
  gültig bleiben (Optional/Required-Semantik).
- [ ] **Platzhalter-DSL spezifizieren.** In kurzer Zeit sind `${VAR}` (Compose,
  Deploy-Zeit), `${<service>.env.X}`, `${<service>.hostname}` und
  `${domain.<purpose>}` (Post-Install) entstanden — gleiche `${}`-Syntax,
  unterschiedliche Kontexte/Namespaces. Braucht: Grammatik, erlaubte Tokens
  (inkl. `-` in Servicenamen), evtl. `${<service>.port}` statt hartcodiertem
  Port, ein **Escaping** für literale `${…}`, und Klarheit, welcher Platzhalter
  in welchem Kontext gilt.

## 2. Felder, die wir bald brauchen könnten

- [ ] **`portMappings`** — im Prototyp vorhanden, bewusst vertagt. Nötig, sobald
  ein Template rohes TCP/UDP öffentlich exponieren muss (öffentlich erreichbare
  DB, Mail, Game-Server, Nicht-HTTP-Protokolle), inkl. `purpose`-artiger
  Referenzierung wie bei `domains`.
- [ ] **Cronjobs / geplante Tasks** — `templates.ts` modelliert `cronjobData`
  (pg/maria-Backups) explizit; hier läuft das über das Compose-Label
  `backup.command`. Zwei Mechanismen für dasselbe. Bei mehr Ops-Bedarf
  (Backups, Cleanup, Upgrade-Migrationen) lohnt ein First-Class-Feld.
- [ ] **Secret-Typen abgleichen** — `systemInputs` kann Länge/CharPool/Regex,
  aber `templates.ts` nutzt `hexsecret`, `hexsecret16`, `b64secret`, UUID.
  „Base64 mit N Bytes" oder „Hex Länge N" ist über Regeln nur umständlich
  abbildbar. Bei Templates mit spezifischen Key-Formaten (JWT, Encryption-Keys)
  relevant.
- [ ] **Ressourcen-Hinweise** — kein CPU/RAM-Feld, obwohl intern
  `ContainerResourceLimitsData` (cpuLimit/ramLimit) existiert. „min/empfohlen"
  hilft der Plattform bei Maschinenwahl/Warnung, gerade bei stark
  unterschiedlichen Templates.
- [ ] **Abhängigkeiten / Komposition** — heute ist jedes Template self-contained
  (bündelt eigenes Postgres). `type: component` (= „in bestehenden Stack
  deployen") deutet Komposition an, aber es fehlt ein Modell, um ein
  standalone-Template gegen eine **bestehende** Komponente zu verdrahten.
  Größter fachlicher Ausbau, falls weg von „alles gebündelt".

## 3. Qualität & Skalierung

- [ ] **i18n skaliert nicht** — de/en inline in jedem Feld jedes Manifests. Eine
  3. Sprache heißt „alles anfassen". Hängt eng an der SSOT-Frage (1).
- [ ] **Sensible Werte** — `help` zeigt Passwörter/Tokens/Connection-Strings;
  mStudio maskiert per Namensmuster (`password|token|secret|pass`). Ein
  explizites `sensitive: true` am `help`-Eintrag wäre robuster als Namensraten.
- [ ] **Update-/Tag-Policy** — Images nutzen `:latest`, `:v1`, `:lts`; `version`
  ist nur Anzeige. Für Reproduzierbarkeit/Update-Kanäle braucht es irgendwann
  eine Politik.
- [ ] **Discoverability** — `categories` ist ein festes 8er-Enum; Tags,
  Reifegrad/Stabilität, „featured" fehlen für einen größeren Store.

## Priorisierung

Zuerst angehen — diese Punkte werden mit jedem weiteren Template teurer:

1. **JSON Schema + CI** (Abschnitt 1)
2. **Single Source of Truth** klären — wird `templates.ts` generiert oder von
   Hand gepflegt? (Abschnitt 1)
3. **Platzhalter-DSL** spezifizieren (Abschnitt 1)
