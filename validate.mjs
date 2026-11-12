#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import sharp from "sharp";
import YAML from "yaml";

const MIN_WIDTH = 1500;
const BG_RATIO_WIDTH = 3;
const BG_RATIO_HEIGHT = 2;
const REQUIRED_TEMPLATE_FILES = ["docker-compose.yml", "manifest.yaml", "icon.svg"];
const DEFAULT_VALUE_PLACEHOLDERS = new Set([
  "user.email",
  "user.username",
  "user.firstName",
  "user.lastName",
  "user.fullName",
  "aiHosting.llmEndpoint",
]);
const IGNORED_DIRECTORIES = new Set(["node_modules"]);
const repositoryRoot = dirname(fileURLToPath(import.meta.url));

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return false;
    }
    throw error;
  }
}

async function findTemplateManifestPaths(errors) {
  const entries = await readdir(repositoryRoot, { withFileTypes: true });
  const directories = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !IGNORED_DIRECTORIES.has(entry.name),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const manifestPaths = [];

  for (const directory of directories) {
    const fileChecks = await Promise.all(
      REQUIRED_TEMPLATE_FILES.map(async (filename) => ({
        filename,
        exists: await isFile(join(repositoryRoot, directory.name, filename)),
      })),
    );

    if (!fileChecks.some(({ exists }) => exists)) {
      continue;
    }

    for (const { filename, exists } of fileChecks) {
      if (!exists) {
        errors.push(`${directory.name}/${filename}: required template file not found`);
      }
    }

    if (fileChecks.find(({ filename }) => filename === "manifest.yaml")?.exists) {
      manifestPaths.push(join(repositoryRoot, directory.name, "manifest.yaml"));
    }
  }

  return manifestPaths;
}

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

function validateDefaultValues(errors, manifestPath, manifest) {
  const userInputs = Array.isArray(manifest?.userInputs) ? manifest.userInputs : [];

  for (const input of userInputs) {
    if (typeof input?.defaultValue !== "string") {
      continue;
    }

    for (const [match, placeholder] of input.defaultValue.matchAll(/\$?\{([^{}]*)\}/g)) {
      const location = `${displayPath(manifestPath)}: userInputs -> ${input.name}: defaultValue`;

      if (!match.startsWith("$")) {
        errors.push(`${location} uses {${placeholder}}, expected \${${placeholder}}`);
      } else if (!DEFAULT_VALUE_PLACEHOLDERS.has(placeholder)) {
        errors.push(`${location} uses unknown placeholder \${${placeholder}}`);
      }
    }
  }
}

// The presentation (dataType, format, description, errorMessage, options) is
// part of the manifest; the validationSchema only validates. The container
// service rejects a manifest whose enum does not fit its dataType, so these
// checks mirror its rules.
const ENUM_BY_DATA_TYPE = {
  boolean: ["false", "true"],
  consent: ["true"],
};
// JSON Schema formats the backend validates; presentation-only formats belong
// in the format field.
const SCHEMA_FORMATS = new Set(["email"]);

function sameValues(a, b) {
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.length === sortedB.length && sortedA.every((value, index) => value === sortedB[index]);
}

function validateInputSchemas(errors, manifestPath, manifest) {
  const userInputs = Array.isArray(manifest?.userInputs) ? manifest.userInputs : [];

  for (const input of userInputs) {
    if (typeof input?.validationSchema !== "string") {
      continue;
    }

    const location = `${displayPath(manifestPath)}: userInputs -> ${input.name}`;
    let validationSchema;

    try {
      validationSchema = JSON.parse(input.validationSchema);
    } catch (error) {
      errors.push(`${location}: validationSchema is not valid JSON: ${error.message}`);
      continue;
    }

    if (validationSchema?.type !== undefined && validationSchema.type !== "string") {
      errors.push(`${location}: validationSchema needs "type": "string", user input values are always strings`);
    }

    for (const key of Object.keys(validationSchema ?? {}).filter((key) => key.startsWith("x-"))) {
      errors.push(`${location}: validationSchema has "${key}", use the manifest fields for presentation`);
    }

    const schemaFormat = validationSchema?.format;
    if (schemaFormat !== undefined && !SCHEMA_FORMATS.has(schemaFormat)) {
      errors.push(`${location}: validationSchema has "format": "${schemaFormat}", use format: ${schemaFormat}`);
    }
    if (schemaFormat === "email" && input.format !== "email") {
      errors.push(`${location}: validates an email address and needs format: email`);
    }

    // Without errorMessage mStudio shows the raw regex to the user.
    if (validationSchema?.pattern !== undefined && input.errorMessage === undefined) {
      errors.push(`${location}: needs an errorMessage for the "pattern" of its validationSchema`);
    }
    if (validationSchema?.pattern === undefined && input.errorMessage !== undefined) {
      errors.push(`${location}: has an errorMessage without a "pattern" in its validationSchema`);
    }

    const values = validationSchema?.enum;
    if (values !== undefined && (!Array.isArray(values) || values.some((value) => typeof value !== "string"))) {
      errors.push(`${location}: validationSchema needs string values in "enum"`);
      continue;
    }

    const dataType = input.dataType ?? "text";
    if (input.options !== undefined && dataType !== "select") {
      errors.push(`${location}: has options and needs dataType select`);
    }
    if (input.format !== undefined && dataType !== "text") {
      errors.push(`${location}: has a format, which only text inputs support`);
    }

    if (dataType === "text") {
      if (values !== undefined) {
        errors.push(`${location}: has an "enum" in its validationSchema and needs dataType boolean, consent or select`);
      }
      continue;
    }

    if (dataType === "select") {
      if (!Array.isArray(input.options)) {
        errors.push(`${location}: dataType select needs options`);
      }
      const optionValues = Array.isArray(input.options) ? input.options.map((option) => option?.value) : [];
      if (new Set(optionValues).size !== optionValues.length) {
        errors.push(`${location}: has duplicate option values`);
      }
      if (!sameValues(values ?? [], optionValues)) {
        errors.push(`${location}: option values must match the "enum" of its validationSchema`);
      }
      continue;
    }

    const expected = ENUM_BY_DATA_TYPE[dataType];
    if (expected && !sameValues(values ?? [], expected)) {
      errors.push(`${location}: dataType ${dataType} needs "enum": ${JSON.stringify(expected)} in its validationSchema`);
    }
  }
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
const manifestPaths = await findTemplateManifestPaths(errors);

for (const manifestPath of manifestPaths) {
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

  validateDefaultValues(errors, manifestPath, manifest);
  validateInputSchemas(errors, manifestPath, manifest);

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
