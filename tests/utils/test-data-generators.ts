import { IWorld, ICreature } from "../../src/core/interfaces";
import {
  INeuralNetwork,
  INeuralNetworkConfig,
  ActivationType,
  ILayerConfig,
} from "../../src/neural/types";
import { Position } from "../../src/world/types";
import { NeuralNetwork } from "../../src/neural/neural-network";
import { Creature } from "../../src/core/creature";
import { World } from "../../src/world/World";
import { Random } from "../../src/core/random";

/**
 * Test Data Generators
 *
 * Provides factory functions for generating consistent test data
 * across all test types in the simulation system.
 */

export interface TestConfig {
  deterministic?: boolean;
  seed?: number;
  verbose?: boolean;
}

export class TestDataGenerators {
  private static defaultConfig: TestConfig = {
    deterministic: true,
    seed: 12345,
    verbose: false,
  };

  /**
   * Generate a test world configuration
   */
  static createWorldConfig(
    overrides: Partial<any> = {},
    config: TestConfig = {}
  ): any {
    const finalConfig = { ...this.defaultConfig, ...config };

    return {
      width: 20,
      height: 20,
      seed: finalConfig.seed,
      tickRate: 60,
      maxTicks: 1000,
      enableSignals: true,
      enableObstacles: true,
      resources: {
        foodSources: 10,
        regenerationRate: 0.1,
      },
      terrain: {
        grassProbability: 0.7,
        waterProbability: 0.2,
        obstacleProbability: 0.1,
      },
      ...overrides,
    };
  }

  /**
   * Generate a test neural network configuration
   */
  static createNeuralNetworkConfig(
    inputSize: number = 60,
    overrides: Partial<INeuralNetworkConfig> = {},
    config: TestConfig = {}
  ): INeuralNetworkConfig {
    const finalConfig = { ...this.defaultConfig, ...config };

    const baseConfig: INeuralNetworkConfig = {
      inputSize,
      hiddenLayers: [
        { size: 32, activation: ActivationType.SIGMOID },
        { size: 16, activation: ActivationType.SIGMOID },
      ],
      outputLayer: { size: 16, activation: ActivationType.SIGMOID },
      weightRange: {
        min: -1.0,
        max: 1.0,
      },
      seed: finalConfig.seed,
    };

    return {
      ...baseConfig,
      ...overrides,
    };
  }

  /**
   * Generate a test neural network instance
   */
  static createNeuralNetwork(
    inputSize: number = 60,
    networkOverrides: Partial<INeuralNetworkConfig> = {},
    config: TestConfig = {}
  ): INeuralNetwork {
    const networkConfig = this.createNeuralNetworkConfig(
      inputSize,
      networkOverrides,
      config
    );
    return new NeuralNetwork(networkConfig);
  }

  /**
   * Generate a test creature configuration
   */
  static createCreatureConfig(
    overrides: Partial<any> = {},
    config: TestConfig = {}
  ): any {
    const finalConfig = { ...this.defaultConfig, ...config };

    return {
      id: `test-creature-${finalConfig.seed}`,
      initialEnergy: 100,
      maxEnergy: 100,
      maxAge: 1000,
      worldDimensions: {
        width: 20,
        height: 20,
      },
      vision: {
        range: 1,
        maxDistance: 2,
        includeDiagonals: true,
      },
      memory: {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 4,
        signalHistorySize: 3,
      },
      energyCosts: {
        movement: 1,
        diagonalMovement: 1.4,
        rest: -2,
        sleep: -3,
        emitSignal: 0.5,
        eat: -10,
        drink: -5,
        gather: 1,
        attack: 3,
        defend: 1,
        metabolism: 0.05,
      },
      signalRange: 5.0,
      signalStrength: 1.0,
      traits: {
        speed: 1.0,
        efficiency: 1.0,
        aggression: 0.5,
        exploration: 0.7,
      },
      ...overrides,
    };
  }

  /**
   * Generate a test creature instance
   */
  static createCreature(
    position: Position = { x: 5, y: 5 },
    configOverrides: Partial<any> = {},
    config: TestConfig = {}
  ): ICreature {
    const finalConfig = { ...this.defaultConfig, ...config };
    const creatureConfig = this.createCreatureConfig(
      configOverrides,
      finalConfig
    );
    const networkConfig = this.createNeuralNetworkConfig(60, {}, finalConfig);
    const network = new NeuralNetwork(networkConfig);

    return new Creature(creatureConfig.id, network, position, creatureConfig);
  }

  /**
   * Generate a test world instance
   */
  static createWorld(
    worldOverrides: Partial<any> = {},
    config: TestConfig = {}
  ): IWorld {
    const finalConfig = { ...this.defaultConfig, ...config };
    const worldConfig = this.createWorldConfig(worldOverrides, finalConfig);
    const random = new Random(finalConfig.seed);
    return new World(random, worldConfig);
  }

  /**
   * Generate a population of test creatures
   */
  static createCreaturePopulation(
    count: number = 10,
    worldBounds: { width: number; height: number } = { width: 20, height: 20 },
    configOverrides: Partial<any> = {},
    config: TestConfig = {}
  ): ICreature[] {
    const finalConfig = { ...this.defaultConfig, ...config };
    const creatures: ICreature[] = [];

    for (let i = 0; i < count; i++) {
      const position: Position = {
        x: Math.floor(Math.random() * worldBounds.width),
        y: Math.floor(Math.random() * worldBounds.height),
      };

      const creatureConfigWithId = {
        ...configOverrides,
        id: `test-creature-${finalConfig.seed}-${i}`,
      };

      creatures.push(
        this.createCreature(position, creatureConfigWithId, finalConfig)
      );
    }

    return creatures;
  }

  /**
   * Generate a complete simulation scenario
   */
  static createSimulationScenario(
    name: string = "Test Scenario",
    overrides: Partial<any> = {},
    config: TestConfig = {}
  ): any {
    const finalConfig = { ...this.defaultConfig, ...config };

    return {
      id: `scenario-${finalConfig.seed}`,
      name,
      description: `Test scenario generated with seed ${finalConfig.seed}`,
      worldConfig: this.createWorldConfig({}, finalConfig),
      initialCreatures: 5,
      duration: 1000,
      objectives: [
        {
          type: "survival",
          target: 0.8,
          description: "80% of creatures should survive",
        },
        {
          type: "reproduction",
          target: 2,
          description: "Average 2 offspring per creature",
        },
      ],
      ...overrides,
    };
  }

  /**
   * Generate genetic algorithm configuration
   */
  static createGeneticConfig(
    overrides: Partial<any> = {},
    config: TestConfig = {}
  ): any {
    const finalConfig = { ...this.defaultConfig, ...config };

    return {
      populationSize: 50,
      eliteCount: 5,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      generationLimit: 100,
      fitnessThreshold: 0.9,
      selectionMethod: "tournament",
      tournamentSize: 3,
      seed: finalConfig.seed,
      ...overrides,
    };
  }

  /**
   * Generate a world snapshot for testing save/load functionality
   */
  static createWorldSnapshot(
    world?: IWorld,
    overrides: Partial<any> = {},
    config: TestConfig = {}
  ): any {
    const finalConfig = { ...this.defaultConfig, ...config };

    if (world) {
      return {
        timestamp: Date.now(),
        tick: world.currentTick,
        worldConfig: (world as any).getConfig(),
        creatures: world.creatures.map((creature) => ({
          id: creature.id,
          position: creature.position,
          energy: creature.energy,
          age: creature.age,
          alive: creature.alive,
        })),
        entities: world.entities.map((entity) => ({
          id: entity.id,
          position: entity.position,
          active: entity.active,
        })),
        ...overrides,
      };
    }

    // Create a basic snapshot without a world
    return {
      timestamp: Date.now(),
      tick: 0,
      worldConfig: this.createWorldConfig({}, finalConfig),
      creatures: [],
      entities: [],
      ...overrides,
    };
  }

  /**
   * Generate performance test data sets
   */
  static createPerformanceTestData(
    scale: "small" | "medium" | "large" = "small",
    config: TestConfig = {}
  ): {
    worldConfig: any;
    creatureCount: number;
    simulationTicks: number;
    expectedMetrics: {
      maxTickTime: number;
      maxMemoryMB: number;
      minFrameRate: number;
    };
  } {
    const finalConfig = { ...this.defaultConfig, ...config };

    const scales = {
      small: {
        worldSize: { width: 50, height: 50 },
        creatureCount: 25,
        simulationTicks: 500,
        metrics: { maxTickTime: 16, maxMemoryMB: 50, minFrameRate: 60 },
      },
      medium: {
        worldSize: { width: 100, height: 100 },
        creatureCount: 100,
        simulationTicks: 1000,
        metrics: { maxTickTime: 33, maxMemoryMB: 100, minFrameRate: 30 },
      },
      large: {
        worldSize: { width: 200, height: 200 },
        creatureCount: 500,
        simulationTicks: 2000,
        metrics: { maxTickTime: 50, maxMemoryMB: 200, minFrameRate: 20 },
      },
    };

    const scaleData = scales[scale];

    return {
      worldConfig: this.createWorldConfig(
        {
          width: scaleData.worldSize.width,
          height: scaleData.worldSize.height,
        },
        finalConfig
      ),
      creatureCount: scaleData.creatureCount,
      simulationTicks: scaleData.simulationTicks,
      expectedMetrics: scaleData.metrics,
    };
  }

  /**
   * Generate a complete deterministic test set
   */
  static createDeterministicTestSet(
    seed: number,
    testName: string
  ): {
    world: IWorld;
    creatures: ICreature[];
    neuralNetworks: INeuralNetwork[];
    scenario: any;
  } {
    const config: TestConfig = { seed, deterministic: true };

    const world = this.createWorld({}, config);
    const creatures = this.createCreaturePopulation(
      10,
      { width: 20, height: 20 },
      {},
      config
    );
    const neuralNetworks = Array.from({ length: 5 }, (_, i) =>
      this.createNeuralNetwork(60, { seed: seed + i }, config)
    );
    const scenario = this.createSimulationScenario(testName, {}, config);

    return {
      world,
      creatures,
      neuralNetworks,
      scenario,
    };
  }
}
