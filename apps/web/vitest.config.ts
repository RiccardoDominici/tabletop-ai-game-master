import { defineConfig } from 'vitest/config';

/**
 * Test unitari del client (logica pura: audio, umori, formattazione).
 * Solo `src/**`: e2e/ è di Playwright e non deve finire qui.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
