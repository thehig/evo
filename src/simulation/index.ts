/**
 * Simulation module exports
 *
 * This module contains the Training and World simulators.
 */

// Core Training Simulator
export { TrainingSimulator } from "./training-simulator";
export type {
  ITrainingScenario,
  ITrainingSimulatorConfig,
  IGenerationStats,
  ITrainingProgress,
} from "./training-simulator";

// Scenario Management
export { ScenarioManager } from "./scenario-manager";
export type {
  IScenarioMetadata,
  IExtendedTrainingScenario,
} from "./scenario-manager";
export { ScenarioType, ScenarioDifficulty } from "./scenario-manager";

// Module version
export const SIMULATION_MODULE_VERSION = "0.1.0";
