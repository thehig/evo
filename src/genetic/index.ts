/**
 * Genetic algorithm module exports
 *
 * This module contains the genetic algorithm system for evolving neural networks.
 */

// Core types and interfaces
export * from "./types";

// Main genetic algorithm class
export { GeneticAlgorithm } from "./genetic-algorithm";

// Selection strategies
export {
  TournamentSelection,
  RouletteWheelSelection,
  createSelectionStrategy,
} from "./selection";

// Crossover strategies
export {
  SinglePointCrossover,
  MultiPointCrossover,
  UniformCrossover,
  createCrossoverStrategy,
} from "./crossover";

// Mutation strategies
export {
  GaussianMutation,
  UniformMutation,
  createMutationStrategy,
} from "./mutation";

// Version
export const GENETIC_MODULE_VERSION = "0.1.0";
