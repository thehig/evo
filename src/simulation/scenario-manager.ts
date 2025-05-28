/**
 * Scenario Manager
 *
 * This module provides predefined training scenarios and utilities for
 * creating custom scenarios for the Training Simulator.
 */

import { ITrainingScenario } from "./training-simulator";
import { INeuralNetwork } from "../neural/types";
import { ActivationType } from "../neural/types";
import { DEFAULT_CREATURE_CONFIG } from "../core/creature-types";
import { SensorySystem } from "../core/sensory-system.js";

/**
 * Predefined scenario types
 */
export enum ScenarioType {
  SURVIVAL = "survival",
  EXPLORATION = "exploration",
  ENERGY_EFFICIENCY = "energy_efficiency",
  MOVEMENT_OPTIMIZATION = "movement_optimization",
  CUSTOM = "custom",
}

/**
 * Scenario difficulty levels
 */
export enum ScenarioDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXTREME = "extreme",
}

/**
 * Scenario metadata
 */
export interface IScenarioMetadata {
  type: ScenarioType;
  difficulty: ScenarioDifficulty;
  estimatedGenerations: number;
  description: string;
  objectives: string[];
  successCriteria: string[];
}

/**
 * Extended training scenario with metadata
 */
export interface IExtendedTrainingScenario extends ITrainingScenario {
  metadata: IScenarioMetadata;
}

/**
 * Scenario Manager Implementation
 *
 * Provides predefined scenarios and utilities for creating custom scenarios.
 */
export class ScenarioManager {
  private static readonly DEFAULT_WORLD_SIZE = { width: 20, height: 20 };
  private static readonly DEFAULT_SIMULATION_TICKS = 1000;

  /**
   * Get all available predefined scenarios
   */
  static getAvailableScenarios(): IExtendedTrainingScenario[] {
    return [
      this.createSurvivalScenario(),
      this.createExplorationScenario(),
      this.createEnergyEfficiencyScenario(),
      this.createMovementOptimizationScenario(),
    ];
  }

  /**
   * Get a scenario by type and difficulty
   */
  static getScenario(
    type: ScenarioType,
    difficulty: ScenarioDifficulty = ScenarioDifficulty.MEDIUM
  ): IExtendedTrainingScenario {
    switch (type) {
      case ScenarioType.SURVIVAL:
        return this.createSurvivalScenario(difficulty);
      case ScenarioType.EXPLORATION:
        return this.createExplorationScenario(difficulty);
      case ScenarioType.ENERGY_EFFICIENCY:
        return this.createEnergyEfficiencyScenario(difficulty);
      case ScenarioType.MOVEMENT_OPTIMIZATION:
        return this.createMovementOptimizationScenario(difficulty);
      default:
        throw new Error(`Unknown scenario type: ${type}`);
    }
  }

  /**
   * Create a basic survival scenario
   */
  static createSurvivalScenario(
    difficulty: ScenarioDifficulty = ScenarioDifficulty.MEDIUM
  ): IExtendedTrainingScenario {
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    const maxTicks = Math.floor(
      this.DEFAULT_SIMULATION_TICKS * difficultyMultiplier
    );

    const creatureConfig = {
      ...DEFAULT_CREATURE_CONFIG,
      initialEnergy: difficulty === ScenarioDifficulty.HARD ? 50 : 100,
      maxEnergy: difficulty === ScenarioDifficulty.HARD ? 80 : 150,
      maxAge: Math.floor(2000 / difficultyMultiplier),
    };

    // Calculate the correct input size based on creature configuration
    const inputSize = SensorySystem.calculateInputSize(
      creatureConfig.vision,
      creatureConfig.memory
    );

    return {
      name: `Survival Training (${difficulty})`,
      description:
        "Creatures must survive as long as possible while managing energy efficiently.",
      worldConfig: {
        width: this.DEFAULT_WORLD_SIZE.width,
        height: this.DEFAULT_WORLD_SIZE.height,
        seed: 12345,
      },
      creatureConfig,
      neuralNetworkConfig: {
        inputSize, // Use calculated input size
        hiddenLayers: [
          { size: 16, activation: ActivationType.SIGMOID, useBias: true },
          { size: 8, activation: ActivationType.SIGMOID, useBias: true },
        ],
        outputLayer: {
          size: 9,
          activation: ActivationType.SIGMOID,
          useBias: true,
        }, // 8 directions + rest
      },
      fitnessFunction: this.createSurvivalFitnessFunction(),
      maxSimulationTicks: maxTicks,
      metadata: {
        type: ScenarioType.SURVIVAL,
        difficulty,
        estimatedGenerations: Math.floor(50 * difficultyMultiplier),
        description:
          "Basic survival scenario focusing on longevity and energy management.",
        objectives: [
          "Maximize lifespan",
          "Efficient energy usage",
          "Avoid energy depletion",
        ],
        successCriteria: [
          "Average lifespan > 500 ticks",
          "Survival rate > 70%",
          "Energy efficiency > 0.5",
        ],
      },
    };
  }

  /**
   * Create an exploration scenario
   */
  static createExplorationScenario(
    difficulty: ScenarioDifficulty = ScenarioDifficulty.MEDIUM
  ): IExtendedTrainingScenario {
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    const worldSize = Math.floor(
      this.DEFAULT_WORLD_SIZE.width * difficultyMultiplier
    );

    const creatureConfig = {
      ...DEFAULT_CREATURE_CONFIG,
      vision: {
        range: difficulty === ScenarioDifficulty.EASY ? 3 : 2,
        maxDistance: 4.0,
        includeDiagonals: true,
      },
    };

    // Calculate the correct input size based on creature configuration
    const inputSize = SensorySystem.calculateInputSize(
      creatureConfig.vision,
      creatureConfig.memory
    );

    return {
      name: `Exploration Training (${difficulty})`,
      description:
        "Creatures must explore the world efficiently while maintaining energy.",
      worldConfig: {
        width: worldSize,
        height: worldSize,
        seed: 23456,
      },
      creatureConfig,
      neuralNetworkConfig: {
        inputSize, // Use calculated input size
        hiddenLayers: [
          { size: 20, activation: ActivationType.RELU, useBias: true },
          { size: 12, activation: ActivationType.RELU, useBias: true },
        ],
        outputLayer: {
          size: 9,
          activation: ActivationType.SIGMOID,
          useBias: true,
        },
      },
      fitnessFunction: this.createExplorationFitnessFunction(),
      maxSimulationTicks: Math.floor(
        this.DEFAULT_SIMULATION_TICKS * difficultyMultiplier
      ),
      metadata: {
        type: ScenarioType.EXPLORATION,
        difficulty,
        estimatedGenerations: Math.floor(75 * difficultyMultiplier),
        description:
          "Exploration scenario rewarding movement and world coverage.",
        objectives: [
          "Explore maximum world area",
          "Efficient movement patterns",
          "Maintain energy while exploring",
        ],
        successCriteria: [
          "World coverage > 60%",
          "Movement efficiency > 0.7",
          "Average exploration score > 100",
        ],
      },
    };
  }

  /**
   * Create an energy efficiency scenario
   */
  static createEnergyEfficiencyScenario(
    difficulty: ScenarioDifficulty = ScenarioDifficulty.MEDIUM
  ): IExtendedTrainingScenario {
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);

    const creatureConfig = {
      ...DEFAULT_CREATURE_CONFIG,
      energyCosts: {
        ...DEFAULT_CREATURE_CONFIG.energyCosts,
        metabolism:
          DEFAULT_CREATURE_CONFIG.energyCosts.metabolism * difficultyMultiplier,
        movement:
          DEFAULT_CREATURE_CONFIG.energyCosts.movement * difficultyMultiplier,
      },
    };

    // Calculate the correct input size based on creature configuration
    const inputSize = SensorySystem.calculateInputSize(
      creatureConfig.vision,
      creatureConfig.memory
    );

    return {
      name: `Energy Efficiency Training (${difficulty})`,
      description: "Creatures must maximize actions per energy unit consumed.",
      worldConfig: {
        width: this.DEFAULT_WORLD_SIZE.width,
        height: this.DEFAULT_WORLD_SIZE.height,
        seed: 34567,
      },
      creatureConfig,
      neuralNetworkConfig: {
        inputSize, // Use calculated input size
        hiddenLayers: [
          { size: 18, activation: ActivationType.SIGMOID, useBias: true },
          { size: 10, activation: ActivationType.SIGMOID, useBias: true },
        ],
        outputLayer: {
          size: 9,
          activation: ActivationType.SIGMOID,
          useBias: true,
        },
      },
      fitnessFunction: this.createEnergyEfficiencyFitnessFunction(),
      maxSimulationTicks: this.DEFAULT_SIMULATION_TICKS,
      metadata: {
        type: ScenarioType.ENERGY_EFFICIENCY,
        difficulty,
        estimatedGenerations: Math.floor(60 * difficultyMultiplier),
        description:
          "Energy efficiency scenario focusing on optimal resource usage.",
        objectives: [
          "Maximize actions per energy unit",
          "Minimize unnecessary movements",
          "Optimize rest/action balance",
        ],
        successCriteria: [
          "Energy efficiency > 0.8",
          "Action/energy ratio > 2.0",
          "Waste energy < 20%",
        ],
      },
    };
  }

  /**
   * Create a movement optimization scenario
   */
  static createMovementOptimizationScenario(
    difficulty: ScenarioDifficulty = ScenarioDifficulty.MEDIUM
  ): IExtendedTrainingScenario {
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);

    const creatureConfig = {
      ...DEFAULT_CREATURE_CONFIG,
      vision: {
        range: 2,
        maxDistance: 3.5, // Higher resolution for better pathfinding
        includeDiagonals: true,
      },
    };

    // Calculate the correct input size based on creature configuration
    const inputSize = SensorySystem.calculateInputSize(
      creatureConfig.vision,
      creatureConfig.memory
    );

    return {
      name: `Movement Optimization Training (${difficulty})`,
      description:
        "Creatures must learn efficient movement patterns and pathfinding.",
      worldConfig: {
        width: Math.floor(this.DEFAULT_WORLD_SIZE.width * difficultyMultiplier),
        height: Math.floor(
          this.DEFAULT_WORLD_SIZE.height * difficultyMultiplier
        ),
        seed: 45678,
      },
      creatureConfig,
      neuralNetworkConfig: {
        inputSize, // Use calculated input size
        hiddenLayers: [
          { size: 24, activation: ActivationType.RELU, useBias: true },
          { size: 16, activation: ActivationType.RELU, useBias: true },
          { size: 8, activation: ActivationType.RELU, useBias: true },
        ],
        outputLayer: {
          size: 9,
          activation: ActivationType.SIGMOID,
          useBias: true,
        },
      },
      fitnessFunction: this.createMovementOptimizationFitnessFunction(),
      maxSimulationTicks: Math.floor(
        this.DEFAULT_SIMULATION_TICKS * difficultyMultiplier
      ),
      metadata: {
        type: ScenarioType.MOVEMENT_OPTIMIZATION,
        difficulty,
        estimatedGenerations: Math.floor(80 * difficultyMultiplier),
        description:
          "Movement optimization scenario focusing on efficient pathfinding.",
        objectives: [
          "Learn optimal movement patterns",
          "Minimize redundant movements",
          "Develop pathfinding strategies",
        ],
        successCriteria: [
          "Movement efficiency > 0.8",
          "Path optimization > 0.7",
          "Average movement score > 150",
        ],
      },
    };
  }

  /**
   * Create a custom scenario template
   */
  static createCustomScenario(
    name: string,
    description: string,
    fitnessFunction: (network: INeuralNetwork) => Promise<number>
  ): IExtendedTrainingScenario {
    // Calculate the correct input size based on default creature configuration
    const inputSize = SensorySystem.calculateInputSize(
      DEFAULT_CREATURE_CONFIG.vision,
      DEFAULT_CREATURE_CONFIG.memory
    );

    return {
      name,
      description,
      worldConfig: {
        width: this.DEFAULT_WORLD_SIZE.width,
        height: this.DEFAULT_WORLD_SIZE.height,
        seed: Date.now(),
      },
      creatureConfig: DEFAULT_CREATURE_CONFIG,
      neuralNetworkConfig: {
        inputSize, // Use calculated input size
        hiddenLayers: [
          { size: 16, activation: ActivationType.SIGMOID, useBias: true },
          { size: 8, activation: ActivationType.SIGMOID, useBias: true },
        ],
        outputLayer: {
          size: 9,
          activation: ActivationType.SIGMOID,
          useBias: true,
        },
      },
      fitnessFunction,
      maxSimulationTicks: this.DEFAULT_SIMULATION_TICKS,
      metadata: {
        type: ScenarioType.CUSTOM,
        difficulty: ScenarioDifficulty.MEDIUM,
        estimatedGenerations: 50,
        description: "Custom user-defined scenario.",
        objectives: ["User-defined objectives"],
        successCriteria: ["User-defined success criteria"],
      },
    };
  }

  /**
   * Get difficulty multiplier for scaling scenario parameters
   */
  private static getDifficultyMultiplier(
    difficulty: ScenarioDifficulty
  ): number {
    switch (difficulty) {
      case ScenarioDifficulty.EASY:
        return 0.7;
      case ScenarioDifficulty.MEDIUM:
        return 1.0;
      case ScenarioDifficulty.HARD:
        return 1.5;
      case ScenarioDifficulty.EXTREME:
        return 2.0;
      default:
        return 1.0;
    }
  }

  /**
   * Create survival fitness function
   */
  private static createSurvivalFitnessFunction() {
    return async (_network: INeuralNetwork): Promise<number> => {
      // Fitness based on survival time and energy efficiency
      // This is a placeholder - actual implementation would need access to creature state
      return Math.random() * 100; // Placeholder
    };
  }

  /**
   * Create exploration fitness function
   */
  private static createExplorationFitnessFunction() {
    return async (_network: INeuralNetwork): Promise<number> => {
      // Fitness based on world coverage and exploration efficiency
      return Math.random() * 100; // Placeholder
    };
  }

  /**
   * Create energy efficiency fitness function
   */
  private static createEnergyEfficiencyFitnessFunction() {
    return async (_network: INeuralNetwork): Promise<number> => {
      // Fitness based on actions per energy unit consumed
      return Math.random() * 100; // Placeholder
    };
  }

  /**
   * Create movement optimization fitness function
   */
  private static createMovementOptimizationFitnessFunction() {
    return async (_network: INeuralNetwork): Promise<number> => {
      // Fitness based on movement efficiency and pathfinding quality
      return Math.random() * 100; // Placeholder
    };
  }
}
