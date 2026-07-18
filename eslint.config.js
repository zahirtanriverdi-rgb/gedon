import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Root lint covers the Express API + scripts only. The Next.js frontend in web/ has its own
// toolchain; linting it from here would need the React plugins this API-only package no
// longer carries.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report', '.claude', 'web'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
    },
  },
);
