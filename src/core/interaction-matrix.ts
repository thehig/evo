/**
 * Interaction Matrix Framework
 *
 * This module provides the core framework for managing interactions between
 * creatures and their environment, including combat, feeding, reproduction,
 * and communication.
 */

import { IEntity, ICreature } from "./interfaces";
import { EntityType, CreatureAction } from "./creature-types";
import { Position } from "../world/types";

/**
 * Types of interactions that can occur
 */
export enum InteractionType {
  COMBAT = "combat",
  FEEDING = "feeding",
  REPRODUCTION = "reproduction",
  COMMUNICATION = "communication",
  RESOURCE_GATHERING = "resource_gathering",
  TERRAIN_EFFECT = "terrain_effect",
}

/**
 * Status effects that can be applied to entities
 */
export interface StatusEffect {
  /** Type of status effect */
  type: string;

  /** Duration in ticks */
  duration: number;

  /** Magnitude of the effect */
  magnitude: number;

  /** Additional properties */
  properties?: Record<string, any>;
}

/**
 * Memory entry for significant interactions
 */
export interface MemoryEntry {
  /** Type of interaction */
  interactionType: InteractionType;

  /** Entity involved in the interaction */
  entityId: string;

  /** Entity type involved */
  entityType: EntityType;

  /** Outcome of the interaction */
  outcome: "success" | "failure" | "neutral";

  /** Tick when interaction occurred */
  tick: number;

  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Result of an interaction
 */
export interface InteractionResult {
  /** Whether the interaction was successful */
  success: boolean;

  /** Energy change for initiator */
  energyChange: number;

  /** Damage dealt to target */
  damageDealt?: number;

  /** Damage received by initiator */
  damageReceived?: number;

  /** Resources gathered */
  resourcesGathered?: number;

  /** Status effects applied */
  statusEffects?: StatusEffect[];

  /** Memory entry to record */
  memoryEntry?: MemoryEntry;

  /** Additional effects */
  effects?: Record<string, any>;

  /** Reason for failure if unsuccessful */
  failureReason?: string;
}

/**
 * Conditions for an interaction to occur
 */
export interface InteractionConditions {
  /** Minimum energy required for initiator */
  minEnergy?: number;

  /** Maximum energy allowed for initiator */
  maxEnergy?: number;

  /** Required entity states */
  requiredStates?: string[];

  /** Forbidden entity states */
  forbiddenStates?: string[];

  /** Custom condition function */
  customCondition?: (
    initiator: IEntity,
    target: IEntity,
    context: any
  ) => boolean;
}

/**
 * Rule defining how entities interact
 */
export interface InteractionRule {
  /** Unique identifier for this rule */
  id: string;

  /** Type of interaction */
  type: InteractionType;

  /** Priority (higher numbers execute first) */
  priority: number;

  /** Maximum range for this interaction */
  range: number;

  /** Cooldown period in ticks */
  cooldown: number;

  /** Energy cost for initiator */
  energyCost: number;

  /** Conditions that must be met */
  conditions: InteractionConditions;

  /** Function to execute the interaction */
  execute: (
    initiator: IEntity,
    target: IEntity,
    context: any
  ) => InteractionResult;
}

/**
 * Event data for interaction events
 */
export interface InteractionEventData {
  /** Entity that initiated the interaction */
  initiator: IEntity;

  /** Target entity */
  target: IEntity;

  /** Type of interaction */
  type: InteractionType;

  /** Result of the interaction */
  result: InteractionResult;

  /** Tick when interaction occurred */
  tick: number;
}

/**
 * Configuration for the interaction matrix
 */
export interface InteractionMatrixConfig {
  /** Global range multiplier */
  rangeMultiplier: number;

  /** Global cooldown multiplier */
  cooldownMultiplier: number;

  /** Maximum interactions per entity per tick */
  maxInteractionsPerTick: number;

  /** Whether to enable interaction events */
  enableEvents: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: InteractionMatrixConfig = {
  rangeMultiplier: 1.0,
  cooldownMultiplier: 1.0,
  maxInteractionsPerTick: 3,
  enableEvents: true,
};

/**
 * Simple event emitter for interaction events
 */
class InteractionEventEmitter {
  private listeners: Map<string, ((data: InteractionEventData) => void)[]> =
    new Map();

  on(event: string, callback: (data: InteractionEventData) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: InteractionEventData): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  off(event: string, callback: (data: InteractionEventData) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

/**
 * Core interaction matrix class
 */
export class InteractionMatrix {
  private rules: Map<EntityType, Map<EntityType, InteractionRule[]>> =
    new Map();
  private cooldowns: Map<string, Map<string, number>> = new Map();
  private eventEmitter: InteractionEventEmitter = new InteractionEventEmitter();
  private config: InteractionMatrixConfig;
  private currentTick: number = 0;

  constructor(config: Partial<InteractionMatrixConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register an interaction rule between entity types
   */
  registerInteraction(
    initiatorType: EntityType,
    targetType: EntityType,
    rule: InteractionRule
  ): void {
    if (!this.rules.has(initiatorType)) {
      this.rules.set(initiatorType, new Map());
    }

    const targetRules = this.rules.get(initiatorType)!;
    if (!targetRules.has(targetType)) {
      targetRules.set(targetType, []);
    }

    targetRules.get(targetType)!.push(rule);

    // Sort by priority (higher priority first)
    targetRules.get(targetType)!.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove an interaction rule
   */
  removeInteraction(
    initiatorType: EntityType,
    targetType: EntityType,
    ruleId: string
  ): boolean {
    const targetRules = this.rules.get(initiatorType)?.get(targetType);
    if (!targetRules) return false;

    const index = targetRules.findIndex((rule) => rule.id === ruleId);
    if (index === -1) return false;

    targetRules.splice(index, 1);
    return true;
  }

  /**
   * Get all rules for a specific interaction
   */
  getRulesForInteraction(
    initiatorType: EntityType,
    targetType: EntityType
  ): InteractionRule[] {
    return this.rules.get(initiatorType)?.get(targetType) || [];
  }

  /**
   * Check if an entity is on cooldown for a specific interaction type
   */
  isOnCooldown(entityId: string, ruleId: string): boolean {
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return false;

    const cooldownEnd = entityCooldowns.get(ruleId);
    return cooldownEnd !== undefined && this.currentTick < cooldownEnd;
  }

  /**
   * Set cooldown for an entity and rule
   */
  setCooldown(entityId: string, ruleId: string, duration: number): void {
    if (!this.cooldowns.has(entityId)) {
      this.cooldowns.set(entityId, new Map());
    }

    const adjustedDuration = Math.round(
      duration * this.config.cooldownMultiplier
    );
    this.cooldowns
      .get(entityId)!
      .set(ruleId, this.currentTick + adjustedDuration);
  }

  /**
   * Process potential interactions for an entity
   */
  processInteractions(
    entity: IEntity,
    nearbyEntities: IEntity[],
    context: any = {}
  ): InteractionResult[] {
    const results: InteractionResult[] = [];
    const entityType = this.getEntityType(entity);

    if (!this.rules.has(entityType)) {
      return results;
    }

    let interactionCount = 0;
    const maxInteractions = this.config.maxInteractionsPerTick;

    for (const target of nearbyEntities) {
      if (target.id === entity.id || interactionCount >= maxInteractions) {
        continue;
      }

      const targetType = this.getEntityType(target);
      const rules = this.getRulesForInteraction(entityType, targetType);

      for (const rule of rules) {
        if (this.canInteract(entity, target, rule)) {
          const result = this.executeInteraction(entity, target, rule, context);

          if (result.success) {
            results.push(result);
            interactionCount++;

            // Set cooldown
            this.setCooldown(entity.id, rule.id, rule.cooldown);

            // Emit event if enabled
            if (this.config.enableEvents) {
              this.eventEmitter.emit("interaction", {
                initiator: entity,
                target: target,
                type: rule.type,
                result: result,
                tick: this.currentTick,
              });
            }

            break; // Only one successful interaction per target
          }
        }
      }
    }

    return results;
  }

  /**
   * Check if an interaction can occur
   */
  private canInteract(
    entity: IEntity,
    target: IEntity,
    rule: InteractionRule
  ): boolean {
    // Check cooldown
    if (this.isOnCooldown(entity.id, rule.id)) {
      return false;
    }

    // Check range
    const distance = this.calculateDistance(entity.position, target.position);
    const adjustedRange = rule.range * this.config.rangeMultiplier;
    if (distance > adjustedRange) {
      return false;
    }

    // Check energy cost (only for creatures)
    if (this.isCreature(entity)) {
      if (entity.energy < rule.energyCost) {
        return false;
      }

      // Check conditions
      const conditions = rule.conditions;

      if (
        conditions.minEnergy !== undefined &&
        entity.energy < conditions.minEnergy
      ) {
        return false;
      }

      if (
        conditions.maxEnergy !== undefined &&
        entity.energy > conditions.maxEnergy
      ) {
        return false;
      }
    }

    // Check custom condition
    if (
      rule.conditions.customCondition &&
      !rule.conditions.customCondition(entity, target, {})
    ) {
      return false;
    }

    return true;
  }

  /**
   * Execute an interaction
   */
  private executeInteraction(
    entity: IEntity,
    target: IEntity,
    rule: InteractionRule,
    context: any
  ): InteractionResult {
    try {
      const result = rule.execute(entity, target, context);

      // Apply energy cost (only for creatures)
      if (result.success && this.isCreature(entity)) {
        entity.energy = Math.max(0, entity.energy - rule.energyCost);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        energyChange: 0,
        failureReason: `Interaction execution failed: ${error}`,
      };
    }
  }

  /**
   * Check if an entity is a creature
   */
  private isCreature(entity: IEntity): entity is ICreature {
    return "energy" in entity && "brain" in entity && "genome" in entity;
  }

  /**
   * Get entity type for interaction matrix
   */
  private getEntityType(entity: IEntity): EntityType {
    // Check if it's a creature
    if (this.isCreature(entity)) {
      // For now, default to CREATURE_FRIEND
      // In a more sophisticated system, this could check species, faction, etc.
      return EntityType.CREATURE_FRIEND;
    }

    // Check for other entity types based on properties or type hints
    // This is a simplified implementation - in practice, entities would
    // have a getType() method or type property

    if ("resourceType" in entity) {
      const resourceEntity = entity as any;
      switch (resourceEntity.resourceType) {
        case "food":
          return EntityType.FOOD;
        case "water":
          return EntityType.WATER;
        case "mineral":
          return EntityType.MINERAL;
        case "shelter":
          return EntityType.SHELTER;
        default:
          return EntityType.UNKNOWN;
      }
    }

    if ("isObstacle" in entity && (entity as any).isObstacle) {
      return EntityType.OBSTACLE;
    }

    // Default to unknown for unrecognized entities
    return EntityType.UNKNOWN;
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
   * Update the current tick
   */
  updateTick(tick: number): void {
    this.currentTick = tick;

    // Clean up expired cooldowns
    this.cleanupCooldowns();
  }

  /**
   * Clean up expired cooldowns
   */
  private cleanupCooldowns(): void {
    for (const [entityId, entityCooldowns] of this.cooldowns) {
      for (const [ruleId, cooldownEnd] of entityCooldowns) {
        if (this.currentTick >= cooldownEnd) {
          entityCooldowns.delete(ruleId);
        }
      }

      if (entityCooldowns.size === 0) {
        this.cooldowns.delete(entityId);
      }
    }
  }

  /**
   * Get maximum interaction range for an entity type
   */
  getMaxInteractionRange(entityType: EntityType): number {
    let maxRange = 0;

    const entityRules = this.rules.get(entityType);
    if (entityRules) {
      for (const targetRules of entityRules.values()) {
        for (const rule of targetRules) {
          maxRange = Math.max(
            maxRange,
            rule.range * this.config.rangeMultiplier
          );
        }
      }
    }

    return maxRange;
  }

  /**
   * Register event listener
   */
  onInteraction(callback: (data: InteractionEventData) => void): void {
    this.eventEmitter.on("interaction", callback);
  }

  /**
   * Remove event listener
   */
  offInteraction(callback: (data: InteractionEventData) => void): void {
    this.eventEmitter.off("interaction", callback);
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<InteractionMatrixConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<InteractionMatrixConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get statistics about the interaction matrix
   */
  getStatistics() {
    const stats = {
      totalRules: 0,
      rulesByType: new Map<InteractionType, number>(),
      activeCooldowns: 0,
      entitiesWithCooldowns: this.cooldowns.size,
    };

    // Count rules
    for (const entityRules of this.rules.values()) {
      for (const targetRules of entityRules.values()) {
        stats.totalRules += targetRules.length;

        for (const rule of targetRules) {
          const count = stats.rulesByType.get(rule.type) || 0;
          stats.rulesByType.set(rule.type, count + 1);
        }
      }
    }

    // Count active cooldowns
    for (const entityCooldowns of this.cooldowns.values()) {
      stats.activeCooldowns += entityCooldowns.size;
    }

    return stats;
  }

  /**
   * Reset the interaction matrix
   */
  reset(): void {
    this.cooldowns.clear();
    this.currentTick = 0;
  }
}
