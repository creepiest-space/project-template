import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../../src/cli.ts', import.meta.url));

describe('create-project CLI', () => {
  test('requires a directory without an interactive terminal', async () => {
    const child = Bun.spawn(['bun', cli], { stderr: 'pipe', stdout: 'pipe' });
    const exitCode = await child.exited;
    const stderr = await new Response(child.stderr).text();

    expect(exitCode).toBe(2);
    expect(stderr).toContain('Missing project directory');
  });

  test('creates a base project without prompts', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-project-e2e-'));
    try {
      const child = Bun.spawn(
        ['bun', cli, 'demo', '--template=base', '--no-install', '--no-git', `--cwd=${cwd}`],
        { stderr: 'pipe', stdout: 'pipe' },
      );
      const exitCode = await child.exited;
      const stdout = await new Response(child.stdout).text();
      const stderr = await new Response(child.stderr).text();

      expect(exitCode).toBe(0);
      expect(stderr).toBe('');
      expect(stdout).toContain('Created demo');
      expect(stdout).toContain('bun install');
      expect(JSON.parse(await readFile(join(cwd, 'demo', 'package.json'), 'utf8')).name).toBe(
        'demo',
      );
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  test('creates a web profile non-interactively', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-project-e2e-'));
    try {
      const child = Bun.spawn(
        [
          'bun',
          cli,
          'web-app',
          '--profile=web',
          '--framework=none',
          '--testing=unit,integration,e2e',
          '--quality=full',
          '--no-install',
          '--no-git',
          `--cwd=${cwd}`,
        ],
        { stderr: 'pipe', stdout: 'pipe' },
      );
      const exitCode = await child.exited;
      const stderr = await new Response(child.stderr).text();
      const manifest: unknown = JSON.parse(
        await readFile(join(cwd, 'web-app', 'package.json'), 'utf8'),
      );

      expect(exitCode).toBe(0);
      expect(stderr).toBe('');
      expect(manifest).toMatchObject({
        devDependencies: {
          '@playwright/test': '^1.62.1',
          stylelint: '^17.14.1',
          vitest: '^4.1.11',
        },
      });
      expect(await readFile(join(cwd, 'web-app', 'playwright.config.ts'), 'utf8')).toContain(
        'chromium',
      );
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
