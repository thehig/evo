/**
 * Persistence system module exports
 *
 * This module contains the save/load system for storing and retrieving simulation data.
 */

// Core types and interfaces
export * from "./types";

// Main persistence manager
export { PersistenceManager } from "./persistence-manager";

// Utility functions
export * from "./utils";

// Factory functions
export * from "./factory";

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
