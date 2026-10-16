import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { NODE_ENV: "test" },
    // The in-memory Mongo download + spin-up on first run can be slow.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Integration files own their DB lifecycle via `useTestDb()`; run serially
    // so the shared in-memory Mongo stays predictable.
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/seed.ts", "src/types/**"],
    },
  },
});
