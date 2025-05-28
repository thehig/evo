/**
 * Resource Interaction System
 *
 * This module handles interactions between creatures and resources,
 * including food consumption, resource depletion, and regeneration.
 */

import { IEntity, ICreature } from "./interfaces";
import { EntityType, CreatureAction } from "./creature-types";
import {
  InteractionResult,
  MemoryEntry,
  InteractionType,
  StatusEffect,
} from "./interaction-matrix";
import { Position } from "../world/types";

/**
 * Types of food resources available in the environment
 */
export enum FoodType {
  PLANT = "plant",
  MEAT = "meat",
  FRUIT = "fruit",
  SEEDS = "seeds",
  NECTAR = "nectar",
  ALGAE = "algae",
  INSECTS = "insects",
  FISH = "fish",
}

/**
 * Types of creatures based on their dietary preferences
 */
export enum CreatureType {
  HERBIVORE = "herbivore",
  CARNIVORE = "carnivore",
  OMNIVORE = "omnivore",
  INSECTIVORE = "insectivore",
  FILTER_FEEDER = "filter_feeder",
}

/**
 * Resource quality levels affecting energy gain
 */
export enum ResourceQuality {
  POOR = "poor",
  AVERAGE = "average",
  GOOD = "good",
  EXCELLENT = "excellent",
  TOXIC = "toxic",
}

/**
 * Food source entity interface
 */
export interface IFoodSource extends IEntity {
  /** Type of food this source provides */
  foodType: FoodType;

  /** Current amount of food available */
  currentAmount: number;

  /** Maximum amount this source can hold */
  maxAmount: number;

  /** Quality of the food affecting energy gain */
  quality: ResourceQuality;

  /** Regeneration rate per tick */
  regenerationRate: number;

  /** Whether this source can be depleted */
  depletable: boolean;

  /** Time until next regeneration tick */
  regenerationCooldown: number;

  /** Consume a specified amount from this source */
  consume(amount: number): number;

  /** Regenerate food over time */
  regenerate(deltaTime: number): void;

  /** Check if source has enough food */
  hasFood(amount: number): boolean;
}

/**
 * Food compatibility and energy values
 */
interface FoodCompatibility {
  /** Energy gain multiplier for this food type */
  energyMultiplier: number;

  /** Preference score (0-1, higher = more preferred) */
  preference: number;

  /** Minimum energy required to consume this food */
  minEnergyRequired: number;

  /** Time to consume this food type */
  consumptionTime: number;

  /** Possible status effects from consuming this food */
  statusEffects?: StatusEffect[];
}

/**
 * Resource detection configuration
 */
export interface ResourceDetectionConfig {
  /** Base detection range for food sources */
  baseDetectionRange: number;

  /** Range multiplier based on hunger level */
  hungerRangeMultiplier: number;

  /** Maximum detection range */
  maxDetectionRange: number;

  /** Energy cost for active food searching */
  searchEnergyCost: number;
}

/**
 * Default resource detection configuration
 */
const DEFAULT_DETECTION_CONFIG: ResourceDetectionConfig = {
  baseDetectionRange: 3.0,
  hungerRangeMultiplier: 1.5,
  maxDetectionRange: 8.0,
  searchEnergyCost: 1.0,
};

/**
 * Food source implementation
 */
export class FoodSource implements IFoodSource {
  public currentAmount: number;
  public regenerationCooldown: number = 0;

  constructor(
    public readonly id: string,
    public position: Position,
    public readonly foodType: FoodType,
    public readonly maxAmount: number,
    public readonly quality: ResourceQuality = ResourceQuality.AVERAGE,
    public readonly regenerationRate: number = 0.1,
    public readonly depletable: boolean = true,
    initialAmount?: number
  ) {
    this.currentAmount = initialAmount ?? maxAmount;
  }

  get active(): boolean {
    return this.currentAmount > 0 || !this.depletable;
  }

  set active(value: boolean) {
    // Food sources can't be manually deactivated
  }

  consume(amount: number): number {
    if (!this.depletable) {
      return amount; // Infinite source
    }

    const consumed = Math.min(amount, this.currentAmount);
    this.currentAmount -= consumed;
    return consumed;
  }

  regenerate(deltaTime: number): void {
    if (this.regenerationCooldown > 0) {
      this.regenerationCooldown -= deltaTime;
      return;
    }

    if (this.currentAmount < this.maxAmount) {
      const regenerated = this.regenerationRate * deltaTime;
      this.currentAmount = Math.min(
        this.maxAmount,
        this.currentAmount + regenerated
      );

      // Set cooldown for next regeneration
      this.regenerationCooldown = 1.0; // 1 tick cooldown
    }
  }

  hasFood(amount: number): boolean {
    return !this.depletable || this.currentAmount >= amount;
  }

  update(deltaTime: number): void {
    this.regenerate(deltaTime);
  }

  destroy(): void {
    // Cleanup if needed
  }
}

/**
 * Resource interaction system managing food consumption
 */
export class ResourceInteractionSystem {
  private foodCompatibilityMap: Map<
    CreatureType,
    Map<FoodType, FoodCompatibility>
  > = new Map();
  private detectionConfig: ResourceDetectionConfig;
  private foodSources: Map<string, IFoodSource> = new Map();

  constructor(config: Partial<ResourceDetectionConfig> = {}) {
    this.detectionConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
    this.initializeFoodCompatibility();
  }

  /**
   * Initialize food compatibility matrix
   */
  private initializeFoodCompatibility(): void {
    // Herbivore compatibility
    this.foodCompatibilityMap.set(
      CreatureType.HERBIVORE,
      new Map([
        [
          FoodType.PLANT,
          {
            energyMultiplier: 1.2,
            preference: 0.9,
            minEnergyRequired: 5,
            consumptionTime: 2,
          },
        ],
        [
          FoodType.FRUIT,
          {
            energyMultiplier: 1.0,
            preference: 0.8,
            minEnergyRequired: 3,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.SEEDS,
          {
            energyMultiplier: 0.8,
            preference: 0.6,
            minEnergyRequired: 2,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.NECTAR,
          {
            energyMultiplier: 0.6,
            preference: 0.4,
            minEnergyRequired: 1,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.ALGAE,
          {
            energyMultiplier: 0.7,
            preference: 0.5,
            minEnergyRequired: 2,
            consumptionTime: 2,
          },
        ],
      ])
    );

    // Carnivore compatibility
    this.foodCompatibilityMap.set(
      CreatureType.CARNIVORE,
      new Map([
        [
          FoodType.MEAT,
          {
            energyMultiplier: 1.5,
            preference: 0.95,
            minEnergyRequired: 8,
            consumptionTime: 3,
          },
        ],
        [
          FoodType.FISH,
          {
            energyMultiplier: 1.3,
            preference: 0.8,
            minEnergyRequired: 6,
            consumptionTime: 2,
          },
        ],
        [
          FoodType.INSECTS,
          {
            energyMultiplier: 0.8,
            preference: 0.6,
            minEnergyRequired: 3,
            consumptionTime: 1,
          },
        ],
      ])
    );

    // Omnivore compatibility (can eat most things)
    this.foodCompatibilityMap.set(
      CreatureType.OMNIVORE,
      new Map([
        [
          FoodType.MEAT,
          {
            energyMultiplier: 1.2,
            preference: 0.8,
            minEnergyRequired: 6,
            consumptionTime: 3,
          },
        ],
        [
          FoodType.PLANT,
          {
            energyMultiplier: 1.0,
            preference: 0.7,
            minEnergyRequired: 4,
            consumptionTime: 2,
          },
        ],
        [
          FoodType.FRUIT,
          {
            energyMultiplier: 0.9,
            preference: 0.8,
            minEnergyRequired: 3,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.SEEDS,
          {
            energyMultiplier: 0.7,
            preference: 0.5,
            minEnergyRequired: 2,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.INSECTS,
          {
            energyMultiplier: 0.8,
            preference: 0.6,
            minEnergyRequired: 3,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.FISH,
          {
            energyMultiplier: 1.1,
            preference: 0.7,
            minEnergyRequired: 5,
            consumptionTime: 2,
          },
        ],
      ])
    );

    // Insectivore compatibility
    this.foodCompatibilityMap.set(
      CreatureType.INSECTIVORE,
      new Map([
        [
          FoodType.INSECTS,
          {
            energyMultiplier: 1.4,
            preference: 0.95,
            minEnergyRequired: 2,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.NECTAR,
          {
            energyMultiplier: 0.6,
            preference: 0.4,
            minEnergyRequired: 1,
            consumptionTime: 1,
          },
        ],
        [
          FoodType.FRUIT,
          {
            energyMultiplier: 0.5,
            preference: 0.3,
            minEnergyRequired: 2,
            consumptionTime: 1,
          },
        ],
      ])
    );

    // Filter feeder compatibility
    this.foodCompatibilityMap.set(
      CreatureType.FILTER_FEEDER,
      new Map([
        [
          FoodType.ALGAE,
          {
            energyMultiplier: 1.3,
            preference: 0.9,
            minEnergyRequired: 1,
            consumptionTime: 2,
          },
        ],
        [
          FoodType.PLANT,
          {
            energyMultiplier: 0.8,
            preference: 0.6,
            minEnergyRequired: 3,
            consumptionTime: 3,
          },
        ],
      ])
    );
  }

  /**
   * Register a food source in the system
   */
  registerFoodSource(foodSource: IFoodSource): void {
    this.foodSources.set(foodSource.id, foodSource);
  }

  /**
   * Remove a food source from the system
   */
  removeFoodSource(foodSourceId: string): boolean {
    return this.foodSources.delete(foodSourceId);
  }

  /**
   * Get creature type from creature entity
   */
  private getCreatureType(creature: ICreature): CreatureType {
    // This is a simplified implementation
    // In a real system, this would be determined by the creature's genome or configuration
    const config = creature.getConfig() as any;
    return config?.creatureType || CreatureType.OMNIVORE;
  }

  /**
   * Detect food sources within range of a creature
   */
  detectFoodSources(creature: ICreature): IFoodSource[] {
    const creatureType = this.getCreatureType(creature);
    const compatibilityMap = this.foodCompatibilityMap.get(creatureType);

    if (!compatibilityMap) {
      return [];
    }

    // Calculate detection range based on hunger
    const hungerLevel = this.calculateHungerLevel(creature);
    const detectionRange = Math.min(
      this.detectionConfig.maxDetectionRange,
      this.detectionConfig.baseDetectionRange *
        (1 + hungerLevel * this.detectionConfig.hungerRangeMultiplier)
    );

    const detectedSources: IFoodSource[] = [];

    for (const foodSource of this.foodSources.values()) {
      if (!foodSource.active || !foodSource.hasFood(0.1)) {
        continue;
      }

      const distance = this.calculateDistance(
        creature.position,
        foodSource.position
      );

      if (
        distance <= detectionRange &&
        compatibilityMap.has(foodSource.foodType)
      ) {
        detectedSources.push(foodSource);
      }
    }

    // Sort by preference and distance
    return detectedSources.sort((a, b) => {
      const compatA = compatibilityMap.get(a.foodType)!;
      const compatB = compatibilityMap.get(b.foodType)!;

      const distA = this.calculateDistance(creature.position, a.position);
      const distB = this.calculateDistance(creature.position, b.position);

      // Calculate value score (preference / distance)
      const scoreA = compatA.preference / Math.max(1, distA);
      const scoreB = compatB.preference / Math.max(1, distB);

      return scoreB - scoreA;
    });
  }

  /**
   * Attempt to consume food from a source
   */
  consumeFood(
    creature: ICreature,
    foodSource: IFoodSource,
    amount: number = 1
  ): InteractionResult {
    const creatureType = this.getCreatureType(creature);
    const compatibilityMap = this.foodCompatibilityMap.get(creatureType);

    if (!compatibilityMap || !compatibilityMap.has(foodSource.foodType)) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Incompatible food type",
      };
    }

    const compatibility = compatibilityMap.get(foodSource.foodType)!;

    // Check energy requirements
    if (creature.energy < compatibility.minEnergyRequired) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Insufficient energy to consume food",
      };
    }

    // Check if food source has enough food
    if (!foodSource.hasFood(amount)) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Insufficient food available",
      };
    }

    // Consume the food
    const consumedAmount = foodSource.consume(amount);

    if (consumedAmount <= 0) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Failed to consume food",
      };
    }

    // Calculate energy gain
    const baseEnergyGain = consumedAmount * 10; // Base energy per unit
    const qualityMultiplier = this.getQualityMultiplier(foodSource.quality);
    const energyGain =
      baseEnergyGain * compatibility.energyMultiplier * qualityMultiplier;

    // Apply energy cost for consumption
    const energyCost = compatibility.minEnergyRequired;
    const netEnergyChange = energyGain - energyCost;

    // Create memory entry
    const memoryEntry: MemoryEntry = {
      interactionType: InteractionType.FEEDING,
      entityId: foodSource.id,
      entityType: EntityType.FOOD,
      outcome: netEnergyChange > 0 ? "success" : "neutral",
      tick: Date.now(), // Simplified tick tracking
      context: {
        foodType: foodSource.foodType,
        amountConsumed: consumedAmount,
        energyGained: energyGain,
        quality: foodSource.quality,
      },
    };

    // Determine status effects
    const statusEffects: StatusEffect[] = [];

    if (foodSource.quality === ResourceQuality.TOXIC) {
      statusEffects.push({
        type: "poisoned",
        duration: 10,
        magnitude: -2,
        properties: { damagePerTick: 2 },
      });
    } else if (foodSource.quality === ResourceQuality.EXCELLENT) {
      statusEffects.push({
        type: "well_fed",
        duration: 20,
        magnitude: 1.2,
        properties: { energyEfficiencyBonus: 0.2 },
      });
    }

    return {
      success: true,
      energyChange: netEnergyChange,
      resourcesGathered: consumedAmount,
      statusEffects: statusEffects.length > 0 ? statusEffects : undefined,
      memoryEntry,
      effects: {
        foodType: foodSource.foodType,
        quality: foodSource.quality,
        consumptionTime: compatibility.consumptionTime,
      },
    };
  }

  /**
   * Calculate hunger level for a creature (0.0 = not hungry, 1.0 = very hungry)
   */
  private calculateHungerLevel(creature: ICreature): number {
    const config = creature.getConfig() as any;
    const maxEnergy = config?.maxEnergy || 100;
    const energyRatio = creature.energy / maxEnergy;

    // Hunger increases as energy decreases
    return Math.max(0, 1 - energyRatio);
  }

  /**
   * Get quality multiplier for energy calculations
   */
  private getQualityMultiplier(quality: ResourceQuality): number {
    switch (quality) {
      case ResourceQuality.POOR:
        return 0.5;
      case ResourceQuality.AVERAGE:
        return 1.0;
      case ResourceQuality.GOOD:
        return 1.3;
      case ResourceQuality.EXCELLENT:
        return 1.6;
      case ResourceQuality.TOXIC:
        return 0.2; // Still provides some energy but with negative effects
      default:
        return 1.0;
    }
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
   * Update all food sources
   */
  updateFoodSources(deltaTime: number): void {
    for (const foodSource of this.foodSources.values()) {
      foodSource.update(deltaTime);
    }
  }

  /**
   * Get food compatibility for a creature type
   */
  getFoodCompatibility(
    creatureType: CreatureType
  ): Map<FoodType, FoodCompatibility> {
    return this.foodCompatibilityMap.get(creatureType) || new Map();
  }

  /**
   * Check if a creature can consume a specific food type
   */
  canConsumeFood(creature: ICreature, foodType: FoodType): boolean {
    const creatureType = this.getCreatureType(creature);
    const compatibilityMap = this.foodCompatibilityMap.get(creatureType);
    return compatibilityMap?.has(foodType) || false;
  }

  /**
   * Get optimal food sources for a creature
   */
  getOptimalFoodSources(
    creature: ICreature,
    maxSources: number = 5
  ): IFoodSource[] {
    const detectedSources = this.detectFoodSources(creature);
    return detectedSources.slice(0, maxSources);
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<ResourceDetectionConfig> {
    return { ...this.detectionConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ResourceDetectionConfig>): void {
    this.detectionConfig = { ...this.detectionConfig, ...newConfig };
  }

  /**
   * Get statistics about the resource system
   */
  getStatistics() {
    const totalFoodSources = this.foodSources.size;
    const activeFoodSources = Array.from(this.foodSources.values()).filter(
      (fs) => fs.active
    ).length;
    const foodTypeDistribution = new Map<FoodType, number>();

    for (const foodSource of this.foodSources.values()) {
      const count = foodTypeDistribution.get(foodSource.foodType) || 0;
      foodTypeDistribution.set(foodSource.foodType, count + 1);
    }

    return {
      totalFoodSources,
      activeFoodSources,
      foodTypeDistribution,
      creatureTypeCompatibilities: this.foodCompatibilityMap.size,
    };
  }

  /**
   * Reset the resource system
   */
  reset(): void {
    this.foodSources.clear();
  }
}
