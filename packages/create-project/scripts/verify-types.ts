import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import attwPackage from '@arethetypeswrong/cli/package.json' with { type: 'json' };

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const npmCache = await mkdtemp(join(tmpdir(), 'create-project-npm-cache-'));

if (attwPackage.name !== '@arethetypeswrong/cli') {
  throw new Error('Unexpected package provides the attw executable.');
}

try {
  const child = Bun.spawn(['attw', '--pack', '.', '--profile', 'esm-only'], {
    cwd: packageDirectory,
    env: { ...process.env, npm_config_cache: npmCache },
    stderr: 'inherit',
    stdout: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`attw --pack . failed with exit code ${exitCode}.`);
} finally {
  await rm(npmCache, { force: true, recursive: true });
}
