/**
 * Unit tests for the Reproduction System
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ReproductionSystem,
  ReproductionState,
  ReproductionConfig,
  MatingCompatibility,
  ReproductionResult,
} from "../../src/core/reproduction-system";
import { GeneticsSystem, TraitType } from "../../src/core/genetics";
import { ICreature } from "../../src/core/interfaces";
import { Position } from "../../src/world/types";

// Mock creature for testing
class MockCreature implements ICreature {
  id: string;
  position: Position;
  energy: number;
  age: number;
  active: boolean = true;
  alive: boolean = true;
  readonly genome: unknown = null;
  readonly brain: unknown = null;
  private broadcastSignal: number = 0;

  constructor(
    id: string,
    x: number = 0,
    y: number = 0,
    energy: number = 100,
    age: number = 200
  ) {
    this.id = id;
    this.position = { x, y };
    this.energy = energy;
    this.age = age;
  }

  // Implement required ICreature methods
  update(deltaTime: number): void {}
  destroy(): void {}
  think(): void {}
  act(): void {}
  reproduce(partner: ICreature): ICreature | null {
    return null;
  }
  getConfig(): any {
    return { maxEnergy: 100 };
  }
  getBroadcastSignal(): number {
    return this.broadcastSignal;
  }
  setBroadcastSignal(signal: number): void {
    this.broadcastSignal = signal;
  }
  render(context: CanvasRenderingContext2D): void {}
  move(direction: { x: number; y: number }): void {}
  takeDamage(amount: number): void {}
  heal(amount: number): void {}
  die(): void {}
  getBounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.position.x, y: this.position.y, width: 10, height: 10 };
  }
}

describe("ReproductionSystem", () => {
  let reproduction: ReproductionSystem;
  let genetics: GeneticsSystem;
  let creature1: MockCreature;
  let creature2: MockCreature;

  beforeEach(() => {
    genetics = new GeneticsSystem({}, 12345);
    reproduction = new ReproductionSystem(genetics, {}, 12345);

    creature1 = new MockCreature("creature1", 0, 0, 80, 200);
    creature2 = new MockCreature("creature2", 1, 1, 80, 250);
  });

  describe("Initialization", () => {
    it("should initialize creature reproduction data", () => {
      reproduction.initializeCreature(creature1);

      const reproData = reproduction.getReproductionData(creature1.id);
      expect(reproData).toBeDefined();
      expect(reproData!.state).toBe(ReproductionState.READY); // Mature age
      expect(reproData!.reproductionCount).toBe(0);
      expect(reproData!.fertilityModifier).toBe(1.0);
    });

    it("should set immature state for young creatures", () => {
      const youngCreature = new MockCreature("young", 0, 0, 80, 50); // Age < maturityAge

      reproduction.initializeCreature(youngCreature);

      const reproData = reproduction.getReproductionData(youngCreature.id);
      expect(reproData!.state).toBe(ReproductionState.IMMATURE);
    });
  });

  describe("Mating Compatibility", () => {
    beforeEach(() => {
      reproduction.initializeCreature(creature1);
      reproduction.initializeCreature(creature2);
    });

    it("should calculate compatibility between two creatures", () => {
      const compatibility = reproduction.calculateMatingCompatibility(
        creature1,
        creature2
      );

      expect(compatibility.geneticCompatibility).toBeGreaterThanOrEqual(0);
      expect(compatibility.geneticCompatibility).toBeLessThanOrEqual(1);
      expect(compatibility.ageCompatibility).toBeGreaterThanOrEqual(0);
      expect(compatibility.ageCompatibility).toBeLessThanOrEqual(1);
      expect(compatibility.energyCompatibility).toBeGreaterThanOrEqual(0);
      expect(compatibility.energyCompatibility).toBeLessThanOrEqual(1);
      expect(compatibility.overallCompatibility).toBeGreaterThanOrEqual(0);
      expect(compatibility.overallCompatibility).toBeLessThanOrEqual(1);
    });

    it("should allow mating for compatible creatures", () => {
      // Ensure both creatures are ready and have enough energy
      creature1.energy = 80;
      creature2.energy = 80;

      const compatibility = reproduction.calculateMatingCompatibility(
        creature1,
        creature2
      );
      expect(compatibility.canMate).toBe(true);
      expect(compatibility.incompatibilityReasons.length).toBe(0);
    });

    it("should prevent mating for low energy creatures", () => {
      creature1.energy = 20; // Below threshold

      const compatibility = reproduction.calculateMatingCompatibility(
        creature1,
        creature2
      );
      expect(compatibility.canMate).toBe(false);
      expect(compatibility.incompatibilityReasons).toContain(
        "Creature 1 has insufficient energy"
      );
    });

    it("should prevent mating for distant creatures", () => {
      creature2.position = { x: 10, y: 10 }; // Too far away

      const compatibility = reproduction.calculateMatingCompatibility(
        creature1,
        creature2
      );
      expect(compatibility.canMate).toBe(false);
      expect(compatibility.incompatibilityReasons).toContain(
        "Too far apart for mating"
      );
    });

    it("should prevent mating for non-ready creatures", () => {
      const reproData1 = reproduction.getReproductionData(creature1.id)!;
      reproData1.state = ReproductionState.PREGNANT;

      const compatibility = reproduction.calculateMatingCompatibility(
        creature1,
        creature2
      );
      expect(compatibility.canMate).toBe(false);
      expect(
        compatibility.incompatibilityReasons.some((reason) =>
          reason.includes("not ready")
        )
      ).toBe(true);
    });
  });

  describe("Reproduction Attempts", () => {
    beforeEach(() => {
      reproduction.initializeCreature(creature1);
      reproduction.initializeCreature(creature2);
    });

    it("should successfully reproduce compatible creatures", () => {
      const result = reproduction.attemptReproduction(creature1, creature2);

      expect(result.success).toBe(true);
      expect(result.energyCost).toBeGreaterThan(0);
      expect(result.cooldownPeriod).toBeGreaterThan(0);
      expect(result.memoryEntry).toBeDefined();
      expect(result.failureReason).toBeUndefined();
    });

    it("should deduct energy from both parents", () => {
      const initialEnergy1 = creature1.energy;
      const initialEnergy2 = creature2.energy;

      const result = reproduction.attemptReproduction(creature1, creature2);

      if (result.success) {
        expect(creature1.energy).toBeLessThan(initialEnergy1);
        expect(creature2.energy).toBeLessThan(initialEnergy2);
        expect(creature1.energy).toBe(initialEnergy1 - result.energyCost);
        expect(creature2.energy).toBe(initialEnergy2 - result.energyCost);
      }
    });

    it("should set pregnancy state for one parent", () => {
      const result = reproduction.attemptReproduction(creature1, creature2);

      if (result.success) {
        const data1 = reproduction.getReproductionData(creature1.id)!;
        const data2 = reproduction.getReproductionData(creature2.id)!;

        // One should be pregnant, the other in cooldown
        const pregnantCount = [data1.state, data2.state].filter(
          (state) => state === ReproductionState.PREGNANT
        ).length;

        expect(pregnantCount).toBe(1);
      }
    });

    it("should fail reproduction for insufficient energy", () => {
      creature1.energy = 10; // Below minimum
      creature2.energy = 10;

      const result = reproduction.attemptReproduction(creature1, creature2);

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain("has insufficient energy");
    });

    it("should fail reproduction for incompatible creatures", () => {
      creature2.position = { x: 10, y: 10 }; // Too far

      const result = reproduction.attemptReproduction(creature1, creature2);

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain("Too far apart");
    });
  });

  describe("System Updates", () => {
    beforeEach(() => {
      reproduction.initializeCreature(creature1);
      reproduction.initializeCreature(creature2);
    });

    it("should update reproduction states over time", () => {
      const youngCreature = new MockCreature("young", 0, 0, 80, 50);
      reproduction.initializeCreature(youngCreature);

      let reproData = reproduction.getReproductionData(youngCreature.id)!;
      expect(reproData.state).toBe(ReproductionState.IMMATURE);

      // Age the creature
      youngCreature.age = 150;
      reproduction.update([youngCreature], 10);

      reproData = reproduction.getReproductionData(youngCreature.id)!;
      expect(reproData.state).toBe(ReproductionState.READY);
    });

    it("should handle gestation periods", () => {
      // Force pregnancy state for testing
      reproduction.attemptReproduction(creature1, creature2);

      const data1 = reproduction.getReproductionData(creature1.id)!;
      const data2 = reproduction.getReproductionData(creature2.id)!;

      // Find the pregnant parent
      const pregnantData =
        data1.state === ReproductionState.PREGNANT ? data1 : data2;
      const initialGestation = pregnantData.gestationRemaining;

      expect(initialGestation).toBeGreaterThan(0);

      // Update system
      const offspring = reproduction.update([creature1, creature2], 5);

      // Check that gestation decreased
      expect(pregnantData.gestationRemaining).toBeLessThan(initialGestation);
    });

    it("should complete gestation and produce offspring", () => {
      reproduction.attemptReproduction(creature1, creature2);

      const data1 = reproduction.getReproductionData(creature1.id)!;
      const data2 = reproduction.getReproductionData(creature2.id)!;

      // Find the pregnant parent and set gestation to near completion
      const pregnantData =
        data1.state === ReproductionState.PREGNANT ? data1 : data2;
      pregnantData.gestationRemaining = 1;

      // Update to complete gestation
      const offspring = reproduction.update([creature1, creature2], 2);

      // Should transition to cooldown
      expect(pregnantData.state).toBe(ReproductionState.COOLDOWN);
      expect(pregnantData.reproductionCount).toBe(1);
    });
  });

  describe("Mate Finding", () => {
    beforeEach(() => {
      reproduction.initializeCreature(creature1);
      reproduction.initializeCreature(creature2);
    });

    it("should find potential mates for a creature", () => {
      const candidates = [creature1, creature2];
      const mates = reproduction.findPotentialMates(creature1, candidates);

      expect(mates).toContain(creature2);
      expect(mates).not.toContain(creature1); // Should not include self
    });

    it("should filter out incompatible mates", () => {
      creature2.position = { x: 10, y: 10 }; // Too far

      const candidates = [creature1, creature2];
      const mates = reproduction.findPotentialMates(creature1, candidates);

      expect(mates).not.toContain(creature2);
    });

    it("should sort mates by compatibility", () => {
      const creature3 = new MockCreature("creature3", 0.5, 0.5, 90, 220);
      reproduction.initializeCreature(creature3);

      const candidates = [creature1, creature2, creature3];
      const mates = reproduction.findPotentialMates(creature1, candidates);

      // All should be potential mates if compatible
      expect(mates.length).toBeGreaterThan(0);

      // Check that they're sorted by compatibility (higher first)
      for (let i = 0; i < mates.length - 1; i++) {
        const comp1 = reproduction.calculateMatingCompatibility(
          creature1,
          mates[i]
        );
        const comp2 = reproduction.calculateMatingCompatibility(
          creature1,
          mates[i + 1]
        );
        expect(comp1.overallCompatibility).toBeGreaterThanOrEqual(
          comp2.overallCompatibility
        );
      }
    });
  });

  describe("Configuration", () => {
    it("should use custom configuration", () => {
      const customConfig: Partial<ReproductionConfig> = {
        minEnergyThreshold: 0.5,
        maturityAge: 150,
        baseEnergyCost: 50,
      };

      const customReproduction = new ReproductionSystem(
        genetics,
        customConfig,
        12345
      );
      const config = customReproduction.getConfig();

      expect(config.minEnergyThreshold).toBe(0.5);
      expect(config.maturityAge).toBe(150);
      expect(config.baseEnergyCost).toBe(50);
    });

    it("should update configuration", () => {
      const newConfig: Partial<ReproductionConfig> = {
        reproductionCooldown: 100,
      };

      reproduction.updateConfig(newConfig);
      const config = reproduction.getConfig();

      expect(config.reproductionCooldown).toBe(100);
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      reproduction.initializeCreature(creature1);
      reproduction.initializeCreature(creature2);
    });

    it("should provide reproduction statistics", () => {
      const stats = reproduction.getStatistics();

      expect(stats.totalCreatures).toBe(2);
      expect(stats.stateDistribution).toBeDefined();
      expect(stats.stateDistribution.get(ReproductionState.READY)).toBe(2);
      expect(stats.totalReproductions).toBe(0);
      expect(stats.averageFertility).toBeGreaterThan(0);
      expect(stats.currentTick).toBeGreaterThanOrEqual(0);
    });

    it("should track reproduction counts", () => {
      reproduction.attemptReproduction(creature1, creature2);

      // Complete the gestation artificially
      const data1 = reproduction.getReproductionData(creature1.id)!;
      const data2 = reproduction.getReproductionData(creature2.id)!;

      if (data1.state === ReproductionState.PREGNANT) {
        data1.gestationRemaining = 0;
        data1.state = ReproductionState.COOLDOWN;
        data1.reproductionCount = 1;
      } else if (data2.state === ReproductionState.PREGNANT) {
        data2.gestationRemaining = 0;
        data2.state = ReproductionState.COOLDOWN;
        data2.reproductionCount = 1;
      }

      const stats = reproduction.getStatistics();
      expect(stats.totalReproductions).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle creatures without reproduction data", () => {
      const creatures = [creature1]; // Not initialized
      const offspring = reproduction.update(creatures, 10);

      // Should auto-initialize
      const reproData = reproduction.getReproductionData(creature1.id);
      expect(reproData).toBeDefined();
    });

    it("should handle empty creature lists", () => {
      const offspring = reproduction.update([], 10);
      expect(offspring).toEqual([]);
    });

    it("should reset system state", () => {
      reproduction.initializeCreature(creature1);
      reproduction.initializeCreature(creature2);

      reproduction.reset();

      const data1 = reproduction.getReproductionData(creature1.id);
      const data2 = reproduction.getReproductionData(creature2.id);

      expect(data1).toBeUndefined();
      expect(data2).toBeUndefined();

      const stats = reproduction.getStatistics();
      expect(stats.totalCreatures).toBe(0);
    });

    it("should handle very old creatures", () => {
      const oldCreature = new MockCreature("old", 0, 0, 80, 1000); // Very old
      reproduction.initializeCreature(oldCreature);

      reproduction.update([oldCreature], 10);

      const reproData = reproduction.getReproductionData(oldCreature.id)!;
      expect(reproData.state).toBe(ReproductionState.INFERTILE);
    });
  });
});
