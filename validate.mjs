#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import sharp from "sharp";
import YAML from "yaml";

import { findManifestPaths, isFile, repositoryRoot } from "./manifest-files.mjs";

const MIN_WIDTH = 1500;
const BG_RATIO_WIDTH = 3;
const BG_RATIO_HEIGHT = 2;

function displayPath(path) {
  return relative(repositoryRoot, path);
}

function formatSchemaError(manifestPath, error) {
  const location = error.instancePath || "";
  let detail = "";

  if (error.keyword === "additionalProperties") {
    detail = ` (${error.params.additionalProperty})`;
  } else if (error.keyword === "required") {
    detail = ` (${error.params.missingProperty})`;
  }

  return `${displayPath(manifestPath)}${location}: ${error.message}${detail}`;
}

async function validateScreenshot(errors, manifestPath, location, field, filename) {
  const imagePath = join(dirname(manifestPath), filename);
  let metadata;

  if (!(await isFile(imagePath))) {
    errors.push(`${location} -> ${displayPath(imagePath)} not found`);
    return;
  }

  try {
    metadata = await sharp(imagePath).metadata();
  } catch {
    errors.push(`${location} -> ${displayPath(imagePath)} is not a readable image`);
    return;
  }

  const { width, height } = metadata;
  if (!width || !height) {
    errors.push(`${location} -> ${displayPath(imagePath)} is not a readable image`);
    return;
  }

  if (width < MIN_WIDTH) {
    errors.push(
      `${location} -> ${displayPath(imagePath)} is ${width}x${height}, ` +
        `expected a width of at least ${MIN_WIDTH}px`,
    );
  }

  if (field === "bg" && width * BG_RATIO_HEIGHT !== height * BG_RATIO_WIDTH) {
    errors.push(
      `${location} -> ${displayPath(imagePath)} is ${width}x${height}, ` +
        `expected an aspect ratio of exactly ${BG_RATIO_WIDTH}:${BG_RATIO_HEIGHT}`,
    );
  }
}

const schema = JSON.parse(
  await readFile(join(repositoryRoot, "manifest.schema.json"), "utf8"),
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateManifest = ajv.compile(schema);
const errors = [];

for (const manifestPath of await findManifestPaths()) {
  let manifest;

  try {
    manifest = YAML.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`${displayPath(manifestPath)}: ${error.message}`);
    continue;
  }

  if (!validateManifest(manifest)) {
    for (const error of validateManifest.errors ?? []) {
      errors.push(formatSchemaError(manifestPath, error));
    }
  }

  if (!Array.isArray(manifest?.screenshots)) {
    continue;
  }

  for (const [index, screenshot] of manifest.screenshots.entries()) {
    for (const field of ["bg", "screenshot"]) {
      const filename = screenshot?.[field];
      if (typeof filename !== "string" || filename.length === 0) {
        continue;
      }

      const location = `${displayPath(manifestPath)}: screenshots[${index + 1}].${field}`;
      await validateScreenshot(errors, manifestPath, location, field, filename);
    }
  }
}

for (const error of errors) {
  console.error(`error: ${error}`);
}

console.log(`${errors.length} error(s)`);
process.exitCode = errors.length === 0 ? 0 : 1;
