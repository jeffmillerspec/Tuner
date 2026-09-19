import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.vitest.mjs'],
    exclude: ['tests/**/*.test.mjs', 'node_modules/**'],
    testTimeout: 30000,
    environment: 'happy-dom',
  },
});
