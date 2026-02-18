module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Code style (formatting, semicolons, etc)
        'refactor', // Code refactoring
        'perf', // Performance improvement
        'test', // Adding/updating tests
        'build', // Build system or dependencies
        'ci', // CI/CD changes
        'chore', // Maintenance tasks
        'revert', // Reverting changes
        'wip', // Work in progress (for draft PRs)
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'agentos',
        'agentos.sh',
        'workbench',
        'extensions',
        'sql-adapter',
        'codex',
        'docs',
        'ci',
        'deps',
      ],
    ],
    'subject-case': [0], // Disable case checking
    'body-max-line-length': [0], // Disable body line length
    'footer-max-line-length': [0], // Disable footer line length
  },
};
