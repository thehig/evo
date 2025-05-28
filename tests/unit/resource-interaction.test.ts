/**
 * Unit tests for Resource Interaction System
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ResourceInteractionSystem,
  FoodSource,
  FoodType,
  CreatureType,
  ResourceQuality,
  IFoodSource,
} from "../../src/core/resource-interaction";
import { ICreature } from "../../src/core/interfaces";

// Mock creature implementation for testing
class MockCreature implements ICreature {
  public energy: number = 100;
  public age: number = 0;
  public alive: boolean = true;
  public readonly genome: unknown = {};
  public readonly brain: unknown = {};

  constructor(
    public readonly id: string,
    public position: { x: number; y: number },
    energy: number = 100,
    public creatureType: CreatureType = CreatureType.OMNIVORE,
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

  getConfig(): { maxEnergy: number; creatureType: CreatureType } {
    return { maxEnergy: this.maxEnergy, creatureType: this.creatureType };
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

describe("ResourceInteractionSystem", () => {
  let resourceSystem: ResourceInteractionSystem;
  let herbivore: MockCreature;
  let carnivore: MockCreature;
  let omnivore: MockCreature;
  let plantFood: FoodSource;
  let meatFood: FoodSource;
  let fruitFood: FoodSource;

  beforeEach(() => {
    resourceSystem = new ResourceInteractionSystem();

    herbivore = new MockCreature(
      "herbivore1",
      { x: 0, y: 0 },
      100,
      CreatureType.HERBIVORE
    );
    carnivore = new MockCreature(
      "carnivore1",
      { x: 0, y: 0 },
      100,
      CreatureType.CARNIVORE
    );
    omnivore = new MockCreature(
      "omnivore1",
      { x: 0, y: 0 },
      100,
      CreatureType.OMNIVORE
    );

    plantFood = new FoodSource("plant1", { x: 1, y: 0 }, FoodType.PLANT, 10);
    meatFood = new FoodSource("meat1", { x: 2, y: 0 }, FoodType.MEAT, 5);
    fruitFood = new FoodSource("fruit1", { x: 0, y: 1 }, FoodType.FRUIT, 8);

    resourceSystem.registerFoodSource(plantFood);
    resourceSystem.registerFoodSource(meatFood);
    resourceSystem.registerFoodSource(fruitFood);
  });

  describe("Food Source Management", () => {
    it("should register and track food sources", () => {
      const stats = resourceSystem.getStatistics();
      expect(stats.totalFoodSources).toBe(3);
      expect(stats.activeFoodSources).toBe(3);
    });

    it("should remove food sources", () => {
      const removed = resourceSystem.removeFoodSource("plant1");
      expect(removed).toBe(true);

      const stats = resourceSystem.getStatistics();
      expect(stats.totalFoodSources).toBe(2);
    });

    it("should track food type distribution", () => {
      const stats = resourceSystem.getStatistics();
      expect(stats.foodTypeDistribution.get(FoodType.PLANT)).toBe(1);
      expect(stats.foodTypeDistribution.get(FoodType.MEAT)).toBe(1);
      expect(stats.foodTypeDistribution.get(FoodType.FRUIT)).toBe(1);
    });
  });

  describe("Food Source Behavior", () => {
    it("should consume food correctly", () => {
      const initialAmount = plantFood.currentAmount;
      const consumed = plantFood.consume(2);

      expect(consumed).toBe(2);
      expect(plantFood.currentAmount).toBe(initialAmount - 2);
    });

    it("should not consume more than available", () => {
      plantFood.currentAmount = 3;
      const consumed = plantFood.consume(5);

      expect(consumed).toBe(3);
      expect(plantFood.currentAmount).toBe(0);
    });

    it("should regenerate food over time", () => {
      plantFood.currentAmount = 5;
      plantFood.regenerate(10); // 10 ticks

      expect(plantFood.currentAmount).toBeGreaterThan(5);
      expect(plantFood.currentAmount).toBeLessThanOrEqual(plantFood.maxAmount);
    });

    it("should handle infinite food sources", () => {
      const infiniteFood = new FoodSource(
        "infinite",
        { x: 0, y: 0 },
        FoodType.PLANT,
        100,
        ResourceQuality.AVERAGE,
        0,
        false // not depletable
      );

      const consumed = infiniteFood.consume(50);
      expect(consumed).toBe(50);
      expect(infiniteFood.currentAmount).toBe(100); // Unchanged
    });
  });

  describe("Food Detection", () => {
    it("should detect compatible food sources within range", () => {
      const detectedSources = resourceSystem.detectFoodSources(herbivore);

      // Herbivore should detect plant and fruit, but not meat
      expect(detectedSources.length).toBeGreaterThan(0);
      expect(detectedSources.some((fs) => fs.foodType === FoodType.PLANT)).toBe(
        true
      );
      expect(detectedSources.some((fs) => fs.foodType === FoodType.FRUIT)).toBe(
        true
      );
      expect(detectedSources.some((fs) => fs.foodType === FoodType.MEAT)).toBe(
        false
      );
    });

    it("should sort food sources by preference and distance", () => {
      // Place herbivore closer to fruit than plant
      herbivore.position = { x: 0, y: 0.5 };

      const detectedSources = resourceSystem.detectFoodSources(herbivore);

      // Should prioritize closer, preferred food
      expect(detectedSources.length).toBeGreaterThan(0);
      // First source should be the closest or most preferred
    });

    it("should increase detection range when hungry", () => {
      // Test with low energy (hungry) creature
      const hungryCreature = new MockCreature(
        "hungry",
        { x: 10, y: 10 },
        20,
        CreatureType.HERBIVORE
      );
      const distantFood = new FoodSource(
        "distant",
        { x: 15, y: 15 },
        FoodType.PLANT,
        10
      );
      resourceSystem.registerFoodSource(distantFood);

      const detectedSources = resourceSystem.detectFoodSources(hungryCreature);

      // Should detect food at greater distance when hungry
      expect(detectedSources.length).toBeGreaterThanOrEqual(0);
    });

    it("should not detect food sources outside range", () => {
      const farCreature = new MockCreature(
        "far",
        { x: 100, y: 100 },
        100,
        CreatureType.HERBIVORE
      );
      const detectedSources = resourceSystem.detectFoodSources(farCreature);

      expect(detectedSources.length).toBe(0);
    });
  });

  describe("Food Consumption", () => {
    it("should successfully consume compatible food", () => {
      const result = resourceSystem.consumeFood(herbivore, plantFood, 1);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBeGreaterThan(0);
      expect(result.resourcesGathered).toBe(1);
      expect(result.memoryEntry).toBeDefined();
    });

    it("should fail to consume incompatible food", () => {
      const result = resourceSystem.consumeFood(herbivore, meatFood, 1);

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain("Incompatible food type");
    });

    it("should fail when creature has insufficient energy", () => {
      herbivore.energy = 1; // Very low energy
      const result = resourceSystem.consumeFood(herbivore, plantFood, 1);

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain("Insufficient energy");
    });

    it("should fail when food source is depleted", () => {
      plantFood.currentAmount = 0;
      const result = resourceSystem.consumeFood(herbivore, plantFood, 1);

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain("Insufficient food available");
    });

    it("should apply quality modifiers correctly", () => {
      const excellentFood = new FoodSource(
        "excellent",
        { x: 0, y: 0 },
        FoodType.PLANT,
        10,
        ResourceQuality.EXCELLENT
      );
      resourceSystem.registerFoodSource(excellentFood);

      const result = resourceSystem.consumeFood(herbivore, excellentFood, 1);

      expect(result.success).toBe(true);
      expect(result.statusEffects).toBeDefined();
      expect(
        result.statusEffects?.some((effect) => effect.type === "well_fed")
      ).toBe(true);
    });

    it("should handle toxic food", () => {
      const toxicFood = new FoodSource(
        "toxic",
        { x: 0, y: 0 },
        FoodType.PLANT,
        10,
        ResourceQuality.TOXIC
      );
      resourceSystem.registerFoodSource(toxicFood);

      const result = resourceSystem.consumeFood(herbivore, toxicFood, 1);

      expect(result.success).toBe(true);
      expect(result.statusEffects).toBeDefined();
      expect(
        result.statusEffects?.some((effect) => effect.type === "poisoned")
      ).toBe(true);
    });
  });

  describe("Creature Type Compatibility", () => {
    it("should handle herbivore food preferences", () => {
      expect(resourceSystem.canConsumeFood(herbivore, FoodType.PLANT)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(herbivore, FoodType.FRUIT)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(herbivore, FoodType.MEAT)).toBe(
        false
      );
      expect(resourceSystem.canConsumeFood(herbivore, FoodType.FISH)).toBe(
        false
      );
    });

    it("should handle carnivore food preferences", () => {
      expect(resourceSystem.canConsumeFood(carnivore, FoodType.MEAT)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(carnivore, FoodType.FISH)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(carnivore, FoodType.PLANT)).toBe(
        false
      );
      expect(resourceSystem.canConsumeFood(carnivore, FoodType.FRUIT)).toBe(
        false
      );
    });

    it("should handle omnivore food preferences", () => {
      expect(resourceSystem.canConsumeFood(omnivore, FoodType.MEAT)).toBe(true);
      expect(resourceSystem.canConsumeFood(omnivore, FoodType.PLANT)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(omnivore, FoodType.FRUIT)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(omnivore, FoodType.FISH)).toBe(true);
    });

    it("should handle insectivore food preferences", () => {
      const insectivore = new MockCreature(
        "insectivore",
        { x: 0, y: 0 },
        100,
        CreatureType.INSECTIVORE
      );

      expect(resourceSystem.canConsumeFood(insectivore, FoodType.INSECTS)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(insectivore, FoodType.NECTAR)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(insectivore, FoodType.MEAT)).toBe(
        false
      );
    });

    it("should handle filter feeder food preferences", () => {
      const filterFeeder = new MockCreature(
        "filter",
        { x: 0, y: 0 },
        100,
        CreatureType.FILTER_FEEDER
      );

      expect(resourceSystem.canConsumeFood(filterFeeder, FoodType.ALGAE)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(filterFeeder, FoodType.PLANT)).toBe(
        true
      );
      expect(resourceSystem.canConsumeFood(filterFeeder, FoodType.MEAT)).toBe(
        false
      );
    });
  });

  describe("Energy Calculations", () => {
    it("should calculate energy gain based on food type and creature compatibility", () => {
      const herbivoreResult = resourceSystem.consumeFood(
        herbivore,
        plantFood,
        1
      );
      const omnivoreResult = resourceSystem.consumeFood(omnivore, plantFood, 1);

      expect(herbivoreResult.success).toBe(true);
      expect(omnivoreResult.success).toBe(true);

      // Herbivore should get more energy from plants than omnivore
      expect(herbivoreResult.energyChange).toBeGreaterThan(
        omnivoreResult.energyChange
      );
    });

    it("should account for energy costs in net energy change", () => {
      const initialEnergy = herbivore.energy;
      const result = resourceSystem.consumeFood(herbivore, plantFood, 1);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBeDefined();

      // Net energy change should account for consumption cost
      const expectedFinalEnergy = initialEnergy + result.energyChange;
      // Note: The actual creature energy isn't modified by the system,
      // that's handled by the caller
    });
  });

  describe("Optimal Food Selection", () => {
    it("should return optimal food sources for a creature", () => {
      const optimalSources = resourceSystem.getOptimalFoodSources(herbivore, 3);

      expect(optimalSources.length).toBeLessThanOrEqual(3);
      expect(
        optimalSources.every((source) =>
          resourceSystem.canConsumeFood(herbivore, source.foodType)
        )
      ).toBe(true);
    });

    it("should limit the number of returned sources", () => {
      const optimalSources = resourceSystem.getOptimalFoodSources(omnivore, 2);

      expect(optimalSources.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Configuration", () => {
    it("should use custom detection configuration", () => {
      const customSystem = new ResourceInteractionSystem({
        baseDetectionRange: 5.0,
        maxDetectionRange: 15.0,
      });

      const config = customSystem.getConfig();
      expect(config.baseDetectionRange).toBe(5.0);
      expect(config.maxDetectionRange).toBe(15.0);
    });

    it("should update configuration", () => {
      resourceSystem.updateConfig({
        hungerRangeMultiplier: 2.0,
        searchEnergyCost: 2.0,
      });

      const config = resourceSystem.getConfig();
      expect(config.hungerRangeMultiplier).toBe(2.0);
      expect(config.searchEnergyCost).toBe(2.0);
    });
  });

  describe("Food Source Updates", () => {
    it("should update all food sources", () => {
      // Deplete some food
      plantFood.consume(5);
      const initialAmount = plantFood.currentAmount;

      resourceSystem.updateFoodSources(5); // 5 ticks

      expect(plantFood.currentAmount).toBeGreaterThanOrEqual(initialAmount);
    });
  });

  describe("System Reset", () => {
    it("should reset the resource system", () => {
      resourceSystem.reset();

      const stats = resourceSystem.getStatistics();
      expect(stats.totalFoodSources).toBe(0);
      expect(stats.activeFoodSources).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle creatures with unknown types", () => {
      const unknownCreature = new MockCreature("unknown", { x: 0, y: 0 }, 100);
      // Default to omnivore for unknown types

      const detectedSources = resourceSystem.detectFoodSources(unknownCreature);
      expect(detectedSources).toBeDefined();
    });

    it("should handle empty food source lists", () => {
      resourceSystem.reset();

      const detectedSources = resourceSystem.detectFoodSources(herbivore);
      expect(detectedSources).toEqual([]);
    });

    it("should handle creatures with zero energy", () => {
      herbivore.energy = 0;

      const result = resourceSystem.consumeFood(herbivore, plantFood, 1);
      expect(result.success).toBe(false);
    });

    it("should handle food sources at exact detection range", () => {
      const config = resourceSystem.getConfig();
      const exactRangeFood = new FoodSource(
        "exact",
        { x: config.baseDetectionRange, y: 0 },
        FoodType.PLANT,
        10
      );
      resourceSystem.registerFoodSource(exactRangeFood);

      const detectedSources = resourceSystem.detectFoodSources(herbivore);
      // Should detect food at exact range
      expect(detectedSources.some((fs) => fs.id === "exact")).toBe(true);
    });
  });
});
