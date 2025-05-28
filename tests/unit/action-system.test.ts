/**
 * Action System Tests
 *
 * Tests for the creature action system including movement, special actions,
 * conflict resolution, and feedback generation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ActionSystem, IWorldContext } from "../../src/core/action-system";
import { Creature } from "../../src/core/creature";
import { NeuralNetwork } from "../../src/neural/neural-network";
import { ActivationType } from "../../src/neural/types";
import {
  CreatureAction,
  EntityType,
  DEFAULT_CREATURE_CONFIG,
  ActionResult,
} from "../../src/core/creature-types";

// Mock world context for testing
class MockWorldContext implements IWorldContext {
  private entities: Map<string, EntityType> = new Map();
  private creatures: Map<string, Creature[]> = new Map();
  private signals: Map<string, number> = new Map();
  private dimensions = { width: 10, height: 10 };

  getEntityAt(x: number, y: number): EntityType {
    const key = `${x},${y}`;
    return this.entities.get(key) || EntityType.EMPTY;
  }

  setEntityAt(x: number, y: number, entityType: EntityType): void {
    const key = `${x},${y}`;
    if (entityType === EntityType.EMPTY) {
      this.entities.delete(key);
    } else {
      this.entities.set(key, entityType);
    }
  }

  getCreaturesAt(x: number, y: number): Creature[] {
    const key = `${x},${y}`;
    return this.creatures.get(key) || [];
  }

  setCreaturesAt(x: number, y: number, creatures: Creature[]): void {
    const key = `${x},${y}`;
    if (creatures.length === 0) {
      this.creatures.delete(key);
    } else {
      this.creatures.set(key, creatures);
    }
  }

  isValidPosition(x: number, y: number): boolean {
    return (
      x >= 0 &&
      x < this.dimensions.width &&
      y >= 0 &&
      y < this.dimensions.height
    );
  }

  getSignalAt(x: number, y: number): number {
    const key = `${x},${y}`;
    return this.signals.get(key) || 0;
  }

  setSignalAt(x: number, y: number, strength: number): void {
    const key = `${x},${y}`;
    if (strength <= 0) {
      this.signals.delete(key);
    } else {
      this.signals.set(key, strength);
    }
  }

  removeEntityAt(x: number, y: number, entityType: EntityType): boolean {
    const key = `${x},${y}`;
    const currentEntity = this.entities.get(key);
    if (currentEntity === entityType) {
      this.entities.delete(key);
      return true;
    }
    return false;
  }

  getDimensions(): { width: number; height: number } {
    return { ...this.dimensions };
  }

  reset(): void {
    this.entities.clear();
    this.creatures.clear();
    this.signals.clear();
  }
}

describe("ActionSystem", () => {
  let actionSystem: ActionSystem;
  let mockWorld: MockWorldContext;
  let creature: Creature;
  let brain: NeuralNetwork;

  beforeEach(() => {
    mockWorld = new MockWorldContext();
    actionSystem = new ActionSystem(mockWorld);

    // Create a simple neural network for testing
    brain = new NeuralNetwork({
      inputSize: 10,
      hiddenLayers: [{ size: 5, activation: ActivationType.SIGMOID }],
      outputLayer: { size: 16, activation: ActivationType.SIGMOID }, // Enough outputs for all actions
    });

    // Create a test creature with reduced initial energy so it can gain energy
    const testConfig = {
      ...DEFAULT_CREATURE_CONFIG,
      initialEnergy: 0.8, // Start with 80% energy so creature can gain energy
    };
    creature = new Creature("test-creature", brain, { x: 5, y: 5 }, testConfig);
  });

  describe("Basic Action Execution", () => {
    it("should execute cardinal movement actions", () => {
      const result = actionSystem.executeAction(
        creature,
        CreatureAction.MOVE_NORTH
      );

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.movement
      );
      expect(creature.position).toEqual({ x: 5, y: 4 });
    });

    it("should execute diagonal movement actions", () => {
      const result = actionSystem.executeAction(
        creature,
        CreatureAction.MOVE_NORTHEAST
      );

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.diagonalMovement
      );
      expect(creature.position).toEqual({ x: 6, y: 4 });
    });

    it("should execute rest action", () => {
      const initialEnergy = creature.energy;
      const result = actionSystem.executeAction(creature, CreatureAction.REST);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.rest
      );
      expect(creature.energy).toBe(
        initialEnergy - DEFAULT_CREATURE_CONFIG.energyCosts.rest
      );
    });

    it("should execute sleep action", () => {
      const initialEnergy = creature.energy;
      const result = actionSystem.executeAction(creature, CreatureAction.SLEEP);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.sleep
      );
      expect(creature.energy).toBe(
        initialEnergy - DEFAULT_CREATURE_CONFIG.energyCosts.sleep
      );
    });

    it("should execute signal emission", () => {
      creature.setBroadcastSignal(0.8);
      const result = actionSystem.executeAction(
        creature,
        CreatureAction.EMIT_SIGNAL
      );

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.emitSignal
      );
      expect(result.effects?.signalEmitted).toBe(0.8);
      expect(mockWorld.getSignalAt(5, 5)).toBe(0.8);
    });
  });

  describe("Special Actions", () => {
    it("should successfully eat food", () => {
      mockWorld.setEntityAt(5, 5, EntityType.FOOD);
      const initialEnergy = creature.energy;

      const result = actionSystem.executeAction(creature, CreatureAction.EAT);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.eat
      );
      expect(creature.energy).toBe(
        initialEnergy - DEFAULT_CREATURE_CONFIG.energyCosts.eat
      );
      expect(mockWorld.getEntityAt(5, 5)).toBe(EntityType.EMPTY);
    });

    it("should fail to eat when no food present", () => {
      const result = actionSystem.executeAction(creature, CreatureAction.EAT);

      expect(result.success).toBe(false);
      expect(result.energyChange).toBe(0);
      expect(result.failureReason).toBe(
        "No food available at current position"
      );
    });

    it("should successfully drink water", () => {
      mockWorld.setEntityAt(5, 5, EntityType.WATER);
      const initialEnergy = creature.energy;

      const result = actionSystem.executeAction(creature, CreatureAction.DRINK);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.drink
      );
      expect(creature.energy).toBe(
        initialEnergy - DEFAULT_CREATURE_CONFIG.energyCosts.drink
      );
      expect(mockWorld.getEntityAt(5, 5)).toBe(EntityType.WATER); // Water doesn't get consumed
    });

    it("should successfully gather minerals", () => {
      mockWorld.setEntityAt(5, 5, EntityType.MINERAL);
      const initialEnergy = creature.energy;

      const result = actionSystem.executeAction(
        creature,
        CreatureAction.GATHER
      );

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.gather
      );
      expect(creature.energy).toBe(
        initialEnergy - DEFAULT_CREATURE_CONFIG.energyCosts.gather
      );
      expect(result.effects?.resourcesGathered).toBe(1);
      expect(mockWorld.getEntityAt(5, 5)).toBe(EntityType.EMPTY);
    });

    it("should attack nearby creatures", () => {
      const target = new Creature(
        "target",
        brain,
        { x: 6, y: 5 },
        DEFAULT_CREATURE_CONFIG
      );
      mockWorld.setCreaturesAt(6, 5, [target]);

      const initialEnergy = creature.energy;
      const targetInitialEnergy = target.energy;

      const result = actionSystem.executeAction(
        creature,
        CreatureAction.ATTACK
      );

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.attack
      );
      expect(creature.energy).toBe(
        initialEnergy - DEFAULT_CREATURE_CONFIG.energyCosts.attack
      );
      expect(result.effects?.damageDealt).toBe(0.1);
      expect(target.energy).toBe(targetInitialEnergy - 0.1);
    });

    it("should fail to attack when no creatures nearby", () => {
      const result = actionSystem.executeAction(
        creature,
        CreatureAction.ATTACK
      );

      expect(result.success).toBe(false);
      expect(result.energyChange).toBe(0);
      expect(result.failureReason).toBe("No creatures nearby to attack");
    });

    it("should execute defend action", () => {
      const initialEnergy = creature.energy;
      const result = actionSystem.executeAction(
        creature,
        CreatureAction.DEFEND
      );

      expect(result.success).toBe(true);
      expect(result.energyChange).toBe(
        -DEFAULT_CREATURE_CONFIG.energyCosts.defend
      );
      expect(creature.energy).toBe(
        initialEnergy - DEFAULT_CREATURE_CONFIG.energyCosts.defend
      );
    });
  });

  describe("Movement Validation", () => {
    it("should fail movement when target position is out of bounds", () => {
      creature.position = { x: 0, y: 0 };
      const result = actionSystem.executeAction(
        creature,
        CreatureAction.MOVE_WEST
      );

      expect(result.success).toBe(false);
      expect(result.energyChange).toBe(0);
      expect(result.failureReason).toBe(
        "Invalid position - out of bounds or blocked"
      );
      expect(creature.position).toEqual({ x: 0, y: 0 });
    });

    it("should fail movement when target position is occupied", () => {
      const blocker = new Creature(
        "blocker",
        brain,
        { x: 6, y: 5 },
        DEFAULT_CREATURE_CONFIG
      );
      mockWorld.setCreaturesAt(6, 5, [blocker]);

      const result = actionSystem.executeAction(
        creature,
        CreatureAction.MOVE_EAST
      );

      expect(result.success).toBe(false);
      expect(result.energyChange).toBe(0);
      expect(result.failureReason).toBe(
        "Position occupied by another creature"
      );
      expect(creature.position).toEqual({ x: 5, y: 5 });
    });
  });

  describe("Action Queuing and Processing", () => {
    it("should queue and process actions", () => {
      actionSystem.queueAction(creature, CreatureAction.MOVE_NORTH);

      const results = actionSystem.processActions();

      expect(results.has(creature.id)).toBe(true);
      const result = results.get(creature.id)!;
      expect(result.success).toBe(true);
      expect(creature.position).toEqual({ x: 5, y: 4 });
    });

    it("should process multiple non-conflicting actions", () => {
      const creature2 = new Creature(
        "creature2",
        brain,
        { x: 7, y: 7 },
        DEFAULT_CREATURE_CONFIG
      );

      actionSystem.queueAction(creature, CreatureAction.MOVE_NORTH);
      actionSystem.queueAction(creature2, CreatureAction.MOVE_SOUTH);

      const results = actionSystem.processActions();

      expect(results.size).toBe(2);
      expect(results.get(creature.id)?.success).toBe(true);
      expect(results.get(creature2.id)?.success).toBe(true);
      expect(creature.position).toEqual({ x: 5, y: 4 });
      expect(creature2.position).toEqual({ x: 7, y: 8 });
    });
  });

  describe("Conflict Resolution", () => {
    it("should resolve movement conflicts - first creature wins", () => {
      const testConfig = {
        ...DEFAULT_CREATURE_CONFIG,
        initialEnergy: 0.8, // Start with 80% energy so creature can gain energy
      };
      const creature2 = new Creature(
        "creature2",
        brain,
        { x: 3, y: 5 }, // Position creature2 so both will try to move to (4, 5)
        testConfig
      );

      // Both creatures try to move to the same position (4, 5)
      actionSystem.queueAction(creature, CreatureAction.MOVE_WEST); // (5,5) -> (4,5)
      actionSystem.queueAction(creature2, CreatureAction.MOVE_EAST); // (3,5) -> (4,5)

      const results = actionSystem.processActions();

      expect(results.size).toBe(2);

      // First creature should succeed
      const result1 = results.get(creature.id)!;
      expect(result1.success).toBe(true);
      expect(creature.position).toEqual({ x: 4, y: 5 });

      // Second creature should fail
      const result2 = results.get(creature2.id)!;
      expect(result2.success).toBe(false);
      expect(result2.failureReason).toBe(
        "Movement blocked by another creature"
      );
      expect(creature2.position).toEqual({ x: 3, y: 5 }); // Original position
    });

    it("should resolve resource conflicts - first creature wins", () => {
      const creature2 = new Creature(
        "creature2",
        brain,
        { x: 5, y: 5 },
        DEFAULT_CREATURE_CONFIG
      );
      mockWorld.setEntityAt(5, 5, EntityType.FOOD);

      actionSystem.queueAction(creature, CreatureAction.EAT);
      actionSystem.queueAction(creature2, CreatureAction.EAT);

      const results = actionSystem.processActions();

      expect(results.size).toBe(2);

      // First creature should succeed
      const result1 = results.get(creature.id)!;
      expect(result1.success).toBe(true);

      // Second creature should fail
      const result2 = results.get(creature2.id)!;
      expect(result2.success).toBe(false);
      expect(result2.failureReason).toBe(
        "Resource already consumed by another creature"
      );
    });

    it("should allow simultaneous combat actions", () => {
      const testConfig = {
        ...DEFAULT_CREATURE_CONFIG,
        initialEnergy: 0.8, // Start with 80% energy so creature can gain energy
      };
      const creature2 = new Creature(
        "creature2",
        brain,
        { x: 6, y: 5 }, // Position next to creature so attack can work
        testConfig
      );

      // Set up creatures so they can see each other for combat
      mockWorld.setCreaturesAt(6, 5, [creature2]);

      actionSystem.queueAction(creature, CreatureAction.ATTACK);
      actionSystem.queueAction(creature2, CreatureAction.DEFEND);

      const results = actionSystem.processActions();

      expect(results.size).toBe(2);
      expect(results.get(creature.id)?.success).toBe(true);
      expect(results.get(creature2.id)?.success).toBe(true);
    });

    it("should allow simultaneous communication actions", () => {
      const creature2 = new Creature(
        "creature2",
        brain,
        { x: 5, y: 5 },
        DEFAULT_CREATURE_CONFIG
      );

      creature.setBroadcastSignal(0.5);
      creature2.setBroadcastSignal(0.7);

      actionSystem.queueAction(creature, CreatureAction.EMIT_SIGNAL);
      actionSystem.queueAction(creature2, CreatureAction.EMIT_SIGNAL);

      const results = actionSystem.processActions();

      expect(results.size).toBe(2);
      expect(results.get(creature.id)?.success).toBe(true);
      expect(results.get(creature2.id)?.success).toBe(true);
      expect(mockWorld.getSignalAt(5, 5)).toBeGreaterThan(0);
    });
  });

  describe("Action Feedback", () => {
    it("should generate positive feedback for successful energy-gaining actions", () => {
      mockWorld.setEntityAt(5, 5, EntityType.FOOD);

      actionSystem.queueAction(creature, CreatureAction.EAT);
      actionSystem.processActions();

      const feedback = actionSystem.getActionHistory(creature.id);
      expect(feedback.length).toBe(1);

      const actionFeedback = feedback[0];
      expect(actionFeedback.action).toBe(CreatureAction.EAT);
      expect(actionFeedback.result.success).toBe(true);
      expect(actionFeedback.reward).toBeGreaterThan(0);
    });

    it("should generate negative feedback for failed actions", () => {
      actionSystem.queueAction(creature, CreatureAction.EAT); // No food present
      actionSystem.processActions();

      const feedback = actionSystem.getActionHistory(creature.id);
      expect(feedback.length).toBe(1);

      const actionFeedback = feedback[0];
      expect(actionFeedback.action).toBe(CreatureAction.EAT);
      expect(actionFeedback.result.success).toBe(false);
      expect(actionFeedback.reward).toBe(-0.1);
    });

    it("should track action context in feedback", () => {
      mockWorld.setEntityAt(4, 5, EntityType.WATER);
      mockWorld.setEntityAt(6, 5, EntityType.MINERAL);

      actionSystem.queueAction(creature, CreatureAction.REST);
      actionSystem.processActions();

      const feedback = actionSystem.getActionHistory(creature.id);
      expect(feedback.length).toBe(1);

      const actionFeedback = feedback[0];
      expect(actionFeedback.context.nearbyEntities).toContain(EntityType.WATER);
      expect(actionFeedback.context.nearbyEntities).toContain(
        EntityType.MINERAL
      );
    });

    it("should limit action history size", () => {
      // Generate more than 10 actions
      for (let i = 0; i < 15; i++) {
        actionSystem.queueAction(creature, CreatureAction.REST);
        actionSystem.processActions();
      }

      const feedback = actionSystem.getActionHistory(creature.id);
      expect(feedback.length).toBe(10); // Should be limited to 10
    });

    it("should clear action history", () => {
      actionSystem.queueAction(creature, CreatureAction.REST);
      actionSystem.processActions();

      expect(actionSystem.getActionHistory(creature.id).length).toBe(1);

      actionSystem.clearActionHistory(creature.id);
      expect(actionSystem.getActionHistory(creature.id).length).toBe(0);
    });
  });

  describe("Energy Cost Validation", () => {
    it("should apply correct energy costs for different action types", () => {
      const testCases = [
        {
          action: CreatureAction.MOVE_NORTH,
          expectedCost: DEFAULT_CREATURE_CONFIG.energyCosts.movement,
        },
        {
          action: CreatureAction.MOVE_NORTHEAST,
          expectedCost: DEFAULT_CREATURE_CONFIG.energyCosts.diagonalMovement,
        },
        {
          action: CreatureAction.REST,
          expectedCost: DEFAULT_CREATURE_CONFIG.energyCosts.rest,
        },
        {
          action: CreatureAction.SLEEP,
          expectedCost: DEFAULT_CREATURE_CONFIG.energyCosts.sleep,
        },
        {
          action: CreatureAction.EMIT_SIGNAL,
          expectedCost: DEFAULT_CREATURE_CONFIG.energyCosts.emitSignal,
        },
        {
          action: CreatureAction.ATTACK,
          expectedCost: DEFAULT_CREATURE_CONFIG.energyCosts.attack,
        },
        {
          action: CreatureAction.DEFEND,
          expectedCost: DEFAULT_CREATURE_CONFIG.energyCosts.defend,
        },
      ];

      for (const testCase of testCases) {
        const testCreature = new Creature(
          `test-${testCase.action}`,
          brain,
          { x: 5, y: 5 },
          DEFAULT_CREATURE_CONFIG
        );

        // Set up environment for special actions
        if (testCase.action === CreatureAction.ATTACK) {
          const target = new Creature(
            "target",
            brain,
            { x: 6, y: 5 },
            DEFAULT_CREATURE_CONFIG
          );
          mockWorld.setCreaturesAt(6, 5, [target]);
        }

        const result = actionSystem.executeAction(
          testCreature,
          testCase.action
        );

        if (result.success) {
          expect(result.energyChange).toBe(-testCase.expectedCost);
        }
      }
    });
  });

  describe("Deterministic Behavior", () => {
    it("should produce consistent results for identical inputs", () => {
      const creature1 = new Creature(
        "creature1",
        brain,
        { x: 5, y: 5 },
        DEFAULT_CREATURE_CONFIG
      );
      const creature2 = new Creature(
        "creature2",
        brain,
        { x: 5, y: 5 },
        DEFAULT_CREATURE_CONFIG
      );

      const result1 = actionSystem.executeAction(
        creature1,
        CreatureAction.MOVE_NORTH
      );
      const result2 = actionSystem.executeAction(
        creature2,
        CreatureAction.MOVE_NORTH
      );

      expect(result1.success).toBe(result2.success);
      expect(result1.energyChange).toBe(result2.energyChange);
      expect(creature1.position).toEqual(creature2.position);
    });
  });
});
