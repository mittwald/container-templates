#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

import YAML from "yaml";

import { findManifestPaths } from "./manifest-files.mjs";

const templates = [];

for (const manifestPath of await findManifestPaths()) {
  const manifest = YAML.parse(await readFile(manifestPath, "utf8"));
  const name = basename(dirname(manifestPath));
  templates.push({
    name,
    displayName: manifest.name ?? { de: name, en: name },
    version: String(manifest.version ?? ""),
    icon: "icon.svg",
    developer: manifest.developer ?? "",
    website: manifest.website ?? "",
    repository: manifest.repository ?? "",
    license: manifest.license?.name ?? "",
    tagline: manifest.tagline ?? {},
    description: { de: manifest.description?.de ?? "" },
    categories: manifest.categories ?? [],
  });
}

process.stdout.write(JSON.stringify(templates));
