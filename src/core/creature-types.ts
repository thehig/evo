/**
 * Creature-specific types and interfaces
 *
 * This module defines the types and interfaces for creature implementation,
 * including actions, sensory data, and creature configuration.
 */

/**
 * Available creature actions
 */
export enum CreatureAction {
  MOVE_NORTH = "move_north",
  MOVE_SOUTH = "move_south",
  MOVE_EAST = "move_east",
  MOVE_WEST = "move_west",
  REST = "rest",
  // Future actions can be added here
}

/**
 * Entity types that can be detected by creature senses
 */
export enum EntityType {
  EMPTY = "empty",
  CREATURE_FRIEND = "creature_friend",
  CREATURE_ENEMY = "creature_enemy",
  FOOD = "food",
  WATER = "water",
  OBSTACLE = "obstacle",
  SHELTER = "shelter",
  MINERAL = "mineral",
  UNKNOWN = "unknown",
}

/**
 * Vision cell data for a single grid position
 */
export interface VisionCell {
  /** Type of entity/terrain in this cell */
  entityType: EntityType;

  /** Distance from creature (0.0 = same cell, 1.0 = max vision range) */
  distance: number;

  /** Relative position from creature (-1.0 to 1.0 for each axis) */
  relativeX: number;
  relativeY: number;

  /** Signal strength if this is a communicating creature (0.0 - 1.0) */
  signalStrength: number;
}

/**
 * Memory of recent experiences
 */
export interface MemoryData {
  /** Recent energy changes (positive = gained, negative = lost) */
  recentEnergyChanges: number[];

  /** Recent actions taken */
  recentActions: CreatureAction[];

  /** Recent entity encounters */
  recentEncounters: EntityType[];

  /** Recent signal detections */
  recentSignals: number[];
}

/**
 * Creature sensory input data
 */
export interface ISensoryData {
  /** Current energy level (0.0 - 1.0) */
  energy: number;

  /** Age normalized (0.0 - 1.0) */
  ageNormalized: number;

  /** Position X normalized (0.0 - 1.0) */
  positionX: number;

  /** Position Y normalized (0.0 - 1.0) */
  positionY: number;

  /** Vision data - grid of detected entities */
  vision: VisionCell[];

  /** Internal hunger state (0.0 - 1.0) */
  hunger: number;

  /** Memory of recent experiences */
  memory: MemoryData;

  /** Current signal being broadcast (0.0 - 1.0) */
  currentSignal: number;
}

/**
 * Creature internal state
 */
export interface ICreatureState {
  /** Current hunger level (0.0 = not hungry, 1.0 = very hungry) */
  hunger: number;

  /** Last action performed */
  lastAction: CreatureAction | null;

  /** Number of ticks since last action */
  ticksSinceLastAction: number;

  /** Energy history for memory system */
  energyHistory: number[];

  /** Action history for memory system */
  actionHistory: CreatureAction[];

  /** Entity encounter history */
  encounterHistory: EntityType[];

  /** Signal detection history */
  signalHistory: number[];

  /** Current signal being broadcast */
  broadcastSignal: number;
}

/**
 * Energy costs for different actions
 */
export interface IEnergyCosts {
  /** Energy cost for movement actions */
  movement: number;

  /** Energy cost for resting (negative = energy gain) */
  rest: number;

  /** Base metabolic cost per tick */
  metabolism: number;
}

/**
 * Vision configuration
 */
export interface VisionConfig {
  /** Vision range in cells (1 = 3x3, 2 = 5x5, 3 = 7x7, etc.) */
  range: number;

  /** Maximum distance for entity detection */
  maxDistance: number;

  /** Whether to include diagonal cells */
  includeDiagonals: boolean;
}

/**
 * Memory configuration
 */
export interface MemoryConfig {
  /** Number of recent energy changes to remember */
  energyHistorySize: number;

  /** Number of recent actions to remember */
  actionHistorySize: number;

  /** Number of recent encounters to remember */
  encounterHistorySize: number;

  /** Number of recent signals to remember */
  signalHistorySize: number;
}

/**
 * Creature configuration
 */
export interface ICreatureConfig {
  /** Initial energy level */
  initialEnergy: number;

  /** Maximum energy level */
  maxEnergy: number;

  /** Energy costs for actions */
  energyCosts: IEnergyCosts;

  /** Maximum age in ticks */
  maxAge: number;

  /** World dimensions for position normalization */
  worldDimensions: {
    width: number;
    height: number;
  };

  /** Vision configuration */
  vision: VisionConfig;

  /** Memory configuration */
  memory: MemoryConfig;

  /** Signal transmission range */
  signalRange: number;

  /** Signal transmission strength */
  signalStrength: number;
}

/**
 * Default creature configuration
 */
export const DEFAULT_CREATURE_CONFIG: ICreatureConfig = {
  initialEnergy: 1.0,
  maxEnergy: 1.0,
  energyCosts: {
    movement: 0.05,
    rest: -0.02, // Negative means energy gain
    metabolism: 0.001,
  },
  maxAge: 10000,
  worldDimensions: {
    width: 100,
    height: 100,
  },
  vision: {
    range: 2, // 5x5 grid
    maxDistance: 3.0,
    includeDiagonals: true,
  },
  memory: {
    energyHistorySize: 10,
    actionHistorySize: 5,
    encounterHistorySize: 8,
    signalHistorySize: 6,
  },
  signalRange: 5.0,
  signalStrength: 1.0,
};
