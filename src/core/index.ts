/**
 * Core module exports
 *
 * This module contains the foundational interfaces and abstract classes
 * for the simulation engine.
 */

// Interfaces
export * from "./interfaces";
export * from "./creature-types";

// Implementations
export { Random } from "./random";
export { EventSystem, SimulationEvents } from "./events";
export { SimulationEngine } from "./simulation-engine";
export { Creature } from "./creature";
export { SensorySystem } from "./sensory-system";
export { ActionSystem, type IWorldContext } from "./action-system";
export {
  InteractionMatrix,
  InteractionType,
  type InteractionRule,
  type InteractionResult,
  type InteractionEventData,
  type InteractionMatrixConfig,
  type StatusEffect,
  type MemoryEntry,
  type InteractionConditions,
} from "./interaction-matrix";
export {
  CombatResolver,
  CombatOutcome,
  CombatState,
  CombatAction,
  type CombatAttributes,
  type CombatResult,
  type CombatRoundResult,
  type CombatConfig,
} from "./combat-system";
export {
  ResourceInteractionSystem,
  FoodSource,
  FoodType,
  CreatureType,
  ResourceQuality,
  type IFoodSource,
  type ResourceDetectionConfig,
} from "./resource-interaction";
export {
  TerrainInteractionSystem,
  TerrainType,
  type TerrainProperties,
  type TerrainCell,
  type TerrainEffect,
  type TerrainInteractionConfig,
} from "./terrain-interaction";

export const CORE_MODULE_VERSION = "0.1.0";
