/**
 * Core simulation engine interfaces
 *
 * These interfaces define the fundamental contracts for the simulation system,
 * providing the foundation for both Training and World simulators.
 */

/**
 * Base interface for all entities in the simulation
 */
export interface IEntity {
  /** Unique identifier for the entity */
  readonly id: string;

  /** Current position in the world */
  position: { x: number; y: number };

  /** Whether the entity is currently active in the simulation */
  active: boolean;

  /** Update the entity for one simulation tick */
  update(deltaTime: number): void;

  /** Clean up resources when entity is destroyed */
  destroy(): void;
}

/**
 * Interface for creatures - entities with neural networks and genetic traits
 */
export interface ICreature extends IEntity {
  /** Genetic information */
  readonly genome: unknown; // Will be defined in genetic module

  /** Neural network for decision making */
  readonly brain: unknown; // Will be defined in neural module

  /** Current energy level */
  energy: number;

  /** Age in simulation ticks */
  age: number;

  /** Whether the creature is alive */
  alive: boolean;

  /** Process sensory input and make decisions */
  think(): void;

  /** Execute actions based on neural network output */
  act(): void;

  /** Reproduce with another creature */
  reproduce(partner: ICreature): ICreature | null;
}

/**
 * Interface for the simulation world
 */
export interface IWorld {
  /** World dimensions */
  readonly width: number;
  readonly height: number;

  /** All entities currently in the world */
  readonly entities: ReadonlyArray<IEntity>;

  /** All creatures currently in the world */
  readonly creatures: ReadonlyArray<ICreature>;

  /** Current simulation tick */
  readonly currentTick: number;

  /** Add an entity to the world */
  addEntity(entity: IEntity): void;

  /** Remove an entity from the world */
  removeEntity(entityId: string): boolean;

  /** Get entity by ID */
  getEntity(entityId: string): IEntity | undefined;

  /** Get all entities within a radius of a position */
  getEntitiesInRadius(
    position: { x: number; y: number },
    radius: number
  ): IEntity[];

  /** Update all entities for one simulation tick */
  update(deltaTime: number): void;

  /** Reset the world to initial state */
  reset(): void;
}

/**
 * Simulation event types
 */
export enum SimulationEventType {
  TICK = "tick",
  ENTITY_ADDED = "entity_added",
  ENTITY_REMOVED = "entity_removed",
  CREATURE_BORN = "creature_born",
  CREATURE_DIED = "creature_died",
  SIMULATION_STARTED = "simulation_started",
  SIMULATION_PAUSED = "simulation_paused",
  SIMULATION_STOPPED = "simulation_stopped",
  SIMULATION_RESET = "simulation_reset",
}

/**
 * Base simulation event
 */
export interface ISimulationEvent {
  readonly type: SimulationEventType;
  readonly timestamp: number;
  readonly tick: number;
  readonly data?: unknown;
}

/**
 * Event handler function type
 */
export type EventHandler<T extends ISimulationEvent = ISimulationEvent> = (
  event: T
) => void;

/**
 * Event system interface
 */
export interface IEventSystem {
  /** Subscribe to events of a specific type */
  on<T extends ISimulationEvent>(
    eventType: SimulationEventType,
    handler: EventHandler<T>
  ): void;

  /** Unsubscribe from events */
  off<T extends ISimulationEvent>(
    eventType: SimulationEventType,
    handler: EventHandler<T>
  ): void;

  /** Emit an event */
  emit(event: ISimulationEvent): void;

  /** Clear all event handlers */
  clear(): void;
}

/**
 * Simulation state enum
 */
export enum SimulationState {
  STOPPED = "stopped",
  RUNNING = "running",
  PAUSED = "paused",
}

/**
 * Simulation configuration
 */
export interface ISimulationConfig {
  /** Target ticks per second */
  tickRate: number;

  /** Random seed for deterministic behavior */
  seed?: number;

  /** Maximum number of ticks to run (0 = unlimited) */
  maxTicks?: number;

  /** Whether to auto-pause on errors */
  pauseOnError: boolean;
}

/**
 * Core simulation engine interface
 */
export interface ISimulationEngine {
  /** Current simulation state */
  readonly state: SimulationState;

  /** Current simulation configuration */
  readonly config: ISimulationConfig;

  /** The simulation world */
  readonly world: IWorld;

  /** Event system for simulation events */
  readonly events: IEventSystem;

  /** Current simulation tick */
  readonly currentTick: number;

  /** Current simulation time in milliseconds */
  readonly currentTime: number;

  /** Deterministic random number generator */
  readonly random: IRandom;

  /** Start the simulation */
  start(): void;

  /** Pause the simulation */
  pause(): void;

  /** Stop the simulation */
  stop(): void;

  /** Reset the simulation to initial state */
  reset(): void;

  /** Step the simulation forward by one tick */
  step(): void;

  /** Update simulation configuration */
  configure(config: Partial<ISimulationConfig>): void;
}

/**
 * Deterministic random number generator interface
 */
export interface IRandom {
  /** Current seed value */
  readonly seed: number;

  /** Generate a random number between 0 and 1 */
  random(): number;

  /** Generate a random integer between min (inclusive) and max (exclusive) */
  randomInt(min: number, max: number): number;

  /** Generate a random number with normal distribution */
  randomGaussian(mean?: number, standardDeviation?: number): number;

  /** Choose a random element from an array */
  choice<T>(array: T[]): T;

  /** Shuffle an array in place */
  shuffle<T>(array: T[]): T[];

  /** Reset the generator with a new seed */
  setSeed(seed: number): void;
}
