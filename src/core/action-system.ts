/**
 * Action System for Creature Interactions
 *
 * This module handles the execution of creature actions, conflict resolution,
 * and feedback generation for neural network learning.
 */

import {
  CreatureAction,
  ActionResult,
  ActionConflict,
  ActionFeedback,
  EntityType,
  ICreatureConfig,
} from "./creature-types";
import { ICreature } from "./interfaces";

/**
 * Interface for world interaction during action execution
 */
export interface IWorldContext {
  /** Get entity type at a specific position */
  getEntityAt(x: number, y: number): EntityType;

  /** Get creatures at a specific position */
  getCreaturesAt(x: number, y: number): ICreature[];

  /** Check if position is valid and passable */
  isValidPosition(x: number, y: number): boolean;

  /** Get signal strength at a position */
  getSignalAt(x: number, y: number): number;

  /** Set signal strength at a position */
  setSignalAt(x: number, y: number, strength: number): void;

  /** Remove entity from position (for consumption) */
  removeEntityAt(x: number, y: number, entityType: EntityType): boolean;

  /** Get world dimensions */
  getDimensions(): { width: number; height: number };
}

/**
 * Action system for handling creature actions and interactions
 */
export class ActionSystem {
  private _worldContext: IWorldContext;
  private _pendingActions: Map<
    string,
    { creature: ICreature; action: CreatureAction }
  > = new Map();
  private _actionHistory: Map<string, ActionFeedback[]> = new Map();

  constructor(worldContext: IWorldContext) {
    this._worldContext = worldContext;
  }

  /**
   * Queue an action for a creature
   */
  queueAction(creature: ICreature, action: CreatureAction): void {
    this._pendingActions.set(creature.id, { creature, action });
  }

  /**
   * Process all queued actions and resolve conflicts
   */
  processActions(): Map<string, ActionResult> {
    const results = new Map<string, ActionResult>();
    const conflicts = this.detectConflicts();
    const actionData = new Map<
      string,
      { creature: ICreature; action: CreatureAction }
    >();

    // Store action data before processing for feedback generation
    for (const [creatureId, data] of this._pendingActions) {
      actionData.set(creatureId, data);
    }

    // Resolve conflicts first
    for (const conflict of conflicts) {
      const conflictResults = this.resolveConflict(conflict);
      for (const [creatureId, result] of conflictResults) {
        results.set(creatureId, result);
        this._pendingActions.delete(creatureId);
      }
    }

    // Process remaining non-conflicting actions
    for (const [creatureId, { creature, action }] of this._pendingActions) {
      if (!results.has(creatureId)) {
        const result = this.executeAction(creature, action);
        results.set(creatureId, result);
      }
    }

    // Clear pending actions
    this._pendingActions.clear();

    // Generate feedback for learning
    this.generateFeedback(results, actionData);

    return results;
  }

  /**
   * Execute a single action for a creature
   */
  executeAction(creature: ICreature, action: CreatureAction): ActionResult {
    const config = creature.getConfig() as ICreatureConfig;
    const energyCosts = config.energyCosts;

    switch (action) {
      case CreatureAction.MOVE_NORTH:
        return this.executeMovement(creature, 0, -1, energyCosts.movement);

      case CreatureAction.MOVE_SOUTH:
        return this.executeMovement(creature, 0, 1, energyCosts.movement);

      case CreatureAction.MOVE_EAST:
        return this.executeMovement(creature, 1, 0, energyCosts.movement);

      case CreatureAction.MOVE_WEST:
        return this.executeMovement(creature, -1, 0, energyCosts.movement);

      case CreatureAction.MOVE_NORTHEAST:
        return this.executeMovement(
          creature,
          1,
          -1,
          energyCosts.diagonalMovement
        );

      case CreatureAction.MOVE_NORTHWEST:
        return this.executeMovement(
          creature,
          -1,
          -1,
          energyCosts.diagonalMovement
        );

      case CreatureAction.MOVE_SOUTHEAST:
        return this.executeMovement(
          creature,
          1,
          1,
          energyCosts.diagonalMovement
        );

      case CreatureAction.MOVE_SOUTHWEST:
        return this.executeMovement(
          creature,
          -1,
          1,
          energyCosts.diagonalMovement
        );

      case CreatureAction.REST:
        return this.executeRest(creature, energyCosts.rest);

      case CreatureAction.SLEEP:
        return this.executeSleep(creature, energyCosts.sleep);

      case CreatureAction.EMIT_SIGNAL:
        return this.executeEmitSignal(creature, energyCosts.emitSignal);

      case CreatureAction.EAT:
        return this.executeEat(creature, energyCosts.eat);

      case CreatureAction.DRINK:
        return this.executeDrink(creature, energyCosts.drink);

      case CreatureAction.GATHER:
        return this.executeGather(creature, energyCosts.gather);

      case CreatureAction.ATTACK:
        return this.executeAttack(creature, energyCosts.attack);

      case CreatureAction.DEFEND:
        return this.executeDefend(creature, energyCosts.defend);

      default:
        return {
          success: false,
          energyChange: 0,
          failureReason: `Unknown action: ${action}`,
        };
    }
  }

  /**
   * Execute movement action
   */
  private executeMovement(
    creature: ICreature,
    dx: number,
    dy: number,
    energyCost: number
  ): ActionResult {
    const currentPos = creature.position;
    const newX = currentPos.x + dx;
    const newY = currentPos.y + dy;

    // Check if new position is valid
    if (!this._worldContext.isValidPosition(newX, newY)) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Invalid position - out of bounds or blocked",
      };
    }

    // Check for other creatures at target position
    const creaturesAtTarget = this._worldContext.getCreaturesAt(newX, newY);
    if (creaturesAtTarget.length > 0) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Position occupied by another creature",
      };
    }

    // Execute movement
    creature.position = { x: newX, y: newY };
    creature.energy -= energyCost;

    return {
      success: true,
      energyChange: -energyCost,
    };
  }

  /**
   * Execute rest action
   */
  private executeRest(creature: ICreature, energyGain: number): ActionResult {
    creature.energy -= energyGain; // energyGain is negative, so this adds energy

    return {
      success: true,
      energyChange: -energyGain,
    };
  }

  /**
   * Execute sleep action (higher energy gain but more vulnerable)
   */
  private executeSleep(creature: ICreature, energyGain: number): ActionResult {
    creature.energy -= energyGain; // energyGain is negative, so this adds energy

    return {
      success: true,
      energyChange: -energyGain,
    };
  }

  /**
   * Execute signal emission
   */
  private executeEmitSignal(
    creature: ICreature,
    energyCost: number
  ): ActionResult {
    const position = creature.position;
    const signalStrength = creature.getBroadcastSignal();

    // Set signal in world
    this._worldContext.setSignalAt(position.x, position.y, signalStrength);

    creature.energy -= energyCost;

    return {
      success: true,
      energyChange: -energyCost,
      effects: {
        signalEmitted: signalStrength,
      },
    };
  }

  /**
   * Execute eat action
   */
  private executeEat(creature: ICreature, energyGain: number): ActionResult {
    const position = creature.position;
    const entityAtPosition = this._worldContext.getEntityAt(
      position.x,
      position.y
    );

    if (entityAtPosition !== EntityType.FOOD) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "No food available at current position",
      };
    }

    // Consume food
    const consumed = this._worldContext.removeEntityAt(
      position.x,
      position.y,
      EntityType.FOOD
    );
    if (!consumed) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Failed to consume food",
      };
    }

    creature.energy -= energyGain; // energyGain is negative, so this adds energy

    return {
      success: true,
      energyChange: -energyGain,
    };
  }

  /**
   * Execute drink action
   */
  private executeDrink(creature: ICreature, energyGain: number): ActionResult {
    const position = creature.position;
    const entityAtPosition = this._worldContext.getEntityAt(
      position.x,
      position.y
    );

    if (entityAtPosition !== EntityType.WATER) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "No water available at current position",
      };
    }

    // Water doesn't get consumed, just provides energy
    creature.energy -= energyGain; // energyGain is negative, so this adds energy

    return {
      success: true,
      energyChange: -energyGain,
    };
  }

  /**
   * Execute gather action
   */
  private executeGather(creature: ICreature, energyCost: number): ActionResult {
    const position = creature.position;
    const entityAtPosition = this._worldContext.getEntityAt(
      position.x,
      position.y
    );

    if (entityAtPosition !== EntityType.MINERAL) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "No resources available at current position",
      };
    }

    // Consume mineral
    const gathered = this._worldContext.removeEntityAt(
      position.x,
      position.y,
      EntityType.MINERAL
    );
    if (!gathered) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "Failed to gather resources",
      };
    }

    creature.energy -= energyCost;

    return {
      success: true,
      energyChange: -energyCost,
      effects: {
        resourcesGathered: 1,
      },
    };
  }

  /**
   * Execute attack action
   */
  private executeAttack(creature: ICreature, energyCost: number): ActionResult {
    const nearbyCreatures = this.getNearbyCreatures(creature, 1);

    if (nearbyCreatures.length === 0) {
      return {
        success: false,
        energyChange: 0,
        failureReason: "No creatures nearby to attack",
      };
    }

    // Attack the first nearby creature
    const target = nearbyCreatures[0];
    const damage = 0.1; // Fixed damage for now

    target.energy -= damage;
    creature.energy -= energyCost;

    return {
      success: true,
      energyChange: -energyCost,
      effects: {
        damageDealt: damage,
      },
    };
  }

  /**
   * Execute defend action
   */
  private executeDefend(creature: ICreature, energyCost: number): ActionResult {
    creature.energy -= energyCost;

    return {
      success: true,
      energyChange: -energyCost,
    };
  }

  /**
   * Detect conflicts between pending actions
   */
  private detectConflicts(): ActionConflict[] {
    const conflicts: ActionConflict[] = [];
    const positionMap = new Map<
      string,
      { creature: ICreature; action: CreatureAction }[]
    >();

    // Group actions by target position
    for (const [, { creature, action }] of this._pendingActions) {
      const targetPos = this.getActionTargetPosition(creature, action);
      const posKey = `${targetPos.x},${targetPos.y}`;

      if (!positionMap.has(posKey)) {
        positionMap.set(posKey, []);
      }
      positionMap.get(posKey)!.push({ creature, action });
    }

    // Detect conflicts
    for (const [posKey, actionsAtPos] of positionMap) {
      if (actionsAtPos.length > 1) {
        const [x, y] = posKey.split(",").map(Number);
        const conflictType = this.determineConflictType(
          actionsAtPos.map((a) => a.action)
        );

        conflicts.push({
          creatures: actionsAtPos.map((a) => a.creature.id),
          actions: actionsAtPos.map((a) => a.action),
          position: { x, y },
          conflictType,
        });
      }
    }

    return conflicts;
  }

  /**
   * Get target position for an action
   */
  private getActionTargetPosition(
    creature: ICreature,
    action: CreatureAction
  ): { x: number; y: number } {
    const pos = creature.position;

    switch (action) {
      case CreatureAction.MOVE_NORTH:
        return { x: pos.x, y: pos.y - 1 };
      case CreatureAction.MOVE_SOUTH:
        return { x: pos.x, y: pos.y + 1 };
      case CreatureAction.MOVE_EAST:
        return { x: pos.x + 1, y: pos.y };
      case CreatureAction.MOVE_WEST:
        return { x: pos.x - 1, y: pos.y };
      case CreatureAction.MOVE_NORTHEAST:
        return { x: pos.x + 1, y: pos.y - 1 };
      case CreatureAction.MOVE_NORTHWEST:
        return { x: pos.x - 1, y: pos.y - 1 };
      case CreatureAction.MOVE_SOUTHEAST:
        return { x: pos.x + 1, y: pos.y + 1 };
      case CreatureAction.MOVE_SOUTHWEST:
        return { x: pos.x - 1, y: pos.y + 1 };
      default:
        return pos; // Non-movement actions target current position
    }
  }

  /**
   * Determine conflict type based on actions
   */
  private determineConflictType(
    actions: CreatureAction[]
  ): ActionConflict["conflictType"] {
    const hasMovement = actions.some((a) => a.toString().startsWith("move_"));
    const hasCombat = actions.some(
      (a) => a === CreatureAction.ATTACK || a === CreatureAction.DEFEND
    );
    const hasResource = actions.some(
      (a) =>
        a === CreatureAction.EAT ||
        a === CreatureAction.DRINK ||
        a === CreatureAction.GATHER
    );
    const hasComm = actions.some((a) => a === CreatureAction.EMIT_SIGNAL);

    if (hasCombat) return "combat";
    if (hasResource) return "resource";
    if (hasComm) return "communication";
    if (hasMovement) return "movement";

    return "movement"; // Default
  }

  /**
   * Resolve conflicts between creatures
   */
  private resolveConflict(conflict: ActionConflict): Map<string, ActionResult> {
    const results = new Map<string, ActionResult>();

    switch (conflict.conflictType) {
      case "movement":
        return this.resolveMovementConflict(conflict);
      case "resource":
        return this.resolveResourceConflict(conflict);
      case "combat":
        return this.resolveCombatConflict(conflict);
      case "communication":
        return this.resolveCommunicationConflict(conflict);
      default:
        // Default: first creature wins
        for (let i = 0; i < conflict.creatures.length; i++) {
          const creatureId = conflict.creatures[i];
          const action = conflict.actions[i];
          const creature = this._pendingActions.get(creatureId)?.creature;

          if (creature) {
            if (i === 0) {
              results.set(creatureId, this.executeAction(creature, action));
            } else {
              results.set(creatureId, {
                success: false,
                energyChange: 0,
                failureReason: "Action blocked by conflict",
              });
            }
          }
        }
        return results;
    }
  }

  /**
   * Resolve movement conflicts (first creature wins)
   */
  private resolveMovementConflict(
    conflict: ActionConflict
  ): Map<string, ActionResult> {
    const results = new Map<string, ActionResult>();

    for (let i = 0; i < conflict.creatures.length; i++) {
      const creatureId = conflict.creatures[i];
      const action = conflict.actions[i];
      const creature = this._pendingActions.get(creatureId)?.creature;

      if (creature) {
        if (i === 0) {
          // First creature gets to move
          results.set(creatureId, this.executeAction(creature, action));
        } else {
          // Others are blocked
          results.set(creatureId, {
            success: false,
            energyChange: 0,
            failureReason: "Movement blocked by another creature",
          });
        }
      }
    }

    return results;
  }

  /**
   * Resolve resource conflicts (first creature wins)
   */
  private resolveResourceConflict(
    conflict: ActionConflict
  ): Map<string, ActionResult> {
    const results = new Map<string, ActionResult>();

    for (let i = 0; i < conflict.creatures.length; i++) {
      const creatureId = conflict.creatures[i];
      const action = conflict.actions[i];
      const creature = this._pendingActions.get(creatureId)?.creature;

      if (creature) {
        if (i === 0) {
          // First creature gets the resource
          results.set(creatureId, this.executeAction(creature, action));
        } else {
          // Others find no resource
          results.set(creatureId, {
            success: false,
            energyChange: 0,
            failureReason: "Resource already consumed by another creature",
          });
        }
      }
    }

    return results;
  }

  /**
   * Resolve combat conflicts
   */
  private resolveCombatConflict(
    conflict: ActionConflict
  ): Map<string, ActionResult> {
    const results = new Map<string, ActionResult>();

    // For now, all combat actions execute simultaneously
    for (let i = 0; i < conflict.creatures.length; i++) {
      const creatureId = conflict.creatures[i];
      const action = conflict.actions[i];
      const creature = this._pendingActions.get(creatureId)?.creature;

      if (creature) {
        results.set(creatureId, this.executeAction(creature, action));
      }
    }

    return results;
  }

  /**
   * Resolve communication conflicts (all signals combine)
   */
  private resolveCommunicationConflict(
    conflict: ActionConflict
  ): Map<string, ActionResult> {
    const results = new Map<string, ActionResult>();

    // All creatures can emit signals simultaneously
    for (let i = 0; i < conflict.creatures.length; i++) {
      const creatureId = conflict.creatures[i];
      const action = conflict.actions[i];
      const creature = this._pendingActions.get(creatureId)?.creature;

      if (creature) {
        results.set(creatureId, this.executeAction(creature, action));
      }
    }

    return results;
  }

  /**
   * Generate feedback for neural network learning
   */
  private generateFeedback(
    results: Map<string, ActionResult>,
    actionData: Map<string, { creature: ICreature; action: CreatureAction }>
  ): void {
    for (const [creatureId, result] of results) {
      const data = actionData.get(creatureId);
      if (!data) continue;

      const { creature, action } = data;
      const nearbyEntities = this.getNearbyEntities(creature, 1);
      const nearbySignals = this.getNearbySignals(creature, 1);

      const feedback: ActionFeedback = {
        action,
        result,
        context: {
          energyBefore: creature.energy - result.energyChange,
          nearbyEntities,
          nearbySignals,
        },
        reward: this.calculateReward(result, action),
      };

      // Store feedback for learning
      if (!this._actionHistory.has(creatureId)) {
        this._actionHistory.set(creatureId, []);
      }
      this._actionHistory.get(creatureId)!.push(feedback);

      // Keep only recent feedback (last 10 actions)
      const history = this._actionHistory.get(creatureId)!;
      if (history.length > 10) {
        history.shift();
      }
    }
  }

  /**
   * Calculate reward signal for action feedback
   */
  private calculateReward(
    result: ActionResult,
    action: CreatureAction
  ): number {
    if (!result.success) {
      return -0.1; // Small negative reward for failed actions
    }

    // Positive reward for energy gain, negative for energy loss
    let reward = result.energyChange * 0.5;

    // Bonus rewards for specific successful actions
    switch (action) {
      case CreatureAction.EAT:
      case CreatureAction.DRINK:
        reward += 0.2; // Bonus for successful feeding
        break;
      case CreatureAction.GATHER:
        reward += 0.1; // Bonus for resource gathering
        break;
      case CreatureAction.ATTACK:
        if (result.effects?.damageDealt) {
          reward += result.effects.damageDealt; // Reward proportional to damage
        }
        break;
    }

    return Math.max(-1.0, Math.min(1.0, reward)); // Clamp to [-1, 1]
  }

  /**
   * Get nearby creatures within specified range
   */
  private getNearbyCreatures(creature: ICreature, range: number): ICreature[] {
    const nearby: ICreature[] = [];
    const pos = creature.position;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip self

        const x = pos.x + dx;
        const y = pos.y + dy;

        if (this._worldContext.isValidPosition(x, y)) {
          const creaturesAtPos = this._worldContext.getCreaturesAt(x, y);
          nearby.push(...creaturesAtPos);
        }
      }
    }

    return nearby;
  }

  /**
   * Get nearby entity types within specified range
   */
  private getNearbyEntities(creature: ICreature, range: number): EntityType[] {
    const nearby: EntityType[] = [];
    const pos = creature.position;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;

        if (this._worldContext.isValidPosition(x, y)) {
          const entity = this._worldContext.getEntityAt(x, y);
          if (entity !== EntityType.EMPTY) {
            nearby.push(entity);
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Get nearby signal strengths within specified range
   */
  private getNearbySignals(creature: ICreature, range: number): number[] {
    const nearby: number[] = [];
    const pos = creature.position;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;

        if (this._worldContext.isValidPosition(x, y)) {
          const signal = this._worldContext.getSignalAt(x, y);
          if (signal > 0) {
            nearby.push(signal);
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Get action feedback history for a creature
   */
  getActionHistory(creatureId: string): ActionFeedback[] {
    return this._actionHistory.get(creatureId) || [];
  }

  /**
   * Clear action history for a creature
   */
  clearActionHistory(creatureId: string): void {
    this._actionHistory.delete(creatureId);
  }
}
