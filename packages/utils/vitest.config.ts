import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    workspace: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.{spec,test}.ts'],
          exclude: ['**/*.browser.{spec,test}.ts', '**/node_modules/**'],
        },
      },
    ],
  },
})
