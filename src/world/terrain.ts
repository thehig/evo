/**
 * Terrain configuration and utilities
 */

import { TerrainType, TerrainProperties, ResourceType } from "./types";

/**
 * Default terrain properties for each terrain type
 */
export const TERRAIN_PROPERTIES: Record<TerrainType, TerrainProperties> = {
  [TerrainType.GRASS]: {
    movementCost: 1.0,
    passable: true,
    resourceGeneration: {
      [ResourceType.FOOD]: 0.3,
      [ResourceType.WATER]: 0.1,
    },
    color: "#4CAF50", // Green
  },

  [TerrainType.WATER]: {
    movementCost: 2.0,
    passable: true,
    resourceGeneration: {
      [ResourceType.WATER]: 0.8,
      [ResourceType.FOOD]: 0.2, // Fish
    },
    color: "#2196F3", // Blue
  },

  [TerrainType.MOUNTAIN]: {
    movementCost: 3.0,
    passable: true,
    resourceGeneration: {
      [ResourceType.MINERAL]: 0.6,
      [ResourceType.SHELTER]: 0.4,
    },
    color: "#795548", // Brown
  },

  [TerrainType.DESERT]: {
    movementCost: 1.5,
    passable: true,
    resourceGeneration: {
      [ResourceType.MINERAL]: 0.2,
    },
    color: "#FFC107", // Amber
  },

  [TerrainType.FOREST]: {
    movementCost: 1.2,
    passable: true,
    resourceGeneration: {
      [ResourceType.FOOD]: 0.5,
      [ResourceType.SHELTER]: 0.3,
      [ResourceType.WATER]: 0.2,
    },
    color: "#388E3C", // Dark Green
  },

  [TerrainType.SWAMP]: {
    movementCost: 2.5,
    passable: true,
    resourceGeneration: {
      [ResourceType.WATER]: 0.4,
      [ResourceType.FOOD]: 0.3,
    },
    color: "#689F38", // Light Green
  },
};

/**
 * Default terrain distribution weights for world generation
 */
export const DEFAULT_TERRAIN_DISTRIBUTION: Record<TerrainType, number> = {
  [TerrainType.GRASS]: 0.35,
  [TerrainType.WATER]: 0.15,
  [TerrainType.MOUNTAIN]: 0.1,
  [TerrainType.DESERT]: 0.1,
  [TerrainType.FOREST]: 0.2,
  [TerrainType.SWAMP]: 0.1,
};

/**
 * Get terrain properties for a given terrain type
 */
export function getTerrainProperties(terrain: TerrainType): TerrainProperties {
  return TERRAIN_PROPERTIES[terrain];
}

/**
 * Check if a terrain type is passable
 */
export function isTerrainPassable(terrain: TerrainType): boolean {
  return TERRAIN_PROPERTIES[terrain].passable;
}

/**
 * Get movement cost for a terrain type
 */
export function getMovementCost(terrain: TerrainType): number {
  return TERRAIN_PROPERTIES[terrain].movementCost;
}

/**
 * Get resource generation rate for a terrain and resource type
 */
export function getResourceGeneration(
  terrain: TerrainType,
  resource: ResourceType
): number {
  return TERRAIN_PROPERTIES[terrain].resourceGeneration[resource] || 0;
}

/**
 * Get all terrain types that can generate a specific resource
 */
export function getTerrainTypesForResource(
  resource: ResourceType
): TerrainType[] {
  return Object.entries(TERRAIN_PROPERTIES)
    .filter(
      ([, properties]) =>
        properties.resourceGeneration[resource] &&
        properties.resourceGeneration[resource]! > 0
    )
    .map(([terrain]) => terrain as TerrainType);
}

/**
 * Calculate effective movement cost considering terrain and obstacles
 */
export function calculateEffectiveMovementCost(
  terrain: TerrainType,
  hasObstacle: boolean
): number {
  const baseCost = getMovementCost(terrain);
  return hasObstacle ? baseCost * 2.0 : baseCost;
}
