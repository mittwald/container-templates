#!/usr/bin/env node

// Generates the "Vorhandene Templates" table in README.md from every
// <template>/manifest.yaml (folder name + tagline.de). Run `node gen-readme.mjs`
// to update the table, or `node gen-readme.mjs --check` to verify it is current
// (used in CI). The table is the single source of truth derived from manifests,
// so contributors never edit it by hand — which also avoids merge conflicts.

import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const ROOT = dirname(fileURLToPath(import.meta.url));
const README = join(ROOT, "README.md");
const START = "<!-- templates:start -->";
const END = "<!-- templates:end -->";
const NOTE =
  "<!-- AUTO-GENERATED from each template's manifest (tagline.de) by gen-readme.mjs. Do NOT edit by hand — it is regenerated automatically when changes are merged to main. -->";

async function collectTemplates() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  const templates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    let manifest;
    try {
      manifest = YAML.parse(await readFile(join(ROOT, entry.name, "manifest.yaml"), "utf8"));
    } catch {
      continue; // not a template directory
    }
    const tagline = manifest?.tagline?.de?.trim();
    if (!tagline) throw new Error(`${entry.name}: missing tagline.de`);
    templates.push({ name: entry.name, tagline });
  }
  templates.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return templates;
}

function renderTable(templates) {
  const rows = templates.map(
    (t) =>
      `| <img src="${t.name}/icon.svg" width="24" height="24" style="object-fit:contain"> | [${t.name}](${t.name}/) | ${t.tagline} |`,
  );
  return ["| | Template | Beschreibung |", "|---|----------|-------------|", ...rows].join("\n");
}

const templates = await collectTemplates();
const table = renderTable(templates);
const readme = await readFile(README, "utf8");

const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!pattern.test(readme)) {
  throw new Error(`README.md is missing the ${START} / ${END} markers`);
}
const next = readme.replace(pattern, `${START}\n${NOTE}\n${table}\n${END}`);

const check = process.argv.includes("--check");
if (check) {
  if (next !== readme) {
    console.error("README.md template table is out of date. Run `pnpm gen:readme`.");
    process.exit(1);
  }
  console.log(`README.md is up to date (${templates.length} templates).`);
} else if (next !== readme) {
  await writeFile(README, next);
  console.log(`Updated README.md (${templates.length} templates).`);
} else {
  console.log(`README.md already current (${templates.length} templates).`);
}
