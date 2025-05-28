/**
 * Types of obstacles in the environment
 */
export enum ObstacleType {
  SOLID_BARRIER = "solid_barrier",
  PARTIAL_BARRIER = "partial_barrier",
  HAZARD = "hazard",
  SHELTER = "shelter",
  RESOURCE_POINT = "resource_point",
  WATER = "water",
  CLIFF = "cliff",
  CAVE = "cave",
  TREE = "tree",
  ROCK = "rock",
}

/**
 * Movement effects caused by obstacles
 */
export enum MovementEffect {
  BLOCKED = "blocked",
  SLOWED = "slowed",
  DAMAGE = "damage",
  HIDDEN = "hidden",
  ELEVATED = "elevated",
}

/**
 * Represents an obstacle in the environment
 */
export interface IObstacle {
  id: string;
  type: ObstacleType;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  properties: IObstacleProperties;
}

/**
 * Properties that define obstacle behavior
 */
export interface IObstacleProperties {
  // Movement properties
  passable: boolean; // Can creatures move through this obstacle
  movementCost: number; // Multiplier for movement energy cost (1 = normal, >1 = harder)
  damageOnContact: number; // Damage dealt when creature touches obstacle
  damagePerTick: number; // Continuous damage while in contact

  // Signal properties
  signalBlocking: number; // 0-1 value for signal attenuation
  signalReflection: number; // 0-1 value for signal reflection

  // Vision properties
  visionBlocking: boolean; // Does this block line of sight
  transparency: number; // 0-1 value for partial vision blocking

  // Interaction properties
  hidingValue: number; // 0-1 value for how well creatures can hide here
  climbable: boolean; // Can creatures climb over this obstacle
  climbCost: number; // Energy cost to climb over

  // Special effects
  statusEffects?: IObstacleStatusEffect[]; // Status effects applied to creatures
  resourceGeneration?: number; // Rate of resource generation (if resource point)
  maxResources?: number; // Maximum resources this obstacle can hold
}

/**
 * Status effect applied by obstacles
 */
export interface IObstacleStatusEffect {
  type: string; // Type of status effect (e.g., 'poisoned', 'energized')
  magnitude: number; // Strength of the effect
  duration: number; // Duration in ticks (0 = permanent while in contact)
  probabilityPerTick: number; // Chance per tick of applying effect (0-1)
}

/**
 * Configuration for obstacle system
 */
export interface IObstacleSystemConfig {
  collisionDetection: boolean;
  signalAttenuation: boolean;
  visionBlocking: boolean;
  statusEffects: boolean;
  resourceGeneration: boolean;
  maxObstacles: number;
  spatialHashing: boolean;
  gridSize: number;
}

/**
 * Result of obstacle interaction
 */
export interface IObstacleInteractionResult {
  blocked: boolean;
  movementCost: number;
  damage: number;
  statusEffects: IObstacleStatusEffect[];
  signalAttenuation: number;
  visionBlocked: boolean;
  resourcesGained: number;
  hidingBonus: number;
}

/**
 * Pathfinding node with obstacle consideration
 */
export interface IPathfindingNode {
  position: { x: number; y: number };
  gCost: number; // Cost from start
  hCost: number; // Heuristic cost to end
  fCost: number; // Total cost (g + h)
  parent: IPathfindingNode | null;
  obstacle: IObstacle | null;
  movementCost: number;
  passable: boolean;
}

/**
 * Spatial grid cell for obstacle optimization
 */
export interface IObstacleGridCell {
  cellId: string;
  obstacles: Set<string>;
  lastUpdated: number;
  passable: boolean; // Quick check if any part of cell is passable
  averageMovementCost: number; // Average movement cost in this cell
}

/**
 * Line-of-sight calculation result
 */
export interface ILineOfSightResult {
  visible: boolean;
  blockedByObstacles: string[]; // IDs of obstacles blocking sight
  transparency: number; // Overall transparency 0-1 (1 = fully visible)
  distance: number;
}

/**
 * Obstacle detection result for creatures
 */
export interface IObstacleDetection {
  obstacle: IObstacle;
  distance: number;
  direction: { x: number; y: number }; // Normalized direction vector
  approachability: number; // 0-1 how easy it is to approach this obstacle
  dangerLevel: number; // 0-1 how dangerous this obstacle appears
}
