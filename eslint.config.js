import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'server', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  // Règle §2.4 : un module ne s'importe que depuis src/core (@core/*).
  // Fichiers à la racine d'un module : interdit de sortir du dossier du module.
  {
    files: ['src/modules/*/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '**/app/**'],
              message: 'Un module ne peut importer que depuis @core/*.',
            },
          ],
        },
      ],
    },
  },
  // Sous-dossiers d'un module (components/...) : idem, un niveau plus bas.
  {
    files: ['src/modules/*/*/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*', '**/app/**'],
              message: 'Un module ne peut importer que depuis @core/*.',
            },
          ],
        },
      ],
    },
  },
);
