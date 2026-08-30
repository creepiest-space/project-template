import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FEATURE_IDS = [
  'case-police',
  'cspell',
  'dependency-cruiser',
  'playwright',
  'stylelint',
  'vitest',
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

const DEFAULT_FEATURES_DIR = fileURLToPath(new URL('../template/features', import.meta.url));

type FeatureManifest = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  id: FeatureId;
  scripts: Record<string, string>;
};

export function isFeatureId(value: string): value is FeatureId {
  return FEATURE_IDS.some((feature) => feature === value);
}

export async function applyFeatures(
  projectDir: string,
  requestedFeatures: readonly FeatureId[],
  featuresDir = DEFAULT_FEATURES_DIR,
): Promise<void> {
  const featureIds = [...new Set(requestedFeatures)].toSorted();
  if (featureIds.length === 0) return;

  const packagePath = join(projectDir, 'package.json');
  const packageJson = parseRecord(await readFile(packagePath, 'utf8'), 'package.json');

  await featureIds.reduce(async (previous, featureId) => {
    await previous;
    const featureDir = join(featuresDir, featureId);
    const manifest = await readFeatureManifest(featureDir, featureId);
    mergeManifestSection(packageJson, 'dependencies', manifest.dependencies, featureId);
    mergeManifestSection(packageJson, 'devDependencies', manifest.devDependencies, featureId);
    mergeManifestSection(packageJson, 'scripts', manifest.scripts, featureId);
    await copyFeatureFiles(join(featureDir, 'files'), projectDir, featureId);
  }, Promise.resolve());

  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function readFeatureManifest(
  featureDir: string,
  expectedId: FeatureId,
): Promise<FeatureManifest> {
  let manifest: Record<string, unknown>;
  try {
    manifest = parseRecord(
      await readFile(join(featureDir, 'feature.json'), 'utf8'),
      'feature.json',
    );
  } catch (error) {
    throw new Error(`Cannot load feature ${expectedId}: ${errorMessage(error)}`, { cause: error });
  }

  if (manifest.id !== expectedId) {
    throw new Error(`Feature ${expectedId} has an invalid manifest id.`);
  }

  return {
    dependencies: readStringRecord(manifest.dependencies, `${expectedId}.dependencies`),
    devDependencies: readStringRecord(manifest.devDependencies, `${expectedId}.devDependencies`),
    id: expectedId,
    scripts: readStringRecord(manifest.scripts, `${expectedId}.scripts`),
  };
}

function mergeManifestSection(
  packageJson: Record<string, unknown>,
  sectionName: 'dependencies' | 'devDependencies' | 'scripts',
  additions: Record<string, string>,
  featureId: FeatureId,
): void {
  if (Object.keys(additions).length === 0) return;

  const current = packageJson[sectionName];
  if (current !== undefined && !isRecord(current)) {
    throw new Error(`package.json field ${sectionName} must be an object.`);
  }
  const section = current ?? {};
  packageJson[sectionName] = section;

  for (const name of Object.keys(additions).toSorted()) {
    const value = additions[name];
    if (value === undefined) continue;
    const existing = section[name];
    if (existing !== undefined && existing !== value) {
      throw new Error(`Feature ${featureId} conflicts with package.json ${sectionName}.${name}.`);
    }
    section[name] = value;
  }
}

async function copyFeatureFiles(
  sourceDir: string,
  projectDir: string,
  featureId: FeatureId,
): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true }).catch((error: unknown) => {
    if (isErrorCode(error, 'ENOENT')) return [];
    throw error;
  });

  await entries
    .toSorted((left, right) => left.name.localeCompare(right.name))
    .reduce(async (previous, entry) => {
      await previous;
      const source = join(sourceDir, entry.name);
      const destination = join(projectDir, entry.name);
      if (entry.isDirectory()) {
        await mkdir(destination, { recursive: true });
        await copyFeatureFiles(source, destination, featureId);
        return;
      }
      if (!entry.isFile()) {
        throw new Error(`Feature ${featureId} contains an unsupported entry: ${entry.name}.`);
      }

      await mkdir(dirname(destination), { recursive: true });
      try {
        await copyFile(source, destination, constants.COPYFILE_EXCL);
      } catch (error) {
        if (isErrorCode(error, 'EEXIST')) {
          throw new Error(
            `Feature ${featureId} cannot overwrite ${relative(projectDir, destination)}.`,
            { cause: error },
          );
        }
        throw error;
      }
    }, Promise.resolve());
}

function parseRecord(source: string, label: string): Record<string, unknown> {
  const value: unknown = JSON.parse(source);
  if (!isRecord(value)) throw new Error(`${label} must contain an object.`);
  return value;
}

function readStringRecord(value: unknown, label: string): Record<string, string> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);

  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') throw new Error(`${label}.${key} must be a string.`);
    result[key] = item;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
