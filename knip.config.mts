import type { KnipConfig } from 'knip';

export default {
  workspaces: {
    'apps/*': {},
    'packages/*': {},
  },
  ignore: ['cz.config.mts', 'packages/create-project/template/**', '**/dist/**', '**/coverage/**'],
} satisfies KnipConfig;
