/**
 * World system module exports
 *
 * This module contains the grid-based world system with entities, terrain, and resources.
 */

// Core world class
export { World } from "./World";

// Types and interfaces
export type {
  Position,
  TerrainProperties,
  ResourceNode,
  GridCell,
  WorldChunk,
  WorldConfig,
  WorldGenerationOptions,
  EntityQuery,
  EntityQueryResult,
} from "./types";

export { TerrainType, ResourceType } from "./types";

// Terrain configuration and utilities
export {
  TERRAIN_PROPERTIES,
  DEFAULT_TERRAIN_DISTRIBUTION,
  getTerrainProperties,
  isTerrainPassable,
  getMovementCost,
  getResourceGeneration,
  getTerrainTypesForResource,
  calculateEffectiveMovementCost,
} from "./terrain";

// World generation utilities
export {
  generateTerrain,
  generateResources,
  generateObstacles,
} from "./generation";

export const WORLD_MODULE_VERSION = "1.0.0";
