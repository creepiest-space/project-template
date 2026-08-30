import { readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'create-project-tarball-'));

try {
  await run(['bun', 'pm', 'pack', '--destination', temporaryDirectory], packageDirectory);
  const tarballs = (await readdir(temporaryDirectory)).filter((file) => file.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one npm tarball, found ${tarballs.length}.`);
  }

  const tarball = tarballs[0];
  if (tarball === undefined) throw new Error('The npm tarball is missing.');
  const listing = await run(['tar', '-tzf', join(temporaryDirectory, tarball)], packageDirectory);
  const files = new Set(listing.split('\n').filter(Boolean));
  const required = [
    'package/package.json',
    'package/dist/cli.js',
    'package/dist/index.d.ts',
    'package/template/base/package.json',
    'package/template/features/vitest/feature.json',
    'package/template/features/package-quality/feature.json',
  ];
  for (const file of required) {
    if (!files.has(file)) throw new Error(`Tarball is missing required file: ${file}`);
  }
  if ([...files].some((file) => file.startsWith('package/src/'))) {
    throw new Error('Tarball must not contain generator source files.');
  }

  console.log(`Verified tarball ${tarball} (${files.size} entries).`);
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

async function run(command: string[], cwd: string): Promise<string> {
  const child = Bun.spawn(command, { cwd, stderr: 'pipe', stdout: 'pipe' });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(' ')} failed: ${stderr.trim() || stdout.trim()}`);
  }
  return stdout;
}
