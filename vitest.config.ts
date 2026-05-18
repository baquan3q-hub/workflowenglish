import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    globals: false,
    // Provide dummy Supabase credentials so modules that construct the
    // client at import time (e.g. masteryService) don't crash during tests
    // that exercise only their pure helpers.
    env: {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
