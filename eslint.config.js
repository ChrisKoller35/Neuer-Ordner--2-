import js from '@eslint/js';
import globals from 'globals';

export default [
  // Basis-Empfehlungen von ESLint
  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      // ── Fehler-Vermeidung ──
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      'no-undef': 'error',
      'no-constant-condition': 'warn',
      'no-debugger': 'warn',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-irregular-whitespace': 'error',
      'no-unreachable': 'error',
      'no-useless-assignment': 'warn',

      // ── Best Practices ──
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-var': 'warn',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'no-shadow': 'warn',
      'no-throw-literal': 'warn',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',

      // ── Style (alles was Prettier nicht abdeckt) ──
      'no-lonely-if': 'warn',
      'prefer-template': 'warn',
      'object-shorthand': ['warn', 'properties'],
      'no-useless-rename': 'warn',
      'no-useless-return': 'warn'
    }
  },

  // Prettier-Kompatibilität: Style-Regeln abschalten die mit Prettier kollidieren
  {
    rules: {
      // Prettier übernimmt Formatting – diese Regeln deaktivieren
      'indent': 'off',
      'quotes': 'off',
      'semi': 'off',
      'comma-dangle': 'off',
      'arrow-parens': 'off',
      'brace-style': 'off',
      'max-len': 'off'
    }
  },

  // Test-Dateien: zusätzliche Globals
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly'
      }
    }
  },

  // Ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'tools/**',
      'scripts/**',
      '*.config.js'
    ]
  }
];
