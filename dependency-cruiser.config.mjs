/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'packages-must-not-depend-on-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-private-package-imports',
      severity: 'error',
      from: { path: '^(apps|packages)/' },
      to: { path: '^packages/[^/]+/(internal|private)/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: {
      conditionNames: ['import', 'types', 'default'],
      exportsFields: ['exports'],
    },
    tsPreCompilationDeps: true,
  },
};
