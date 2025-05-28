/**
 * Neural Evolution Simulator
 *
 * A two-part evolutionary simulation game where creatures controlled by neural networks
 * evolve through genetic algorithms, consisting of a Training Simulator for species
 * development and a World Simulator for large-scale ecosystem interactions.
 */

// Core exports
export * from "./core/index.js";

// Simulation exports
export * from "./simulation/index.js";

// Neural network exports
export * from "./neural/index.js";

// Genetic algorithm exports
export * from "./genetic/index.js";

// World system exports
export * from "./world/index.js";

// Persistence system exports
export * from "./persistence/index.js";

// Renderer exports
export * from "./renderer/index.js";

// Type exports
export * from "./types/index.js";

// Utility exports
export * from "./utils/index.js";

// Version information
export const VERSION = "0.1.0";

// Main simulator class (to be implemented)
export class NeuralEvolutionSimulator {
  constructor() {
    console.log("Neural Evolution Simulator v" + VERSION);
  }
}
