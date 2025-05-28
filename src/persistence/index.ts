/**
 * Persistence system module exports
 *
 * This module contains the save/load system for storing and retrieving simulation data.
 */

// Core types and interfaces
export * from "./types";

// Export browser-compatible implementations for browser builds
export * from "./browser-persistence";
export { BrowserPersistenceManager as PersistenceManager } from "./index.browser";

// Version information
export const PERSISTENCE_MODULE_VERSION = "0.1.0";

// Re-export commonly used types for convenience
export type {
  IPersistenceManager,
  ISerializable,
  ISaveResult,
  ILoadResult,
  IFileMetadata,
} from "./types";
