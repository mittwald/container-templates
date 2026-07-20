import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = dirname(fileURLToPath(import.meta.url));

export async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export async function findManifestPaths() {
  const entries = await readdir(repositoryRoot, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));
  const manifestPaths = [];

  for (const directory of directories) {
    const manifestPath = join(repositoryRoot, directory.name, "manifest.yaml");
    if (await isFile(manifestPath)) {
      manifestPaths.push(manifestPath);
    }
  }

  return manifestPaths;
}
