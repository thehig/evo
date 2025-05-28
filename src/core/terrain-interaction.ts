/**
 * Terrain Interaction System
 *
 * This module handles interactions between creatures and different terrain types,
 * including movement modifiers, environmental effects, and terrain-specific behaviors.
 */

import { IEntity, ICreature } from "./interfaces";
import { EntityType } from "./creature-types";
import {
  InteractionResult,
  MemoryEntry,
  InteractionType,
  StatusEffect,
} from "./interaction-matrix";
import { Position } from "../world/types";

/**
 * Types of terrain in the environment
 */
export enum TerrainType {
  GRASS = "grass",
  WATER = "water",
  SAND = "sand",
  ROCK = "rock",
  MUD = "mud",
  ICE = "ice",
  LAVA = "lava",
  FOREST = "forest",
  SWAMP = "swamp",
  MOUNTAIN = "mountain",
  CAVE = "cave",
  HEALING_SPRING = "healing_spring",
  ENERGY_DRAIN = "energy_drain",
  QUICKSAND = "quicksand",
  THORNS = "thorns",
}

/**
 * Terrain properties affecting creature interactions
 */
export interface TerrainProperties {
  /** Movement speed multiplier (1.0 = normal, <1.0 = slower, >1.0 = faster) */
  speedMultiplier: number;

  /** Energy cost multiplier for movement (1.0 = normal, >1.0 = more expensive) */
  energyCostMultiplier: number;

  /** Damage per tick when standing on this terrain */
  damagePerTick: number;

  /** Healing per tick when standing on this terrain */
  healingPerTick: number;

  /** Energy drain/gain per tick */
  energyPerTick: number;

  /** Whether creatures can pass through this terrain */
  passable: boolean;

  /** Whether this terrain provides shelter/hiding */
  providesShelter: boolean;

  /** Temperature effect (affects creature comfort) */
  temperature: number; // -1.0 (very cold) to 1.0 (very hot)

  /** Visibility modifier (affects detection range) */
  visibilityModifier: number;

  /** Special effects that can be applied */
  specialEffects?: TerrainEffect[];
}

/**
 * Special terrain effects
 */
export interface TerrainEffect {
  /** Type of effect */
  type: string;

  /** Probability of effect occurring per tick (0.0 - 1.0) */
  probability: number;

  /** Duration of the effect */
  duration: number;

  /** Magnitude of the effect */
  magnitude: number;

  /** Additional properties */
  properties?: Record<string, any>;
}

/**
 * Terrain interaction configuration
 */
export interface TerrainInteractionConfig {
  /** Whether to apply terrain effects */
  enableTerrainEffects: boolean;

  /** Global terrain effect multiplier */
  effectMultiplier: number;

  /** Minimum time between terrain effect applications */
  effectCooldown: number;

  /** Whether to track terrain interaction history */
  trackHistory: boolean;
}

/**
 * Default terrain interaction configuration
 */
const DEFAULT_TERRAIN_CONFIG: TerrainInteractionConfig = {
  enableTerrainEffects: true,
  effectMultiplier: 1.0,
  effectCooldown: 1.0,
  trackHistory: true,
};

/**
 * Terrain cell representing a specific location's terrain
 */
export interface TerrainCell {
  /** Position of this terrain cell */
  position: Position;

  /** Type of terrain */
  terrainType: TerrainType;

  /** Current properties (may be modified by environmental factors) */
  properties: TerrainProperties;

  /** Entities currently on this terrain */
  occupants: Set<string>;

  /** Last update tick */
  lastUpdate: number;
}

/**
 * Terrain interaction system managing environmental effects
 */
export class TerrainInteractionSystem {
  private terrainProperties: Map<TerrainType, TerrainProperties> = new Map();
  private terrainGrid: Map<string, TerrainCell> = new Map();
  private config: TerrainInteractionConfig;
  private entityCooldowns: Map<string, number> = new Map();
  private interactionHistory: Map<string, TerrainInteractionRecord[]> =
    new Map();

  constructor(config: Partial<TerrainInteractionConfig> = {}) {
    this.config = { ...DEFAULT_TERRAIN_CONFIG, ...config };
    this.initializeTerrainProperties();
  }

  /**
   * Initialize default terrain properties
   */
  private initializeTerrainProperties(): void {
    // Grass - neutral terrain
    this.terrainProperties.set(TerrainType.GRASS, {
      speedMultiplier: 1.0,
      energyCostMultiplier: 1.0,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: 0,
      passable: true,
      providesShelter: false,
      temperature: 0.0,
      visibilityModifier: 1.0,
    });

    // Water - slows movement, can drown
    this.terrainProperties.set(TerrainType.WATER, {
      speedMultiplier: 0.5,
      energyCostMultiplier: 1.5,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: -1,
      passable: true,
      providesShelter: false,
      temperature: -0.3,
      visibilityModifier: 0.8,
      specialEffects: [
        {
          type: "drowning",
          probability: 0.1,
          duration: 5,
          magnitude: 2,
          properties: { damagePerTick: 2 },
        },
      ],
    });

    // Sand - slightly slower movement
    this.terrainProperties.set(TerrainType.SAND, {
      speedMultiplier: 0.8,
      energyCostMultiplier: 1.2,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: 0,
      passable: true,
      providesShelter: false,
      temperature: 0.4,
      visibilityModifier: 1.2,
    });

    // Rock - impassable or very slow
    this.terrainProperties.set(TerrainType.ROCK, {
      speedMultiplier: 0.3,
      energyCostMultiplier: 2.0,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: 0,
      passable: true,
      providesShelter: true,
      temperature: 0.0,
      visibilityModifier: 0.6,
    });

    // Mud - very slow movement
    this.terrainProperties.set(TerrainType.MUD, {
      speedMultiplier: 0.4,
      energyCostMultiplier: 1.8,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: -0.5,
      passable: true,
      providesShelter: false,
      temperature: -0.2,
      visibilityModifier: 0.7,
      specialEffects: [
        {
          type: "stuck",
          probability: 0.05,
          duration: 3,
          magnitude: 0.5,
          properties: { speedReduction: 0.5 },
        },
      ],
    });

    // Ice - fast but slippery
    this.terrainProperties.set(TerrainType.ICE, {
      speedMultiplier: 1.3,
      energyCostMultiplier: 0.8,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: -2,
      passable: true,
      providesShelter: false,
      temperature: -0.8,
      visibilityModifier: 1.1,
      specialEffects: [
        {
          type: "slipping",
          probability: 0.15,
          duration: 2,
          magnitude: 1,
          properties: { randomMovement: true },
        },
      ],
    });

    // Lava - extremely dangerous
    this.terrainProperties.set(TerrainType.LAVA, {
      speedMultiplier: 0.2,
      energyCostMultiplier: 3.0,
      damagePerTick: 10,
      healingPerTick: 0,
      energyPerTick: -5,
      passable: true,
      providesShelter: false,
      temperature: 1.0,
      visibilityModifier: 0.5,
      specialEffects: [
        {
          type: "burning",
          probability: 0.8,
          duration: 10,
          magnitude: 3,
          properties: { damagePerTick: 3 },
        },
      ],
    });

    // Forest - provides shelter, moderate movement
    this.terrainProperties.set(TerrainType.FOREST, {
      speedMultiplier: 0.7,
      energyCostMultiplier: 1.1,
      damagePerTick: 0,
      healingPerTick: 0.5,
      energyPerTick: 0,
      passable: true,
      providesShelter: true,
      temperature: -0.1,
      visibilityModifier: 0.6,
    });

    // Swamp - slow, draining
    this.terrainProperties.set(TerrainType.SWAMP, {
      speedMultiplier: 0.3,
      energyCostMultiplier: 2.2,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: -2,
      passable: true,
      providesShelter: false,
      temperature: 0.2,
      visibilityModifier: 0.5,
      specialEffects: [
        {
          type: "disease",
          probability: 0.02,
          duration: 20,
          magnitude: 1,
          properties: { energyDrainMultiplier: 1.5 },
        },
      ],
    });

    // Mountain - very slow, high energy cost
    this.terrainProperties.set(TerrainType.MOUNTAIN, {
      speedMultiplier: 0.2,
      energyCostMultiplier: 2.5,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: -1,
      passable: true,
      providesShelter: true,
      temperature: -0.6,
      visibilityModifier: 1.5,
    });

    // Cave - shelter, hidden
    this.terrainProperties.set(TerrainType.CAVE, {
      speedMultiplier: 0.8,
      energyCostMultiplier: 1.0,
      damagePerTick: 0,
      healingPerTick: 1,
      energyPerTick: 0,
      passable: true,
      providesShelter: true,
      temperature: -0.3,
      visibilityModifier: 0.3,
    });

    // Healing spring - beneficial terrain
    this.terrainProperties.set(TerrainType.HEALING_SPRING, {
      speedMultiplier: 0.9,
      energyCostMultiplier: 0.8,
      damagePerTick: 0,
      healingPerTick: 3,
      energyPerTick: 2,
      passable: true,
      providesShelter: false,
      temperature: 0.1,
      visibilityModifier: 1.0,
      specialEffects: [
        {
          type: "regeneration",
          probability: 0.3,
          duration: 15,
          magnitude: 2,
          properties: { healingBonus: 2 },
        },
      ],
    });

    // Energy drain - harmful terrain
    this.terrainProperties.set(TerrainType.ENERGY_DRAIN, {
      speedMultiplier: 0.6,
      energyCostMultiplier: 1.5,
      damagePerTick: 0,
      healingPerTick: 0,
      energyPerTick: -4,
      passable: true,
      providesShelter: false,
      temperature: 0.0,
      visibilityModifier: 0.8,
      specialEffects: [
        {
          type: "exhaustion",
          probability: 0.2,
          duration: 10,
          magnitude: 1.5,
          properties: { energyCostIncrease: 0.5 },
        },
      ],
    });

    // Quicksand - trapping terrain
    this.terrainProperties.set(TerrainType.QUICKSAND, {
      speedMultiplier: 0.1,
      energyCostMultiplier: 4.0,
      damagePerTick: 1,
      healingPerTick: 0,
      energyPerTick: -3,
      passable: true,
      providesShelter: false,
      temperature: 0.3,
      visibilityModifier: 1.0,
      specialEffects: [
        {
          type: "trapped",
          probability: 0.4,
          duration: 8,
          magnitude: 2,
          properties: { movementBlocked: true },
        },
      ],
    });

    // Thorns - damaging vegetation
    this.terrainProperties.set(TerrainType.THORNS, {
      speedMultiplier: 0.5,
      energyCostMultiplier: 1.3,
      damagePerTick: 2,
      healingPerTick: 0,
      energyPerTick: 0,
      passable: true,
      providesShelter: false,
      temperature: 0.0,
      visibilityModifier: 0.8,
      specialEffects: [
        {
          type: "bleeding",
          probability: 0.25,
          duration: 5,
          magnitude: 1,
          properties: { damagePerTick: 1 },
        },
      ],
    });
  }

  /**
   * Set terrain at a specific position
   */
  setTerrain(position: Position, terrainType: TerrainType): void {
    const key = this.getPositionKey(position);
    const properties = this.terrainProperties.get(terrainType);

    if (!properties) {
      throw new Error(`Unknown terrain type: ${terrainType}`);
    }

    this.terrainGrid.set(key, {
      position: { ...position },
      terrainType,
      properties: { ...properties },
      occupants: new Set(),
      lastUpdate: 0,
    });
  }

  /**
   * Get terrain at a specific position
   */
  getTerrain(position: Position): TerrainCell | undefined {
    const key = this.getPositionKey(position);
    return this.terrainGrid.get(key);
  }

  /**
   * Get terrain type at a specific position
   */
  getTerrainType(position: Position): TerrainType {
    const terrain = this.getTerrain(position);
    return terrain?.terrainType || TerrainType.GRASS;
  }

  /**
   * Apply terrain effects to a creature
   */
  applyTerrainEffects(
    creature: ICreature,
    deltaTime: number
  ): InteractionResult {
    if (!this.config.enableTerrainEffects) {
      return { success: false, energyChange: 0 };
    }

    // Check cooldown
    const cooldownKey = `${creature.id}_terrain`;
    const lastApplication = this.entityCooldowns.get(cooldownKey) || 0;
    const currentTime = Date.now();

    if (currentTime - lastApplication < this.config.effectCooldown * 1000) {
      return { success: false, energyChange: 0, failureReason: "On cooldown" };
    }

    const terrain = this.getTerrain(creature.position);
    if (!terrain) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "No terrain data",
      };
    }

    // Update terrain occupancy
    terrain.occupants.add(creature.id);

    const properties = terrain.properties;
    let totalEnergyChange = 0;
    let totalDamage = 0;
    let totalHealing = 0;
    const statusEffects: StatusEffect[] = [];

    // Apply base terrain effects
    totalEnergyChange +=
      properties.energyPerTick * deltaTime * this.config.effectMultiplier;
    totalDamage +=
      properties.damagePerTick * deltaTime * this.config.effectMultiplier;
    totalHealing +=
      properties.healingPerTick * deltaTime * this.config.effectMultiplier;

    // Apply special effects
    if (properties.specialEffects) {
      for (const effect of properties.specialEffects) {
        if (Math.random() < effect.probability * deltaTime) {
          statusEffects.push({
            type: effect.type,
            duration: effect.duration,
            magnitude: effect.magnitude * this.config.effectMultiplier,
            properties: effect.properties,
          });
        }
      }
    }

    // Apply damage/healing to creature
    if (totalDamage > 0) {
      creature.energy = Math.max(0, creature.energy - totalDamage);
    }

    if (totalHealing > 0) {
      const config = creature.getConfig() as any;
      const maxEnergy = config?.maxEnergy || 100;
      creature.energy = Math.min(maxEnergy, creature.energy + totalHealing);
    }

    // Create memory entry
    const memoryEntry: MemoryEntry = {
      interactionType: InteractionType.TERRAIN_EFFECT,
      entityId: `terrain_${terrain.terrainType}`,
      entityType: EntityType.UNKNOWN,
      outcome: totalEnergyChange >= 0 ? "success" : "failure",
      tick: currentTime,
      context: {
        terrainType: terrain.terrainType,
        energyChange: totalEnergyChange,
        damage: totalDamage,
        healing: totalHealing,
        statusEffects: statusEffects.length,
      },
    };

    // Record interaction history
    if (this.config.trackHistory) {
      this.recordTerrainInteraction(creature.id, {
        terrainType: terrain.terrainType,
        position: { ...creature.position },
        effects: {
          energyChange: totalEnergyChange,
          damage: totalDamage,
          healing: totalHealing,
          statusEffects: statusEffects.length,
        },
        timestamp: currentTime,
      });
    }

    // Set cooldown
    this.entityCooldowns.set(cooldownKey, currentTime);

    return {
      success: true,
      energyChange: totalEnergyChange,
      damageDealt: 0,
      damageReceived: totalDamage,
      statusEffects: statusEffects.length > 0 ? statusEffects : undefined,
      memoryEntry,
      effects: {
        terrainType: terrain.terrainType,
        healing: totalHealing,
        temperature: properties.temperature,
        shelter: properties.providesShelter,
      },
    };
  }

  /**
   * Get movement modifier for terrain
   */
  getMovementModifier(position: Position): {
    speedMultiplier: number;
    energyCostMultiplier: number;
  } {
    const terrain = this.getTerrain(position);
    if (!terrain) {
      return { speedMultiplier: 1.0, energyCostMultiplier: 1.0 };
    }

    return {
      speedMultiplier: terrain.properties.speedMultiplier,
      energyCostMultiplier: terrain.properties.energyCostMultiplier,
    };
  }

  /**
   * Check if position is passable
   */
  isPassable(position: Position): boolean {
    const terrain = this.getTerrain(position);
    return terrain?.properties.passable ?? true;
  }

  /**
   * Check if position provides shelter
   */
  providesShelter(position: Position): boolean {
    const terrain = this.getTerrain(position);
    return terrain?.properties.providesShelter ?? false;
  }

  /**
   * Get visibility modifier for position
   */
  getVisibilityModifier(position: Position): number {
    const terrain = this.getTerrain(position);
    return terrain?.properties.visibilityModifier ?? 1.0;
  }

  /**
   * Get temperature at position
   */
  getTemperature(position: Position): number {
    const terrain = this.getTerrain(position);
    return terrain?.properties.temperature ?? 0.0;
  }

  /**
   * Update terrain occupancy
   */
  updateOccupancy(
    entityId: string,
    oldPosition: Position,
    newPosition: Position
  ): void {
    // Remove from old position
    const oldTerrain = this.getTerrain(oldPosition);
    if (oldTerrain) {
      oldTerrain.occupants.delete(entityId);
    }

    // Add to new position
    const newTerrain = this.getTerrain(newPosition);
    if (newTerrain) {
      newTerrain.occupants.add(entityId);
    }
  }

  /**
   * Get entities on terrain at position
   */
  getOccupants(position: Position): string[] {
    const terrain = this.getTerrain(position);
    return terrain ? Array.from(terrain.occupants) : [];
  }

  /**
   * Record terrain interaction in history
   */
  private recordTerrainInteraction(
    entityId: string,
    record: TerrainInteractionRecord
  ): void {
    if (!this.interactionHistory.has(entityId)) {
      this.interactionHistory.set(entityId, []);
    }

    const history = this.interactionHistory.get(entityId)!;
    history.push(record);

    // Keep only last 100 interactions
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Get terrain interaction history for an entity
   */
  getTerrainHistory(entityId: string): TerrainInteractionRecord[] {
    return this.interactionHistory.get(entityId) || [];
  }

  /**
   * Generate position key for terrain grid
   */
  private getPositionKey(position: Position): string {
    return `${Math.floor(position.x)},${Math.floor(position.y)}`;
  }

  /**
   * Get terrain properties for a terrain type
   */
  getTerrainProperties(
    terrainType: TerrainType
  ): TerrainProperties | undefined {
    return this.terrainProperties.get(terrainType);
  }

  /**
   * Update terrain properties
   */
  updateTerrainProperties(
    terrainType: TerrainType,
    properties: Partial<TerrainProperties>
  ): void {
    const existing = this.terrainProperties.get(terrainType);
    if (existing) {
      this.terrainProperties.set(terrainType, { ...existing, ...properties });
    }
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<TerrainInteractionConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TerrainInteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get statistics about the terrain system
   */
  getStatistics() {
    const totalCells = this.terrainGrid.size;
    const terrainTypeDistribution = new Map<TerrainType, number>();
    const occupancyStats = { totalOccupants: 0, occupiedCells: 0 };

    for (const cell of this.terrainGrid.values()) {
      const count = terrainTypeDistribution.get(cell.terrainType) || 0;
      terrainTypeDistribution.set(cell.terrainType, count + 1);

      if (cell.occupants.size > 0) {
        occupancyStats.occupiedCells++;
        occupancyStats.totalOccupants += cell.occupants.size;
      }
    }

    return {
      totalCells,
      terrainTypeDistribution,
      occupancyStats,
      interactionHistoryEntries: Array.from(
        this.interactionHistory.values()
      ).reduce((sum, history) => sum + history.length, 0),
    };
  }

  /**
   * Reset the terrain system
   */
  reset(): void {
    this.terrainGrid.clear();
    this.entityCooldowns.clear();
    this.interactionHistory.clear();
  }
}

/**
 * Terrain interaction record for history tracking
 */
interface TerrainInteractionRecord {
  terrainType: TerrainType;
  position: Position;
  effects: {
    energyChange: number;
    damage: number;
    healing: number;
    statusEffects: number;
  };
  timestamp: number;
}
