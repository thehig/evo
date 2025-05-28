/**
 * Neural Evolution Simulator
 *
 * A two-part evolutionary simulation game where creatures controlled by neural networks
 * evolve through genetic algorithms, consisting of a Training Simulator for species
 * development and a World Simulator for large-scale ecosystem interactions.
 */

// Core exports
export * from "./core/index";

// Simulation exports
export * from "./simulation/index";

// Neural network exports
export * from "./neural/index";

// Genetic algorithm exports
export * from "./genetic/index";

// World system exports
export * from "./world/index";

// Persistence system exports
export * from "./persistence/index";

// Renderer exports
export * from "./renderer/index";

// Type exports
export * from "./types/index";

// Utility exports
export * from "./utils/index";

// Version information
export const VERSION = "0.1.0";

// Main simulator class (to be implemented)
export class NeuralEvolutionSimulator {
  constructor() {
    console.log("Neural Evolution Simulator v" + VERSION);
  }
}
