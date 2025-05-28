import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/types": resolve(__dirname, "./src/types"),
      "@/utils": resolve(__dirname, "./src/utils"),
      "@/components": resolve(__dirname, "./src/components"),
      // Use browser-compatible persistence for browser builds
      "./persistence/index": resolve(
        __dirname,
        "./src/persistence/index.browser.ts"
      ),
    },
  },
  build: {
    target: "es2020",
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "NeuralEvolutionSimulator",
      fileName: "neural-evolution-simulator",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      // Externalize Node.js built-in modules for browser compatibility
      external: ["crypto", "fs", "fs/promises", "path", "os", "util"],
      output: {
        globals: {
          crypto: "crypto",
          fs: "fs",
          "fs/promises": "fs",
          path: "path",
          os: "os",
          util: "util",
        },
      },
    },
  },
  esbuild: {
    target: "es2020",
  },
  define: {
    // Define environment for conditional compilation
    __BROWSER__: true,
    __NODE__: false,
  },
});
