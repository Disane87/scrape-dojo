const scopeEmojis = {
  api: '🖥️',
  ui: '🎨',
  docs: '📔',
  docker: '🐳',
  auth: '🔐',
  scrape: '🕷️',
  db: '🗄️',
  shared: '📦',
  ci: '🤖',
  deps: '📌',
  release: '🏷️',
};

const typeMap = {
  feat: '🚀 Features',
  fix: '🛠️ Fixes',
  perf: '⚡ Performance',
  revert: '🔙 Reverts',
  docs: '📔 Docs',
  style: '💎 Styles',
  refactor: '♻️ Refactor',
  test: '🧪 Tests',
  build: '📦 Build',
  ci: '🤖 CI',
};

const types = Object.entries(typeMap).map(([type, section]) => ({
  type,
  section,
}));
types.push({ type: 'chore', section: '🔧 Chore', hidden: true });

module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: { types },
        writerOpts: {
          transform: (commit) => {
            const result = { ...commit };

            // Set shortHash for commit link display
            if (result.hash) {
              result.shortHash = result.hash.substring(0, 7);
            }

            // Map type to section header (replaces preset default transform)
            if (result.type && typeMap[result.type]) {
              result.type = typeMap[result.type];
            } else if (result.type === 'chore') {
              return false;
            } else if (!result.type) {
              return false;
            }

            // Add emoji prefix to scope
            if (result.scope && scopeEmojis[result.scope]) {
              result.scope = `${scopeEmojis[result.scope]} ${result.scope}`;
            }

            return result;
          },
        },
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'pnpm-lock.yaml'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
