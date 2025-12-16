import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.{test,spec}.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'test/nuxt/**', // Nuxt tests must use vitest.nuxt.config.ts
      'test/e2e/**',  // E2E tests use Playwright
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Focus on TypeScript files (composables, utils, API) rather than Vue components
      // Vue components are better tested with E2E tests
      include: ['app/**/*.ts', 'server/**/*.ts'],
      exclude: [
        'node_modules/',
        '.nuxt/',
        'dist/',
        '**/*.config.ts',
        '**/*.{test,spec,e2e}.ts',
        'test/',
        'app/app.vue',
        'app/**/*.vue', // Exclude Vue components - tested via E2E
        'app/plugins/**', // Plugins are tested via integration
        'server/routes/**', // Routes are tested via E2E
      ],
      thresholds: {
        // Realistic thresholds based on current TS coverage (~17%)
        // Server APIs are primarily tested via E2E, not unit tests
        // Focus on critical business logic (composables, utils)
        lines: 15,
        functions: 15,
        branches: 15,
        statements: 15,
      },
    },
  },
})
