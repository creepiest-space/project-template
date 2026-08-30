import { constants } from 'node:fs';
import { access } from 'node:fs/promises';

import lefthookPackage from 'lefthook/package.json' with { type: 'json' };

if (lefthookPackage.name !== 'lefthook') throw new Error('Lefthook is unavailable.');

try {
  await access('.git', constants.F_OK);
} catch {
  console.log('Skipping Lefthook installation: this project is not a Git repository.');
  process.exit(0);
}

const child = Bun.spawn(['lefthook', 'install'], {
  stderr: 'inherit',
  stdin: 'inherit',
  stdout: 'inherit',
});
process.exitCode = await child.exited;
