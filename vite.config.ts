import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // or 'happy-dom', 'node'
    exclude: [...configDefaults.exclude, "**/node_modules/**", "**/dist/**"],
    setupFiles: ["/c:/dev/personal/evo/tests/vitest.setup.ts"],
  },
});
