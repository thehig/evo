/**
 * Renderer module exports
 */

// Core types and interfaces
export * from "./types";

// Renderer implementations
export { NullRenderer } from "./NullRenderer";

// Utility classes
export { WorldSnapshotCreator } from "./WorldSnapshot";
export { RendererRegistry } from "./RendererRegistry";

// Import classes for utility functions
import { NullRenderer } from "./NullRenderer";
import { RendererRegistry } from "./RendererRegistry";

// Utility functions
export const createNullRenderer = (_config?: Record<string, unknown>) => {
  return new NullRenderer();
};

export const createWebGLRenderer = async (config?: Record<string, unknown>) => {
  // Lazy load WebGL renderer to avoid P5.js loading in Node.js environments
  const { WebGLRenderer } = await import("./WebGLRenderer");
  return new WebGLRenderer(config);
};

export const getRendererRegistry = () => {
  return RendererRegistry.getInstance();
};

export const RENDERER_MODULE_VERSION = "0.1.0";

// Lazy export for WebGL renderer
export const getWebGLRenderer = async () => {
  const { WebGLRenderer } = await import("./WebGLRenderer");
  return WebGLRenderer;
};
