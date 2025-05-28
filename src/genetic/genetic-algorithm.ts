/**
 * Genetic Algorithm implementation
 *
 * This module implements the main genetic algorithm class that orchestrates
 * the evolution of neural networks through selection, crossover, and mutation.
 */

import { IRandom } from "../core/interfaces";
import { Random } from "../core/random";
import { INeuralNetwork } from "../neural/types";
import {
  IGeneticAlgorithm,
  IGeneticAlgorithmConfig,
  IIndividual,
  IPopulationStats,
  FitnessFunction,
  ISelectionStrategy,
  ICrossoverStrategy,
  IMutationStrategy,
} from "./types";
import { createSelectionStrategy } from "./selection";
import { createCrossoverStrategy } from "./crossover";
import { createMutationStrategy } from "./mutation";

/**
 * Individual implementation
 */
class Individual implements IIndividual {
  constructor(
    public network: INeuralNetwork,
    public fitness: number = 0,
    public generation: number = 0,
    public id: string = ""
  ) {}
}

/**
 * Genetic Algorithm implementation
 */
export class GeneticAlgorithm implements IGeneticAlgorithm {
  private _population: Individual[] = [];
  private _generation: number = 0;
  private _stats: IPopulationStats | null = null;
  private readonly random: IRandom;
  private readonly selectionStrategy: ISelectionStrategy;
  private readonly crossoverStrategy: ICrossoverStrategy;
  private readonly mutationStrategy: IMutationStrategy;

  constructor(public readonly config: IGeneticAlgorithmConfig) {
    this.validateConfig(config);

    // Initialize random number generator
    this.random = new Random(config.seed || 42);

    // Initialize strategies
    this.selectionStrategy = createSelectionStrategy(config.selection);
    this.crossoverStrategy = createCrossoverStrategy(config.crossover);
    this.mutationStrategy = createMutationStrategy(config.mutation);
  }

  /**
   * Validate genetic algorithm configuration
   */
  private validateConfig(config: IGeneticAlgorithmConfig): void {
    if (config.populationSize <= 0) {
      throw new Error("Population size must be positive");
    }

    if (config.elitismRate < 0 || config.elitismRate > 1) {
      throw new Error("Elitism rate must be between 0 and 1");
    }

    if (config.maxGenerations <= 0) {
      throw new Error("Maximum generations must be positive");
    }

    if (config.crossover.rate < 0 || config.crossover.rate > 1) {
      throw new Error("Crossover rate must be between 0 and 1");
    }

    if (config.mutation.rate < 0 || config.mutation.rate > 1) {
      throw new Error("Mutation rate must be between 0 and 1");
    }
  }

  /**
   * Generate unique ID for an individual
   */
  private generateId(): string {
    return `gen${this._generation}_${Date.now()}_${Math.floor(
      this.random.random() * 10000
    )}`;
  }

  /**
   * Get current population
   */
  get population(): ReadonlyArray<IIndividual> {
    return this._population;
  }

  /**
   * Get current generation number
   */
  get generation(): number {
    return this._generation;
  }

  /**
   * Get population statistics
   */
  get stats(): IPopulationStats {
    if (!this._stats) {
      this._stats = this.calculateStats();
    }
    return this._stats;
  }

  /**
   * Initialize population with random individuals
   */
  initializePopulation(networkTemplate: INeuralNetwork): void {
    this._population = [];
    this._generation = 0;
    this._stats = null;

    for (let i = 0; i < this.config.populationSize; i++) {
      const network = networkTemplate.clone();
      const individual = new Individual(
        network,
        0,
        this._generation,
        this.generateId()
      );
      this._population.push(individual);
    }
  }

  /**
   * Evaluate fitness for all individuals
   */
  async evaluateFitness(fitnessFunction: FitnessFunction): Promise<void> {
    const fitnessPromises = this._population.map(async (individual) => {
      individual.fitness = await fitnessFunction(individual.network);
    });

    await Promise.all(fitnessPromises);
    this._stats = null; // Reset stats to force recalculation
  }

  /**
   * Calculate population statistics
   */
  private calculateStats(): IPopulationStats {
    if (this._population.length === 0) {
      throw new Error("Cannot calculate stats for empty population");
    }

    const fitnesses = this._population.map((ind) => ind.fitness);
    const bestFitness = Math.max(...fitnesses);
    const worstFitness = Math.min(...fitnesses);
    const averageFitness =
      fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;

    // Calculate standard deviation
    const variance =
      fitnesses.reduce((sum, f) => sum + Math.pow(f - averageFitness, 2), 0) /
      fitnesses.length;
    const fitnessStdDev = Math.sqrt(variance);

    const bestIndividual = this._population.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );

    return {
      generation: this._generation,
      size: this._population.length,
      bestFitness,
      averageFitness,
      worstFitness,
      fitnessStdDev,
      bestIndividual,
    };
  }

  /**
   * Evolve to the next generation
   */
  evolve(): void {
    if (this._population.length === 0) {
      throw new Error("Population must be initialized before evolution");
    }

    // Sort population by fitness (descending)
    this._population.sort((a, b) => b.fitness - a.fitness);

    const newPopulation: Individual[] = [];

    // Elitism: preserve top individuals
    const eliteCount = Math.floor(
      this.config.populationSize * this.config.elitismRate
    );
    for (let i = 0; i < eliteCount; i++) {
      const elite = new Individual(
        this._population[i].network.clone(),
        0, // Fitness will be re-evaluated
        this._generation + 1,
        this.generateId()
      );
      newPopulation.push(elite);
    }

    // Generate offspring to fill the rest of the population
    const offspringCount = this.config.populationSize - eliteCount;

    for (let i = 0; i < offspringCount; i += 2) {
      // Select parents
      const parents = this.selectionStrategy.select(this._population, 2, () =>
        this.random.random()
      );

      let offspring1: INeuralNetwork;
      let offspring2: INeuralNetwork;

      // Apply crossover
      if (this.random.random() < this.config.crossover.rate) {
        [offspring1, offspring2] = this.crossoverStrategy.crossover(
          parents[0].network,
          parents[1].network,
          () => this.random.random()
        );
      } else {
        // No crossover, just clone parents
        offspring1 = parents[0].network.clone();
        offspring2 = parents[1].network.clone();
      }

      // Apply mutation
      this.mutationStrategy.mutate(offspring1, () => this.random.random());
      this.mutationStrategy.mutate(offspring2, () => this.random.random());

      // Create individuals
      const individual1 = new Individual(
        offspring1,
        0, // Fitness will be re-evaluated
        this._generation + 1,
        this.generateId()
      );

      const individual2 = new Individual(
        offspring2,
        0, // Fitness will be re-evaluated
        this._generation + 1,
        this.generateId()
      );

      newPopulation.push(individual1);

      // Only add second offspring if we haven't reached population size
      if (newPopulation.length < this.config.populationSize) {
        newPopulation.push(individual2);
      }
    }

    this._population = newPopulation;
    this._generation++;
    this._stats = null; // Reset stats to force recalculation
  }

  /**
   * Run evolution for specified generations
   */
  async run(
    networkTemplate: INeuralNetwork,
    fitnessFunction: FitnessFunction,
    generations?: number
  ): Promise<IPopulationStats[]> {
    const maxGens = generations || this.config.maxGenerations;
    const statsHistory: IPopulationStats[] = [];

    // Initialize population if not already done
    if (this._population.length === 0) {
      this.initializePopulation(networkTemplate);
    }

    // Initial fitness evaluation
    await this.evaluateFitness(fitnessFunction);
    statsHistory.push(this.getStats());

    // Evolution loop
    for (let gen = 0; gen < maxGens; gen++) {
      // Check if target fitness is reached
      if (
        this.config.targetFitness !== undefined &&
        this.stats.bestFitness >= this.config.targetFitness
      ) {
        break;
      }

      // Evolve to next generation
      this.evolve();

      // Evaluate fitness
      await this.evaluateFitness(fitnessFunction);

      // Record stats
      statsHistory.push(this.getStats());
    }

    return statsHistory;
  }

  /**
   * Get the best individual
   */
  getBestIndividual(): IIndividual {
    if (this._population.length === 0) {
      throw new Error("Population is empty");
    }

    return this._population.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Get population statistics
   */
  getStats(): IPopulationStats {
    return this.stats;
  }

  /**
   * Reset the algorithm
   */
  reset(): void {
    this._population = [];
    this._generation = 0;
    this._stats = null;
  }
}
