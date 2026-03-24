import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment:  'jsdom',
    globals:      true,
    setupFiles:   ['./src/tests/setup.tsx'],
    include:      ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude:      ['src/tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'json', 'html'],
      include:    ['src/**/*.{ts,tsx}'],
      exclude:    ['src/**/*.{test,spec}.{ts,tsx}', 'src/tests/**'],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@packages/lib': path.resolve(__dirname, '../../packages/lib/src'),
    },
  },
})
