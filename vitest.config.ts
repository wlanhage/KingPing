import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Samma @/-alias som Next använder, så tester kan importera appkod direkt.
  resolve: { alias: { '@': resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
});
