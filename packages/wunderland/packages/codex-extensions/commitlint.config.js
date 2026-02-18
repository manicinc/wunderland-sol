module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, no code change
        'refactor', // Code restructuring
        'perf',     // Performance improvement
        'test',     // Adding tests
        'chore',    // Maintenance
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert previous commit
        'security', // Security fix
        'plugin',   // Plugin-related changes
        'theme',    // Theme-related changes
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'core',      // Core functionality
        'loader',    // Plugin loader
        'manager',   // Plugin manager
        'security',  // Security scanner
        'themes',    // Theme system
        'templates', // Plugin templates
        'types',     // Type definitions
        'registry',  // Registry
        'ci',        // CI/CD
        'deps',      // Dependencies
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [2, 'always', 200],
  },
};

