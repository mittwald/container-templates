#!/usr/bin/env node

import { randomInt, X509Certificate } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "node:net";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

const repositoryRoot = dirname(fileURLToPath(import.meta.url));
const devRoot = join(repositoryRoot, ".dev");
const appsRoot = join(devRoot, "apps");
const proxyRoot = join(devRoot, "proxy");
const proxyComposePath = join(proxyRoot, "compose.yaml");
const caddyfilePath = join(proxyRoot, "Caddyfile");
const rootCertificatePath = join(proxyRoot, "root.crt");
const devNetworkName = "container-templates-dev";
const devNetworkKey = "template-dev";
const proxyProjectName = "ct-dev-proxy";
const rootCertificateInContainer =
  "/data/caddy/pki/authorities/local/root.crt";
const ajv = new Ajv2020({ allErrors: true, coerceTypes: true, strict: false });
addFormats(ajv);
ajv.addFormat("password", { type: "string", validate: () => true });
ajv.addFormat("url", {
  type: "string",
  validate: (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  },
});

function printHelp() {
  console.log(`Local HTTPS runner for container templates

Usage:
  pnpm app <template> up [--pull] [--no-wait] [--set NAME=VALUE]
                           [--publish [SERVICE=][HOST_PORT:]CONTAINER_PORT]
  pnpm app <template> down
  pnpm app <template> logs
  pnpm app <template> reset
  pnpm app <template> config [--set NAME=VALUE]
  pnpm app <template> values
  pnpm app status
  pnpm app proxy up|down|logs
  pnpm app trust
  pnpm app untrust

Examples:
  pnpm app n8n up
  pnpm app postgresql up --publish 5432
  pnpm app postgresql up --publish 15432:5432
  pnpm app bugsink up --set ADMIN_EMAIL=me@example.test
  pnpm app shlink logs

Generated files and persistent local values are stored below .dev/.`);
}

function parseArguments(arguments_) {
  if (arguments_.length === 0 || arguments_.includes("--help") || arguments_.includes("-h")) {
    return { command: "help", options: {} };
  }

  if (["status", "trust", "untrust"].includes(arguments_[0])) {
    if (arguments_.length > 1) {
      throw new Error(`${arguments_[0]} does not accept additional arguments`);
    }
    return { command: arguments_[0], options: {} };
  }

  if (arguments_[0] === "proxy") {
    const action = arguments_[1] ?? "up";
    if (!["down", "logs", "up"].includes(action) || arguments_.length > 2) {
      throw new Error("proxy expects one of: up, down, logs");
    }
    return { command: `proxy-${action}`, options: {} };
  }

  const template = arguments_[0];
  let command = "up";
  let index = 1;
  if (arguments_[1] && !arguments_[1].startsWith("-")) {
    command = arguments_[1];
    index = 2;
  }

  const options = { publishes: [], pull: false, wait: true, values: {} };
  while (index < arguments_.length) {
    const argument = arguments_[index];

    if (argument === "--pull") {
      options.pull = true;
      index += 1;
      continue;
    }
    if (argument === "--no-wait") {
      options.wait = false;
      index += 1;
      continue;
    }
    if (argument === "--publish" || argument.startsWith("--publish=")) {
      const publish = argument === "--publish"
        ? arguments_[index + 1]
        : argument.slice("--publish=".length);
      if (!publish || publish.startsWith("-")) {
        throw new Error("--publish expects [SERVICE=][HOST_PORT:]CONTAINER_PORT");
      }
      options.publishes.push(publish);
      index += argument === "--publish" ? 2 : 1;
      continue;
    }

    let assignment;
    if (argument === "--set") {
      assignment = arguments_[index + 1];
      index += 2;
    } else if (argument.startsWith("--set=")) {
      assignment = argument.slice("--set=".length);
      index += 1;
    } else {
      throw new Error(`unknown option: ${argument}`);
    }

    const separator = assignment?.indexOf("=") ?? -1;
    if (separator < 1) {
      throw new Error("--set expects NAME=VALUE");
    }
    options.values[assignment.slice(0, separator)] = assignment.slice(separator + 1);
  }

  return { command, options, template };
}

async function run(command, arguments_, { allowFailure = false, capture = false } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: repositoryRoot,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";

    if (capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code: code ?? 1, stderr, stdout };
      if (result.code === 0 || allowFailure) {
        resolve(result);
        return;
      }
      const detail = capture && stderr.trim() ? `\n${stderr.trim()}` : "";
      reject(new Error(`${command} exited with code ${result.code}${detail}`));
    });
  });
}

async function ensureDockerAvailable() {
  const result = await run("docker", ["info", "--format", "{{.ServerVersion}}"], {
    allowFailure: true,
    capture: true,
  });
  if (result.code !== 0) {
    const detail = result.stderr.trim() || "Docker did not return a server version";
    throw new Error(`Docker is not available: ${detail}`);
  }
}

async function portHasListener(port) {
  return await new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(750);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function assertPortsAvailable(ports, context) {
  const occupied = [];
  for (const port of ports) {
    if (await portHasListener(port)) {
      occupied.push(port);
    }
  }
  if (occupied.length > 0) {
    throw new Error(
      `${context} cannot start because ${occupied.map((port) => `127.0.0.1:${port}`).join(", ")} ` +
        "is already in use",
    );
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function slugify(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function projectName(template) {
  return `ct-${slugify(template)}`;
}

function appDirectory(template) {
  return join(appsRoot, template);
}

function appFile(template, filename) {
  return join(appDirectory(template), filename);
}

async function readYaml(path) {
  return YAML.parse(await readFile(path, "utf8"));
}

async function loadTemplate(template) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(template)) {
    throw new Error(`invalid template name: ${template}`);
  }

  const templateRoot = join(repositoryRoot, template);
  let manifest;
  let compose;
  try {
    [manifest, compose] = await Promise.all([
      readYaml(join(templateRoot, "manifest.yaml")),
      readYaml(join(templateRoot, "docker-compose.yml")),
    ]);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`template not found: ${template}`);
    }
    throw error;
  }

  if (!compose?.services || typeof compose.services !== "object") {
    throw new Error(`${template}/docker-compose.yml does not define services`);
  }

  return { compose, manifest, template, templateRoot };
}

function domainHostname(template, domain, domainCount) {
  if (domainCount === 1) {
    return `${template}.localhost`;
  }
  return `${slugify(domain.purpose)}.${template}.localhost`;
}

function domainValues(template, manifest) {
  const domains = Array.isArray(manifest.domains) ? manifest.domains : [];
  return Object.fromEntries(
    domains.map((domain) => [
      domain.userInput,
      domainHostname(template, domain, domains.length),
    ]),
  );
}

function parseValidationSchema(input) {
  try {
    return JSON.parse(input.validationSchema);
  } catch (error) {
    throw new Error(`invalid validationSchema for ${input.name}: ${error.message}`);
  }
}

function repeatToLength(value, minimumLength) {
  let result = value;
  while (result.length < minimumLength) {
    result += value;
  }
  return result.slice(0, Math.max(value.length, minimumLength));
}

function defaultUserValue(input) {
  if (input.defaultValue !== undefined) {
    return String(input.defaultValue);
  }
  if (!input.required) {
    return "";
  }

  const schema = parseValidationSchema(input);
  const minimumLength = Math.max(1, schema.minLength ?? 1);
  const name = input.name.toUpperCase();
  let value;

  if (input.format === "email" || schema.format === "email" || name.endsWith("_EMAIL")) {
    value = "admin@example.test";
  } else if (input.format === "password" || schema.format === "password" || name.includes("PASSWORD")) {
    value = "DevPassword123!";
  } else if (name.endsWith("_USER") || name.endsWith("_USERNAME")) {
    value = "admin";
  } else if (name === "DATABASE_NAME") {
    value = "app";
  } else if (name === "BRAND_TITLE") {
    value = "Local Password Pusher";
  } else if (name === "BRAND_TAGLINE") {
    value = "Local development";
  } else if (name.includes("TOKEN") || name.includes("SECRET")) {
    value = "DevToken1234567890";
  } else {
    value = "local";
  }

  return repeatToLength(value, minimumLength);
}

function randomCharacter(alphabet) {
  return alphabet[randomInt(alphabet.length)];
}

function shuffled(value) {
  const characters = [...value];
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters.join("");
}

const characterPools = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  special: "!@#%_+-=",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

function systemInputRules(input) {
  if (input.schema?.kind !== 1) {
    throw new Error(`${input.name} uses unsupported system input kind: ${input.schema?.kind}`);
  }
  const rules = input.schema?.schema;
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error(`${input.name} does not define system input rules`);
  }

  for (const rule of rules) {
    if (!new Set(["charPool", "length", "regex"]).has(rule.ruleType)) {
      throw new Error(`${input.name} uses unsupported system rule: ${rule.ruleType}`);
    }
    if (rule.identifier && !new Set(["hex", "numbers"]).has(rule.identifier)) {
      throw new Error(`${input.name} uses unsupported system rule identifier: ${rule.identifier}`);
    }
    if (rule.ruleType === "charPool") {
      if (!Array.isArray(rule.charPools) || rule.charPools.length === 0) {
        throw new Error(`${input.name} has a charPool rule without character pools`);
      }
      for (const pool of rule.charPools) {
        if (!characterPools[pool]) {
          throw new Error(`${input.name} uses unsupported character pool: ${pool}`);
        }
      }
    }
    if (rule.ruleType !== "length" && rule.max !== undefined) {
      throw new Error(`${input.name} uses unsupported maximum on ${rule.ruleType} rule`);
    }
    if (rule.ruleType === "regex" && !new Set(["[A-Z]", "[a-z]"]).has(rule.pattern)) {
      throw new Error(`${input.name} uses unsupported system regex: ${rule.pattern}`);
    }
  }
  return rules;
}

function countPatternMatches(value, pattern) {
  return [...value.matchAll(new RegExp(pattern, "g"))].length;
}

function validateSystemValue(input, value) {
  const rules = systemInputRules(input);
  for (const rule of rules) {
    const minimum = Number(rule.min) || 0;
    if (rule.ruleType === "length") {
      if (value.length < minimum || (rule.max !== undefined && value.length > rule.max)) {
        throw new Error(
          `${input.name} must have a length between ${minimum} and ${rule.max ?? "infinity"}`,
        );
      }
    } else if (rule.ruleType === "charPool") {
      const alphabet = rule.charPools.map((pool) => characterPools[pool]).join("");
      const matches = [...value].filter((character) => alphabet.includes(character)).length;
      if (matches < minimum) {
        throw new Error(`${input.name} does not satisfy its ${rule.identifier ?? "character"} rule`);
      }
    } else if (countPatternMatches(value, rule.pattern) < minimum) {
      throw new Error(`${input.name} does not satisfy system pattern ${rule.pattern}`);
    }
  }
}

function generateSystemValue(input) {
  const rules = systemInputRules(input);
  const lengthRules = rules.filter((rule) => rule.ruleType === "length");
  const minimumLength = Math.max(0, ...lengthRules.map((rule) => Number(rule.min) || 0));
  const maximumLength = Math.min(
    Infinity,
    ...lengthRules
      .filter((rule) => rule.max !== undefined)
      .map((rule) => Number(rule.max)),
  );
  if (maximumLength < minimumLength) {
    throw new Error(`${input.name} has incompatible minimum and maximum lengths`);
  }
  const targetLength = Math.min(Math.max(24, minimumLength), maximumLength);
  const useHex = rules.some((rule) => rule.identifier === "hex");
  const alphabet = useHex
    ? "abcdef0123456789"
    : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const required = [];

  for (const rule of rules) {
    const count = Number(rule.min) || 0;
    if (rule.ruleType === "regex" && rule.pattern === "[A-Z]") {
      required.push(...Array.from({ length: count }, () => randomCharacter("ABCDEFGHIJKLMNOPQRSTUVWXYZ")));
    } else if (rule.ruleType === "regex" && rule.pattern === "[a-z]") {
      required.push(...Array.from({ length: count }, () => randomCharacter("abcdefghijklmnopqrstuvwxyz")));
    } else if (rule.ruleType === "charPool") {
      const pool = rule.charPools.map((name) => characterPools[name]).join("");
      required.push(...Array.from({ length: count }, () => randomCharacter(pool)));
    }
  }

  if (required.length > targetLength) {
    throw new Error(`${input.name} requires more characters than its maximum length allows`);
  }
  while (required.length < targetLength) {
    required.push(randomCharacter(alphabet));
  }
  const value = shuffled(required.join(""));
  validateSystemValue(input, value);
  return value;
}

async function readSavedValues(template) {
  try {
    return JSON.parse(await readFile(appFile(template, "values.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function validateUserValue(input, value) {
  if (!input.required && value === "") {
    return;
  }
  if (input.required && value === "") {
    throw new Error(`${input.name} is required`);
  }
  const schema = parseValidationSchema(input);
  if (input.format && !schema.format) {
    schema.format = input.format;
  }
  const validate = ajv.compile(schema);
  if (!validate(value)) {
    const details = ajv.errorsText(validate.errors, { separator: "; " });
    throw new Error(`${input.name} is invalid: ${details}`);
  }
}

async function createValues(templateData, overrides) {
  const { manifest, template } = templateData;
  const inputs = [
    ...(Array.isArray(manifest.userInputs) ? manifest.userInputs : []),
    ...(Array.isArray(manifest.systemInputs) ? manifest.systemInputs : []),
  ];
  const knownNames = new Set(inputs.map((input) => input.name));
  for (const name of Object.keys(overrides)) {
    if (!knownNames.has(name)) {
      throw new Error(`unknown input for ${template}: ${name}`);
    }
  }

  const saved = await readSavedValues(template);
  const domains = domainValues(template, manifest);
  const values = { ...saved };

  for (const input of manifest.userInputs ?? []) {
    if (values[input.name] === undefined) {
      values[input.name] = domains[input.name] ?? defaultUserValue(input);
    }
  }
  for (const input of manifest.systemInputs ?? []) {
    if (values[input.name] === undefined) {
      values[input.name] = generateSystemValue(input);
    }
    try {
      validateSystemValue(input, String(values[input.name]));
    } catch (error) {
      throw new Error(`${error.message}; provide a valid value with --set ${input.name}=...`);
    }
  }
  Object.assign(values, overrides);

  for (const input of manifest.userInputs ?? []) {
    validateUserValue(input, String(values[input.name] ?? ""));
  }

  return values;
}

async function writeValuesFile(template, values) {
  await mkdir(appDirectory(template), { recursive: true });
  const valuesPath = appFile(template, "values.json");
  await writeFile(valuesPath, `${JSON.stringify(values, null, 2)}\n`, { mode: 0o600 });
  await chmod(valuesPath, 0o600);
}

function quoteEnvironmentValue(value) {
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

async function writeEnvironmentFile(template, values) {
  const content = Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${quoteEnvironmentValue(value)}`)
    .join("\n");
  const path = appFile(template, "compose.env");
  await writeFile(path, `${content}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
  return path;
}

function parsePort(value, specification) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid port in --publish ${specification}: ${value}`);
  }
  return port;
}

function parsePublishSpecifications(templateData, specifications) {
  const serviceNames = Object.keys(templateData.compose.services);
  const publishedHostPorts = new Set();

  return specifications.map((specification) => {
    const assignmentParts = specification.split("=");
    if (assignmentParts.length > 2) {
      throw new Error(`invalid --publish value: ${specification}`);
    }
    const service = assignmentParts.length === 2 ? assignmentParts[0] : undefined;
    const portSpecification = assignmentParts.at(-1);
    const portParts = portSpecification.split(":");
    if (portParts.length > 2) {
      throw new Error(`invalid --publish value: ${specification}`);
    }

    const resolvedService = service ?? (serviceNames.length === 1 ? serviceNames[0] : undefined);
    if (!resolvedService) {
      throw new Error(
        `${templateData.template} has multiple services; use --publish SERVICE=HOST_PORT:CONTAINER_PORT`,
      );
    }
    if (!templateData.compose.services[resolvedService]) {
      throw new Error(`unknown service in --publish ${specification}: ${resolvedService}`);
    }

    const containerPort = parsePort(portParts.at(-1), specification);
    const hostPort = parsePort(portParts.length === 2 ? portParts[0] : containerPort, specification);
    if (publishedHostPorts.has(hostPort)) {
      throw new Error(`host port ${hostPort} is published more than once`);
    }
    publishedHostPorts.add(hostPort);
    return { containerPort, hostPort, service: resolvedService };
  });
}

function networkAlias(template, service) {
  return `${projectName(template)}-${slugify(service)}`.slice(0, 63);
}

function addServiceNetwork(service, alias) {
  let networks;
  if (!service.networks) {
    networks = { default: null };
  } else if (Array.isArray(service.networks)) {
    networks = Object.fromEntries(service.networks.map((network) => [network, null]));
  } else {
    networks = { ...service.networks };
  }
  networks[devNetworkKey] = { aliases: [alias] };
  service.networks = networks;
}

function escapeContainerVariables(value) {
  if (typeof value === "string") {
    // Template inputs use ${NAME}. Unbraced $NAME references belong to commands
    // executed inside containers and must survive Docker Compose interpolation.
    return value.replace(/(?<!\$)\$(?!\{)([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name) => `$$${name}`);
  }
  if (Array.isArray(value)) {
    return value.map(escapeContainerVariables);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, escapeContainerVariables(entry)]),
    );
  }
  return value;
}

function renderCompose(templateData, publishes) {
  const { compose, manifest, template } = templateData;
  const rendered = escapeContainerVariables(structuredClone(compose));
  const routedServices = new Set((manifest.domains ?? []).map((domain) => domain.service));

  for (const [name, service] of Object.entries(rendered.services)) {
    delete service.ports;
    if (routedServices.has(name)) {
      addServiceNetwork(service, networkAlias(template, name));
    }
  }

  for (const publish of publishes) {
    const service = rendered.services[publish.service];
    service.ports = service.ports ?? [];
    service.ports.push(`127.0.0.1:${publish.hostPort}:${publish.containerPort}`);
  }

  rendered.networks = rendered.networks ?? {};
  rendered.networks[devNetworkKey] = {
    external: true,
    name: devNetworkName,
  };
  return rendered;
}

function createRoutes(templateData, values) {
  const { manifest, template } = templateData;
  const hostnames = new Set();
  return (manifest.domains ?? []).map((domain) => {
    const hostname = values[domain.userInput];
    const validHostname =
      typeof hostname === "string" &&
      /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(hostname);
    if (!validHostname) {
      throw new Error(`${domain.userInput} must contain a valid hostname without scheme, port, or path`);
    }
    if (hostname === "caddy.localhost") {
      throw new Error(`${domain.userInput} uses the reserved hostname caddy.localhost`);
    }
    if (hostnames.has(hostname)) {
      throw new Error(`${hostname} is assigned to more than one domain in ${template}`);
    }
    hostnames.add(hostname);
    return {
      hostname,
      purpose: domain.purpose,
      template,
      upstream: `${networkAlias(template, domain.service)}:${domain.port}`,
    };
  });
}

async function prepareApp(template, options = {}) {
  const templateData = await loadTemplate(template);
  const values = await createValues(templateData, options.values ?? {});
  const routes = createRoutes(templateData, values);
  const publishes = parsePublishSpecifications(templateData, options.publishes ?? []);
  await writeValuesFile(template, values);
  const environmentPath = await writeEnvironmentFile(template, values);
  const composePath = appFile(template, "compose.yaml");
  const rendered = renderCompose(templateData, publishes);
  await writeFile(composePath, YAML.stringify(rendered, { lineWidth: 0 }));
  return {
    ...templateData,
    composePath,
    environmentPath,
    publishes,
    routes,
    values,
  };
}

function composeArguments(app, ...arguments_) {
  return [
    "compose",
    "--project-name",
    projectName(app.template),
    "--env-file",
    app.environmentPath,
    "--file",
    app.composePath,
    ...arguments_,
  ];
}

function proxyComposeArguments(...arguments_) {
  return [
    "compose",
    "--project-name",
    proxyProjectName,
    "--file",
    proxyComposePath,
    ...arguments_,
  ];
}

async function writeProxyCompose() {
  await mkdir(proxyRoot, { recursive: true });
  const compose = {
    services: {
      caddy: {
        image: "caddy:2-alpine",
        ports: ["127.0.0.1:80:80", "127.0.0.1:443:443"],
        volumes: [
          "./Caddyfile:/etc/caddy/Caddyfile:ro",
          "caddy_data:/data",
          "caddy_config:/config",
        ],
        networks: [devNetworkKey],
      },
    },
    networks: {
      [devNetworkKey]: { external: true, name: devNetworkName },
    },
    volumes: { caddy_config: null, caddy_data: null },
  };
  await writeFile(proxyComposePath, YAML.stringify(compose, { lineWidth: 0 }));
}

async function registeredRoutes() {
  let entries;
  try {
    entries = await readdir(appsRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const routes = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      const registration = JSON.parse(
        await readFile(join(appsRoot, entry.name, "routes.json"), "utf8"),
      );
      routes.push(
        ...registration.map((route) => ({
          ...route,
          template: route.template ?? entry.name,
        })),
      );
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }
  return routes.sort((left, right) => left.hostname.localeCompare(right.hostname));
}

async function writeCaddyfile() {
  const routes = await registeredRoutes();
  const blocks = [
    `caddy.localhost {\n\ttls internal\n\trespond "Container templates development proxy"\n}`,
    ...routes.map(
      (route) =>
        `${route.hostname} {\n\ttls internal\n\treverse_proxy ${route.upstream}\n}`,
    ),
  ];
  await mkdir(proxyRoot, { recursive: true });
  await writeFile(caddyfilePath, `${blocks.join("\n\n")}\n`);
}

async function ensureNetwork() {
  const inspection = await run("docker", ["network", "inspect", devNetworkName], {
    allowFailure: true,
    capture: true,
  });
  if (inspection.code !== 0) {
    await run("docker", ["network", "create", devNetworkName]);
  }
}

async function proxyIsRunning() {
  const result = await run("docker", proxyComposeArguments("ps", "--status", "running", "--services"), {
    allowFailure: true,
    capture: true,
  });
  return result.code === 0 && result.stdout.split("\n").includes("caddy");
}

async function reloadProxy() {
  let lastResult;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    lastResult = await run(
      "docker",
      proxyComposeArguments(
        "exec",
        "--no-TTY",
        "caddy",
        "caddy",
        "reload",
        "--config",
        "/etc/caddy/Caddyfile",
        "--adapter",
        "caddyfile",
      ),
      { allowFailure: true, capture: true },
    );
    if (lastResult.code === 0) {
      return;
    }
    await delay(300);
  }
  throw new Error(`Caddy reload failed\n${lastResult?.stderr.trim() ?? ""}`);
}

async function ensureProxy() {
  await ensureDockerAvailable();
  await writeProxyCompose();
  const running = await proxyIsRunning();
  if (!running) {
    await assertPortsAvailable([80, 443], "local HTTPS proxy");
  }
  await ensureNetwork();
  await writeCaddyfile();
  await run("docker", proxyComposeArguments("up", "--detach"));
  await reloadProxy();
}

async function manageProxy(action) {
  if (action === "up") {
    await ensureProxy();
    console.log("Local HTTPS proxy is running at https://caddy.localhost");
    return;
  }

  await writeProxyCompose();
  if (action === "down") {
    await run("docker", proxyComposeArguments("down", "--remove-orphans"));
    console.log("Local HTTPS proxy stopped; its CA and certificates were retained");
  } else {
    await run("docker", proxyComposeArguments("logs", "--follow", "--tail", "200"));
  }
}

async function readRegisteredRoutes(template) {
  try {
    return JSON.parse(await readFile(appFile(template, "routes.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function registerRoutes(app) {
  const routes = await registeredRoutes();
  for (const route of app.routes) {
    const collision = routes.find(
      (registered) =>
        registered.template !== app.template && registered.hostname === route.hostname,
    );
    if (collision) {
      throw new Error(
        `${route.hostname} is already registered by template ${collision.template}`,
      );
    }
  }
  await writeFile(
    appFile(app.template, "routes.json"),
    `${JSON.stringify(app.routes, null, 2)}\n`,
  );
}

async function restoreRegisteredRoutes(template, routes) {
  if (routes === null) {
    try {
      await unlink(appFile(template, "routes.json"));
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  } else {
    await writeFile(appFile(template, "routes.json"), `${JSON.stringify(routes, null, 2)}\n`);
  }
  await writeCaddyfile();
  if (await proxyIsRunning()) {
    await reloadProxy();
  }
}

async function unregisterRoutes(template) {
  await restoreRegisteredRoutes(template, null);
}

async function printAppDiagnostics(app) {
  console.error(`\n${app.template} failed to start. Current container state:`);
  await run("docker", composeArguments(app, "ps", "--all"), { allowFailure: true });
  console.error("\nRecent container logs:");
  await run(
    "docker",
    composeArguments(app, "logs", "--no-color", "--tail", "100"),
    { allowFailure: true },
  );
}

function printAppSummary(app) {
  console.log(`\n${app.template} is running`);
  if (app.routes.length > 0) {
    console.log("\nURLs:");
    for (const route of app.routes) {
      console.log(`  https://${route.hostname}`);
    }
  } else {
    console.log("\nThis component has no public domain route.");
  }
  if (app.publishes.length > 0) {
    console.log("\nPublished ports:");
    for (const publish of app.publishes) {
      console.log(
        `  ${publish.service}: 127.0.0.1:${publish.hostPort} -> ${publish.containerPort}`,
      );
    }
  }
  console.log(`\nValues: .dev/apps/${app.template}/values.json`);
  console.log(`Logs:   pnpm app ${app.template} logs`);
  console.log(`Stop:   pnpm app ${app.template} down`);
}

async function up(app, options) {
  await ensureDockerAvailable();
  const runningServices = await run(
    "docker",
    composeArguments(app, "ps", "--status", "running", "--services"),
    { allowFailure: true, capture: true },
  );
  if (runningServices.stdout.trim() === "") {
    await assertPortsAvailable(
      app.publishes.map((publish) => publish.hostPort),
      app.template,
    );
  }

  const managesRoutes = app.routes.length > 0;
  const previousRoutes = managesRoutes
    ? await readRegisteredRoutes(app.template)
    : null;
  if (managesRoutes) {
    await registerRoutes(app);
  }
  try {
    if (managesRoutes) {
      await ensureProxy();
    }
    if (options.pull) {
      await run("docker", composeArguments(app, "pull"));
    }
    const arguments_ = ["up", "--detach", "--remove-orphans"];
    if (options.wait) {
      arguments_.push("--wait", "--wait-timeout", "180");
    }
    await run("docker", composeArguments(app, ...arguments_));
  } catch (error) {
    await printAppDiagnostics(app);
    if (managesRoutes) {
      try {
        await restoreRegisteredRoutes(app.template, previousRoutes);
      } catch (rollbackError) {
        throw new Error(`${error.message}\nRoute rollback also failed: ${rollbackError.message}`);
      }
    }
    throw error;
  }
  await run("docker", composeArguments(app, "ps"));
  printAppSummary(app);
}

async function down(app, removeVolumes) {
  const arguments_ = ["down", "--remove-orphans"];
  if (removeVolumes) {
    arguments_.push("--volumes");
  }
  await run("docker", composeArguments(app, ...arguments_));
  await unregisterRoutes(app.template);
  console.log(
    removeVolumes
      ? `${app.template} stopped and its local volumes were removed`
      : `${app.template} stopped`,
  );
}

async function showStatus() {
  await ensureDockerAvailable();
  const result = await run("docker", ["compose", "ls", "--format", "json"], {
    capture: true,
  });
  const projects = JSON.parse(result.stdout || "[]").filter((project) =>
    project.Name?.startsWith("ct-"),
  );
  if (projects.length === 0) {
    console.log("No local container-template projects are running.");
  } else {
    console.log("Local container-template projects:");
    for (const project of projects) {
      console.log(`  ${project.Name}: ${project.Status}`);
    }
  }
  const routes = await registeredRoutes();
  if (routes.length > 0) {
    console.log("\nRegistered local URLs:");
    for (const route of routes) {
      console.log(`  https://${route.hostname} (${route.template})`);
    }
  }
}

async function copyRootCertificate() {
  await ensureProxy();
  let available = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await run(
      "docker",
      proxyComposeArguments("exec", "--no-TTY", "caddy", "test", "-f", rootCertificateInContainer),
      { allowFailure: true, capture: true },
    );
    if (result.code === 0) {
      available = true;
      break;
    }
    await delay(250);
  }
  if (!available) {
    throw new Error("Caddy did not generate its local root certificate");
  }
  await run(
    "docker",
    proxyComposeArguments(
      "cp",
      `caddy:${rootCertificateInContainer}`,
      rootCertificatePath,
    ),
  );
}

async function macUserKeychain() {
  const result = await run("security", ["default-keychain", "-d", "user"], {
    capture: true,
  });
  const path = result.stdout.trim().replace(/^"|"$/g, "");
  if (!path) {
    throw new Error("macOS did not return a default user keychain");
  }
  return path;
}

async function linuxTrustStore() {
  let release = "";
  try {
    release = await readFile("/etc/os-release", "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  const identifiers = new Set(
    [...release.matchAll(/^(?:ID|ID_LIKE)=(.*)$/gm)]
      .flatMap((match) => match[1].replaceAll('"', "").split(/\s+/))
      .filter(Boolean),
  );

  if (["debian", "ubuntu"].some((identifier) => identifiers.has(identifier))) {
    return {
      target: "/usr/local/share/ca-certificates/container-templates-caddy-local.crt",
      update: ["update-ca-certificates"],
      removeUpdate: ["update-ca-certificates", "--fresh"],
    };
  }
  if (["centos", "fedora", "rhel"].some((identifier) => identifiers.has(identifier))) {
    return {
      target: "/etc/pki/ca-trust/source/anchors/container-templates-caddy-local.crt",
      update: ["update-ca-trust", "extract"],
      removeUpdate: ["update-ca-trust", "extract"],
    };
  }

  throw new Error(
    "automatic Linux trust installation currently supports Debian/Ubuntu and Fedora/RHEL families",
  );
}

async function trustLinuxRootCertificate() {
  const store = await linuxTrustStore();
  console.log(`Installing Caddy's local development CA in ${store.target}.`);
  await run("sudo", ["install", "-m", "0644", rootCertificatePath, store.target]);
  await run("sudo", store.update);
  console.log("Caddy's local development CA is trusted system-wide.");
}

async function untrustLinuxRootCertificate() {
  const store = await linuxTrustStore();
  await run("sudo", ["rm", "-f", "--", store.target]);
  await run("sudo", store.removeUpdate);
  console.log("Caddy's local development CA was removed from the Linux system trust store.");
}

async function trustRootCertificate() {
  await copyRootCertificate();
  if (process.platform === "linux") {
    await trustLinuxRootCertificate();
    return;
  }
  if (process.platform !== "darwin") {
    console.log(`Root certificate: ${rootCertificatePath}`);
    throw new Error("automatic trust installation is currently supported on macOS and Linux");
  }
  const certificate = new X509Certificate(await readFile(rootCertificatePath));
  const fingerprint = certificate.fingerprint.replaceAll(":", "");
  const keychain = await macUserKeychain();
  const trustedCertificates = await run(
    "security",
    ["find-certificate", "-a", "-Z", keychain],
    { allowFailure: true, capture: true },
  );
  if (trustedCertificates.stdout.includes(fingerprint)) {
    console.log("Caddy's local development CA is already trusted.");
    return;
  }

  console.log("Installing Caddy's local development CA in the macOS user keychain.");
  await run("security", [
    "add-trusted-cert",
    "-r",
    "trustRoot",
    "-k",
    keychain,
    rootCertificatePath,
  ]);
  console.log("Caddy's local development CA is trusted.");
  console.log("Open https://caddy.localhost to verify it.");
}

async function untrustRootCertificate() {
  if (process.platform === "linux") {
    await untrustLinuxRootCertificate();
    return;
  }
  if (process.platform !== "darwin") {
    throw new Error("automatic trust removal is currently supported on macOS and Linux");
  }
  let certificate;
  try {
    certificate = new X509Certificate(await readFile(rootCertificatePath));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`root certificate not found at ${rootCertificatePath}`);
    }
    throw error;
  }
  const fingerprint = certificate.fingerprint.replaceAll(":", "");
  const keychain = await macUserKeychain();
  await run("security", [
    "delete-certificate",
    "-Z",
    fingerprint,
    keychain,
  ]);
  console.log("Caddy's local development CA was removed from the macOS user keychain.");
}

async function showValues(app) {
  for (const [name, value] of Object.entries(app.values).sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`${name}=${value}`);
  }
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.command === "help") {
    printHelp();
    return;
  }
  if (parsed.command === "status") {
    await showStatus();
    return;
  }
  if (parsed.command === "trust") {
    await trustRootCertificate();
    return;
  }
  if (parsed.command === "untrust") {
    await untrustRootCertificate();
    return;
  }
  if (parsed.command.startsWith("proxy-")) {
    await manageProxy(parsed.command.slice("proxy-".length));
    return;
  }

  const validCommands = new Set(["config", "down", "logs", "reset", "up", "values"]);
  if (!validCommands.has(parsed.command)) {
    throw new Error(`unknown command: ${parsed.command}`);
  }

  const app = await prepareApp(parsed.template, parsed.options);
  if (parsed.command === "up") {
    await up(app, parsed.options);
  } else if (parsed.command === "down") {
    await down(app, false);
  } else if (parsed.command === "reset") {
    await down(app, true);
  } else if (parsed.command === "logs") {
    await run("docker", composeArguments(app, "logs", "--follow", "--tail", "200"));
  } else if (parsed.command === "config") {
    await run("docker", composeArguments(app, "config", "--quiet"));
    console.log(`${parsed.template}: generated Compose configuration is valid`);
  } else if (parsed.command === "values") {
    await showValues(app);
  }
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
});
