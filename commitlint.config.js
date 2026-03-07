module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'ui',
        'docs',
        'docker',
        'auth',
        'scrape',
        'db',
        'shared',
        'ci',
        'deps',
        'release',
      ],
    ],
    'scope-empty': [1, 'never'],
  },
};
