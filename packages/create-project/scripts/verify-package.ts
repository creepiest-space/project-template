import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));

const requiredFiles = [
  'LICENSE',
  'README.md',
  'dist/cli.js',
  'dist/index.d.ts',
  'dist/index.js',
  'template/base/.editorconfig',
  'template/base/.gitattributes',
  'template/base/.github/workflows/ci.yml',
  'template/base/AGENTS.md',
  'template/base/README.md',
  'template/base/apps/.gitkeep',
  'template/base/gitignore.template',
  'template/base/oxlint.config.mts.template',
  'template/base/package.json',
  'template/base/packages/.gitkeep',
  'template/features/case-police/feature.json',
  'template/features/cspell/feature.json',
  'template/features/dependency-cruiser/feature.json',
  'template/features/package-quality/feature.json',
  'template/features/playwright/feature.json',
  'template/features/security/feature.json',
  'template/features/stylelint/feature.json',
  'template/features/vitest/feature.json',
] as const;

await Promise.all(
  requiredFiles.map(async (file) => {
    try {
      await access(join(packageDirectory, file), constants.R_OK);
    } catch {
      throw new Error(`Package payload is missing required file: ${file}`);
    }
  }),
);

const manifest = await readJson('package.json');
assert(isRecord(manifest), 'package.json must contain an object.');
assert(manifest.name === '@creepiest-space/create-project', 'Unexpected npm package name.');
assert(
  typeof manifest.version === 'string' && manifest.version.length > 0,
  'Package version is missing.',
);
assert(manifest.private !== true, 'A private package cannot be published.');
assert(manifest.license === 'MIT', 'Package license must be MIT.');

const publishConfig = manifest.publishConfig;
assert(isRecord(publishConfig), 'publishConfig is missing.');
assert(publishConfig.access === 'public', 'Scoped npm package must use public access.');
assert(publishConfig.registry === 'https://registry.npmjs.org/', 'Package registry must be npmjs.');

const bin = manifest.bin;
assert(isRecord(bin), 'Package bin entry is missing.');
assert(bin['create-project'] === './dist/cli.js', 'Package bin entry does not target dist/cli.js.');

const files = manifest.files;
assert(Array.isArray(files), 'Package files allowlist is missing.');
assert(
  files.includes('dist') && files.includes('template'),
  'Package files allowlist is incomplete.',
);

const cli = await readFile(join(packageDirectory, 'dist/cli.js'), 'utf8');
assert(cli.startsWith('#!/usr/bin/env bun\n'), 'Built CLI must retain its Bun shebang.');

const templateManifest = await readJson('template/base/package.json');
assert(isRecord(templateManifest), 'Base template package.json must contain an object.');
assert(templateManifest.private === true, 'Generated projects must be private by default.');
assert(templateManifest.packageManager === 'bun@1.3.14', 'Base template must pin Bun.');

console.log(`Verified npm package ${manifest.name}@${manifest.version}.`);

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(packageDirectory, path), 'utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
