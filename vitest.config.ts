import { defineConfig } from 'vitest/config';

// Tools + protocol handler are plain functions with no Workers-runtime
// dependency, so the default node environment runs the full suite (protocol,
// tool correctness, pricing/notice drift guards) without miniflare.
export default defineConfig({
  // This package has no CSS; stop Vite from walking up and loading the parent
  // website's postcss/tailwind config.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
