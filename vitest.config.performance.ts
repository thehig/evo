import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    name: "performance",
    include: ["tests/performance/**/*.test.ts"],
    exclude: ["tests/unit/**", "tests/integration/**", "tests/core/**"],

    // Performance test specific settings
    testTimeout: 60000, // 60 seconds for longer performance tests
    hookTimeout: 30000,

    // Run performance tests sequentially to avoid resource contention
    sequence: {
      concurrent: false,
    },

    // Disable parallelization for consistent performance measurements
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Environment setup
    globals: true,
    environment: "node",

    // Custom reporter for performance metrics
    reporters: ["default"],

    // Setup files
    setupFiles: ["./tests/setup.ts"],

    // Allow for longer setup times
    teardownTimeout: 10000,

    // Custom environment variables for performance tests
    env: {
      NODE_ENV: "test",
      PERFORMANCE_TEST: "true",
      LOG_LEVEL: "error", // Minimal logging for accurate timing
    },
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@tests": resolve(__dirname, "./tests"),
    },
  },

  // Optimize for performance testing
  esbuild: {
    target: "node18",
    minify: false, // Don't minify for easier debugging
  },
});
