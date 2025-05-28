/**
 * Renderer system types and interfaces
 */

import {
  Position,
  TerrainType,
  ResourceType,
  ResourceNode,
} from "../world/types";

/**
 * Renderer capabilities that define what a renderer can do
 */
export interface RendererCapabilities {
  /** Whether the renderer can display visual output */
  hasVisualOutput: boolean;

  /** Whether the renderer supports real-time rendering */
  supportsRealTime: boolean;

  /** Whether the renderer can export images/videos */
  canExport: boolean;

  /** Whether the renderer supports interactive controls */
  supportsInteraction: boolean;

  /** Maximum world size the renderer can handle efficiently */
  maxWorldSize: { width: number; height: number };

  /** Supported export formats */
  exportFormats: string[];

  /** Renderer-specific metadata */
  metadata: Record<string, unknown>;
}

/**
 * Snapshot of an entity's state at a specific moment
 */
export interface EntitySnapshot {
  /** Entity ID */
  id: string;

  /** Entity type */
  type: "entity" | "creature";

  /** Position in the world */
  position: Position;

  /** Whether the entity is active */
  active: boolean;

  /** Additional entity-specific data */
  data: Record<string, unknown>;
}

/**
 * Snapshot of a creature's state (extends EntitySnapshot)
 */
export interface CreatureSnapshot extends EntitySnapshot {
  type: "creature";

  /** Current energy level */
  energy: number;

  /** Age in simulation ticks */
  age: number;

  /** Whether the creature is alive */
  alive: boolean;

  /** Creature-specific data including neural network state */
  data: {
    /** Neural network weights and biases */
    brainState?: unknown;

    /** Genetic information */
    genome?: unknown;

    /** Current action being performed */
    currentAction?: string;

    /** Additional creature data */
    [key: string]: unknown;
  };
}

/**
 * Snapshot of a grid cell's state
 */
export interface CellSnapshot {
  /** Position of the cell */
  position: Position;

  /** Terrain type */
  terrain: TerrainType;

  /** Entity IDs in this cell */
  entityIds: string[];

  /** Resource nodes in this cell */
  resources: ResourceNode[];

  /** Whether this cell has an obstacle */
  hasObstacle: boolean;

  /** Last update tick */
  lastUpdate: number;
}

/**
 * Complete snapshot of the world state at a specific moment
 */
export interface WorldSnapshot {
  /** Timestamp when the snapshot was taken */
  timestamp: number;

  /** Simulation tick when the snapshot was taken */
  tick: number;

  /** World dimensions */
  dimensions: { width: number; height: number };

  /** All entities in the world */
  entities: EntitySnapshot[];

  /** All creatures in the world */
  creatures: CreatureSnapshot[];

  /** Grid cells (can be sparse for large worlds) */
  cells: CellSnapshot[];

  /** World-level statistics */
  statistics: {
    /** Total number of entities */
    totalEntities: number;

    /** Total number of creatures */
    totalCreatures: number;

    /** Number of living creatures */
    livingCreatures: number;

    /** Average creature energy */
    averageEnergy: number;

    /** Total resources in the world */
    totalResources: Record<ResourceType, number>;

    /** Additional statistics */
    [key: string]: unknown;
  };

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Rendering context that provides information about the current render state
 */
export interface RenderContext {
  /** Current simulation tick */
  tick: number;

  /** Delta time since last render */
  deltaTime: number;

  /** Whether the simulation is paused */
  paused: boolean;

  /** Current zoom level (1.0 = normal) */
  zoom: number;

  /** Camera position in world coordinates */
  camera: Position;

  /** Viewport dimensions */
  viewport: { width: number; height: number };

  /** Additional context data */
  metadata: Record<string, unknown>;
}

/**
 * Renderer event types
 */
export enum RendererEventType {
  RENDER_START = "render_start",
  RENDER_END = "render_end",
  SNAPSHOT_CREATED = "snapshot_created",
  EXPORT_START = "export_start",
  EXPORT_END = "export_end",
  ERROR = "error",
}

/**
 * Base renderer event
 */
export interface RendererEvent {
  readonly type: RendererEventType;
  readonly timestamp: number;
  readonly data?: unknown;
}

/**
 * Event handler for renderer events
 */
export type RendererEventHandler = (event: RendererEvent) => void;

/**
 * Core renderer interface
 */
export interface IRenderer {
  /** Unique identifier for this renderer */
  readonly id: string;

  /** Human-readable name for this renderer */
  readonly name: string;

  /** Renderer capabilities */
  readonly capabilities: RendererCapabilities;

  /** Whether the renderer is currently initialized */
  readonly initialized: boolean;

  /** Initialize the renderer with configuration */
  initialize(config?: Record<string, unknown>): Promise<void>;

  /** Shutdown the renderer and clean up resources */
  shutdown(): Promise<void>;

  /** Render a world snapshot */
  render(snapshot: WorldSnapshot, context: RenderContext): Promise<void>;

  /** Create a snapshot from the current world state */
  createSnapshot(world: unknown, tick: number): WorldSnapshot;

  /** Export the current render to a file or data */
  export?(
    format: string,
    options?: Record<string, unknown>
  ): Promise<Blob | string>;

  /** Subscribe to renderer events */
  on(eventType: RendererEventType, handler: RendererEventHandler): void;

  /** Unsubscribe from renderer events */
  off(eventType: RendererEventType, handler: RendererEventHandler): void;

  /** Update renderer configuration */
  configure(config: Record<string, unknown>): void;
}

/**
 * Renderer factory function type
 */
export type RendererFactory = (config?: Record<string, unknown>) => IRenderer;

/**
 * Renderer registration information
 */
export interface RendererRegistration {
  /** Renderer ID */
  id: string;

  /** Renderer name */
  name: string;

  /** Factory function to create the renderer */
  factory: RendererFactory;

  /** Default configuration */
  defaultConfig: Record<string, unknown>;

  /** Renderer capabilities */
  capabilities: RendererCapabilities;
}
