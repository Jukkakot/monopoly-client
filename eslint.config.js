import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Empty catch blocks are an intentional pattern here — localStorage / sessionStorage
      // access is best-effort and must never throw (private mode, SSR, quota).
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Allow deliberately-unused bindings when prefixed with _ (destructure holes, etc.).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // The React-Compiler / react-refresh rules below flag deliberate, working patterns in
      // this pre-Compiler codebase (helper render fns, ref reads in init, HMR export shape).
      // Kept as advisory warnings — visible, but not error-gating.
      'react-refresh/only-export-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // Test helpers legitimately use `any` when poking at loosely-typed harness internals.
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
])
