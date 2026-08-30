import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, parse, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import packageJson from '../package.json';
import { applyFeatures, type FeatureId } from './features';

export { applyFeatures, FEATURE_IDS, isFeatureId, type FeatureId } from './features';

const TEMPLATE = 'base';
const TEMPLATE_DIR = fileURLToPath(new URL('../template/base', import.meta.url));
const SAFE_ARGUMENT_RE = /^[A-Za-z0-9_./:@=-]+$/;
const PACKAGE_NAME_UNSAFE_RE = /[^a-z0-9._-]+/g;
const REPEATED_DASH_RE = /-{2,}/g;
const EDGE_SEPARATOR_RE = /^[._-]+|[._-]+$/g;

export type CliOptions = {
  cwd: string;
  dir?: string;
  force: boolean;
  git: boolean;
  help: boolean;
  install: boolean;
  template: typeof TEMPLATE;
  version: boolean;
};

export type ScaffoldOptions = Pick<CliOptions, 'cwd' | 'force' | 'git' | 'install'> & {
  dir: string;
  features?: readonly FeatureId[];
  featuresDir?: string;
  template: string;
  templateDir?: string;
};

export type ScaffoldResult = {
  installFailed: boolean;
  projectDir: string;
  projectName: string;
};

export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export function parseArgs(argv: string[], cwd = process.cwd()): CliOptions {
  const options: CliOptions = {
    cwd,
    force: false,
    git: true,
    help: false,
    install: true,
    template: TEMPLATE,
    version: false,
  };
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;

    if (argument === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (argument === '--force' || argument === '-f') {
      options.force = true;
      continue;
    }
    if (argument === '--git') {
      options.git = true;
      continue;
    }
    if (argument === '--no-git') {
      options.git = false;
      continue;
    }
    if (argument === '--install') {
      options.install = true;
      continue;
    }
    if (argument === '--no-install') {
      options.install = false;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--version' || argument === '-v') {
      options.version = true;
      continue;
    }
    if (argument === '--template' || argument === '-t') {
      const value = argv[index + 1];
      if (!value) throw new CliError(`${argument} requires a value.`, 2);
      options.template = parseTemplate(value);
      index += 1;
      continue;
    }
    if (argument.startsWith('--template=')) {
      options.template = parseTemplate(argument.slice('--template='.length));
      continue;
    }
    if (argument === '--cwd') {
      const value = argv[index + 1];
      if (!value) throw new CliError('--cwd requires a value.', 2);
      options.cwd = resolve(cwd, value);
      index += 1;
      continue;
    }
    if (argument.startsWith('--cwd=')) {
      options.cwd = resolve(cwd, argument.slice('--cwd='.length));
      continue;
    }
    if (argument.startsWith('-')) {
      throw new CliError(`Unknown option: ${argument}`, 2);
    }
    positionals.push(argument);
  }

  if (positionals.length > 1) {
    throw new CliError('Expected a single project directory.', 2);
  }
  if (positionals[0] !== undefined) options.dir = positionals[0];
  return options;
}

function parseTemplate(value: string): typeof TEMPLATE {
  if (value !== TEMPLATE) {
    throw new CliError(`Unknown template: ${value}. Available templates: ${TEMPLATE}.`, 2);
  }
  return value;
}

export function slugifyPackageName(directory: string): string {
  const slug = basename(resolve(directory))
    .toLowerCase()
    .replace(PACKAGE_NAME_UNSAFE_RE, '-')
    .replace(REPEATED_DASH_RE, '-')
    .replace(EDGE_SEPARATOR_RE, '');
  return slug || 'project';
}

export function formatReproductionCommand(options: ScaffoldOptions): string {
  const args = [
    `bunx @creepiest-space/create-project@${packageJson.version}`,
    quoteArgument(options.dir),
    `--template=${options.template}`,
    options.git ? '--git' : '--no-git',
    options.install ? '--install' : '--no-install',
    options.force ? '--force' : '',
  ].filter(Boolean);
  return args.join(' ');
}

function quoteArgument(value: string): string {
  if (SAFE_ARGUMENT_RE.test(value)) return value;
  if (process.platform === 'win32') return JSON.stringify(value);
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function getNextSteps(result: ScaffoldResult, options: ScaffoldOptions): string[] {
  const relativeDir = relativePath(options.cwd, result.projectDir);
  return [
    relativeDir !== '.' ? `cd ${quoteArgument(relativeDir)}` : '',
    !options.install || result.installFailed ? 'bun install' : '',
    'bun run dev',
  ].filter(Boolean);
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  if (options.template !== TEMPLATE) {
    throw new CliError(`Unknown template: ${options.template}.`, 2);
  }

  const projectDir = resolve(options.cwd, options.dir);
  assertSafeTarget(projectDir, options.cwd);

  const exists = await pathExists(projectDir);
  if (exists && !options.force) {
    throw new CliError(
      `Target directory already exists: ${relativePath(options.cwd, projectDir)}. Use --force to replace it.`,
    );
  }

  const parentDir = dirname(projectDir);
  await mkdir(parentDir, { recursive: true });
  const stagingRoot = await mkdtemp(join(parentDir, '.create-project-'));
  const stagedProject = join(stagingRoot, 'project');
  let backupDir: string | undefined;

  try {
    await cp(options.templateDir ?? TEMPLATE_DIR, stagedProject, {
      errorOnExist: true,
      force: false,
      recursive: true,
    });
    const projectName = slugifyPackageName(projectDir);
    await customizeTemplate(stagedProject, projectName);
    await applyFeatures(stagedProject, options.features ?? [], options.featuresDir);

    if (exists) {
      backupDir = join(parentDir, `.create-project-backup-${randomUUID()}`);
      await rename(projectDir, backupDir);
    }

    try {
      await rename(stagedProject, projectDir);
    } catch (error) {
      if (backupDir && !(await pathExists(projectDir))) {
        await rename(backupDir, projectDir);
        backupDir = undefined;
      }
      throw error;
    }

    if (backupDir) {
      await rm(backupDir, { force: true, recursive: true });
      backupDir = undefined;
    }

    if (options.git) {
      const gitResult = await runCommand('git', ['init'], projectDir);
      if (!gitResult.success) {
        throw new CliError(
          `Git initialization failed${gitResult.message ? `: ${gitResult.message}` : '.'}`,
        );
      }
    }

    let installFailed = false;
    if (options.install) {
      const installResult = await runCommand('bun', ['install'], projectDir);
      installFailed = !installResult.success;
    }

    return { installFailed, projectDir, projectName };
  } finally {
    await rm(stagingRoot, { force: true, recursive: true });
    if (backupDir && !(await pathExists(projectDir))) {
      await rename(backupDir, projectDir).catch(() => undefined);
    }
  }
}

function assertSafeTarget(projectDir: string, cwd: string): void {
  const parsed = parse(projectDir);
  if (projectDir === parsed.root) {
    throw new CliError('Refusing to scaffold into a filesystem root.', 2);
  }
  if (projectDir === resolve(cwd)) {
    throw new CliError(
      'Refusing to replace the current working directory. Choose a child directory.',
      2,
    );
  }
}

async function customizeTemplate(projectDir: string, projectName: string): Promise<void> {
  await rename(join(projectDir, 'gitignore.template'), join(projectDir, '.gitignore'));
  await rename(
    join(projectDir, 'oxlint.config.mts.template'),
    join(projectDir, 'oxlint.config.mts'),
  );

  const packagePath = join(projectDir, 'package.json');
  const manifest: unknown = JSON.parse(await readFile(packagePath, 'utf8'));
  if (!isRecord(manifest)) throw new CliError('The base template has an invalid package.json.');
  manifest.name = projectName;
  await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);

  const readmePath = join(projectDir, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  await writeFile(readmePath, readme.replaceAll('{{projectName}}', projectName));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ message?: string; success: boolean }> {
  try {
    const process = Bun.spawn([command, ...args], {
      cwd,
      stderr: 'inherit',
      stdin: 'inherit',
      stdout: 'inherit',
    });
    const exitCode = await process.exited;
    return { success: exitCode === 0 };
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error), success: false };
  }
}

function relativePath(from: string, to: string): string {
  return relative(from, to) || '.';
}

async function promptForDirectory(): Promise<string> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await prompt.question('Project directory (project): ')).trim() || 'project';
  } finally {
    prompt.close();
  }
}

async function confirmReplacement(directory: string): Promise<boolean> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`Target ${directory} exists. Replace it? [y/N] `);
    return /^(?:y|yes)$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

export async function main(argv: string[]): Promise<number> {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      console.log(HELP);
      return 0;
    }
    if (options.version) {
      console.log(packageJson.version);
      return 0;
    }

    if (!options.dir) {
      if (!process.stdin.isTTY) {
        throw new CliError('Missing project directory. Run with --help for usage.', 2);
      }
      options.dir = await promptForDirectory();
    }

    const requestedTarget = resolve(options.cwd, options.dir);
    if (!options.force && process.stdin.isTTY && (await pathExists(requestedTarget))) {
      options.force = await confirmReplacement(relativePath(options.cwd, requestedTarget));
      if (!options.force) throw new CliError('Operation cancelled.');
    }

    const scaffoldOptions: ScaffoldOptions = { ...options, dir: options.dir };
    console.log(
      `Creating ${relativePath(options.cwd, resolve(options.cwd, options.dir))} from the base template...`,
    );
    const result = await scaffoldProject(scaffoldOptions);
    console.log(`Created ${result.projectName}.`);
    console.log(`Reproduce: ${formatReproductionCommand(scaffoldOptions)}`);
    console.log('Next steps:');
    for (const step of getNextSteps(result, scaffoldOptions)) console.log(`  ${step}`);

    if (result.installFailed) {
      console.error(
        'Dependency installation failed. The project was created; run bun install manually.',
      );
      return 1;
    }
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      console.error(error.message);
      return error.exitCode;
    }
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

const HELP = `Create a Creepiest Space project.

Usage:
  create-project <directory> [options]

Options:
  -t, --template <name>  Template to use (default: base)
  -f, --force            Replace an existing target directory
      --install          Install dependencies (default)
      --no-install       Skip dependency installation
      --git              Initialize a Git repository (default)
      --no-git           Skip Git initialization
      --cwd <directory>  Resolve the target from this directory
  -h, --help             Show help
  -v, --version          Show version
`;
