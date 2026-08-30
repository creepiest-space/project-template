import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import attwPackage from '@arethetypeswrong/cli/package.json' with { type: 'json' };

const packageDirectory = dirname(import.meta.dir);
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'library-package-'));

try {
  if (attwPackage.name !== '@arethetypeswrong/cli') throw new Error('attw package is unavailable.');
  await run(['attw', '--pack', '.', '--profile', 'esm-only'], temporaryDirectory);
  await run(['bun', 'pm', 'pack', '--destination', temporaryDirectory]);
  const tarballs = (await readdir(temporaryDirectory)).filter((file) => file.endsWith('.tgz'));
  if (tarballs.length !== 1) throw new Error(`Expected one tarball, found ${tarballs.length}.`);
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

async function run(command: string[], npmCache?: string): Promise<void> {
  const child = Bun.spawn(command, {
    cwd: packageDirectory,
    env: npmCache ? { ...process.env, npm_config_cache: npmCache } : process.env,
    stderr: 'inherit',
    stdout: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${command.join(' ')} failed with exit code ${exitCode}.`);
}
