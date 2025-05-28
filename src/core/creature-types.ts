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

  /** Vision data - simplified for now */
  vision: number[];

  /** Internal hunger state (0.0 - 1.0) */
  hunger: number;
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

  /** Vision range (radius) */
  visionRange: number;
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
  visionRange: 1,
};
