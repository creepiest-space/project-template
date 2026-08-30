import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CliError,
  formatReproductionCommand,
  getNextSteps,
  parseArgs,
  scaffoldProject,
  slugifyPackageName,
  type ScaffoldOptions,
} from '../../src';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'create-project-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function expectRejection(promise: Promise<unknown>, message?: string): Promise<void> {
  let rejection: unknown;
  try {
    await promise;
  } catch (error) {
    rejection = error;
  }
  expect(rejection).toBeInstanceOf(Error);
  if (message && rejection instanceof Error) expect(rejection.message).toContain(message);
}

function options(cwd: string, overrides: Partial<ScaffoldOptions> = {}): ScaffoldOptions {
  return {
    cwd,
    dir: 'my-project',
    force: false,
    git: false,
    install: false,
    template: 'base',
    ...overrides,
  };
}

describe('parseArgs', () => {
  test('uses safe Bun-first defaults', () => {
    expect(parseArgs(['my-project'], '/workspace')).toEqual({
      cwd: '/workspace',
      dir: 'my-project',
      force: false,
      git: true,
      help: false,
      install: true,
      template: 'base',
      version: false,
    });
  });

  test('supports explicit headless choices', () => {
    expect(
      parseArgs(
        ['app', '--template=base', '--no-install', '--no-git', '--force', '--cwd', 'projects'],
        '/workspace',
      ),
    ).toMatchObject({
      cwd: '/workspace/projects',
      dir: 'app',
      force: true,
      git: false,
      install: false,
      template: 'base',
    });
  });

  test('rejects unknown templates and options', () => {
    expect(() => parseArgs(['app', '--template=web'])).toThrow(CliError);
    expect(() => parseArgs(['app', '--mystery'])).toThrow('Unknown option');
  });

  test('preserves the legacy short options', () => {
    expect(parseArgs(['app', '-t', 'base', '-f'], '/workspace')).toMatchObject({
      dir: 'app',
      force: true,
      template: 'base',
    });
  });
});

describe('slugifyPackageName', () => {
  test('creates a lowercase package name from the directory', () => {
    expect(slugifyPackageName('/tmp/My Special@@Project')).toBe('my-special-project');
  });

  test('falls back when the name has no valid characters', () => {
    expect(slugifyPackageName('/tmp/@@@')).toBe('project');
  });
});

describe('scaffoldProject', () => {
  test('creates and customizes the bundled base template', async () => {
    const cwd = await temporaryDirectory();
    const result = await scaffoldProject(options(cwd, { dir: 'My App' }));

    expect(result.projectName).toBe('my-app');
    expect(JSON.parse(await readFile(join(result.projectDir, 'package.json'), 'utf8')).name).toBe(
      'my-app',
    );
    expect(await readFile(join(result.projectDir, 'README.md'), 'utf8')).toContain('# my-app');
    expect(await readFile(join(result.projectDir, '.gitignore'), 'utf8')).toContain(
      'node_modules/',
    );
    expect(await readFile(join(result.projectDir, 'oxlint.config.mts'), 'utf8')).toContain(
      'maxWarnings',
    );
    expect(await readFile(join(result.projectDir, 'apps', '.gitkeep'), 'utf8')).toBe('\n');
  });

  test('preserves the base template quality and workspace contract', async () => {
    const cwd = await temporaryDirectory();
    const result = await scaffoldProject(options(cwd));
    const manifest: unknown = JSON.parse(
      await readFile(join(result.projectDir, 'package.json'), 'utf8'),
    );

    expect(manifest).toMatchObject({
      packageManager: 'bun@1.3.14',
      private: true,
      scripts: {
        build: 'turbo build',
        check: 'bun run quality:fast',
        'check:full': 'bun run quality',
        deadcode: 'bun run check:deadcode',
        test: 'bun run quality:test',
      },
      workspaces: ['apps/*', 'packages/*'],
    });
    const lefthook = await readFile(join(result.projectDir, 'lefthook.yml'), 'utf8');
    expect(lefthook).toContain('{staged_files}');
    expect(lefthook).toContain('bun run quality:fast');
    expect(await readFile(join(result.projectDir, 'turbo.json'), 'utf8')).toContain('"test"');
  });

  test('preserves an existing directory unless force is explicit', async () => {
    const cwd = await temporaryDirectory();
    const target = join(cwd, 'existing');
    await mkdir(target);
    await Bun.write(join(target, 'marker.txt'), 'keep me');

    await expectRejection(scaffoldProject(options(cwd, { dir: 'existing' })), '--force');
    expect(await readFile(join(target, 'marker.txt'), 'utf8')).toBe('keep me');
  });

  test('atomically replaces an existing directory with force', async () => {
    const cwd = await temporaryDirectory();
    const target = join(cwd, 'existing');
    await mkdir(target);
    await Bun.write(join(target, 'marker.txt'), 'replace me');

    await scaffoldProject(options(cwd, { dir: 'existing', force: true }));
    expect(await readFile(join(target, 'package.json'), 'utf8')).toContain('"name": "existing"');
    await expectRejection(readFile(join(target, 'marker.txt'), 'utf8'));
  });

  test('refuses to replace the current working directory', async () => {
    const cwd = await temporaryDirectory();
    await expectRejection(
      scaffoldProject(options(cwd, { dir: '.', force: true })),
      'current working directory',
    );
  });

  test('restores the target when template customization fails', async () => {
    const cwd = await temporaryDirectory();
    const target = join(cwd, 'existing');
    const brokenTemplate = join(cwd, 'broken-template');
    await mkdir(target);
    await mkdir(brokenTemplate);
    await Bun.write(join(target, 'marker.txt'), 'keep me');
    await writeFile(join(brokenTemplate, 'README.md'), 'missing package');

    await expectRejection(
      scaffoldProject(options(cwd, { dir: 'existing', force: true, templateDir: brokenTemplate })),
    );
    expect(await readFile(join(target, 'marker.txt'), 'utf8')).toBe('keep me');
  });
});

describe('handoff output', () => {
  test('prints a pinned reproduction command', () => {
    expect(formatReproductionCommand(options('/workspace', { dir: 'my app' }))).toContain(
      "bunx @creepiest-space/create-project@0.1.0 'my app' --template=base --no-git --no-install",
    );
  });

  test('includes recovery installation when install failed', () => {
    const scaffoldOptions = options('/workspace');
    expect(
      getNextSteps(
        {
          installFailed: true,
          projectDir: '/workspace/my-project',
          projectName: 'my-project',
        },
        scaffoldOptions,
      ),
    ).toEqual(['cd my-project', 'bun install', 'bun run dev']);
  });
});
