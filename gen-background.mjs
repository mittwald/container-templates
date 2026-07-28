#!/usr/bin/env node
// Erzeugt background.jpg für Katalog-Screenshots aus den Farben eines Templates.
// Die Farben stammen aus icon.svg oder wahlweise aus einem Screenshot; das
// Ergebnis ist ein weicher Verlauf im Seitenverhältnis 3:2 (siehe README).

import { readdir, access } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import sharp from "sharp";
import YAML from "yaml";
import { readFile } from "node:fs/promises";

const DEFAULT_WIDTH = 3000;
const RATIO_WIDTH = 3;
const RATIO_HEIGHT = 2;
const SAMPLE_SIZE = 160;
const GRID_WIDTH = 9;
const GRID_HEIGHT = 6;
const OUTPUT_NAME = "background.jpg";

function printHelp() {
  console.log(`Hintergrundbilder aus den Farben eines Templates erzeugen

Usage:
  pnpm gen:background <template> [<template> ...] [options]
  pnpm gen:background --all [options]

Options:
  --from icon|screenshot   Farbquelle (Standard: icon)
  --width <px>             Breite des Ergebnisses (Standard: ${DEFAULT_WIDTH}, Höhe folgt aus 3:2)
  --force                  vorhandenes ${OUTPUT_NAME} überschreiben
  --dry-run                nur die ermittelte Farbpalette ausgeben
  --help                   diese Hilfe

Das Ergebnis liegt als <template>/${OUTPUT_NAME}.`);
}

// --- Farbraum ---------------------------------------------------------------

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}

// --- Palette ----------------------------------------------------------------

async function extractPalette(imagePath) {
  const { data, info } = await sharp(imagePath, { density: 200 })
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Farben nach Farbton bündeln; unbunte und sehr helle/dunkle Pixel fallen raus,
  // weil sie als Bühnenfarbe nichts hergeben.
  const buckets = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3] ?? 255];
    if (a < 128) continue;
    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < 0.18 || l < 0.12 || l > 0.92) continue;
    const key = Math.round(h * 24) % 24;
    const entry = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, weight: 0 };
    const weight = s;
    entry.count += 1;
    entry.weight += weight;
    entry.r += r * weight;
    entry.g += g * weight;
    entry.b += b * weight;
    buckets.set(key, entry);
  }

  const candidates = [...buckets.values()]
    .filter((entry) => entry.count >= 3)
    .sort((a, b) => b.count - a.count)
    .map((entry) => [
      Math.round(entry.r / entry.weight),
      Math.round(entry.g / entry.weight),
      Math.round(entry.b / entry.weight),
    ]);

  // Häufigkeit allein liefert oft denselben Farbton in zwei Helligkeiten und
  // damit einen faden Verlauf. Deshalb greedy nach Farbton-Abstand auswählen.
  const selected = [];
  const used = new Set();
  for (const minDistance of [0.09, 0.05, 0]) {
    for (const [index, candidate] of candidates.entries()) {
      if (selected.length === 3) break;
      if (used.has(index)) continue;
      const [h] = rgbToHsl(...candidate);
      const farEnough = selected.every(([sh]) => {
        const delta = Math.abs(sh - h);
        return Math.min(delta, 1 - delta) >= minDistance;
      });
      if (farEnough) {
        selected.push([h, candidate]);
        used.add(index);
      }
    }
    if (selected.length === 3) break;
  }

  return selected.map(([, color]) => color);
}

// Zu wenige Farben ergeben keinen Verlauf: aus vorhandenen Tönen benachbarte
// Farbtöne ableiten, notfalls auf ein neutrales Blau zurückfallen.
function ensureThreeColors(colors) {
  if (colors.length === 0) return [[86, 130, 214], [126, 108, 208], [92, 176, 214]];
  const result = [...colors];
  while (result.length < 3) {
    const [h, s, l] = rgbToHsl(...result[result.length - 1]);
    const shifted = (h + 0.11 * result.length) % 1;
    result.push(hslToRgb(shifted, Math.max(0.35, s * 0.9), Math.min(0.72, l + 0.06)));
  }
  return result;
}

// Bühnenfarben sind hell: der Screenshot liegt darüber und muss lesbar bleiben.
function toStageColor(rgb, lightness) {
  const [h, s] = rgbToHsl(...rgb);
  return hslToRgb(h, Math.min(0.78, Math.max(0.42, s * 0.92)), lightness);
}

// --- Verlauf ----------------------------------------------------------------

function hash(text) {
  let value = 5381;
  for (const char of text) value = ((value * 33) ^ char.charCodeAt(0)) >>> 0;
  return value;
}

function buildGradient(colors, seed) {
  const rng = hash(seed);
  // Ankerpunkte deterministisch aus dem Templatenamen ableiten, damit dasselbe
  // Template immer denselben Hintergrund bekommt.
  const anchors = [
    { x: 0.08 + ((rng >> 2) % 20) / 100, y: 0.72 + ((rng >> 5) % 20) / 100, color: toStageColor(colors[0], 0.62) },
    { x: 0.78 + ((rng >> 8) % 18) / 100, y: 0.80 + ((rng >> 11) % 16) / 100, color: toStageColor(colors[1], 0.68) },
    { x: 0.30 + ((rng >> 14) % 30) / 100, y: 0.14 + ((rng >> 17) % 14) / 100, color: toStageColor(colors[2], 0.86) },
    { x: 0.68 + ((rng >> 20) % 20) / 100, y: 0.20 + ((rng >> 23) % 18) / 100, color: [255, 255, 255] },
    { x: 0.05, y: 0.05, color: [255, 255, 255] },
  ];

  const pixels = Buffer.alloc(GRID_WIDTH * GRID_HEIGHT * 3);
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const px = (x + 0.5) / GRID_WIDTH;
      const py = (y + 0.5) / GRID_HEIGHT;
      let totalWeight = 0;
      const acc = [0, 0, 0];
      for (const anchor of anchors) {
        const dx = px - anchor.x;
        const dy = py - anchor.y;
        const weight = 1 / (dx * dx + dy * dy + 0.02) ** 1.35;
        totalWeight += weight;
        acc[0] += anchor.color[0] * weight;
        acc[1] += anchor.color[1] * weight;
        acc[2] += anchor.color[2] * weight;
      }
      const offset = (y * GRID_WIDTH + x) * 3;
      pixels[offset] = Math.min(255, Math.round(acc[0] / totalWeight));
      pixels[offset + 1] = Math.min(255, Math.round(acc[1] / totalWeight));
      pixels[offset + 2] = Math.min(255, Math.round(acc[2] / totalWeight));
    }
  }
  return pixels;
}

async function renderBackground(pixels, width, outputPath) {
  const height = Math.round((width * RATIO_HEIGHT) / RATIO_WIDTH);
  await sharp(pixels, { raw: { width: GRID_WIDTH, height: GRID_HEIGHT, channels: 3 } })
    .resize(width, height, { kernel: "cubic" })
    .blur(Math.max(1, Math.round(width / 90)))
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(outputPath);
  return height;
}

// --- Quellen ----------------------------------------------------------------

async function isFile(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveSource(template, from) {
  if (from === "icon") {
    const icon = join(template, "icon.svg");
    if (!(await isFile(icon))) throw new Error(`${template}: icon.svg fehlt`);
    return icon;
  }

  const manifestPath = join(template, "manifest.yaml");
  const manifest = YAML.parse(await readFile(manifestPath, "utf8"));
  const first = manifest?.screenshots?.[0]?.screenshot;
  if (!first) throw new Error(`${template}: kein Screenshot im Manifest, --from icon verwenden`);
  const path = join(template, first);
  if (!(await isFile(path))) throw new Error(`${template}: ${first} nicht gefunden`);
  return path;
}

async function listTemplates() {
  const entries = await readdir(".", { withFileTypes: true });
  const templates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
    if (await isFile(join(entry.name, "manifest.yaml"))) templates.push(entry.name);
  }
  return templates.sort();
}

// --- CLI --------------------------------------------------------------------

function parseArguments(argv) {
  const options = { from: "icon", width: DEFAULT_WIDTH, force: false, dryRun: false, all: false };
  const templates = [];
  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (argument === "--help" || argument === "-h") return { help: true, templates, options };
    else if (argument === "--all") options.all = true;
    else if (argument === "--force") options.force = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--from") options.from = argv[++i];
    else if (argument === "--width") options.width = Number.parseInt(argv[++i], 10);
    else if (argument.startsWith("-")) throw new Error(`unbekannte Option ${argument}`);
    else templates.push(argument.replace(/\/$/, ""));
  }
  if (!["icon", "screenshot"].includes(options.from)) {
    throw new Error(`--from erwartet "icon" oder "screenshot"`);
  }
  if (!Number.isInteger(options.width) || options.width < 1500) {
    throw new Error("--width erwartet mindestens 1500 (Vorgabe aus validate.mjs)");
  }
  return { help: false, templates, options };
}

async function main() {
  const { help, templates, options } = parseArguments(process.argv.slice(2));
  if (help || (templates.length === 0 && !options.all)) {
    printHelp();
    return;
  }

  const targets = options.all ? await listTemplates() : templates;
  let written = 0;
  let skipped = 0;

  for (const template of targets) {
    const outputPath = join(template, OUTPUT_NAME);
    try {
      if (!options.dryRun && !options.force && (await isFile(outputPath))) {
        console.log(`${template}: ${OUTPUT_NAME} existiert bereits, --force zum Überschreiben`);
        skipped += 1;
        continue;
      }

      const source = await resolveSource(template, options.from);
      const palette = ensureThreeColors(await extractPalette(source));
      const swatches = palette
        .map((c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`)
        .join(" ");

      if (options.dryRun) {
        console.log(`${template}: ${swatches}  (Quelle: ${source})`);
        continue;
      }

      const height = await renderBackground(buildGradient(palette, template), options.width, outputPath);
      console.log(`${template}: ${OUTPUT_NAME} ${options.width}x${height} aus ${swatches}`);
      written += 1;
    } catch (error) {
      console.error(`${template}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  if (!options.dryRun && targets.length > 1) {
    console.log(`\n${written} erzeugt, ${skipped} übersprungen.`);
  }
}

await main();
