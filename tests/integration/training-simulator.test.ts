/**
 * Training Simulator Integration Tests
 *
 * Tests the complete genetic algorithm cycle, scenario management,
 * and training progress tracking.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TrainingSimulator } from "../../src/simulation/training-simulator";
import {
  ScenarioManager,
  ScenarioType,
  ScenarioDifficulty,
} from "../../src/simulation/scenario-manager";
import {
  SelectionMethod,
  CrossoverMethod,
  MutationMethod,
} from "../../src/genetic/types";
import { ActivationType } from "../../src/neural/types";

describe("Training Simulator Integration", () => {
  let simulator: TrainingSimulator;

  beforeEach(() => {
    // Create a basic training configuration
    const scenario = ScenarioManager.createSurvivalScenario(
      ScenarioDifficulty.EASY
    );

    const config = {
      seed: 12345,
      tickRate: 60,
      maxTicks: 0,
      pauseOnError: true,
      geneticAlgorithm: {
        populationSize: 10, // Small population for testing
        maxGenerations: 3, // Few generations for testing
        elitismRate: 0.1,
        seed: 12345,
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
      },
      scenario,
      autoAdvanceGenerations: false,
      saveInterval: 1,
    };

    simulator = new TrainingSimulator(config);
  });

  describe("Initialization", () => {
    it("should initialize with correct configuration", () => {
      expect(simulator.currentGeneration).toBe(0);
      expect(simulator.isTraining).toBe(false);
      expect(simulator.generationStats).toHaveLength(0);
      expect(simulator.scenario.name).toContain("Survival Training");
    });

    it("should have a valid world instance", () => {
      expect(simulator.world).toBeDefined();
      expect(simulator.world.width).toBe(20);
      expect(simulator.world.height).toBe(20);
    });

    it("should provide training progress information", () => {
      const progress = simulator.trainingProgress;
      expect(progress.currentGeneration).toBe(0);
      expect(progress.totalGenerations).toBe(3);
      expect(progress.isComplete).toBe(false);
      expect(progress.bestOverallFitness).toBe(0);
    });
  });

  describe("Training Process", () => {
    it("should initialize training successfully", async () => {
      await simulator.initializeTraining();

      expect(simulator.isTraining).toBe(false); // Not started yet
      expect(simulator.currentGeneration).toBe(0);
      expect(simulator.generationStats).toHaveLength(0);
    });

    it("should start and complete training", async () => {
      await simulator.initializeTraining();

      // Start training (this will run all generations)
      await simulator.startTraining();

      expect(simulator.isTraining).toBe(false); // Completed
      expect(simulator.generationStats.length).toBeGreaterThan(0);

      // Check that we have generation stats
      const stats = simulator.generationStats;
      expect(stats).toHaveLength(3); // 3 generations

      // Verify stats structure
      stats.forEach((stat, index) => {
        expect(stat.generation).toBe(index);
        expect(stat.size).toBe(10); // Population size
        expect(stat.bestFitness).toBeGreaterThanOrEqual(0);
        expect(stat.averageFitness).toBeGreaterThanOrEqual(0);
        expect(stat.simulationTicks).toBeGreaterThan(0);
      });
    });

    it("should get best individual after training", async () => {
      await simulator.initializeTraining();
      await simulator.startTraining();

      const bestIndividual = simulator.getBestIndividual();
      expect(bestIndividual).toBeDefined();
      expect(bestIndividual.network).toBeDefined();
      expect(bestIndividual.fitness).toBeGreaterThanOrEqual(0);
      expect(bestIndividual.generation).toBeGreaterThanOrEqual(0);
    });

    it("should stop training when requested", async () => {
      await simulator.initializeTraining();

      // Start training but stop immediately
      const trainingPromise = simulator.startTraining();
      simulator.stopTraining();

      await trainingPromise.catch(() => {}); // Ignore potential errors from stopping

      expect(simulator.isTraining).toBe(false);
    });

    it("should handle training errors gracefully", async () => {
      // Create a scenario with an invalid fitness function
      const invalidScenario = {
        ...simulator.scenario,
        fitnessFunction: async () => {
          throw new Error("Test error");
        },
      };

      simulator.updateScenario(invalidScenario);
      await simulator.initializeTraining();

      await expect(simulator.startTraining()).rejects.toThrow();
      expect(simulator.isTraining).toBe(false);
    });
  });

  describe("Scenario Management", () => {
    it("should update scenario configuration", () => {
      const newScenario = ScenarioManager.createExplorationScenario(
        ScenarioDifficulty.MEDIUM
      );

      simulator.updateScenario(newScenario);

      expect(simulator.scenario.name).toContain("Exploration Training");
      expect(simulator.scenario.worldConfig.width).toBe(20); // Medium difficulty
    });

    it("should not allow scenario update during training", async () => {
      await simulator.initializeTraining();

      // Mock training state
      (simulator as any)._isTraining = true;

      const newScenario = ScenarioManager.createExplorationScenario();

      expect(() => simulator.updateScenario(newScenario)).toThrow(
        "Cannot update scenario while training is in progress"
      );
    });
  });

  describe("Reset Functionality", () => {
    it("should reset simulator state", async () => {
      await simulator.initializeTraining();
      await simulator.startTraining();

      // Verify we have some state
      expect(simulator.generationStats.length).toBeGreaterThan(0);

      simulator.reset();

      expect(simulator.currentGeneration).toBe(0);
      expect(simulator.generationStats).toHaveLength(0);
      expect(simulator.isTraining).toBe(false);
      expect(simulator.creatures).toHaveLength(0);
    });
  });
});

describe("Scenario Manager", () => {
  describe("Predefined Scenarios", () => {
    it("should provide all available scenarios", () => {
      const scenarios = ScenarioManager.getAvailableScenarios();

      expect(scenarios).toHaveLength(4);
      expect(scenarios.map((s) => s.metadata.type)).toEqual([
        ScenarioType.SURVIVAL,
        ScenarioType.EXPLORATION,
        ScenarioType.ENERGY_EFFICIENCY,
        ScenarioType.MOVEMENT_OPTIMIZATION,
      ]);
    });

    it("should create survival scenario with different difficulties", () => {
      const easy = ScenarioManager.createSurvivalScenario(
        ScenarioDifficulty.EASY
      );
      const hard = ScenarioManager.createSurvivalScenario(
        ScenarioDifficulty.HARD
      );

      expect(easy.metadata.difficulty).toBe(ScenarioDifficulty.EASY);
      expect(hard.metadata.difficulty).toBe(ScenarioDifficulty.HARD);

      // Hard should have more challenging parameters
      expect(hard.creatureConfig.initialEnergy).toBeLessThan(
        easy.creatureConfig.initialEnergy
      );
      expect(hard.creatureConfig.maxAge).toBeLessThan(
        easy.creatureConfig.maxAge
      );
    });

    it("should create exploration scenario with scaling world size", () => {
      const easy = ScenarioManager.createExplorationScenario(
        ScenarioDifficulty.EASY
      );
      const extreme = ScenarioManager.createExplorationScenario(
        ScenarioDifficulty.EXTREME
      );

      expect(extreme.worldConfig.width).toBeGreaterThan(easy.worldConfig.width);
      expect(extreme.maxSimulationTicks).toBeGreaterThan(
        easy.maxSimulationTicks
      );
    });

    it("should create energy efficiency scenario with scaled costs", () => {
      const easy = ScenarioManager.createEnergyEfficiencyScenario(
        ScenarioDifficulty.EASY
      );
      const hard = ScenarioManager.createEnergyEfficiencyScenario(
        ScenarioDifficulty.HARD
      );

      expect(hard.creatureConfig.energyCosts.metabolism).toBeGreaterThan(
        easy.creatureConfig.energyCosts.metabolism
      );
      expect(hard.creatureConfig.energyCosts.movement).toBeGreaterThan(
        easy.creatureConfig.energyCosts.movement
      );
    });

    it("should create movement optimization scenario with complex neural networks", () => {
      const scenario = ScenarioManager.createMovementOptimizationScenario();

      expect(scenario.neuralNetworkConfig.hiddenLayers).toHaveLength(3);
      expect(scenario.neuralNetworkConfig.inputSize).toBe(35);
      expect(scenario.neuralNetworkConfig.hiddenLayers[0].activation).toBe(
        ActivationType.RELU
      );
    });
  });

  describe("Custom Scenarios", () => {
    it("should create custom scenario with provided parameters", () => {
      const customFitness = async () => 42;
      const scenario = ScenarioManager.createCustomScenario(
        "Test Scenario",
        "A test scenario",
        customFitness
      );

      expect(scenario.name).toBe("Test Scenario");
      expect(scenario.description).toBe("A test scenario");
      expect(scenario.fitnessFunction).toBe(customFitness);
      expect(scenario.metadata.type).toBe(ScenarioType.CUSTOM);
    });
  });

  describe("Scenario Retrieval", () => {
    it("should get scenario by type and difficulty", () => {
      const scenario = ScenarioManager.getScenario(
        ScenarioType.SURVIVAL,
        ScenarioDifficulty.HARD
      );

      expect(scenario.metadata.type).toBe(ScenarioType.SURVIVAL);
      expect(scenario.metadata.difficulty).toBe(ScenarioDifficulty.HARD);
    });

    it("should use medium difficulty as default", () => {
      const scenario = ScenarioManager.getScenario(ScenarioType.EXPLORATION);

      expect(scenario.metadata.difficulty).toBe(ScenarioDifficulty.MEDIUM);
    });

    it("should throw error for unknown scenario type", () => {
      expect(() =>
        ScenarioManager.getScenario("unknown" as ScenarioType)
      ).toThrow("Unknown scenario type: unknown");
    });
  });

  describe("Scenario Validation", () => {
    it("should have valid neural network configurations", () => {
      const scenarios = ScenarioManager.getAvailableScenarios();

      scenarios.forEach((scenario) => {
        const config = scenario.neuralNetworkConfig;

        expect(config.inputSize).toBeGreaterThan(0);
        expect(config.hiddenLayers.length).toBeGreaterThan(0);
        expect(config.outputLayer.size).toBeGreaterThan(0);

        config.hiddenLayers.forEach((layer) => {
          expect(layer.size).toBeGreaterThan(0);
          expect(Object.values(ActivationType)).toContain(layer.activation);
        });
      });
    });

    it("should have valid creature configurations", () => {
      const scenarios = ScenarioManager.getAvailableScenarios();

      scenarios.forEach((scenario) => {
        const config = scenario.creatureConfig;

        expect(config.initialEnergy).toBeGreaterThan(0);
        expect(config.maxEnergy).toBeGreaterThanOrEqual(config.initialEnergy);
        expect(config.maxAge).toBeGreaterThan(0);
        expect(config.vision.range).toBeGreaterThan(0);
        expect(config.vision.maxDistance).toBeGreaterThan(0);
      });
    });

    it("should have valid world configurations", () => {
      const scenarios = ScenarioManager.getAvailableScenarios();

      scenarios.forEach((scenario) => {
        const config = scenario.worldConfig;

        expect(config.width).toBeGreaterThan(0);
        expect(config.height).toBeGreaterThan(0);
        expect(config.seed).toBeDefined();
      });
    });

    it("should have complete metadata", () => {
      const scenarios = ScenarioManager.getAvailableScenarios();

      scenarios.forEach((scenario) => {
        const metadata = scenario.metadata;

        expect(metadata.type).toBeDefined();
        expect(metadata.difficulty).toBeDefined();
        expect(metadata.estimatedGenerations).toBeGreaterThan(0);
        expect(metadata.description).toBeTruthy();
        expect(metadata.objectives.length).toBeGreaterThan(0);
        expect(metadata.successCriteria.length).toBeGreaterThan(0);
      });
    });
  });
});
