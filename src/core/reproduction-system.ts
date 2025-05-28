/**
 * Reproduction System
 *
 * This module handles creature reproduction mechanics, including mating triggers,
 * genetic combination, offspring generation, and population control.
 */

import { ICreature } from "./interfaces";
import { Random } from "./random";
import { GeneticsSystem, Genome, TraitType } from "./genetics";
import {
  InteractionResult,
  MemoryEntry,
  InteractionType,
  StatusEffect,
} from "./interaction-matrix";
import { Position } from "../world/types";

/**
 * Reproduction state for tracking creature readiness
 */
export enum ReproductionState {
  IMMATURE = "immature",
  READY = "ready",
  PREGNANT = "pregnant",
  COOLDOWN = "cooldown",
  INFERTILE = "infertile",
}

/**
 * Mating compatibility factors
 */
export interface MatingCompatibility {
  /** Genetic compatibility score (0-1) */
  geneticCompatibility: number;

  /** Age compatibility score (0-1) */
  ageCompatibility: number;

  /** Energy compatibility score (0-1) */
  energyCompatibility: number;

  /** Overall compatibility score (0-1) */
  overallCompatibility: number;

  /** Whether mating is possible */
  canMate: boolean;

  /** Reasons why mating might not be possible */
  incompatibilityReasons: string[];
}

/**
 * Reproduction attempt result
 */
export interface ReproductionResult {
  /** Whether reproduction was successful */
  success: boolean;

  /** Offspring creature if successful */
  offspring?: ICreature;

  /** Energy cost for both parents */
  energyCost: number;

  /** Cooldown period before next reproduction attempt */
  cooldownPeriod: number;

  /** Status effects applied to parents */
  statusEffects?: StatusEffect[];

  /** Memory entry for the reproduction event */
  memoryEntry?: MemoryEntry;

  /** Reason for failure if unsuccessful */
  failureReason?: string;
}

/**
 * Reproduction configuration
 */
export interface ReproductionConfig {
  /** Minimum energy percentage required for reproduction */
  minEnergyThreshold: number;

  /** Minimum age for reproduction */
  maturityAge: number;

  /** Maximum age for reproduction */
  maxReproductiveAge: number;

  /** Base energy cost for reproduction */
  baseEnergyCost: number;

  /** Cooldown period between reproduction attempts */
  reproductionCooldown: number;

  /** Minimum genetic compatibility for mating */
  minGeneticCompatibility: number;

  /** Maximum distance for finding mates */
  maxMatingDistance: number;

  /** Gestation period for offspring development */
  gestationPeriod: number;

  /** Chance of multiple offspring */
  multipleOffspringChance: number;

  /** Maximum number of offspring per reproduction */
  maxOffspringCount: number;

  /** Population control mechanisms */
  populationControl: {
    /** Maximum population before reproduction restrictions */
    maxPopulation: number;

    /** Fertility reduction factor when overpopulated */
    overpopulationFertilityReduction: number;

    /** Enable territorial reproduction restrictions */
    enableTerritorialRestrictions: boolean;
  };
}

/**
 * Default reproduction configuration
 */
const DEFAULT_REPRODUCTION_CONFIG: ReproductionConfig = {
  minEnergyThreshold: 0.7,
  maturityAge: 100,
  maxReproductiveAge: 800,
  baseEnergyCost: 30,
  reproductionCooldown: 50,
  minGeneticCompatibility: 0.3,
  maxMatingDistance: 2.0,
  gestationPeriod: 20,
  multipleOffspringChance: 0.1,
  maxOffspringCount: 3,
  populationControl: {
    maxPopulation: 1000,
    overpopulationFertilityReduction: 0.5,
    enableTerritorialRestrictions: true,
  },
};

/**
 * Reproduction tracking data for creatures
 */
export interface ReproductionData {
  /** Current reproduction state */
  state: ReproductionState;

  /** Ticks remaining until ready for reproduction */
  cooldownRemaining: number;

  /** Number of successful reproductions */
  reproductionCount: number;

  /** Ticks remaining in gestation (if pregnant) */
  gestationRemaining: number;

  /** Partner ID for current pregnancy */
  partnerId?: string;

  /** Fertility modifier based on genetics and environment */
  fertilityModifier: number;

  /** Last reproduction attempt tick */
  lastAttemptTick: number;

  /** Offspring genome data (if pregnant) */
  offspringGenome?: Genome;
}

/**
 * Reproduction system managing creature mating and offspring generation
 */
export class ReproductionSystem {
  private config: ReproductionConfig;
  private genetics: GeneticsSystem;
  private random: Random;
  private reproductionData: Map<string, ReproductionData> = new Map();
  private currentTick: number = 0;

  constructor(
    genetics: GeneticsSystem,
    config: Partial<ReproductionConfig> = {},
    seed?: number
  ) {
    this.config = { ...DEFAULT_REPRODUCTION_CONFIG, ...config };
    this.genetics = genetics;
    this.random = new Random(seed);
  }

  /**
   * Initialize reproduction data for a creature
   */
  initializeCreature(creature: ICreature): void {
    // Determine initial state based on creature's age
    let initialState: ReproductionState;
    let cooldownRemaining = 0;

    if (creature.age < this.config.maturityAge) {
      initialState = ReproductionState.IMMATURE;
      cooldownRemaining = this.config.maturityAge - creature.age;
    } else if (creature.age > this.config.maxReproductiveAge) {
      initialState = ReproductionState.INFERTILE;
    } else {
      initialState = ReproductionState.READY;
    }

    const reproData: ReproductionData = {
      state: initialState,
      cooldownRemaining,
      reproductionCount: 0,
      gestationRemaining: 0,
      fertilityModifier: 1.0,
      lastAttemptTick: 0,
    };

    this.reproductionData.set(creature.id, reproData);
  }

  /**
   * Update reproduction system for all creatures
   */
  update(creatures: ICreature[], deltaTime: number): ICreature[] {
    this.currentTick += deltaTime;
    const newOffspring: ICreature[] = [];

    for (const creature of creatures) {
      const reproData = this.reproductionData.get(creature.id);
      if (!reproData) {
        this.initializeCreature(creature);
        continue;
      }

      // Update reproduction state
      this.updateReproductionState(creature, reproData, deltaTime);

      // Handle gestation completion
      if (reproData.state === ReproductionState.PREGNANT) {
        reproData.gestationRemaining -= deltaTime;
        if (reproData.gestationRemaining <= 0) {
          const offspring = this.completeGestation(creature, reproData);
          if (offspring) {
            newOffspring.push(...offspring);
          }
        }
      }
    }

    return newOffspring;
  }

  /**
   * Attempt reproduction between two creatures
   */
  attemptReproduction(
    parent1: ICreature,
    parent2: ICreature
  ): ReproductionResult {
    // Check basic reproduction requirements
    const compatibility = this.calculateMatingCompatibility(parent1, parent2);
    if (!compatibility.canMate) {
      return {
        success: false,
        energyCost: 0,
        cooldownPeriod: 0,
        failureReason: compatibility.incompatibilityReasons.join(", "),
      };
    }

    // Check population control
    if (!this.checkPopulationControl()) {
      return {
        success: false,
        energyCost: 0,
        cooldownPeriod: 0,
        failureReason: "Population limit reached",
      };
    }

    // Calculate energy cost based on compatibility and genetics
    const energyCost = this.calculateEnergyCost(
      parent1,
      parent2,
      compatibility
    );

    // Check if both parents have enough energy
    if (parent1.energy < energyCost || parent2.energy < energyCost) {
      return {
        success: false,
        energyCost: 0,
        cooldownPeriod: 0,
        failureReason: "Insufficient energy for reproduction",
      };
    }

    // Perform reproduction
    const parent1Genome = this.getCreatureGenome(parent1);
    const parent2Genome = this.getCreatureGenome(parent2);

    if (!parent1Genome || !parent2Genome) {
      return {
        success: false,
        energyCost: 0,
        cooldownPeriod: 0,
        failureReason: "Missing genetic information",
      };
    }

    // Create offspring genome
    const offspringGenome = this.genetics.combineGenomes(
      parent1Genome,
      parent2Genome
    );

    // Determine which parent will carry the offspring (random selection)
    const pregnantParent = this.random.random() < 0.5 ? parent1 : parent2;
    const reproData = this.reproductionData.get(pregnantParent.id)!;

    // Set pregnancy state
    reproData.state = ReproductionState.PREGNANT;
    reproData.gestationRemaining = this.config.gestationPeriod;
    reproData.partnerId = pregnantParent === parent1 ? parent2.id : parent1.id;
    reproData.offspringGenome = offspringGenome;

    // Apply energy costs
    parent1.energy -= energyCost;
    parent2.energy -= energyCost;

    // Set cooldowns for both parents
    const reproData1 = this.reproductionData.get(parent1.id)!;
    const reproData2 = this.reproductionData.get(parent2.id)!;

    reproData1.cooldownRemaining = this.config.reproductionCooldown;
    reproData2.cooldownRemaining = this.config.reproductionCooldown;
    reproData1.lastAttemptTick = this.currentTick;
    reproData2.lastAttemptTick = this.currentTick;

    // Create memory entry
    const memoryEntry: MemoryEntry = {
      interactionType: InteractionType.REPRODUCTION,
      entityId: pregnantParent === parent1 ? parent2.id : parent1.id,
      entityType: "creature" as any,
      outcome: "success",
      tick: this.currentTick,
      context: {
        compatibility: compatibility.overallCompatibility,
        energyCost,
        gestationPeriod: this.config.gestationPeriod,
      },
    };

    return {
      success: true,
      energyCost,
      cooldownPeriod: this.config.reproductionCooldown,
      memoryEntry,
    };
  }

  /**
   * Calculate mating compatibility between two creatures
   */
  calculateMatingCompatibility(
    creature1: ICreature,
    creature2: ICreature
  ): MatingCompatibility {
    const reproData1 = this.reproductionData.get(creature1.id);
    const reproData2 = this.reproductionData.get(creature2.id);
    const incompatibilityReasons: string[] = [];

    // Check if both creatures have reproduction data
    if (!reproData1 || !reproData2) {
      incompatibilityReasons.push("Missing reproduction data");
      return {
        geneticCompatibility: 0,
        ageCompatibility: 0,
        energyCompatibility: 0,
        overallCompatibility: 0,
        canMate: false,
        incompatibilityReasons,
      };
    }

    // Check reproduction states
    if (reproData1.state !== ReproductionState.READY) {
      incompatibilityReasons.push(`Creature 1 not ready (${reproData1.state})`);
    }
    if (reproData2.state !== ReproductionState.READY) {
      incompatibilityReasons.push(`Creature 2 not ready (${reproData2.state})`);
    }

    // Check distance
    const distance = Math.sqrt(
      Math.pow(creature1.position.x - creature2.position.x, 2) +
        Math.pow(creature1.position.y - creature2.position.y, 2)
    );
    if (distance > this.config.maxMatingDistance) {
      incompatibilityReasons.push("Too far apart for mating");
    }

    // Calculate genetic compatibility
    const genome1 = this.getCreatureGenome(creature1);
    const genome2 = this.getCreatureGenome(creature2);
    let geneticCompatibility = 0;

    if (genome1 && genome2) {
      geneticCompatibility = this.genetics.calculateCompatibility(
        genome1,
        genome2
      );
      if (geneticCompatibility < this.config.minGeneticCompatibility) {
        incompatibilityReasons.push("Insufficient genetic compatibility");
      }
    } else {
      incompatibilityReasons.push("Missing genetic information");
    }

    // Calculate age compatibility
    const ageDifference = Math.abs(creature1.age - creature2.age);
    const maxAge = Math.max(creature1.age, creature2.age);
    const ageCompatibility = Math.max(0, 1 - ageDifference / (maxAge + 1));

    // Calculate energy compatibility
    const config1 = creature1.getConfig() as any;
    const config2 = creature2.getConfig() as any;
    const maxEnergy1 = config1?.maxEnergy || 100;
    const maxEnergy2 = config2?.maxEnergy || 100;

    const energyRatio1 = creature1.energy / maxEnergy1;
    const energyRatio2 = creature2.energy / maxEnergy2;
    const energyCompatibility = Math.min(energyRatio1, energyRatio2);

    if (energyRatio1 < this.config.minEnergyThreshold) {
      incompatibilityReasons.push("Creature 1 has insufficient energy");
    }
    if (energyRatio2 < this.config.minEnergyThreshold) {
      incompatibilityReasons.push("Creature 2 has insufficient energy");
    }

    // Calculate overall compatibility
    const overallCompatibility =
      geneticCompatibility * 0.5 +
      ageCompatibility * 0.2 +
      energyCompatibility * 0.3;

    const canMate =
      incompatibilityReasons.length === 0 &&
      overallCompatibility >= this.config.minGeneticCompatibility;

    return {
      geneticCompatibility,
      ageCompatibility,
      energyCompatibility,
      overallCompatibility,
      canMate,
      incompatibilityReasons,
    };
  }

  /**
   * Update reproduction state for a creature
   */
  private updateReproductionState(
    creature: ICreature,
    reproData: ReproductionData,
    deltaTime: number
  ): void {
    // Update cooldown
    if (reproData.cooldownRemaining > 0) {
      reproData.cooldownRemaining -= deltaTime;
    }

    // Update fertility modifier based on genetics
    const genome = this.getCreatureGenome(creature);
    if (genome) {
      const fertilityTrait = this.genetics.getTraitValue(
        genome,
        TraitType.FERTILITY
      );
      reproData.fertilityModifier = fertilityTrait;
    }

    // Determine reproduction state
    switch (reproData.state) {
      case ReproductionState.IMMATURE:
        if (creature.age >= this.config.maturityAge) {
          reproData.state = ReproductionState.READY;
        }
        break;

      case ReproductionState.READY:
        if (creature.age > this.config.maxReproductiveAge) {
          reproData.state = ReproductionState.INFERTILE;
        }
        break;

      case ReproductionState.COOLDOWN:
        if (reproData.cooldownRemaining <= 0) {
          reproData.state = ReproductionState.READY;
        }
        break;

      case ReproductionState.PREGNANT:
        // Handled in main update loop
        break;

      case ReproductionState.INFERTILE:
        // Permanent state
        break;
    }
  }

  /**
   * Complete gestation and create offspring
   */
  private completeGestation(
    parent: ICreature,
    reproData: ReproductionData
  ): ICreature[] {
    if (!reproData.offspringGenome) {
      reproData.state = ReproductionState.COOLDOWN;
      return [];
    }

    const offspring: ICreature[] = [];

    // Determine number of offspring
    let offspringCount = 1;
    if (this.random.random() < this.config.multipleOffspringChance) {
      offspringCount = this.random.randomInt(
        2,
        this.config.maxOffspringCount + 1
      );
    }

    // Create offspring
    for (let i = 0; i < offspringCount; i++) {
      const offspringCreature = this.createOffspring(
        parent,
        reproData.offspringGenome
      );
      if (offspringCreature) {
        offspring.push(offspringCreature);
      }
    }

    // Update parent state
    reproData.state = ReproductionState.COOLDOWN;
    reproData.reproductionCount++;
    reproData.gestationRemaining = 0;
    reproData.partnerId = undefined;
    reproData.offspringGenome = undefined;

    return offspring;
  }

  /**
   * Create an offspring creature
   */
  private createOffspring(parent: ICreature, genome: Genome): ICreature | null {
    // This is a simplified implementation
    // In a real system, this would create a new creature instance with the given genome
    // For now, we'll return null as the actual creature creation depends on the specific creature implementation
    return null;
  }

  /**
   * Calculate energy cost for reproduction
   */
  private calculateEnergyCost(
    parent1: ICreature,
    parent2: ICreature,
    compatibility: MatingCompatibility
  ): number {
    let cost = this.config.baseEnergyCost;

    // Adjust cost based on compatibility (lower compatibility = higher cost)
    cost *= 2 - compatibility.overallCompatibility;

    // Adjust cost based on age (older creatures have higher cost)
    const avgAge = (parent1.age + parent2.age) / 2;
    const ageFactor = 1 + (avgAge / this.config.maxReproductiveAge) * 0.5;
    cost *= ageFactor;

    return Math.floor(cost);
  }

  /**
   * Check population control restrictions
   */
  private checkPopulationControl(): boolean {
    const currentPopulation = this.reproductionData.size;
    return currentPopulation < this.config.populationControl.maxPopulation;
  }

  /**
   * Get creature genome (placeholder implementation)
   */
  private getCreatureGenome(creature: ICreature): Genome | null {
    // This is a placeholder implementation
    // In a real system, the creature would have a genome property
    // For now, we'll create a random genome for testing
    return this.genetics.createRandomGenome(creature.id);
  }

  /**
   * Get reproduction data for a creature
   */
  getReproductionData(creatureId: string): ReproductionData | undefined {
    return this.reproductionData.get(creatureId);
  }

  /**
   * Get all creatures ready for reproduction
   */
  getReadyForReproduction(creatures: ICreature[]): ICreature[] {
    return creatures.filter((creature) => {
      const reproData = this.reproductionData.get(creature.id);
      return reproData?.state === ReproductionState.READY;
    });
  }

  /**
   * Find potential mates for a creature
   */
  findPotentialMates(
    creature: ICreature,
    candidates: ICreature[]
  ): ICreature[] {
    const potentialMates: Array<{
      creature: ICreature;
      compatibility: MatingCompatibility;
    }> = [];

    for (const candidate of candidates) {
      if (candidate.id === creature.id) continue;

      const compatibility = this.calculateMatingCompatibility(
        creature,
        candidate
      );
      if (compatibility.canMate) {
        potentialMates.push({ creature: candidate, compatibility });
      }
    }

    // Sort by compatibility score
    potentialMates.sort(
      (a, b) =>
        b.compatibility.overallCompatibility -
        a.compatibility.overallCompatibility
    );

    return potentialMates.map((mate) => mate.creature);
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<ReproductionConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReproductionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get statistics about the reproduction system
   */
  getStatistics() {
    const allData = Array.from(this.reproductionData.values());
    const stateDistribution = new Map<ReproductionState, number>();

    for (const state of Object.values(ReproductionState)) {
      stateDistribution.set(state, 0);
    }

    let totalReproductions = 0;
    let averageFertility = 0;

    for (const data of allData) {
      const count = stateDistribution.get(data.state) || 0;
      stateDistribution.set(data.state, count + 1);
      totalReproductions += data.reproductionCount;
      averageFertility += data.fertilityModifier;
    }

    averageFertility =
      allData.length > 0 ? averageFertility / allData.length : 0;

    return {
      totalCreatures: allData.length,
      stateDistribution,
      totalReproductions,
      averageFertility,
      currentTick: this.currentTick,
    };
  }

  /**
   * Reset the reproduction system
   */
  reset(): void {
    this.reproductionData.clear();
    this.currentTick = 0;
  }
}
