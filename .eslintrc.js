// .eslintrc.js
const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');
const jestPlugin = require('eslint-plugin-jest');
const prettierPlugin = require('eslint-plugin-prettier');
const reactHooks = require('eslint-plugin-react-hooks');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');

module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    // include root tsconfig and any package-level tsconfigs
    project: ['./tsconfig.json', './packages/*/tsconfig.json'],
  },

  plugins: ['@typescript-eslint', 'import', 'jest', 'prettier', 'react-hooks', 'unused-imports'],

  extends: [
    // Base ESLint + TS recommendations
    'plugin:@typescript-eslint/recommended',
    // Import rules
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    // Prettier integration
    'prettier',
    'plugin:prettier/recommended',
    // Jest
    'plugin:jest/recommended',
  ],

  env: {
    node: true,
    jest: true,
  },

  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      // resolve TS paths, including packages/*
      typescript: {
        project: ['./tsconfig.json', './packages/*/tsconfig.json'],
      },
      node: {
        extensions: ['.js', '.ts'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },

  rules: {
    /*** TypeScript ***/
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-types': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
      { selector: 'typeAlias', format: ['PascalCase'], prefix: ['T'] },
      { selector: 'enum', format: ['PascalCase'], prefix: ['E'] },
    ],
    '@typescript-eslint/no-unused-vars': 'off', // handled by unused-imports

    /*** Import ordering ***/
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: 'packages/**',
            group: 'internal',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin', 'external'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-absolute-path': 'error',
    'import/no-useless-path-segments': 'error',
    'import/no-duplicates': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-extraneous-dependencies': 'error',
    'import/no-mutable-exports': 'error',

    /*** React Hooks ***/
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    /*** Jest ***/
    'jest/no-done-callback': 'off',

    /*** Unused imports/vars ***/
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        args: 'after-used',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],

    /*** Prettier ***/
    'prettier/prettier': 'error',

    /*** General JS ***/
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',
    'spaced-comment': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
    'no-return-await': 'error',
    curly: ['error', 'all'],
    'no-multi-spaces': 'error',
    'no-trailing-spaces': 'error',
    // disallow parent-relative imports (../*), but allow same-folder (./*)
    'no-restricted-imports': ['error', { patterns: ['../*'] }],
  },

  overrides: [
    {
      // for config and script files
      files: ['**/*.config.js', '.eslintrc.js', 'rollup.config.*.js'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      env: { node: true },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-commonjs': 'off',
      },
    },
  ],
};
