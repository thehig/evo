/**
 * Genetic Algorithm Tests
 *
 * Comprehensive test suite for the genetic algorithm framework including
 * selection, crossover, mutation, and the main algorithm.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NeuralNetwork } from "../../src/neural/neural-network";
import { ActivationType, INeuralNetwork } from "../../src/neural/types";
import {
  GeneticAlgorithm,
  TournamentSelection,
  RouletteWheelSelection,
  SinglePointCrossover,
  MultiPointCrossover,
  UniformCrossover,
  GaussianMutation,
  UniformMutation,
  SelectionMethod,
  CrossoverMethod,
  MutationMethod,
  IGeneticAlgorithmConfig,
  IIndividual,
} from "../../src/genetic";

describe("Genetic Algorithm Framework", () => {
  let testNetwork: NeuralNetwork;

  beforeEach(() => {
    // Create a simple test network
    testNetwork = new NeuralNetwork({
      inputSize: 3,
      hiddenLayers: [{ size: 4, activation: ActivationType.RELU }],
      outputLayer: { size: 2, activation: ActivationType.SIGMOID },
      seed: 42,
    });
  });

  describe("Selection Strategies", () => {
    let population: IIndividual[];

    beforeEach(() => {
      // Create test population with known fitness values
      population = [
        { network: testNetwork, fitness: 10, generation: 0, id: "1" },
        { network: testNetwork, fitness: 8, generation: 0, id: "2" },
        { network: testNetwork, fitness: 6, generation: 0, id: "3" },
        { network: testNetwork, fitness: 4, generation: 0, id: "4" },
        { network: testNetwork, fitness: 2, generation: 0, id: "5" },
      ];
    });

    describe("TournamentSelection", () => {
      it("should create tournament selection with valid tournament size", () => {
        const selection = new TournamentSelection(3);
        expect(selection).toBeDefined();
      });

      it("should throw error for invalid tournament size", () => {
        expect(() => new TournamentSelection(0)).toThrow(
          "Tournament size must be at least 1"
        );
      });

      it("should select individuals from population", () => {
        const selection = new TournamentSelection(2);
        const mockRandom = () => 0.5; // Deterministic for testing

        const selected = selection.select(population, 3, mockRandom);

        expect(selected).toHaveLength(3);
        expect(selected.every((ind) => population.includes(ind))).toBe(true);
      });

      it("should throw error for empty population", () => {
        const selection = new TournamentSelection(2);
        expect(() => selection.select([], 1, () => 0.5)).toThrow(
          "Population cannot be empty"
        );
      });

      it("should throw error for negative selection count", () => {
        const selection = new TournamentSelection(2);
        expect(() => selection.select(population, -1, () => 0.5)).toThrow(
          "Selection count must be non-negative"
        );
      });
    });

    describe("RouletteWheelSelection", () => {
      it("should create roulette wheel selection with valid selection pressure", () => {
        const selection = new RouletteWheelSelection(1.5);
        expect(selection).toBeDefined();
      });

      it("should throw error for invalid selection pressure", () => {
        expect(() => new RouletteWheelSelection(0)).toThrow(
          "Selection pressure must be positive"
        );
      });

      it("should select individuals from population", () => {
        const selection = new RouletteWheelSelection(1.0);
        const mockRandom = () => 0.5; // Deterministic for testing

        const selected = selection.select(population, 3, mockRandom);

        expect(selected).toHaveLength(3);
        expect(selected.every((ind) => population.includes(ind))).toBe(true);
      });

      it("should handle population with zero fitness", () => {
        const zeroFitnessPopulation = population.map((ind) => ({
          ...ind,
          fitness: 0,
        }));
        const selection = new RouletteWheelSelection(1.0);

        const selected = selection.select(zeroFitnessPopulation, 2, () => 0.5);

        expect(selected).toHaveLength(2);
      });
    });
  });

  describe("Crossover Strategies", () => {
    let parent1: INeuralNetwork;
    let parent2: INeuralNetwork;

    beforeEach(() => {
      parent1 = testNetwork.clone();
      parent2 = testNetwork.clone();
    });

    describe("SinglePointCrossover", () => {
      it("should create offspring with single-point crossover", () => {
        const crossover = new SinglePointCrossover();
        const mockRandom = () => 0.5; // Deterministic for testing

        const [offspring1, offspring2] = crossover.crossover(
          parent1,
          parent2,
          mockRandom
        );

        expect(offspring1).toBeDefined();
        expect(offspring2).toBeDefined();
        expect(offspring1).not.toBe(parent1);
        expect(offspring2).not.toBe(parent2);
      });

      it("should throw error for networks with different structures", () => {
        const differentNetwork = new NeuralNetwork({
          inputSize: 2, // Different input size
          hiddenLayers: [{ size: 4, activation: ActivationType.RELU }],
          outputLayer: { size: 2, activation: ActivationType.SIGMOID },
          seed: 42,
        });

        const crossover = new SinglePointCrossover();

        expect(() =>
          crossover.crossover(parent1, differentNetwork, () => 0.5)
        ).toThrow("Parent networks must have the same structure");
      });
    });

    describe("MultiPointCrossover", () => {
      it("should create multi-point crossover with valid points", () => {
        const crossover = new MultiPointCrossover(3);
        expect(crossover).toBeDefined();
      });

      it("should throw error for invalid number of points", () => {
        expect(() => new MultiPointCrossover(0)).toThrow(
          "Number of crossover points must be at least 1"
        );
      });

      it("should create offspring with multi-point crossover", () => {
        const crossover = new MultiPointCrossover(2);
        const mockRandom = () => 0.5;

        const [offspring1, offspring2] = crossover.crossover(
          parent1,
          parent2,
          mockRandom
        );

        expect(offspring1).toBeDefined();
        expect(offspring2).toBeDefined();
      });
    });

    describe("UniformCrossover", () => {
      it("should create uniform crossover with valid rate", () => {
        const crossover = new UniformCrossover(0.6);
        expect(crossover).toBeDefined();
      });

      it("should throw error for invalid uniform rate", () => {
        expect(() => new UniformCrossover(-0.1)).toThrow(
          "Uniform rate must be between 0 and 1"
        );
        expect(() => new UniformCrossover(1.1)).toThrow(
          "Uniform rate must be between 0 and 1"
        );
      });

      it("should create offspring with uniform crossover", () => {
        const crossover = new UniformCrossover(0.5);
        const mockRandom = () => 0.5;

        const [offspring1, offspring2] = crossover.crossover(
          parent1,
          parent2,
          mockRandom
        );

        expect(offspring1).toBeDefined();
        expect(offspring2).toBeDefined();
      });
    });
  });

  describe("Mutation Strategies", () => {
    let network: INeuralNetwork;

    beforeEach(() => {
      network = testNetwork.clone();
    });

    describe("GaussianMutation", () => {
      it("should create Gaussian mutation with valid parameters", () => {
        const mutation = new GaussianMutation(0.1, 0.5);
        expect(mutation).toBeDefined();
      });

      it("should throw error for invalid mutation rate", () => {
        expect(() => new GaussianMutation(-0.1, 0.5)).toThrow(
          "Mutation rate must be between 0 and 1"
        );
        expect(() => new GaussianMutation(1.1, 0.5)).toThrow(
          "Mutation rate must be between 0 and 1"
        );
      });

      it("should throw error for invalid magnitude", () => {
        expect(() => new GaussianMutation(0.1, -0.1)).toThrow(
          "Mutation magnitude must be non-negative"
        );
      });

      it("should mutate network weights and biases", () => {
        const originalState = network.getState();
        const mutation = new GaussianMutation(1.0, 0.1); // 100% mutation rate for testing

        mutation.mutate(network, () => 0.5);

        const mutatedState = network.getState();

        // At least some weights should be different (with 100% mutation rate)
        let foundDifference = false;
        for (let i = 0; i < originalState.layers.length; i++) {
          if (
            originalState.layers[i].weights &&
            mutatedState.layers[i].weights
          ) {
            for (let j = 0; j < originalState.layers[i].weights!.length; j++) {
              for (
                let k = 0;
                k < originalState.layers[i].weights![j].length;
                k++
              ) {
                if (
                  originalState.layers[i].weights![j][k] !==
                  mutatedState.layers[i].weights![j][k]
                ) {
                  foundDifference = true;
                  break;
                }
              }
            }
          }
        }
        expect(foundDifference).toBe(true);
      });
    });

    describe("UniformMutation", () => {
      it("should create uniform mutation with valid parameters", () => {
        const mutation = new UniformMutation(0.1, -1, 1);
        expect(mutation).toBeDefined();
      });

      it("should throw error for invalid value range", () => {
        expect(() => new UniformMutation(0.1, 1, -1)).toThrow(
          "Minimum value must be less than maximum value"
        );
      });

      it("should mutate network with uniform distribution", () => {
        const mutation = new UniformMutation(1.0, -2, 2); // 100% mutation rate

        mutation.mutate(network, () => 0.5);

        const state = network.getState();

        // Check that mutated values are within the specified range
        for (const layer of state.layers) {
          if (layer.weights) {
            for (const weightRow of layer.weights) {
              for (const weight of weightRow) {
                expect(weight).toBeGreaterThanOrEqual(-2);
                expect(weight).toBeLessThanOrEqual(2);
              }
            }
          }
          if (layer.biases) {
            for (const bias of layer.biases) {
              expect(bias).toBeGreaterThanOrEqual(-2);
              expect(bias).toBeLessThanOrEqual(2);
            }
          }
        }
      });
    });
  });

  describe("GeneticAlgorithm", () => {
    let config: IGeneticAlgorithmConfig;

    beforeEach(() => {
      config = {
        populationSize: 10,
        selection: {
          method: SelectionMethod.TOURNAMENT,
          tournamentSize: 3,
        },
        crossover: {
          method: CrossoverMethod.SINGLE_POINT,
          rate: 0.8,
        },
        mutation: {
          method: MutationMethod.GAUSSIAN,
          rate: 0.1,
          magnitude: 0.1,
        },
        elitismRate: 0.1,
        maxGenerations: 5,
        seed: 42,
      };
    });

    it("should create genetic algorithm with valid configuration", () => {
      const ga = new GeneticAlgorithm(config);
      expect(ga).toBeDefined();
      expect(ga.config).toEqual(config);
    });

    it("should throw error for invalid population size", () => {
      config.populationSize = 0;
      expect(() => new GeneticAlgorithm(config)).toThrow(
        "Population size must be positive"
      );
    });

    it("should throw error for invalid elitism rate", () => {
      config.elitismRate = -0.1;
      expect(() => new GeneticAlgorithm(config)).toThrow(
        "Elitism rate must be between 0 and 1"
      );
    });

    it("should initialize population", () => {
      const ga = new GeneticAlgorithm(config);

      ga.initializePopulation(testNetwork);

      expect(ga.population).toHaveLength(config.populationSize);
      expect(ga.generation).toBe(0);
    });

    it("should evaluate fitness", async () => {
      const ga = new GeneticAlgorithm(config);
      ga.initializePopulation(testNetwork);

      const fitnessFunction = (network: INeuralNetwork) => {
        // Use the network to avoid TypeScript warning
        const output = network.process([1, 0, 1]);
        return Math.random() * 100 + output.length; // Simple fitness based on output
      };

      await ga.evaluateFitness(fitnessFunction);

      for (const individual of ga.population) {
        expect(individual.fitness).toBeGreaterThanOrEqual(0);
        expect(individual.fitness).toBeLessThanOrEqual(102); // 100 + 2 outputs
      }
    });

    it("should evolve to next generation", async () => {
      const ga = new GeneticAlgorithm(config);
      ga.initializePopulation(testNetwork);

      const fitnessFunction = () => Math.random() * 100;
      await ga.evaluateFitness(fitnessFunction);

      const initialGeneration = ga.generation;

      ga.evolve();

      expect(ga.generation).toBe(initialGeneration + 1);
      expect(ga.population).toHaveLength(config.populationSize);
    });

    it("should calculate population statistics", async () => {
      const ga = new GeneticAlgorithm(config);
      ga.initializePopulation(testNetwork);

      // Set known fitness values for testing
      const population = ga.population as any[];
      population[0].fitness = 100;
      population[1].fitness = 80;
      population[2].fitness = 60;
      for (let i = 3; i < population.length; i++) {
        population[i].fitness = 40;
      }

      const stats = ga.getStats();

      expect(stats.generation).toBe(0);
      expect(stats.size).toBe(config.populationSize);
      expect(stats.bestFitness).toBe(100);
      expect(stats.worstFitness).toBe(40);
      expect(stats.bestIndividual.fitness).toBe(100);
    });

    it("should run evolution for multiple generations", async () => {
      const ga = new GeneticAlgorithm(config);

      const fitnessFunction = () => Math.random() * 100;

      const statsHistory = await ga.run(testNetwork, fitnessFunction, 3);

      expect(statsHistory).toHaveLength(4); // Initial + 3 generations
      expect(ga.generation).toBe(3);
    });

    it("should stop early when target fitness is reached", async () => {
      config.targetFitness = 50;
      const ga = new GeneticAlgorithm(config);

      const fitnessFunction = () => 60; // Always return fitness above target

      const statsHistory = await ga.run(testNetwork, fitnessFunction, 10);

      expect(statsHistory).toHaveLength(1); // Should stop after initial evaluation
    });

    it("should get best individual", async () => {
      const ga = new GeneticAlgorithm(config);
      ga.initializePopulation(testNetwork);

      // Set known fitness values
      const population = ga.population as any[];
      population[0].fitness = 100;
      population[1].fitness = 50;

      const best = ga.getBestIndividual();

      expect(best.fitness).toBe(100);
    });

    it("should reset algorithm state", () => {
      const ga = new GeneticAlgorithm(config);
      ga.initializePopulation(testNetwork);

      ga.reset();

      expect(ga.population).toHaveLength(0);
      expect(ga.generation).toBe(0);
    });

    it("should handle deterministic behavior with fixed seed", async () => {
      const ga1 = new GeneticAlgorithm({ ...config, seed: 123 });
      const ga2 = new GeneticAlgorithm({ ...config, seed: 123 });

      const fitnessFunction = () => 50;

      const stats1 = await ga1.run(testNetwork, fitnessFunction, 2);
      const stats2 = await ga2.run(testNetwork, fitnessFunction, 2);

      // With the same seed, results should be identical
      expect(stats1).toHaveLength(stats2.length);
      for (let i = 0; i < stats1.length; i++) {
        expect(stats1[i].generation).toBe(stats2[i].generation);
        expect(stats1[i].size).toBe(stats2[i].size);
      }
    });
  });

  describe("Integration Tests", () => {
    it("should solve a simple optimization problem", async () => {
      // Test problem: evolve a network to output [1, 0] for input [1, 1, 1]
      const targetOutput = [1, 0];
      const testInput = [1, 1, 1];

      const fitnessFunction = (network: INeuralNetwork) => {
        const output = network.process(testInput);
        const error = targetOutput.reduce(
          (sum, target, i) => sum + Math.pow(target - output[i], 2),
          0
        );
        return 100 - error; // Higher fitness for lower error
      };

      const config: IGeneticAlgorithmConfig = {
        populationSize: 20,
        selection: {
          method: SelectionMethod.TOURNAMENT,
          tournamentSize: 3,
        },
        crossover: {
          method: CrossoverMethod.SINGLE_POINT,
          rate: 0.8,
        },
        mutation: {
          method: MutationMethod.GAUSSIAN,
          rate: 0.1,
          magnitude: 0.5,
        },
        elitismRate: 0.2,
        maxGenerations: 10,
        seed: 42,
      };

      const ga = new GeneticAlgorithm(config);
      const statsHistory = await ga.run(testNetwork, fitnessFunction);

      expect(statsHistory).toHaveLength(11); // Initial + 10 generations

      // Fitness should generally improve over generations
      const initialFitness = statsHistory[0].bestFitness;
      const finalFitness = statsHistory[statsHistory.length - 1].bestFitness;

      expect(finalFitness).toBeGreaterThanOrEqual(initialFitness);
    });
  });
});
