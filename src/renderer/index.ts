/**
 * Renderer module exports
 *
 * This module contains the renderer interface and implementations.
 */

// Core types and interfaces
export type {
  IRenderer,
  RendererCapabilities,
  WorldSnapshot,
  EntitySnapshot,
  CreatureSnapshot,
  CellSnapshot,
  RenderContext,
  RendererEvent,
  RendererEventHandler,
  RendererFactory,
  RendererRegistration,
} from "./types";

export { RendererEventType } from "./types";

// Core classes
export { WorldSnapshotCreator } from "./WorldSnapshot";
export { NullRenderer } from "./NullRenderer";
export { RendererRegistry } from "./RendererRegistry";

// Import classes for utility functions
import { NullRenderer } from "./NullRenderer";
import { RendererRegistry } from "./RendererRegistry";

// Utility functions
export const createNullRenderer = (config?: Record<string, unknown>) => {
  return new NullRenderer();
};

export const getRendererRegistry = () => {
  return RendererRegistry.getInstance();
};

export const RENDERER_MODULE_VERSION = "0.1.0";
