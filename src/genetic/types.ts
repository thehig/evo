/**
 * Genetic algorithm types and interfaces
 *
 * This module defines the types and interfaces for the genetic algorithm system
 * that evolves neural networks through selection, mutation, and crossover.
 */

import { INeuralNetwork } from "../neural/types";

/**
 * Selection method types
 */
export enum SelectionMethod {
  TOURNAMENT = "tournament",
  ROULETTE_WHEEL = "roulette_wheel",
}

/**
 * Crossover method types
 */
export enum CrossoverMethod {
  SINGLE_POINT = "single_point",
  MULTI_POINT = "multi_point",
  UNIFORM = "uniform",
}

/**
 * Mutation method types
 */
export enum MutationMethod {
  GAUSSIAN = "gaussian",
  UNIFORM = "uniform",
}

/**
 * Individual in the population (neural network with fitness)
 */
export interface IIndividual {
  /** The neural network */
  network: INeuralNetwork;

  /** Fitness score (higher is better) */
  fitness: number;

  /** Generation when this individual was created */
  generation: number;

  /** Unique identifier */
  id: string;
}

/**
 * Population statistics
 */
export interface IPopulationStats {
  /** Current generation number */
  generation: number;

  /** Population size */
  size: number;

  /** Best fitness in current generation */
  bestFitness: number;

  /** Average fitness in current generation */
  averageFitness: number;

  /** Worst fitness in current generation */
  worstFitness: number;

  /** Standard deviation of fitness */
  fitnessStdDev: number;

  /** Best individual */
  bestIndividual: IIndividual;
}

/**
 * Selection configuration
 */
export interface ISelectionConfig {
  /** Selection method */
  method: SelectionMethod;

  /** Tournament size (for tournament selection) */
  tournamentSize?: number;

  /** Selection pressure (for roulette wheel) */
  selectionPressure?: number;
}

/**
 * Crossover configuration
 */
export interface ICrossoverConfig {
  /** Crossover method */
  method: CrossoverMethod;

  /** Crossover rate (probability of crossover) */
  rate: number;

  /** Number of crossover points (for multi-point) */
  points?: number;

  /** Uniform crossover probability */
  uniformRate?: number;
}

/**
 * Mutation configuration
 */
export interface IMutationConfig {
  /** Mutation method */
  method: MutationMethod;

  /** Mutation rate (probability per weight) */
  rate: number;

  /** Mutation magnitude (standard deviation for Gaussian) */
  magnitude: number;

  /** Minimum mutation value (for uniform) */
  minValue?: number;

  /** Maximum mutation value (for uniform) */
  maxValue?: number;
}

/**
 * Genetic algorithm configuration
 */
export interface IGeneticAlgorithmConfig {
  /** Population size */
  populationSize: number;

  /** Selection configuration */
  selection: ISelectionConfig;

  /** Crossover configuration */
  crossover: ICrossoverConfig;

  /** Mutation configuration */
  mutation: IMutationConfig;

  /** Elitism rate (percentage of top individuals to preserve) */
  elitismRate: number;

  /** Maximum number of generations */
  maxGenerations: number;

  /** Target fitness (stop when reached) */
  targetFitness?: number;

  /** Random seed for deterministic behavior */
  seed?: number;
}

/**
 * Fitness evaluation function
 */
export type FitnessFunction = (
  network: INeuralNetwork
) => Promise<number> | number;

/**
 * Selection strategy interface
 */
export interface ISelectionStrategy {
  /** Select parents for reproduction */
  select(
    population: IIndividual[],
    count: number,
    random: () => number
  ): IIndividual[];
}

/**
 * Crossover strategy interface
 */
export interface ICrossoverStrategy {
  /** Perform crossover between two parents */
  crossover(
    parent1: INeuralNetwork,
    parent2: INeuralNetwork,
    random: () => number
  ): [INeuralNetwork, INeuralNetwork];
}

/**
 * Mutation strategy interface
 */
export interface IMutationStrategy {
  /** Mutate a neural network */
  mutate(network: INeuralNetwork, random: () => number): void;
}

/**
 * Genetic algorithm interface
 */
export interface IGeneticAlgorithm {
  /** Configuration */
  readonly config: IGeneticAlgorithmConfig;

  /** Current population */
  readonly population: ReadonlyArray<IIndividual>;

  /** Current generation number */
  readonly generation: number;

  /** Population statistics */
  readonly stats: IPopulationStats;

  /** Initialize population with random individuals */
  initializePopulation(networkTemplate: INeuralNetwork): void;

  /** Evaluate fitness for all individuals */
  evaluateFitness(fitnessFunction: FitnessFunction): Promise<void>;

  /** Evolve to the next generation */
  evolve(): void;

  /** Run evolution for specified generations */
  run(
    networkTemplate: INeuralNetwork,
    fitnessFunction: FitnessFunction,
    generations?: number
  ): Promise<IPopulationStats[]>;

  /** Get the best individual */
  getBestIndividual(): IIndividual;

  /** Get population statistics */
  getStats(): IPopulationStats;

  /** Reset the algorithm */
  reset(): void;
}
