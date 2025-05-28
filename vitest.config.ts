import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    setupFiles: ["./tests/setup.ts"],
    env: {
      // Set logging to SILENT during tests to reduce console output
      LOG_LEVEL: "SILENT",
      DEBUG: "false",
      VERBOSE: "false",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/types": resolve(__dirname, "./src/types"),
      "@/utils": resolve(__dirname, "./src/utils"),
      "@/components": resolve(__dirname, "./src/components"),
    },
  },
});
