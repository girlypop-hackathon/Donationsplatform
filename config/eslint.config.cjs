// Basic ESLint setup for this project.
// Goal: keep backend linting simple and useful in CI.
module.exports = {
  // Use this as the top-level ESLint config.
  root: true,

  // Backend runtime environment.
  env: {
    es2022: true,
    node: true
  },

  // Parse modern JavaScript files as classic Node scripts.
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },

  // Ignore frontend/build folders in this backend-focused config.
  ignorePatterns: ['node_modules/', 'Frontend/**', 'public/**', 'dist/**'],

  // Start from ESLint's recommended bug-prevention rules.
  extends: ['eslint:recommended'],

  // Relax style-heavy rules for now to avoid noisy CI failures.
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    camelcase: 'off'
  }
}
