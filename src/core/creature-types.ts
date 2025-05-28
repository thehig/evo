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
  // 8-directional movement
  MOVE_NORTH = "move_north",
  MOVE_SOUTH = "move_south",
  MOVE_EAST = "move_east",
  MOVE_WEST = "move_west",
  MOVE_NORTHEAST = "move_northeast",
  MOVE_NORTHWEST = "move_northwest",
  MOVE_SOUTHEAST = "move_southeast",
  MOVE_SOUTHWEST = "move_southwest",

  // Energy conservation
  REST = "rest",
  SLEEP = "sleep", // Deep rest with higher energy gain but vulnerability

  // Communication
  EMIT_SIGNAL = "emit_signal",

  // Special actions based on cell contents
  EAT = "eat", // Consume food in current cell
  DRINK = "drink", // Consume water in current cell
  GATHER = "gather", // Collect resources/minerals
  ATTACK = "attack", // Attack another creature
  DEFEND = "defend", // Defensive stance

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
  /** Energy cost for cardinal movement actions (N, S, E, W) */
  movement: number;

  /** Energy cost for diagonal movement actions (NE, NW, SE, SW) */
  diagonalMovement: number;

  /** Energy cost for resting (negative = energy gain) */
  rest: number;

  /** Energy cost for sleeping (negative = higher energy gain than rest) */
  sleep: number;

  /** Energy cost for emitting communication signals */
  emitSignal: number;

  /** Energy cost for eating (negative = energy gain from food) */
  eat: number;

  /** Energy cost for drinking (negative = energy gain from water) */
  drink: number;

  /** Energy cost for gathering resources */
  gather: number;

  /** Energy cost for attacking */
  attack: number;

  /** Energy cost for defending */
  defend: number;

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
    movement: 0.05, // Cardinal movement
    diagonalMovement: 0.07, // Diagonal movement costs more (sqrt(2) factor)
    rest: -0.02, // Negative means energy gain
    sleep: -0.05, // Higher energy gain than rest but more vulnerable
    emitSignal: 0.03, // Communication costs energy
    eat: -0.15, // Eating provides significant energy
    drink: -0.08, // Drinking provides moderate energy
    gather: 0.04, // Gathering resources costs energy
    attack: 0.12, // Attacking is energy intensive
    defend: 0.06, // Defending costs moderate energy
    metabolism: 0.001, // Base metabolic cost
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

/**
 * Result of an action attempt
 */
export interface ActionResult {
  /** Whether the action was successfully executed */
  success: boolean;

  /** Energy change from the action (positive = gained, negative = lost) */
  energyChange: number;

  /** Reason for failure if action was not successful */
  failureReason?: string;

  /** Additional effects or information from the action */
  effects?: {
    /** Damage dealt (for attack actions) */
    damageDealt?: number;

    /** Damage received (for defend actions or being attacked) */
    damageReceived?: number;

    /** Resources gathered (for gather actions) */
    resourcesGathered?: number;

    /** Signal strength emitted (for emit_signal actions) */
    signalEmitted?: number;
  };
}

/**
 * Action conflict resolution data
 */
export interface ActionConflict {
  /** Creatures involved in the conflict */
  creatures: string[]; // Creature IDs

  /** Actions being attempted */
  actions: CreatureAction[];

  /** Cell position where conflict occurs */
  position: { x: number; y: number };

  /** Type of conflict */
  conflictType: "movement" | "resource" | "combat" | "communication";
}

/**
 * Action feedback for neural network learning
 */
export interface ActionFeedback {
  /** The action that was attempted */
  action: CreatureAction;

  /** Result of the action */
  result: ActionResult;

  /** Environmental context when action was taken */
  context: {
    /** Energy level before action (0.0 - 1.0) */
    energyBefore: number;

    /** Entities visible in the area */
    nearbyEntities: EntityType[];

    /** Signals detected in the area */
    nearbySignals: number[];
  };

  /** Reward signal for learning (-1.0 to 1.0) */
  reward: number;
}
