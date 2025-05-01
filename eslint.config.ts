import { GLOB_MARKDOWN_CODE, GLOB_TESTS } from '@antfu/eslint-config'
import { defineConfig } from '@importantimport/eslint-config'

// @ts-expect-error - fix this
export default defineConfig([{
  rules: {
    '@masknet/no-default-error': 'off',
    '@masknet/no-then': 'off',
    'sonarjs/todo-tag': 'warn',
  },
  vue: true,
}, {
  files: [...GLOB_TESTS, GLOB_MARKDOWN_CODE],
  rules: {
    '@masknet/no-top-level': 'off',
    '@masknet/unicode-specific-set': 'off',
  },
}, {
  rules: {
    'import/order': [
      'error',
      {
        'groups': [
          ['type'],
          ['builtin', 'external'],
          ['parent', 'sibling', 'index'],
        ],
        'newlines-between': 'always',
      },
    ],
  },
}, {
  ignores: [
    'cspell.config.yaml',
    'cspell.config.yml',
  ],
}])
