import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import blankLineIndent from './scripts/eslint-rules/blank-line-indent.js';
import docCommentFormat from './scripts/eslint-rules/doc-comment-format.js';
import noSpaceBeforeParen from './scripts/eslint-rules/no-space-before-paren.js';
import newlineBeforeStatement from './scripts/eslint-rules/newline-before-statement.js';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: {
      js,
      import: importPlugin,
    },
    extends: ['js/recommended'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
            ['type']
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ]
    }
  },
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowIIFEs: true
      }]
    }
  },
  {
    ...pluginReact.configs.flat.recommended,
    rules: {
      'react/react-in-jsx-scope': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  
  {
    files: ["scripts/eslint-rules/**/*.js"],
    languageOptions: {
      parserOptions: {
        project: null
      }
    }
  },
  {
    files: ['client/**/*.{ts,tsx}', 'server/**/*.ts', 'shared/**/*.ts'],
    plugins: {
      local: {
        rules: {
          'doc-comment-format'      : docCommentFormat,
          'blank-line-indent'       : blankLineIndent,
          'no-space-before-paren'   : noSpaceBeforeParen,
          'newline-before-statement': newlineBeforeStatement
        }
      }
    },
    rules: {
      'local/doc-comment-format'      : 'error',
      'local/blank-line-indent'       : 'error',
      'local/no-space-before-paren'   : 'error',
      'local/newline-before-statement': 'error'
    }
  },
  
  {
    ignores: [
      '.react-router/**',
      '.wrangler/**',
      'build/**',
      'node_modules/**',
      'eslint.config.ts',
      'worker-configuration.d.ts',
      'scripts/**'
    ]
  }
]);
