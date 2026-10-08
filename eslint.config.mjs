import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

/*
 * eslint-config-next registers the `import`, `jsx-a11y`, `react`,
 * `react-hooks`, `@next/next` and `@typescript-eslint` plugins for every
 * source file (some of them wrapped), so this file never registers those
 * again: it only adds rules by name on top of them. The layer boundaries and
 * the import order come from `import-x`, which supports ESLint 10 (the
 * `import` plugin that eslint-config-next bundles does not for those rules).
 */

/**
 * Route groups of app/ (AGENTS.md §3). Each one is a module: only the module
 * itself may import from its folder. Add a group here when its module starts.
 */
const modules = [
  '(marketing)',
  '(auth)',
  '(invitations)',
  '(appointments)',
  '(specialists)',
  '(account)',
  '(billing)',
  '(bridges)',
];

const sharedLayers = ['./app/ui', './app/lib', './app/hooks', './tests'];

/** Nothing imports from a module group except that module (§3, rule 9). */
const moduleZones = modules.map((module) => ({
  target: [
    ...sharedLayers,
    ...modules.filter((other) => other !== module).map((m) => `./app/${m}`),
  ],
  from: `./app/${module}`,
  message: `app/${module} is a module: only files inside it may import from it.`,
}));

const layerZones = [
  {
    target: './app/ui',
    from: ['./app/providers.tsx', './app/layout.tsx'],
    message: 'app/ui imports only app/lib and app/hooks.',
  },
  {
    target: './app/lib',
    from: ['./app/ui', './app/hooks'],
    message: 'app/lib holds non-React logic: it never imports UI or hooks.',
  },
  {
    target: './app/hooks',
    from: ['./app/ui'],
    message: 'app/hooks imports only app/lib.',
  },
  {
    target: ['./app/ui', './app/hooks', './app/lib/queries'],
    from: './app/lib/data',
    message:
      'app/lib/data is server-only: client code reads through app/lib/queries.',
  },
];

/** Rules of a typescript-eslint shared config, without its plugin/parser registration. */
const rulesOf = (configs) =>
  configs.flatMap((config) => (config.rules ? [{ rules: config.rules }] : []));

const eslintConfig = defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{jsx,tsx}'],
    rules: { ...jsxA11y.flatConfigs.strict.rules },
  },
  {
    files: ['**/*.{ts,tsx,mts,js,mjs,cjs}'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/internal-regex': '^@/',
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },
    rules: {
      'no-console': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: [...moduleZones, ...layerZones],
        },
      ],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'type',
          ],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'react-dom', group: 'external', position: 'before' },
            { pattern: 'react/**', group: 'external', position: 'before' },
            { pattern: 'react-dom/**', group: 'external', position: 'before' },
            { pattern: 'next', group: 'external', position: 'before' },
            { pattern: 'next/**', group: 'external', position: 'before' },
            { pattern: '@/app/lib/**', group: 'internal', position: 'before' },
            { pattern: '@/app/ui/**', group: 'internal' },
            { pattern: '@/app/hooks/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [
      ...rulesOf(tseslint.configs.strictTypeChecked),
      ...rulesOf(tseslint.configs.stylisticTypeChecked),
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
  },
  {
    // Motion enters through app/ui/motion only (AGENTS.md §8, rule 11).
    files: ['**/*.{ts,tsx}'],
    ignores: ['app/ui/motion/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'motion/react',
              message: 'Import from @/app/ui/motion (AGENTS.md §8, rule 11).',
            },
            {
              name: 'framer-motion',
              message: 'Import from @/app/ui/motion (AGENTS.md §8, rule 11).',
            },
          ],
          patterns: [
            {
              group: ['motion/*', 'framer-motion/*'],
              message: 'Import from @/app/ui/motion (AGENTS.md §8, rule 11).',
            },
          ],
        },
      ],
    },
  },
  {
    // app/lib holds no React (AGENTS.md §3, rule 9).
    files: ['app/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            'react',
            'react-dom',
            'next/link',
            'next/image',
            'next/navigation',
          ],
          patterns: ['react/*', 'react-dom/*'],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
]);

export default eslintConfig;
