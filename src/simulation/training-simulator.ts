/**
 * Training Simulator Core
 *
 * This module implements the Training Simulator component that combines
 * the simulation engine with genetic algorithms to evolve creature populations.
 */

import { SimulationEngine } from "../core/simulation-engine";
import { IWorld, ISimulationConfig } from "../core/interfaces";
import { World } from "../world/World";
import { GeneticAlgorithm } from "../genetic/genetic-algorithm";
import { NeuralNetwork } from "../neural/neural-network";
import { Creature } from "../core/creature";
import { Random } from "../core/random";
import {
  IGeneticAlgorithmConfig,
  IIndividual,
  IPopulationStats,
  FitnessFunction,
} from "../genetic/types";
import { INeuralNetwork, INeuralNetworkConfig } from "../neural/types";
import { ICreatureConfig } from "../core/creature-types";

/**
 * Training scenario configuration
 */
export interface ITrainingScenario {
  name: string;
  description: string;
  worldConfig: {
    width: number;
    height: number;
    seed?: number;
  };
  creatureConfig: ICreatureConfig;
  neuralNetworkConfig: INeuralNetworkConfig;
  fitnessFunction: FitnessFunction;
  maxSimulationTicks: number;
}

/**
 * Training simulator configuration
 */
export interface ITrainingSimulatorConfig extends ISimulationConfig {
  geneticAlgorithm: IGeneticAlgorithmConfig;
  scenario: ITrainingScenario;
  autoAdvanceGenerations: boolean;
  saveInterval: number; // Save every N generations
}

/**
 * Generation statistics with additional training metrics
 */
export interface IGenerationStats extends IPopulationStats {
  simulationTicks: number;
  averageLifespan: number;
  averageEnergyEfficiency: number;
  survivalRate: number;
}

/**
 * Training progress tracking
 */
export interface ITrainingProgress {
  currentGeneration: number;
  totalGenerations: number;
  generationStats: IGenerationStats[];
  bestOverallFitness: number;
  isComplete: boolean;
  startTime: number;
  elapsedTime: number;
}

/**
 * Training Simulator Core Implementation
 *
 * Combines simulation engine with genetic algorithms to evolve creature populations
 * through multiple generations of training scenarios.
 */
export class TrainingSimulator extends SimulationEngine {
  private _world: World;
  private _geneticAlgorithm: GeneticAlgorithm;
  private _scenario: ITrainingScenario;
  private _creatures: Creature[] = [];
  private _currentGeneration: number = 0;
  private _generationStats: IGenerationStats[] = [];
  private _isTraining: boolean = false;
  private _trainingStartTime: number = 0;
  private _currentSimulationTicks: number = 0;

  constructor(config: ITrainingSimulatorConfig) {
    super(config);

    this._scenario = config.scenario;
    this._geneticAlgorithm = new GeneticAlgorithm(config.geneticAlgorithm);

    // Initialize world with scenario configuration
    const worldSeed =
      config.scenario.worldConfig.seed ?? config.seed ?? Date.now();
    this._world = new World(new Random(worldSeed), {
      width: config.scenario.worldConfig.width,
      height: config.scenario.worldConfig.height,
    });
  }

  /**
   * Get the world instance
   */
  get world(): IWorld {
    return this._world;
  }

  /**
   * Get current training scenario
   */
  get scenario(): ITrainingScenario {
    return this._scenario;
  }

  /**
   * Get current generation number
   */
  get currentGeneration(): number {
    return this._currentGeneration;
  }

  /**
   * Get generation statistics
   */
  get generationStats(): ReadonlyArray<IGenerationStats> {
    return this._generationStats;
  }

  /**
   * Check if training is in progress
   */
  get isTraining(): boolean {
    return this._isTraining;
  }

  /**
   * Get current creatures in simulation
   */
  get creatures(): ReadonlyArray<Creature> {
    return this._creatures;
  }

  /**
   * Get training progress information
   */
  get trainingProgress(): ITrainingProgress {
    const elapsedTime =
      this._trainingStartTime > 0 ? Date.now() - this._trainingStartTime : 0;

    const bestOverallFitness =
      this._generationStats.length > 0
        ? Math.max(...this._generationStats.map((stats) => stats.bestFitness))
        : 0;

    return {
      currentGeneration: this._currentGeneration,
      totalGenerations: this._geneticAlgorithm.config.maxGenerations,
      generationStats: this._generationStats,
      bestOverallFitness,
      isComplete:
        this._currentGeneration >= this._geneticAlgorithm.config.maxGenerations,
      startTime: this._trainingStartTime,
      elapsedTime,
    };
  }

  /**
   * Initialize training with the first generation
   */
  async initializeTraining(): Promise<void> {
    if (this._isTraining) {
      throw new Error("Training is already in progress");
    }

    // Create neural network template
    const networkTemplate = new NeuralNetwork(
      this._scenario.neuralNetworkConfig
    );

    // Initialize genetic algorithm population
    this._geneticAlgorithm.initializePopulation(networkTemplate);

    // Reset training state
    this._currentGeneration = 0;
    this._generationStats = [];
    this._trainingStartTime = Date.now();

    console.log(
      `Training initialized with ${this._geneticAlgorithm.config.populationSize} individuals`
    );
  }

  /**
   * Start training process
   */
  async startTraining(): Promise<void> {
    if (this._isTraining) {
      throw new Error("Training is already in progress");
    }

    if (this._geneticAlgorithm.population.length === 0) {
      await this.initializeTraining();
    }

    this._isTraining = true;

    try {
      // Run the genetic algorithm
      const allStats = await this._geneticAlgorithm.run(
        new NeuralNetwork(this._scenario.neuralNetworkConfig),
        this._createFitnessFunction(),
        this._geneticAlgorithm.config.maxGenerations
      );

      // Convert to generation stats with additional metrics
      this._generationStats = allStats.map((stats) => ({
        ...stats,
        simulationTicks: this._scenario.maxSimulationTicks,
        averageLifespan: 0, // Will be calculated during fitness evaluation
        averageEnergyEfficiency: 0, // Will be calculated during fitness evaluation
        survivalRate: 0, // Will be calculated during fitness evaluation
      }));

      console.log(`Training completed after ${allStats.length} generations`);
    } catch (error) {
      console.error("Training failed:", error);
      throw error;
    } finally {
      this._isTraining = false;
    }
  }

  /**
   * Stop training process
   */
  stopTraining(): void {
    this._isTraining = false;
    this.stop(); // Stop the simulation engine
  }

  /**
   * Run a single generation
   */
  async runGeneration(): Promise<IGenerationStats> {
    if (!this._isTraining) {
      throw new Error("Training must be started before running generations");
    }

    console.log(`Running generation ${this._currentGeneration + 1}`);

    // Evaluate fitness for current population
    await this._geneticAlgorithm.evaluateFitness(this._createFitnessFunction());

    // Get population stats
    const populationStats = this._geneticAlgorithm.stats;

    // Calculate additional training metrics
    const generationStats: IGenerationStats = {
      ...populationStats,
      simulationTicks: this._currentSimulationTicks,
      averageLifespan: this._calculateAverageLifespan(),
      averageEnergyEfficiency: this._calculateAverageEnergyEfficiency(),
      survivalRate: this._calculateSurvivalRate(),
    };

    this._generationStats.push(generationStats);

    // Evolve to next generation (unless this is the last generation)
    if (
      this._currentGeneration <
      this._geneticAlgorithm.config.maxGenerations - 1
    ) {
      this._geneticAlgorithm.evolve();
      this._currentGeneration++;
    }

    return generationStats;
  }

  /**
   * Get the best individual from current population
   */
  getBestIndividual(): IIndividual {
    return this._geneticAlgorithm.getBestIndividual();
  }

  /**
   * Update scenario configuration
   */
  updateScenario(scenario: ITrainingScenario): void {
    if (this._isTraining) {
      throw new Error("Cannot update scenario while training is in progress");
    }

    this._scenario = scenario;

    // Recreate world with new configuration
    const worldSeed =
      scenario.worldConfig.seed ?? this.config.seed ?? Date.now();
    this._world = new World(new Random(worldSeed), {
      width: scenario.worldConfig.width,
      height: scenario.worldConfig.height,
    });
  }

  /**
   * Create fitness function for the current scenario
   */
  private _createFitnessFunction(): FitnessFunction {
    return async (network: INeuralNetwork): Promise<number> => {
      // Create a creature with this neural network
      const creatureId = `creature_${Date.now()}_${Math.random()}`;
      const startX = Math.floor(this._world.width / 2);
      const startY = Math.floor(this._world.height / 2);

      const creature = new Creature(
        creatureId,
        network,
        { x: startX, y: startY },
        this._scenario.creatureConfig
      );

      // Reset world for this evaluation
      this._world.reset();

      // Place creature in world
      this._world.addEntity(creature);

      // Run simulation for specified number of ticks
      let ticks = 0;
      const maxTicks = this._scenario.maxSimulationTicks;

      while (ticks < maxTicks && creature.alive) {
        // Update creature
        creature.update(1000 / this.config.tickRate); // Delta time based on tick rate

        // Update world
        this._world.update(1000 / this.config.tickRate);

        ticks++;
      }

      this._currentSimulationTicks = ticks;

      // Use the scenario's fitness function
      return this._scenario.fitnessFunction(network);
    };
  }

  /**
   * Calculate average lifespan of creatures in current generation
   */
  private _calculateAverageLifespan(): number {
    if (this._creatures.length === 0) return 0;

    const totalLifespan = this._creatures.reduce((sum, creature) => {
      return sum + creature.age;
    }, 0);

    return totalLifespan / this._creatures.length;
  }

  /**
   * Calculate average energy efficiency of creatures in current generation
   */
  private _calculateAverageEnergyEfficiency(): number {
    if (this._creatures.length === 0) return 0;

    const totalEfficiency = this._creatures.reduce((sum, creature) => {
      // Energy efficiency = actions taken / energy consumed
      const creatureConfig = creature.getConfig();
      const energyConsumed = creatureConfig.maxEnergy - creature.energy;
      return sum + (energyConsumed > 0 ? creature.age / energyConsumed : 0);
    }, 0);

    return totalEfficiency / this._creatures.length;
  }

  /**
   * Calculate survival rate of creatures in current generation
   */
  private _calculateSurvivalRate(): number {
    if (this._creatures.length === 0) return 0;

    const aliveCount = this._creatures.filter(
      (creature) => creature.alive
    ).length;
    return aliveCount / this._creatures.length;
  }

  /**
   * Reset the training simulator
   */
  reset(): void {
    super.reset();

    this._creatures = [];
    this._currentGeneration = 0;
    this._generationStats = [];
    this._isTraining = false;
    this._trainingStartTime = 0;
    this._currentSimulationTicks = 0;

    // Reset genetic algorithm
    this._geneticAlgorithm.reset();
  }
}
