/**
 * Unit tests for Energy-Based Combat System
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CombatResolver,
  CombatOutcome,
  CombatAction,
  CombatState,
} from "../../src/core/combat-system";
import { ICreature } from "../../src/core/interfaces";

// Mock creature implementation for testing
class MockCreature implements ICreature {
  public energy: number;
  public age: number = 0;
  public alive: boolean = true;
  public readonly genome: unknown = {};
  public readonly brain: unknown = {};

  constructor(
    public readonly id: string,
    public position: { x: number; y: number },
    energy: number = 100,
    public maxEnergy: number = 100
  ) {
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

  getConfig(): { maxEnergy: number } {
    return { maxEnergy: this.maxEnergy };
  }

  getBroadcastSignal(): number {
    return 0;
  }

  setBroadcastSignal(signal: number): void {
    // Mock implementation
  }

  update(deltaTime: number): void {
    // Mock implementation
  }

  destroy(): void {
    // Mock implementation
  }

  get active(): boolean {
    return this.alive;
  }

  set active(value: boolean) {
    this.alive = value;
  }
}

describe("CombatResolver", () => {
  let combatResolver: CombatResolver;
  let creature1: MockCreature;
  let creature2: MockCreature;

  beforeEach(() => {
    combatResolver = new CombatResolver();
    creature1 = new MockCreature("creature1", { x: 0, y: 0 }, 100);
    creature2 = new MockCreature("creature2", { x: 1, y: 0 }, 100);
  });

  describe("Combat Attributes Calculation", () => {
    it("should calculate combat attributes correctly", () => {
      const attributes = combatResolver.calculateCombatAttributes(creature1);

      expect(attributes.attackPower).toBeGreaterThan(0);
      expect(attributes.defense).toBeGreaterThan(0);
      expect(attributes.experience).toBeGreaterThanOrEqual(0);
      expect(attributes.fatigue).toBeGreaterThanOrEqual(0);
      expect(attributes.retreatThreshold).toBeGreaterThan(0);
    });

    it("should scale attack power with energy", () => {
      const highEnergyCreature = new MockCreature("high", { x: 0, y: 0 }, 100);
      const lowEnergyCreature = new MockCreature("low", { x: 0, y: 0 }, 50);

      const highAttrs =
        combatResolver.calculateCombatAttributes(highEnergyCreature);
      const lowAttrs =
        combatResolver.calculateCombatAttributes(lowEnergyCreature);

      expect(highAttrs.attackPower).toBeGreaterThan(lowAttrs.attackPower);
    });

    it("should increase experience with combat history", () => {
      // Simulate some combat history
      const result = combatResolver.resolveCombat(creature1, creature2);

      const attributesAfter =
        combatResolver.calculateCombatAttributes(creature1);
      expect(attributesAfter.experience).toBeGreaterThan(0);
    });
  });

  describe("Combat Action Determination", () => {
    it("should choose retreat when energy is low", () => {
      const lowEnergyCreature = new MockCreature("low", { x: 0, y: 0 }, 10);
      const attributes =
        combatResolver.calculateCombatAttributes(lowEnergyCreature);

      const action = combatResolver.determineCombatAction(
        lowEnergyCreature,
        creature2,
        attributes
      );

      expect(action).toBe(CombatAction.RETREAT);
    });

    it("should choose aggressive attack when energy is high", () => {
      const highEnergyCreature = new MockCreature("high", { x: 0, y: 0 }, 100);
      const weakOpponent = new MockCreature("weak", { x: 0, y: 0 }, 30);

      const attributes =
        combatResolver.calculateCombatAttributes(highEnergyCreature);

      const action = combatResolver.determineCombatAction(
        highEnergyCreature,
        weakOpponent,
        attributes
      );

      expect(action).toBe(CombatAction.AGGRESSIVE_ATTACK);
    });

    it("should choose defensive actions when outmatched", () => {
      const weakCreature = new MockCreature("weak", { x: 0, y: 0 }, 30);
      const strongOpponent = new MockCreature("strong", { x: 0, y: 0 }, 100);
      strongOpponent.age = 100; // Increase experience

      const attributes = combatResolver.calculateCombatAttributes(weakCreature);

      const action = combatResolver.determineCombatAction(
        weakCreature,
        strongOpponent,
        attributes
      );

      expect([CombatAction.DEFENSIVE_ATTACK, CombatAction.DEFEND]).toContain(
        action
      );
    });
  });

  describe("Damage Calculation", () => {
    it("should calculate damage based on attack and defense", () => {
      const { damage, counterDamage } = combatResolver.calculateDamage(
        creature1,
        creature2,
        CombatAction.AGGRESSIVE_ATTACK,
        CombatAction.DEFEND
      );

      expect(damage).toBeGreaterThanOrEqual(0);
      expect(counterDamage).toBe(0); // No counter damage for defend action
    });

    it("should apply action modifiers correctly", () => {
      // Use creatures with higher energy to ensure more significant damage differences
      const strongAttacker = new MockCreature(
        "strong",
        { x: 0, y: 0 },
        200,
        200
      );
      const defender = new MockCreature("defender", { x: 0, y: 0 }, 100, 100);

      const aggressiveDamage = combatResolver.calculateDamage(
        strongAttacker,
        defender,
        CombatAction.AGGRESSIVE_ATTACK,
        CombatAction.DEFEND
      );

      const defensiveDamage = combatResolver.calculateDamage(
        strongAttacker,
        defender,
        CombatAction.DEFENSIVE_ATTACK,
        CombatAction.DEFEND
      );

      expect(aggressiveDamage.damage).toBeGreaterThan(defensiveDamage.damage);
    });

    it("should calculate counter damage for counter attacks", () => {
      const { damage, counterDamage } = combatResolver.calculateDamage(
        creature1,
        creature2,
        CombatAction.AGGRESSIVE_ATTACK,
        CombatAction.COUNTER_ATTACK
      );

      expect(damage).toBeGreaterThan(0);
      expect(counterDamage).toBeGreaterThan(0);
    });

    it("should reduce damage when defending", () => {
      const attackDamage = combatResolver.calculateDamage(
        creature1,
        creature2,
        CombatAction.AGGRESSIVE_ATTACK,
        CombatAction.AGGRESSIVE_ATTACK
      );

      const defendDamage = combatResolver.calculateDamage(
        creature1,
        creature2,
        CombatAction.AGGRESSIVE_ATTACK,
        CombatAction.DEFEND
      );

      expect(defendDamage.damage).toBeLessThan(attackDamage.damage);
    });
  });

  describe("Energy Cost Calculation", () => {
    it("should calculate energy costs for different actions", () => {
      const attributes = combatResolver.calculateCombatAttributes(creature1);

      const aggressiveCost = combatResolver.calculateEnergyCosts(
        CombatAction.AGGRESSIVE_ATTACK,
        attributes
      );
      const defensiveCost = combatResolver.calculateEnergyCosts(
        CombatAction.DEFENSIVE_ATTACK,
        attributes
      );
      const defendCost = combatResolver.calculateEnergyCosts(
        CombatAction.DEFEND,
        attributes
      );

      expect(aggressiveCost).toBeGreaterThan(defensiveCost);
      expect(defensiveCost).toBeGreaterThan(defendCost);
    });

    it("should increase energy costs with fatigue", () => {
      // Create a creature with some combat history to increase fatigue
      const fightResult1 = combatResolver.resolveCombat(creature1, creature2);
      const fightResult2 = combatResolver.resolveCombat(creature1, creature2);

      const attributes = combatResolver.calculateCombatAttributes(creature1);
      const cost = combatResolver.calculateEnergyCosts(
        CombatAction.AGGRESSIVE_ATTACK,
        attributes
      );

      expect(cost).toBeGreaterThan(5); // Base cost is 5
    });
  });

  describe("Combat Round Resolution", () => {
    it("should resolve a combat round correctly", () => {
      const result = combatResolver.resolveCombatRound(creature1, creature2);

      expect(result.damageDealt).toBeGreaterThanOrEqual(0);
      expect(result.damageReceived).toBeGreaterThanOrEqual(0);
      expect(result.attackerEnergyCost).toBeGreaterThan(0);
      expect(result.defenderEnergyCost).toBeGreaterThan(0);
      expect(Object.values(CombatAction)).toContain(result.attackerAction);
      expect(Object.values(CombatAction)).toContain(result.defenderAction);
    });

    it("should end combat when creature energy reaches zero", () => {
      const weakCreature = new MockCreature("weak", { x: 0, y: 0 }, 1);
      const result = combatResolver.resolveCombatRound(creature1, weakCreature);

      expect(result.combatEnded).toBe(true);
      expect(result.outcome).toBeDefined();
    });

    it("should end combat when retreat action is chosen", () => {
      const lowEnergyCreature = new MockCreature("low", { x: 0, y: 0 }, 10);
      const result = combatResolver.resolveCombatRound(
        creature1,
        lowEnergyCreature
      );

      if (
        result.attackerAction === CombatAction.RETREAT ||
        result.defenderAction === CombatAction.RETREAT
      ) {
        expect(result.combatEnded).toBe(true);
        expect(result.outcome).toBe(CombatOutcome.RETREAT);
      }
    });
  });

  describe("Complete Combat Resolution", () => {
    it("should resolve complete combat between creatures", () => {
      const result = combatResolver.resolveCombat(creature1, creature2);

      expect(Object.values(CombatOutcome)).toContain(result.outcome);
      expect(result.rounds).toBeGreaterThan(0);
      expect(result.totalDamageByInitiator).toBeGreaterThanOrEqual(0);
      expect(result.totalDamageByDefender).toBeGreaterThanOrEqual(0);
      expect(result.experienceGained.initiator).toBeGreaterThanOrEqual(0);
      expect(result.experienceGained.defender).toBeGreaterThanOrEqual(0);
    });

    it("should not allow combat with insufficient energy", () => {
      const lowEnergyCreature1 = new MockCreature("low1", { x: 0, y: 0 }, 10);
      const lowEnergyCreature2 = new MockCreature("low2", { x: 0, y: 0 }, 10);

      const result = combatResolver.resolveCombat(
        lowEnergyCreature1,
        lowEnergyCreature2
      );

      expect(result.outcome).toBe(CombatOutcome.INTERRUPTED);
      expect(result.rounds).toBe(0);
    });

    it("should limit combat to maximum rounds", () => {
      // Create creatures with high defense to prolong combat
      const tankCreature1 = new MockCreature("tank1", { x: 0, y: 0 }, 1000);
      const tankCreature2 = new MockCreature("tank2", { x: 0, y: 0 }, 1000);

      const result = combatResolver.resolveCombat(tankCreature1, tankCreature2);

      expect(result.rounds).toBeLessThanOrEqual(10); // Default max rounds
    });

    it("should determine winner correctly", () => {
      const strongCreature = new MockCreature("strong", { x: 0, y: 0 }, 100);
      const weakCreature = new MockCreature("weak", { x: 0, y: 0 }, 20);

      const result = combatResolver.resolveCombat(strongCreature, weakCreature);

      if (result.outcome === CombatOutcome.VICTORY) {
        expect(result.winner).toBe(strongCreature);
        expect(result.loser).toBe(weakCreature);
      } else if (result.outcome === CombatOutcome.DEFEAT) {
        expect(result.winner).toBe(weakCreature);
        expect(result.loser).toBe(strongCreature);
      }
    });
  });

  describe("Combat Interaction Result", () => {
    it("should create proper interaction result", () => {
      const interactionResult = combatResolver.createCombatInteractionResult(
        creature1,
        creature2
      );

      expect(interactionResult.success).toBeDefined();
      expect(interactionResult.energyChange).toBeLessThanOrEqual(0);
      expect(interactionResult.damageDealt).toBeGreaterThanOrEqual(0);
      expect(interactionResult.damageReceived).toBeGreaterThanOrEqual(0);
      expect(interactionResult.memoryEntry).toBeDefined();
      expect(interactionResult.effects).toBeDefined();
    });

    it("should include combat outcome in effects", () => {
      const interactionResult = combatResolver.createCombatInteractionResult(
        creature1,
        creature2
      );

      expect(interactionResult.effects?.combatOutcome).toBeDefined();
      expect(interactionResult.effects?.rounds).toBeGreaterThan(0);
      expect(
        interactionResult.effects?.experienceGained
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Combat Statistics", () => {
    it("should track combat statistics correctly", () => {
      // Use creatures with high energy to ensure they can fight multiple times
      const fighter1 = new MockCreature("fighter1", { x: 0, y: 0 }, 200, 200);
      const fighter2 = new MockCreature("fighter2", { x: 0, y: 0 }, 200, 200);

      // Fight multiple combats with energy reset
      for (let i = 0; i < 3; i++) {
        fighter1.energy = 200;
        fighter2.energy = 200;
        combatResolver.resolveCombat(fighter1, fighter2);
      }

      const stats = combatResolver.getCombatStatistics(fighter1.id);

      expect(stats.totalCombats).toBe(3);
      expect(
        stats.victories + stats.defeats + stats.retreats + stats.stalemates
      ).toBe(3);
      expect(stats.winRate).toBeGreaterThanOrEqual(0);
      expect(stats.winRate).toBeLessThanOrEqual(1);
      expect(stats.totalDamageDealt).toBeGreaterThanOrEqual(0);
      expect(stats.totalDamageReceived).toBeGreaterThanOrEqual(0);
      expect(stats.averageRoundsPerCombat).toBeGreaterThan(0);
    });

    it("should calculate win rate correctly", () => {
      const strongCreature = new MockCreature(
        "strong",
        { x: 0, y: 0 },
        300,
        300
      ); // Much stronger
      const weakCreature = new MockCreature("weak", { x: 0, y: 0 }, 20, 20);

      // Strong creature should win most fights
      for (let i = 0; i < 10; i++) {
        // Reset both creatures' energy for each fight
        strongCreature.energy = 300;
        weakCreature.energy = 20;

        combatResolver.resolveCombat(strongCreature, weakCreature);
      }

      const stats = combatResolver.getCombatStatistics(strongCreature.id);
      expect(stats.winRate).toBeGreaterThan(0.5); // Should win more than half
    });
  });

  describe("Combat State Management", () => {
    it("should track active combats", () => {
      expect(combatResolver.isInCombat(creature1.id)).toBe(false);
      expect(combatResolver.isInCombat(creature2.id)).toBe(false);

      // Combat state is managed internally during resolution
      const result = combatResolver.resolveCombat(creature1, creature2);

      // After combat, creatures should not be in combat
      expect(combatResolver.isInCombat(creature1.id)).toBe(false);
      expect(combatResolver.isInCombat(creature2.id)).toBe(false);
    });
  });

  describe("Configuration", () => {
    it("should use custom configuration", () => {
      const customResolver = new CombatResolver({
        baseDamageMultiplier: 2.0,
        maxRounds: 5,
        minCombatEnergy: 50,
      });

      const config = customResolver.getConfig();
      expect(config.baseDamageMultiplier).toBe(2.0);
      expect(config.maxRounds).toBe(5);
      expect(config.minCombatEnergy).toBe(50);
    });

    it("should update configuration", () => {
      combatResolver.updateConfig({
        baseDamageMultiplier: 1.5,
        randomizationFactor: 0.1,
      });

      const config = combatResolver.getConfig();
      expect(config.baseDamageMultiplier).toBe(1.5);
      expect(config.randomizationFactor).toBe(0.1);
    });
  });

  describe("Reset Functionality", () => {
    it("should reset combat system state", () => {
      // Generate some combat history
      combatResolver.resolveCombat(creature1, creature2);

      let stats = combatResolver.getCombatStatistics(creature1.id);
      expect(stats.totalCombats).toBeGreaterThan(0);

      combatResolver.reset();

      stats = combatResolver.getCombatStatistics(creature1.id);
      expect(stats.totalCombats).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle creatures with zero energy gracefully", () => {
      const zeroEnergyCreature = new MockCreature("zero", { x: 0, y: 0 }, 0);

      const result = combatResolver.resolveCombat(
        creature1,
        zeroEnergyCreature
      );
      expect(result.outcome).toBe(CombatOutcome.INTERRUPTED);
    });

    it("should handle creatures with identical stats", () => {
      const clone1 = new MockCreature("clone1", { x: 0, y: 0 }, 100);
      const clone2 = new MockCreature("clone2", { x: 0, y: 0 }, 100);

      const result = combatResolver.resolveCombat(clone1, clone2);
      expect(Object.values(CombatOutcome)).toContain(result.outcome);
    });

    it("should handle very high energy creatures", () => {
      const superCreature1 = new MockCreature("super1", { x: 0, y: 0 }, 10000);
      const superCreature2 = new MockCreature("super2", { x: 0, y: 0 }, 10000);

      const result = combatResolver.resolveCombat(
        superCreature1,
        superCreature2
      );
      expect(result.rounds).toBeLessThanOrEqual(10); // Should still respect max rounds
    });
  });
});
