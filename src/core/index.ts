/**
 * Core module exports
 *
 * This module contains the foundational interfaces and abstract classes
 * for the simulation engine.
 */

// Interfaces
export * from "./interfaces";

// Implementations
export { Random } from "./random";
export { EventSystem, SimulationEvents } from "./events";
export { SimulationEngine } from "./simulation-engine";

export const CORE_MODULE_VERSION = "0.1.0";
