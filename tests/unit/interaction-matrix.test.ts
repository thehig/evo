/**
 * Unit tests for Interaction Matrix Framework
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  InteractionMatrix,
  InteractionType,
  InteractionRule,
  InteractionResult,
} from "../../src/core/interaction-matrix";
import { EntityType } from "../../src/core/creature-types";
import { IEntity, ICreature } from "../../src/core/interfaces";

// Mock entity implementation
class MockEntity implements IEntity {
  constructor(
    public readonly id: string,
    public position: { x: number; y: number },
    public active: boolean = true
  ) {}

  update(deltaTime: number): void {
    // Mock implementation
  }

  destroy(): void {
    // Mock implementation
  }
}

// Mock creature implementation
class MockCreature extends MockEntity implements ICreature {
  public energy: number = 100;
  public age: number = 0;
  public alive: boolean = true;
  public readonly genome: unknown = {};
  public readonly brain: unknown = {};

  constructor(
    id: string,
    position: { x: number; y: number },
    energy: number = 100
  ) {
    super(id, position);
    this.energy = energy;
  }

  think(): void {
    // Mock implementation
  }

  act(): void {
    // Mock implementation
  }

  reproduce(partner: ICreature): ICreature | null {
    return null;
  }

  getConfig(): unknown {
    return {};
  }

  getBroadcastSignal(): number {
    return 0;
  }

  setBroadcastSignal(signal: number): void {
    // Mock implementation
  }
}

// Mock resource entity
class MockResourceEntity extends MockEntity {
  constructor(
    id: string,
    position: { x: number; y: number },
    public resourceType: string
  ) {
    super(id, position);
  }
}

describe("InteractionMatrix", () => {
  let matrix: InteractionMatrix;
  let creature1: MockCreature;
  let creature2: MockCreature;
  let foodEntity: MockResourceEntity;

  beforeEach(() => {
    matrix = new InteractionMatrix();
    creature1 = new MockCreature("creature1", { x: 0, y: 0 }, 100);
    creature2 = new MockCreature("creature2", { x: 1, y: 0 }, 80);
    foodEntity = new MockResourceEntity("food1", { x: 0, y: 1 }, "food");
  });

  describe("Rule Registration", () => {
    it("should register interaction rules correctly", () => {
      const rule: InteractionRule = {
        id: "test-combat",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 1.5,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );

      const rules = matrix.getRulesForInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND
      );

      expect(rules).toHaveLength(1);
      expect(rules[0]).toBe(rule);
    });

    it("should sort rules by priority", () => {
      const lowPriorityRule: InteractionRule = {
        id: "low-priority",
        type: InteractionType.COMBAT,
        priority: 1,
        range: 1.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      const highPriorityRule: InteractionRule = {
        id: "high-priority",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 1.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        lowPriorityRule
      );
      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        highPriorityRule
      );

      const rules = matrix.getRulesForInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND
      );

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe("high-priority");
      expect(rules[1].id).toBe("low-priority");
    });

    it("should remove interaction rules correctly", () => {
      const rule: InteractionRule = {
        id: "test-rule",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 1.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );

      const removed = matrix.removeInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        "test-rule"
      );

      expect(removed).toBe(true);

      const rules = matrix.getRulesForInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND
      );

      expect(rules).toHaveLength(0);
    });
  });

  describe("Cooldown Management", () => {
    it("should track cooldowns correctly", () => {
      matrix.updateTick(0);
      matrix.setCooldown("creature1", "test-rule", 5);

      expect(matrix.isOnCooldown("creature1", "test-rule")).toBe(true);

      matrix.updateTick(5);
      expect(matrix.isOnCooldown("creature1", "test-rule")).toBe(false);
    });

    it("should clean up expired cooldowns", () => {
      matrix.updateTick(0);
      matrix.setCooldown("creature1", "test-rule", 5);

      matrix.updateTick(10);

      // Cooldown should be cleaned up
      const stats = matrix.getStatistics();
      expect(stats.activeCooldowns).toBe(0);
      expect(stats.entitiesWithCooldowns).toBe(0);
    });
  });

  describe("Interaction Processing", () => {
    it("should process successful interactions", () => {
      const rule: InteractionRule = {
        id: "test-feeding",
        type: InteractionType.FEEDING,
        priority: 10,
        range: 2.0,
        cooldown: 5,
        energyCost: 5,
        conditions: {},
        execute: (initiator, target) => ({
          success: true,
          energyChange: 20,
          resourcesGathered: 1,
        }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.FOOD,
        rule
      );
      matrix.updateTick(0);

      const results = matrix.processInteractions(creature1, [foodEntity]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].resourcesGathered).toBe(1);
      expect(creature1.energy).toBe(95); // 100 - 5 energy cost
    });

    it("should respect range limitations", () => {
      const rule: InteractionRule = {
        id: "short-range",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 0.5, // Very short range
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      // creature2 is at distance 1.0, which is > 0.5 range
      const results = matrix.processInteractions(creature1, [creature2]);

      expect(results).toHaveLength(0);
    });

    it("should respect energy requirements", () => {
      const rule: InteractionRule = {
        id: "expensive-action",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 2.0,
        cooldown: 5,
        energyCost: 150, // More than creature has
        conditions: {},
        execute: () => ({ success: true, energyChange: -150 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      const results = matrix.processInteractions(creature1, [creature2]);

      expect(results).toHaveLength(0);
    });

    it("should respect cooldowns", () => {
      const rule: InteractionRule = {
        id: "cooldown-test",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 2.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      // First interaction should succeed
      let results = matrix.processInteractions(creature1, [creature2]);
      expect(results).toHaveLength(1);

      // Second interaction should fail due to cooldown
      results = matrix.processInteractions(creature1, [creature2]);
      expect(results).toHaveLength(0);

      // After cooldown expires, should work again
      matrix.updateTick(5);
      results = matrix.processInteractions(creature1, [creature2]);
      expect(results).toHaveLength(1);
    });

    it("should respect energy conditions", () => {
      const rule: InteractionRule = {
        id: "energy-condition-test",
        type: InteractionType.REPRODUCTION,
        priority: 10,
        range: 2.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {
          minEnergy: 90, // creature2 has 80 energy
        },
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      // Should fail for creature2 (80 energy < 90 min)
      const results = matrix.processInteractions(creature2, [creature1]);
      expect(results).toHaveLength(0);

      // Should succeed for creature1 (100 energy >= 90 min)
      const results2 = matrix.processInteractions(creature1, [creature2]);
      expect(results2).toHaveLength(1);
    });

    it("should limit interactions per tick", () => {
      const rule: InteractionRule = {
        id: "multi-interaction",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 5.0, // Large range to hit all targets
        cooldown: 0, // No cooldown
        energyCost: 1,
        conditions: {},
        execute: () => ({ success: true, energyChange: -1 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      // Create multiple targets
      const targets = [
        new MockCreature("target1", { x: 1, y: 0 }),
        new MockCreature("target2", { x: 2, y: 0 }),
        new MockCreature("target3", { x: 3, y: 0 }),
        new MockCreature("target4", { x: 4, y: 0 }),
      ];

      const results = matrix.processInteractions(creature1, targets);

      // Should be limited to maxInteractionsPerTick (default: 3)
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Configuration", () => {
    it("should apply range multiplier", () => {
      matrix.updateConfig({ rangeMultiplier: 2.0 });

      const rule: InteractionRule = {
        id: "range-test",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 1.0, // Will be multiplied by 2.0
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      // Place creature2 at distance 1.5 (within 2.0 effective range)
      creature2.position = { x: 1.5, y: 0 };

      const results = matrix.processInteractions(creature1, [creature2]);
      expect(results).toHaveLength(1);
    });

    it("should apply cooldown multiplier", () => {
      matrix.updateConfig({ cooldownMultiplier: 2.0 });

      const rule: InteractionRule = {
        id: "cooldown-multiplier-test",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 2.0,
        cooldown: 5, // Will be multiplied by 2.0 = 10
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      // First interaction
      matrix.processInteractions(creature1, [creature2]);

      // Should still be on cooldown at tick 5
      matrix.updateTick(5);
      let results = matrix.processInteractions(creature1, [creature2]);
      expect(results).toHaveLength(0);

      // Should be available at tick 10
      matrix.updateTick(10);
      results = matrix.processInteractions(creature1, [creature2]);
      expect(results).toHaveLength(1);
    });
  });

  describe("Statistics", () => {
    it("should provide accurate statistics", () => {
      const rule1: InteractionRule = {
        id: "combat-rule",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 1.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      const rule2: InteractionRule = {
        id: "feeding-rule",
        type: InteractionType.FEEDING,
        priority: 5,
        range: 1.0,
        cooldown: 3,
        energyCost: 5,
        conditions: {},
        execute: () => ({ success: true, energyChange: 20 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule1
      );
      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.FOOD,
        rule2
      );

      matrix.updateTick(0);
      matrix.setCooldown("creature1", "combat-rule", 5);
      matrix.setCooldown("creature2", "feeding-rule", 3);

      const stats = matrix.getStatistics();

      expect(stats.totalRules).toBe(2);
      expect(stats.rulesByType.get(InteractionType.COMBAT)).toBe(1);
      expect(stats.rulesByType.get(InteractionType.FEEDING)).toBe(1);
      expect(stats.activeCooldowns).toBe(2);
      expect(stats.entitiesWithCooldowns).toBe(2);
    });
  });

  describe("Event System", () => {
    it("should emit interaction events when enabled", () => {
      let eventReceived = false;
      let eventData: any = null;

      matrix.onInteraction((data) => {
        eventReceived = true;
        eventData = data;
      });

      const rule: InteractionRule = {
        id: "event-test",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 2.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      matrix.processInteractions(creature1, [creature2]);

      expect(eventReceived).toBe(true);
      expect(eventData).toBeTruthy();
      expect(eventData.initiator).toBe(creature1);
      expect(eventData.target).toBe(creature2);
      expect(eventData.type).toBe(InteractionType.COMBAT);
    });

    it("should not emit events when disabled", () => {
      matrix.updateConfig({ enableEvents: false });

      let eventReceived = false;

      matrix.onInteraction(() => {
        eventReceived = true;
      });

      const rule: InteractionRule = {
        id: "no-event-test",
        type: InteractionType.COMBAT,
        priority: 10,
        range: 2.0,
        cooldown: 5,
        energyCost: 10,
        conditions: {},
        execute: () => ({ success: true, energyChange: -10 }),
      };

      matrix.registerInteraction(
        EntityType.CREATURE_FRIEND,
        EntityType.CREATURE_FRIEND,
        rule
      );
      matrix.updateTick(0);

      matrix.processInteractions(creature1, [creature2]);

      expect(eventReceived).toBe(false);
    });
  });

  describe("Reset", () => {
    it("should reset cooldowns and tick counter", () => {
      matrix.updateTick(10);
      matrix.setCooldown("creature1", "test-rule", 5);

      matrix.reset();

      expect(matrix.isOnCooldown("creature1", "test-rule")).toBe(false);

      const stats = matrix.getStatistics();
      expect(stats.activeCooldowns).toBe(0);
      expect(stats.entitiesWithCooldowns).toBe(0);
    });
  });
});
