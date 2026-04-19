'use strict';

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'playwright'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:playwright/recommended',
  ],
  rules: {
    // Floating promises are a common source of silent failures in async test code
    '@typescript-eslint/no-floating-promises': 'error',

    // Playwright-specific rules that catch real bugs
    'playwright/no-wait-for-timeout': 'error',
    'playwright/no-focused-test': 'error',
    'playwright/no-skipped-test': 'error',
    'playwright/missing-playwright-await': 'error',

    // Credentials must never appear in test files
    'no-console': 'error',

    // Avoid overly permissive any
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      // Config files are CommonJS, not subject to strict ESLint TS rules
      files: ['.eslintrc.cjs'],
      env: { node: true },
      parserOptions: { project: null },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'playwright-report/', 'test-results/'],
};
