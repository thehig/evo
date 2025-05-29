/**
 * World Simulator Core
 *
 * This module implements the World Simulator component that manages large-scale
 * ecosystems with multiple species, biome diversity, and long-term evolutionary dynamics.
 */

import { SimulationEngine } from "../core/simulation-engine";
import {
  IWorld,
  ISimulationConfig,
  ICreature,
  IEntity,
} from "../core/interfaces";
import { World } from "../world/World";
import { Creature } from "../core/creature";
import { Random } from "../core/random";
import { createLogger } from "../utils/logger";
import { Position, TerrainType, ResourceType } from "../world/types";
import { INeuralNetworkConfig } from "../neural/types";
import { NeuralNetwork } from "../neural/neural-network";
import { ICreatureConfig } from "../core/creature-types";

// Create a logger for the world simulator
const worldLogger = createLogger("WorldSimulator");

/**
 * Species definition for ecosystem management
 */
export interface ISpecies {
  id: string;
  name: string;
  description: string;
  creatureConfig: ICreatureConfig;
  neuralNetworkConfig: INeuralNetworkConfig;
  preferredBiomes: TerrainType[];
  maxPopulation: number;
  minimumViablePopulation: number;
  reproductionRate: number;
  mutationRate: number;
  color: string; // For visualization
}

/**
 * Biome configuration with environmental parameters
 */
export interface IBiome {
  terrainType: TerrainType;
  name: string;
  description: string;
  temperatureRange: [number, number];
  humidityRange: [number, number];
  resourceMultipliers: Partial<Record<ResourceType, number>>;
  environmentalPressures: {
    predationRisk: number;
    resourceScarcity: number;
    weatherHarshness: number;
  };
  maxCarryingCapacity: number;
}

/**
 * Ecosystem event that can affect the simulation
 */
export interface IEcosystemEvent {
  id: string;
  type:
    | "natural_disaster"
    | "climate_change"
    | "disease_outbreak"
    | "species_migration"
    | "resource_discovery";
  severity: "low" | "medium" | "high" | "catastrophic";
  affectedArea: {
    center: Position;
    radius: number;
  };
  duration: number; // in simulation ticks
  effects: {
    populationImpact?: number; // -1 to 1 multiplier
    resourceImpact?: Partial<Record<ResourceType, number>>;
    mutationRateChange?: number;
    migrationPressure?: number;
  };
  startTick: number;
  description: string;
}

/**
 * Population statistics for a species
 */
export interface ISpeciesPopulationStats {
  speciesId: string;
  totalPopulation: number;
  averageAge: number;
  averageFitness: number;
  averageEnergyEfficiency: number;
  reproductionRate: number;
  deathRate: number;
  migrationRate: number;
  geneticDiversity: number;
  biomeDistribution: Partial<Record<TerrainType, number>>;
}

/**
 * Ecosystem analytics and metrics
 */
export interface IEcosystemStats {
  currentTick: number;
  totalPopulation: number;
  totalSpecies: number;
  extinctSpecies: number;
  avgSpeciesDiversity: number;
  totalBiomass: number;
  resourceUtilization: Partial<Record<ResourceType, number>>;
  predatorPreyRatio: number;
  averageLifespan: number;
  evolutionaryPressure: number;
  speciesStats: ISpeciesPopulationStats[];
  activeEvents: IEcosystemEvent[];
}

/**
 * World simulator configuration extending base simulation config
 */
export interface IWorldSimulatorConfig extends ISimulationConfig {
  worldConfig: {
    width: number;
    height: number;
    chunkSize: number;
    maxLoadedChunks: number;
    seed?: number;
  };
  ecosystemConfig: {
    maxSpecies: number;
    maxTotalPopulation: number;
    resourceRegenerationRate: number;
    environmentalPressureIntensity: number;
    naturalEventFrequency: number;
    climateChangeRate: number;
    migrationEnabled: boolean;
    extinctionThreshold: number;
  };
  speciesDefinitions: ISpecies[];
  biomeDefinitions: IBiome[];
  enableLongTermEvolution: boolean;
  enableEcosystemEvents: boolean;
  saveInterval: number; // Save ecosystem state every N ticks
}

/**
 * World Simulator Core Implementation
 *
 * Manages large-scale ecosystems with multiple species, biome diversity,
 * environmental pressures, and long-term evolutionary dynamics.
 */
export class WorldSimulator extends SimulationEngine {
  private _world: World;
  private _species: Map<string, ISpecies> = new Map();
  private _biomes: Map<TerrainType, IBiome> = new Map();
  private _populations: Map<string, Creature[]> = new Map();
  private _ecosystemStats: IEcosystemStats[] = [];
  private _activeEvents: IEcosystemEvent[] = [];
  private _nextEventId: number = 1;
  private _worldConfig: IWorldSimulatorConfig;
  private _simulationStartTime: number = 0;

  // Chunk loading and management
  private _loadedChunks: Set<string> = new Set();
  private _chunkLoadQueue: Position[] = [];

  // Long-term evolution tracking
  private _evolutionHistory: Map<string, any[]> = new Map();
  private _extinctionLog: Array<{
    speciesId: string;
    tick: number;
    cause: string;
  }> = [];

  constructor(config: IWorldSimulatorConfig) {
    super(config);
    this._worldConfig = config;

    // Initialize world with large-scale configuration
    const worldSeed = config.worldConfig.seed ?? config.seed ?? Date.now();
    this._world = new World(new Random(worldSeed), {
      width: config.worldConfig.width,
      height: config.worldConfig.height,
      chunkSize: config.worldConfig.chunkSize,
      maxLoadedChunks: config.worldConfig.maxLoadedChunks,
      useChunking: true,
    });

    // Initialize species definitions
    this.initializeSpecies(config.speciesDefinitions);

    // Initialize biome definitions
    this.initializeBiomes(config.biomeDefinitions);

    worldLogger.info(
      `WorldSimulator initialized with ${config.speciesDefinitions.length} species and ${config.biomeDefinitions.length} biomes`
    );
  }

  /**
   * Get the world instance
   */
  get world(): IWorld {
    return this._world;
  }

  /**
   * Get current ecosystem statistics
   */
  get ecosystemStats(): IEcosystemStats {
    return this.calculateEcosystemStats();
  }

  /**
   * Get current simulation tick
   */
  get currentTick(): number {
    return super.currentTick; // Use inherited currentTick from SimulationEngine
  }

  /**
   * Get all species definitions
   */
  get species(): ReadonlyArray<ISpecies> {
    return Array.from(this._species.values());
  }

  /**
   * Get population for a specific species
   */
  getSpeciesPopulation(speciesId: string): ReadonlyArray<Creature> {
    return this._populations.get(speciesId) || [];
  }

  /**
   * Get active ecosystem events
   */
  get activeEvents(): ReadonlyArray<IEcosystemEvent> {
    return this._activeEvents;
  }

  /**
   * Initialize species definitions
   */
  private initializeSpecies(speciesDefinitions: ISpecies[]): void {
    this._species.clear();
    this._populations.clear();

    for (const species of speciesDefinitions) {
      this._species.set(species.id, species);
      this._populations.set(species.id, []);

      if (this._worldConfig.enableLongTermEvolution) {
        this._evolutionHistory.set(species.id, []);
      }
    }

    worldLogger.info(
      `Initialized ${speciesDefinitions.length} species definitions`
    );
  }

  /**
   * Initialize biome definitions
   */
  private initializeBiomes(biomeDefinitions: IBiome[]): void {
    this._biomes.clear();

    for (const biome of biomeDefinitions) {
      this._biomes.set(biome.terrainType, biome);
    }

    worldLogger.info(
      `Initialized ${biomeDefinitions.length} biome definitions`
    );
  }

  /**
   * Introduce a species to the ecosystem at specified locations
   */
  async introduceSpecies(
    speciesId: string,
    locations: Position[],
    initialPopulation: number
  ): Promise<void> {
    const species = this._species.get(speciesId);
    if (!species) {
      throw new Error(`Species ${speciesId} not found`);
    }

    const currentPopulation = this._populations.get(speciesId) || [];

    // Check population limits
    if (currentPopulation.length + initialPopulation > species.maxPopulation) {
      throw new Error(
        `Cannot introduce ${initialPopulation} individuals: would exceed max population of ${species.maxPopulation}`
      );
    }

    let introduced = 0;
    for (const location of locations) {
      if (introduced >= initialPopulation) break;

      // Check if location is suitable for this species
      const terrainType = this._world.getTerrainAt(location.x, location.y);
      if (terrainType && species.preferredBiomes.includes(terrainType)) {
        // Create creature at this location
        const creature = this.createCreatureFromSpecies(species, location);

        try {
          this._world.addEntity(creature);
          currentPopulation.push(creature);
          introduced++;
        } catch (error) {
          worldLogger.warn(
            `Failed to place creature at ${location.x}, ${location.y}: ${error}`
          );
        }
      }
    }

    worldLogger.info(
      `Introduced ${introduced} individuals of species ${speciesId} at ${locations.length} locations`
    );
  }

  /**
   * Create a creature instance from species definition
   */
  private createCreatureFromSpecies(
    species: ISpecies,
    position: Position
  ): Creature {
    // Create neural network from species config
    const neuralNetwork = new NeuralNetwork(species.neuralNetworkConfig);

    // Generate unique ID
    const creatureId = `${species.id}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create creature with proper constructor arguments
    return new Creature(
      creatureId,
      neuralNetwork,
      position,
      species.creatureConfig
    );
  }

  /**
   * Update the world simulation including ecosystem dynamics
   */
  update(deltaTime: number): void {
    // Update base world simulation
    this._world.update(deltaTime);

    // Process ecosystem dynamics
    this.processEcosystemDynamics(deltaTime);

    // Process species interactions and population dynamics
    this.processPopulationDynamics(deltaTime);

    // Process long-term evolution
    if (this._worldConfig.enableLongTermEvolution) {
      this.processLongTermEvolution(deltaTime);
    }

    // Process ecosystem events
    if (this._worldConfig.enableEcosystemEvents) {
      this.processEcosystemEvents(deltaTime);
    }

    // Manage chunk loading for large worlds
    this.manageChunkLoading();

    // Save ecosystem state periodically
    if (this.currentTick % this._worldConfig.saveInterval === 0) {
      this.saveEcosystemState();
    }
  }

  /**
   * Process ecosystem dynamics including resource cycles and environmental pressures
   */
  private processEcosystemDynamics(deltaTime: number): void {
    // Update resource regeneration based on biome characteristics
    for (const [terrainType, biome] of this._biomes) {
      this.updateBiomeResources(terrainType, biome, deltaTime);
    }

    // Apply environmental pressures
    this.applyEnvironmentalPressures(deltaTime);
  }

  /**
   * Update resources in a specific biome
   */
  private updateBiomeResources(
    terrainType: TerrainType,
    biome: IBiome,
    deltaTime: number
  ): void {
    // Implementation would scan world chunks for this terrain type
    // and apply resource multipliers and regeneration rates
    // This is a simplified version - full implementation would be more complex
  }

  /**
   * Apply environmental pressures to populations
   */
  private applyEnvironmentalPressures(deltaTime: number): void {
    for (const [speciesId, population] of this._populations) {
      const species = this._species.get(speciesId);
      if (!species) continue;

      for (const creature of population) {
        const position = creature.position;
        const terrainType = this._world.getTerrainAt(position.x, position.y);
        const biome = terrainType ? this._biomes.get(terrainType) : null;

        if (biome) {
          this.applyBiomePressures(creature, biome, deltaTime);
        }
      }
    }
  }

  /**
   * Apply biome-specific pressures to a creature
   */
  private applyBiomePressures(
    creature: Creature,
    biome: IBiome,
    deltaTime: number
  ): void {
    const pressures = biome.environmentalPressures;

    // Apply resource scarcity pressure
    if (pressures.resourceScarcity > 0) {
      const energyDrain = pressures.resourceScarcity * 0.1 * deltaTime;
      creature.energy = Math.max(0, creature.energy - energyDrain);
    }

    // Weather harshness affects energy (since creature doesn't have separate health)
    if (pressures.weatherHarshness > 0) {
      const energyImpact = pressures.weatherHarshness * 0.05 * deltaTime;
      creature.energy = Math.max(0, creature.energy - energyImpact);
    }
  }

  /**
   * Process population dynamics including reproduction, death, and migration
   */
  private processPopulationDynamics(deltaTime: number): void {
    for (const [speciesId, population] of this._populations) {
      const species = this._species.get(speciesId);
      if (!species) continue;

      // Remove dead creatures
      const alivePop = population.filter((creature) => creature.alive);
      this._populations.set(speciesId, alivePop);

      // Check for extinction
      if (
        alivePop.length < species.minimumViablePopulation &&
        alivePop.length > 0
      ) {
        this.handleSpeciesExtinction(speciesId, "population_below_threshold");
      }

      // Process reproduction
      this.processSpeciesReproduction(speciesId, alivePop, deltaTime);

      // Process migration if enabled
      if (this._worldConfig.ecosystemConfig.migrationEnabled) {
        this.processSpeciesMigration(speciesId, alivePop, deltaTime);
      }
    }
  }

  /**
   * Handle species extinction
   */
  private handleSpeciesExtinction(speciesId: string, cause: string): void {
    this._extinctionLog.push({
      speciesId,
      tick: this.currentTick,
      cause,
    });

    // Remove all remaining individuals
    const remainingPopulation = this._populations.get(speciesId) || [];
    for (const creature of remainingPopulation) {
      this._world.removeEntity(creature.id);
    }
    this._populations.set(speciesId, []);

    worldLogger.warn(
      `Species ${speciesId} went extinct at tick ${this.currentTick}. Cause: ${cause}`
    );
  }

  /**
   * Process reproduction for a species
   */
  private processSpeciesReproduction(
    speciesId: string,
    population: Creature[],
    deltaTime: number
  ): void {
    const species = this._species.get(speciesId);
    if (!species) return;

    // Simple reproduction logic - in a full implementation this would be much more sophisticated
    const reproductionChance = species.reproductionRate * deltaTime * 0.001; // Scale down for per-tick calculation
    const config = species.creatureConfig;

    for (let i = 0; i < population.length - 1; i += 2) {
      if (Math.random() < reproductionChance) {
        const parent1 = population[i];
        const parent2 = population[i + 1];

        // Basic reproduction conditions
        if (
          parent1.energy > config.maxEnergy * 0.7 &&
          parent2.energy > config.maxEnergy * 0.7 &&
          population.length < species.maxPopulation
        ) {
          // Create offspring near parents
          const avgPosition = {
            x: Math.floor((parent1.position.x + parent2.position.x) / 2),
            y: Math.floor((parent1.position.y + parent2.position.y) / 2),
          };

          const offspring = this.createCreatureFromSpecies(
            species,
            avgPosition
          );

          try {
            this._world.addEntity(offspring);
            population.push(offspring);

            // Reduce parent energy
            parent1.energy *= 0.8;
            parent2.energy *= 0.8;
          } catch (error) {
            // Failed to place offspring, continue
          }
        }
      }
    }
  }

  /**
   * Process migration patterns
   */
  private processSpeciesMigration(
    speciesId: string,
    population: Creature[],
    deltaTime: number
  ): void {
    // Implementation would handle creature movement between suitable biomes
    // This is a placeholder for the full migration system
  }

  /**
   * Process long-term evolutionary changes
   */
  private processLongTermEvolution(deltaTime: number): void {
    // Track evolutionary metrics over time
    // This would include genetic drift, adaptation tracking, etc.
    for (const [speciesId, population] of this._populations) {
      if (population.length > 0) {
        const evolutionData = this.calculateEvolutionMetrics(
          speciesId,
          population
        );
        const history = this._evolutionHistory.get(speciesId) || [];
        history.push({
          tick: this.currentTick,
          ...evolutionData,
        });

        // Keep only recent history to manage memory
        if (history.length > 1000) {
          history.splice(0, history.length - 1000);
        }

        this._evolutionHistory.set(speciesId, history);
      }
    }
  }

  /**
   * Calculate evolution metrics for a species
   */
  private calculateEvolutionMetrics(
    speciesId: string,
    population: Creature[]
  ): any {
    // Calculate genetic diversity, fitness trends, trait evolution, etc.
    // Note: Using basic energy as fitness proxy since getFitness method doesn't exist
    return {
      population: population.length,
      avgFitness:
        population.reduce((sum, c) => sum + c.energy, 0) / population.length,
      avgEnergy:
        population.reduce((sum, c) => sum + c.energy, 0) / population.length,
      avgAge: population.reduce((sum, c) => sum + c.age, 0) / population.length,
    };
  }

  /**
   * Process ecosystem events
   */
  private processEcosystemEvents(deltaTime: number): void {
    // Update existing events
    this._activeEvents = this._activeEvents.filter((event) => {
      const elapsed = this.currentTick - event.startTick;
      if (elapsed >= event.duration) {
        this.concludeEvent(event);
        return false;
      }

      this.applyEventEffects(event, deltaTime);
      return true;
    });

    // Generate new events
    this.generateRandomEvents();
  }

  /**
   * Generate random ecosystem events
   */
  private generateRandomEvents(): void {
    const eventChance =
      this._worldConfig.ecosystemConfig.naturalEventFrequency * 0.0001; // Per tick

    if (Math.random() < eventChance) {
      const eventType = this.selectRandomEventType();
      const event = this.createEcosystemEvent(eventType);
      this._activeEvents.push(event);

      worldLogger.info(
        `New ecosystem event: ${event.type} (${event.severity}) at tick ${this.currentTick}`
      );
    }
  }

  /**
   * Select a random event type based on probabilities
   */
  private selectRandomEventType(): IEcosystemEvent["type"] {
    const eventTypes: IEcosystemEvent["type"][] = [
      "natural_disaster",
      "climate_change",
      "disease_outbreak",
      "species_migration",
      "resource_discovery",
    ];
    return eventTypes[Math.floor(Math.random() * eventTypes.length)];
  }

  /**
   * Create a new ecosystem event
   */
  private createEcosystemEvent(type: IEcosystemEvent["type"]): IEcosystemEvent {
    const id = `event_${this._nextEventId++}`;
    const severity = this.selectEventSeverity();

    // Generate random affected area
    const center: Position = {
      x: Math.floor(Math.random() * this._world.width),
      y: Math.floor(Math.random() * this._world.height),
    };

    const radius =
      severity === "catastrophic"
        ? 50
        : severity === "high"
        ? 30
        : severity === "medium"
        ? 20
        : 10;

    return {
      id,
      type,
      severity,
      affectedArea: { center, radius },
      duration: this.getEventDuration(type, severity),
      effects: this.getEventEffects(type, severity),
      startTick: this.currentTick,
      description: this.getEventDescription(type, severity),
    };
  }

  /**
   * Select event severity based on probabilities
   */
  private selectEventSeverity(): IEcosystemEvent["severity"] {
    const rand = Math.random();
    if (rand < 0.1) return "catastrophic";
    if (rand < 0.3) return "high";
    if (rand < 0.6) return "medium";
    return "low";
  }

  /**
   * Get event duration based on type and severity
   */
  private getEventDuration(
    type: IEcosystemEvent["type"],
    severity: IEcosystemEvent["severity"]
  ): number {
    const baseDuration =
      type === "natural_disaster"
        ? 50
        : type === "disease_outbreak"
        ? 200
        : type === "climate_change"
        ? 1000
        : type === "species_migration"
        ? 300
        : 100; // resource_discovery

    const severityMultiplier =
      severity === "catastrophic"
        ? 3
        : severity === "high"
        ? 2
        : severity === "medium"
        ? 1.5
        : 1;

    return Math.floor(baseDuration * severityMultiplier);
  }

  /**
   * Get event effects based on type and severity
   */
  private getEventEffects(
    type: IEcosystemEvent["type"],
    severity: IEcosystemEvent["severity"]
  ): IEcosystemEvent["effects"] {
    const severityMultiplier =
      severity === "catastrophic"
        ? 1.0
        : severity === "high"
        ? 0.7
        : severity === "medium"
        ? 0.4
        : 0.2;

    switch (type) {
      case "natural_disaster":
        return {
          populationImpact: -0.8 * severityMultiplier,
          resourceImpact: {
            [ResourceType.FOOD]: -0.6 * severityMultiplier,
            [ResourceType.SHELTER]: -0.9 * severityMultiplier,
          },
        };

      case "disease_outbreak":
        return {
          populationImpact: -0.5 * severityMultiplier,
          mutationRateChange: 0.3 * severityMultiplier,
        };

      case "climate_change":
        return {
          resourceImpact: {
            [ResourceType.WATER]: -0.4 * severityMultiplier,
            [ResourceType.FOOD]: -0.3 * severityMultiplier,
          },
          migrationPressure: 0.6 * severityMultiplier,
        };

      case "resource_discovery":
        return {
          resourceImpact: {
            [ResourceType.FOOD]: 1.5 * severityMultiplier,
            [ResourceType.MINERAL]: 2.0 * severityMultiplier,
          },
        };

      case "species_migration":
        return {
          migrationPressure: 0.8 * severityMultiplier,
        };

      default:
        return {};
    }
  }

  /**
   * Get event description
   */
  private getEventDescription(
    type: IEcosystemEvent["type"],
    severity: IEcosystemEvent["severity"]
  ): string {
    const descriptions = {
      natural_disaster: "A natural disaster strikes the area",
      disease_outbreak: "A disease spreads through the population",
      climate_change: "Climate patterns shift in the region",
      resource_discovery: "New resources are discovered",
      species_migration: "Species migration patterns change",
    };

    return `${descriptions[type]} (${severity} severity)`;
  }

  /**
   * Apply effects of an active event
   */
  private applyEventEffects(event: IEcosystemEvent, deltaTime: number): void {
    // Apply effects to creatures within the affected area
    for (const [speciesId, population] of this._populations) {
      for (const creature of population) {
        const distance = this.calculateDistance(
          creature.position,
          event.affectedArea.center
        );

        if (distance <= event.affectedArea.radius) {
          this.applyEventEffectsToCreature(creature, event, deltaTime);
        }
      }
    }
  }

  /**
   * Apply event effects to a specific creature
   */
  private applyEventEffectsToCreature(
    creature: Creature,
    event: IEcosystemEvent,
    deltaTime: number
  ): void {
    const effects = event.effects;
    const config = creature.getConfig();

    if (effects.populationImpact) {
      // Apply population impact as energy effects
      const impact = effects.populationImpact * deltaTime * 0.01;
      if (impact < 0) {
        creature.energy += impact * config.maxEnergy;
      }
    }
  }

  /**
   * Conclude an event that has ended
   */
  private concludeEvent(event: IEcosystemEvent): void {
    worldLogger.info(
      `Ecosystem event concluded: ${event.type} (lasted ${event.duration} ticks)`
    );
  }

  /**
   * Manage chunk loading for large worlds
   */
  private manageChunkLoading(): void {
    // Determine which chunks need to be loaded based on active creature positions
    const requiredChunks = new Set<string>();

    for (const population of this._populations.values()) {
      for (const creature of population) {
        const chunkKey = this.getChunkKey(creature.position);
        requiredChunks.add(chunkKey);
      }
    }

    // Load required chunks and unload unnecessary ones
    for (const chunkKey of requiredChunks) {
      if (!this._loadedChunks.has(chunkKey)) {
        this.loadChunk(chunkKey);
      }
    }

    // Unload chunks that are no longer needed
    for (const chunkKey of this._loadedChunks) {
      if (!requiredChunks.has(chunkKey)) {
        this.unloadChunk(chunkKey);
      }
    }
  }

  /**
   * Load a chunk
   */
  private loadChunk(chunkKey: string): void {
    // Implementation would load chunk data
    this._loadedChunks.add(chunkKey);
  }

  /**
   * Unload a chunk
   */
  private unloadChunk(chunkKey: string): void {
    // Implementation would save and unload chunk data
    this._loadedChunks.delete(chunkKey);
  }

  /**
   * Get chunk key for a position
   */
  private getChunkKey(position: Position): string {
    const chunkSize = this._worldConfig.worldConfig.chunkSize;
    const chunkX = Math.floor(position.x / chunkSize);
    const chunkY = Math.floor(position.y / chunkSize);
    return `${chunkX},${chunkY}`;
  }

  /**
   * Calculate ecosystem statistics
   */
  private calculateEcosystemStats(): IEcosystemStats {
    const speciesStats: ISpeciesPopulationStats[] = [];
    let totalPopulation = 0;
    let totalSpecies = 0;
    let extinctSpecies = 0;

    for (const [speciesId, population] of this._populations) {
      const species = this._species.get(speciesId);
      if (!species) continue;

      if (population.length === 0) {
        extinctSpecies++;
      } else {
        totalSpecies++;
        totalPopulation += population.length;
        const config = species.creatureConfig;

        const stats: ISpeciesPopulationStats = {
          speciesId,
          totalPopulation: population.length,
          averageAge:
            population.reduce((sum, c) => sum + c.age, 0) / population.length,
          averageFitness:
            population.reduce((sum, c) => sum + c.energy, 0) /
            population.length, // Use energy as fitness proxy
          averageEnergyEfficiency:
            population.reduce(
              (sum, c) => sum + c.energy / config.maxEnergy,
              0
            ) / population.length,
          reproductionRate: 0, // Would be calculated from actual reproduction events
          deathRate: 0, // Would be calculated from death tracking
          migrationRate: 0, // Would be calculated from migration tracking
          geneticDiversity: 0, // Would require genetic analysis
          biomeDistribution: this.calculateBiomeDistribution(population),
        };

        speciesStats.push(stats);
      }
    }

    return {
      currentTick: this.currentTick,
      totalPopulation,
      totalSpecies,
      extinctSpecies,
      avgSpeciesDiversity:
        totalSpecies > 0 ? totalPopulation / totalSpecies : 0,
      totalBiomass: totalPopulation, // Simplified calculation
      resourceUtilization: {}, // Would require resource tracking
      predatorPreyRatio: 0, // Would require relationship analysis
      averageLifespan: 0, // Would require lifespan tracking
      evolutionaryPressure: this._activeEvents.length / 10, // Simplified metric
      speciesStats,
      activeEvents: [...this._activeEvents],
    };
  }

  /**
   * Calculate biome distribution for a population
   */
  private calculateBiomeDistribution(
    population: Creature[]
  ): Partial<Record<TerrainType, number>> {
    const distribution: Partial<Record<TerrainType, number>> = {};

    for (const creature of population) {
      const terrainType = this._world.getTerrainAt(
        creature.position.x,
        creature.position.y
      );
      if (terrainType) {
        distribution[terrainType] = (distribution[terrainType] || 0) + 1;
      }
    }

    // Convert to percentages
    const total = population.length;
    for (const terrainType in distribution) {
      distribution[terrainType as TerrainType] =
        (distribution[terrainType as TerrainType]! / total) * 100;
    }

    return distribution;
  }

  /**
   * Save ecosystem state
   */
  private saveEcosystemState(): void {
    // Implementation would save current ecosystem state to persistence system
    worldLogger.debug(`Saved ecosystem state at tick ${this.currentTick}`);
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Reset the simulator to initial state
   */
  reset(): void {
    super.reset();

    this._activeEvents = [];
    this._nextEventId = 1;
    this._loadedChunks.clear();
    this._ecosystemStats = [];
    this._extinctionLog = [];

    // Clear populations but keep species definitions
    for (const speciesId of this._populations.keys()) {
      this._populations.set(speciesId, []);
    }

    this._world.reset();

    worldLogger.info("World simulator reset");
  }
}
