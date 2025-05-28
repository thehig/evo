/**
 * World system types and interfaces
 */

import { IEntity } from "../core/interfaces";

/**
 * 2D position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Terrain types with different properties
 */
export enum TerrainType {
  GRASS = "grass",
  WATER = "water",
  MOUNTAIN = "mountain",
  DESERT = "desert",
  FOREST = "forest",
  SWAMP = "swamp",
}

/**
 * Resource types that can be found in the world
 */
export enum ResourceType {
  FOOD = "food",
  WATER = "water",
  SHELTER = "shelter",
  MINERAL = "mineral",
}

/**
 * Terrain properties including movement costs and resource generation
 */
export interface TerrainProperties {
  /** Movement cost multiplier (1.0 = normal, >1.0 = slower, <1.0 = faster) */
  movementCost: number;

  /** Whether entities can pass through this terrain */
  passable: boolean;

  /** Resource generation rates for this terrain type */
  resourceGeneration: Partial<Record<ResourceType, number>>;

  /** Visual representation color */
  color: string;
}

/**
 * Resource node in the world
 */
export interface ResourceNode {
  /** Type of resource */
  type: ResourceType;

  /** Current amount available */
  amount: number;

  /** Maximum amount this node can hold */
  maxAmount: number;

  /** Regeneration rate per tick */
  regenerationRate: number;

  /** Position in the world */
  position: Position;
}

/**
 * Grid cell containing terrain, entities, and resources
 */
export interface GridCell {
  /** Position of this cell */
  position: Position;

  /** Terrain type */
  terrain: TerrainType;

  /** Entities currently in this cell */
  entities: Set<IEntity>;

  /** Resource nodes in this cell */
  resources: ResourceNode[];

  /** Whether this cell contains an obstacle */
  hasObstacle: boolean;

  /** Last update tick */
  lastUpdate: number;
}

/**
 * Chunk for managing large worlds efficiently
 */
export interface WorldChunk {
  /** Chunk coordinates */
  chunkX: number;
  chunkY: number;

  /** Size of the chunk (cells per side) */
  size: number;

  /** Grid cells in this chunk */
  cells: GridCell[][];

  /** Whether this chunk is currently loaded */
  loaded: boolean;

  /** Last access time for unloading inactive chunks */
  lastAccess: number;

  /** Entities in this chunk for quick lookup */
  entities: Set<IEntity>;
}

/**
 * World configuration options
 */
export interface WorldConfig {
  /** World width in cells */
  width: number;

  /** World height in cells */
  height: number;

  /** Chunk size for large world optimization */
  chunkSize: number;

  /** Random seed for world generation */
  seed: number;

  /** Terrain distribution weights */
  terrainDistribution: Partial<Record<TerrainType, number>>;

  /** Resource density (0-1) */
  resourceDensity: number;

  /** Obstacle density (0-1) */
  obstacleDensity: number;

  /** Whether to use chunk-based loading */
  useChunking: boolean;

  /** Maximum number of chunks to keep loaded */
  maxLoadedChunks: number;
}

/**
 * Query options for finding entities
 */
export interface EntityQuery {
  /** Center position for the query */
  position: Position;

  /** Search radius */
  radius: number;

  /** Filter by entity type */
  entityType?: "creature" | "entity";

  /** Filter by active status */
  activeOnly?: boolean;

  /** Maximum number of results */
  limit?: number;
}

/**
 * Result of an entity query
 */
export interface EntityQueryResult {
  /** Found entities */
  entities: IEntity[];

  /** Distance from query center for each entity */
  distances: number[];

  /** Total number of entities found */
  count: number;
}

/**
 * World generation options
 */
export interface WorldGenerationOptions {
  /** Terrain generation algorithm */
  terrainAlgorithm: "random" | "perlin" | "cellular";

  /** Resource placement strategy */
  resourcePlacement: "random" | "clustered" | "terrain-based";

  /** Obstacle placement strategy */
  obstaclePlacement: "random" | "clustered" | "terrain-based";

  /** Smoothing passes for terrain generation */
  smoothingPasses: number;
}
