import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/api/**/*.test.ts'],
    globalSetup: ['./tests/api/globalSetup.ts'],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
