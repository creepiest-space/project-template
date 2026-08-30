export default {
  extends: ['stylelint-config-standard'],
  overrides: [
    {
      customSyntax: 'postcss-scss',
      extends: ['stylelint-config-standard-scss'],
      files: ['**/*.scss'],
    },
    {
      customSyntax: 'postcss-sass',
      files: ['**/*.sass'],
    },
    {
      customSyntax: 'postcss-less',
      files: ['**/*.less'],
    },
  ],
  rules: {
    'selector-class-pattern': null,
  },
};
