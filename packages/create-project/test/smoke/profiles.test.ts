import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { scaffoldProject, type ProfileId } from '../../src';

const smokeRoot = await mkdtemp(join(tmpdir(), 'create-project-smoke-'));

afterAll(async () => {
  await rm(smokeRoot, { force: true, recursive: true });
}, 60_000);

describe('generated profile smoke validation', () => {
  for (const profile of ['base', 'cli', 'library', 'web'] as const satisfies readonly ProfileId[]) {
    test(`${profile} installs and passes its local gates`, async () => {
      const result = await scaffoldProject({
        cwd: smokeRoot,
        dir: profile,
        force: false,
        git: false,
        install: false,
        profile,
        template: 'base',
      });

      await run(['bun', 'install'], result.projectDir);
      await run(['bun', 'run', 'quality:fast'], result.projectDir);
      if (profile !== 'base') await run(['bun', 'run', 'test:unit'], result.projectDir);
      if (profile === 'library') await run(['bun', 'run', 'check:package'], result.projectDir);
      expect(result.projectName).toBe(profile);
    }, 180_000);
  }
});

async function run(command: string[], cwd: string): Promise<void> {
  const child = Bun.spawn(command, { cwd, stderr: 'pipe', stdout: 'pipe' });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(' ')} failed in ${cwd}:\n${stdout.trim()}\n${stderr.trim()}`);
  }
}
