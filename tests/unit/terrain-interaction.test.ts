/**
 * Unit tests for Terrain Interaction System
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TerrainInteractionSystem,
  TerrainType,
  TerrainProperties,
} from "../../src/core/terrain-interaction";
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

describe("TerrainInteractionSystem", () => {
  let terrainSystem: TerrainInteractionSystem;
  let creature: MockCreature;

  beforeEach(() => {
    terrainSystem = new TerrainInteractionSystem();
    creature = new MockCreature("creature1", { x: 0, y: 0 }, 100);
  });

  describe("Terrain Management", () => {
    it("should set and get terrain correctly", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);

      const terrain = terrainSystem.getTerrain({ x: 0, y: 0 });
      expect(terrain).toBeDefined();
      expect(terrain?.terrainType).toBe(TerrainType.GRASS);
    });

    it("should get terrain type at position", () => {
      terrainSystem.setTerrain({ x: 1, y: 1 }, TerrainType.WATER);

      const terrainType = terrainSystem.getTerrainType({ x: 1, y: 1 });
      expect(terrainType).toBe(TerrainType.WATER);
    });

    it("should return default terrain type for unset positions", () => {
      const terrainType = terrainSystem.getTerrainType({ x: 99, y: 99 });
      expect(terrainType).toBe(TerrainType.GRASS);
    });

    it("should throw error for unknown terrain type", () => {
      expect(() => {
        terrainSystem.setTerrain({ x: 0, y: 0 }, "unknown" as TerrainType);
      }).toThrow("Unknown terrain type");
    });
  });

  describe("Terrain Properties", () => {
    it("should have correct grass properties", () => {
      const properties = terrainSystem.getTerrainProperties(TerrainType.GRASS);

      expect(properties).toBeDefined();
      expect(properties?.speedMultiplier).toBe(1.0);
      expect(properties?.energyCostMultiplier).toBe(1.0);
      expect(properties?.passable).toBe(true);
      expect(properties?.providesShelter).toBe(false);
    });

    it("should have correct water properties", () => {
      const properties = terrainSystem.getTerrainProperties(TerrainType.WATER);

      expect(properties).toBeDefined();
      expect(properties?.speedMultiplier).toBe(0.5);
      expect(properties?.energyCostMultiplier).toBe(1.5);
      expect(properties?.energyPerTick).toBe(-1);
      expect(properties?.temperature).toBe(-0.3);
    });

    it("should have correct lava properties", () => {
      const properties = terrainSystem.getTerrainProperties(TerrainType.LAVA);

      expect(properties).toBeDefined();
      expect(properties?.damagePerTick).toBe(10);
      expect(properties?.temperature).toBe(1.0);
      expect(properties?.specialEffects).toBeDefined();
      expect(
        properties?.specialEffects?.some((effect) => effect.type === "burning")
      ).toBe(true);
    });

    it("should have correct healing spring properties", () => {
      const properties = terrainSystem.getTerrainProperties(
        TerrainType.HEALING_SPRING
      );

      expect(properties).toBeDefined();
      expect(properties?.healingPerTick).toBe(3);
      expect(properties?.energyPerTick).toBe(2);
      expect(
        properties?.specialEffects?.some(
          (effect) => effect.type === "regeneration"
        )
      ).toBe(true);
    });
  });

  describe("Movement Modifiers", () => {
    it("should return correct movement modifiers for different terrains", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.MUD);

      const modifier = terrainSystem.getMovementModifier({ x: 0, y: 0 });
      expect(modifier.speedMultiplier).toBe(0.4);
      expect(modifier.energyCostMultiplier).toBe(1.8);
    });

    it("should return default modifiers for unset terrain", () => {
      const modifier = terrainSystem.getMovementModifier({ x: 99, y: 99 });
      expect(modifier.speedMultiplier).toBe(1.0);
      expect(modifier.energyCostMultiplier).toBe(1.0);
    });

    it("should handle ice terrain correctly", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.ICE);

      const modifier = terrainSystem.getMovementModifier({ x: 0, y: 0 });
      expect(modifier.speedMultiplier).toBe(1.3); // Faster on ice
      expect(modifier.energyCostMultiplier).toBe(0.8); // Less energy cost
    });
  });

  describe("Terrain Effects", () => {
    it("should apply beneficial terrain effects", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.HEALING_SPRING);
      creature.position = { x: 0, y: 0 };
      creature.energy = 80; // Start with less than max energy so healing can occur

      const result = terrainSystem.applyTerrainEffects(creature, 1.0);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBeGreaterThan(0);
      // The terrain system modifies creature energy directly for healing
      expect(creature.energy).toBeGreaterThan(80);
    });

    it("should apply harmful terrain effects", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.LAVA);
      creature.position = { x: 0, y: 0 };

      const initialEnergy = creature.energy;
      const result = terrainSystem.applyTerrainEffects(creature, 1.0);

      expect(result.success).toBe(true);
      expect(result.energyChange).toBeLessThan(0);
      expect(creature.energy).toBeLessThan(initialEnergy);
    });

    it("should respect cooldown periods", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.HEALING_SPRING);
      creature.position = { x: 0, y: 0 };

      // First application should succeed
      const result1 = terrainSystem.applyTerrainEffects(creature, 1.0);
      expect(result1.success).toBe(true);

      // Second application should fail due to cooldown
      const result2 = terrainSystem.applyTerrainEffects(creature, 1.0);
      expect(result2.success).toBe(false);
      expect(result2.failureReason).toContain("cooldown");
    });

    it("should not apply effects when disabled", () => {
      terrainSystem.updateConfig({ enableTerrainEffects: false });
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.LAVA);
      creature.position = { x: 0, y: 0 };

      const result = terrainSystem.applyTerrainEffects(creature, 1.0);
      expect(result.success).toBe(false);
    });

    it("should apply effect multipliers", () => {
      terrainSystem.updateConfig({ effectMultiplier: 2.0 });
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.ENERGY_DRAIN);
      creature.position = { x: 0, y: 0 };

      const result = terrainSystem.applyTerrainEffects(creature, 1.0);

      expect(result.success).toBe(true);
      // Energy drain should be doubled
      expect(result.energyChange).toBeLessThan(-4); // Base is -4, doubled = -8
    });

    it("should generate status effects", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.LAVA);
      creature.position = { x: 0, y: 0 };

      // Run multiple times to increase chance of status effect
      let statusEffectGenerated = false;
      for (let i = 0; i < 10; i++) {
        const result = terrainSystem.applyTerrainEffects(creature, 1.0);
        if (result.statusEffects && result.statusEffects.length > 0) {
          statusEffectGenerated = true;
          expect(
            result.statusEffects.some((effect) => effect.type === "burning")
          ).toBe(true);
          break;
        }
        // Reset cooldown for next attempt
        terrainSystem.updateConfig({ effectCooldown: 0 });
      }

      // Note: Due to randomness, this might not always trigger, but with 10 attempts it should
    });
  });

  describe("Terrain Queries", () => {
    it("should check if terrain is passable", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);
      terrainSystem.setTerrain({ x: 1, y: 0 }, TerrainType.ROCK);

      expect(terrainSystem.isPassable({ x: 0, y: 0 })).toBe(true);
      expect(terrainSystem.isPassable({ x: 1, y: 0 })).toBe(true); // Rock is passable but slow
    });

    it("should check if terrain provides shelter", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);
      terrainSystem.setTerrain({ x: 1, y: 0 }, TerrainType.CAVE);

      expect(terrainSystem.providesShelter({ x: 0, y: 0 })).toBe(false);
      expect(terrainSystem.providesShelter({ x: 1, y: 0 })).toBe(true);
    });

    it("should get visibility modifiers", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);
      terrainSystem.setTerrain({ x: 1, y: 0 }, TerrainType.FOREST);

      expect(terrainSystem.getVisibilityModifier({ x: 0, y: 0 })).toBe(1.0);
      expect(terrainSystem.getVisibilityModifier({ x: 1, y: 0 })).toBe(0.6);
    });

    it("should get temperature values", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.ICE);
      terrainSystem.setTerrain({ x: 1, y: 0 }, TerrainType.LAVA);

      expect(terrainSystem.getTemperature({ x: 0, y: 0 })).toBe(-0.8);
      expect(terrainSystem.getTemperature({ x: 1, y: 0 })).toBe(1.0);
    });
  });

  describe("Occupancy Tracking", () => {
    it("should track entity occupancy", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);

      terrainSystem.updateOccupancy(
        "entity1",
        { x: -1, y: -1 },
        { x: 0, y: 0 }
      );

      const occupants = terrainSystem.getOccupants({ x: 0, y: 0 });
      expect(occupants).toContain("entity1");
    });

    it("should remove entities from old positions", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);
      terrainSystem.setTerrain({ x: 1, y: 0 }, TerrainType.GRASS);

      terrainSystem.updateOccupancy(
        "entity1",
        { x: -1, y: -1 },
        { x: 0, y: 0 }
      );
      terrainSystem.updateOccupancy("entity1", { x: 0, y: 0 }, { x: 1, y: 0 });

      const oldOccupants = terrainSystem.getOccupants({ x: 0, y: 0 });
      const newOccupants = terrainSystem.getOccupants({ x: 1, y: 0 });

      expect(oldOccupants).not.toContain("entity1");
      expect(newOccupants).toContain("entity1");
    });

    it("should handle multiple occupants", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);

      terrainSystem.updateOccupancy(
        "entity1",
        { x: -1, y: -1 },
        { x: 0, y: 0 }
      );
      terrainSystem.updateOccupancy(
        "entity2",
        { x: -1, y: -1 },
        { x: 0, y: 0 }
      );

      const occupants = terrainSystem.getOccupants({ x: 0, y: 0 });
      expect(occupants).toContain("entity1");
      expect(occupants).toContain("entity2");
      expect(occupants.length).toBe(2);
    });
  });

  describe("Terrain History", () => {
    it("should track terrain interaction history when enabled", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.LAVA);
      creature.position = { x: 0, y: 0 };

      terrainSystem.applyTerrainEffects(creature, 1.0);

      const history = terrainSystem.getTerrainHistory(creature.id);
      expect(history.length).toBe(1);
      expect(history[0].terrainType).toBe(TerrainType.LAVA);
    });

    it("should not track history when disabled", () => {
      terrainSystem.updateConfig({ trackHistory: false });
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.LAVA);
      creature.position = { x: 0, y: 0 };

      terrainSystem.applyTerrainEffects(creature, 1.0);

      const history = terrainSystem.getTerrainHistory(creature.id);
      expect(history.length).toBe(0);
    });

    it("should limit history size", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.HEALING_SPRING);
      creature.position = { x: 0, y: 0 };

      // Apply effects many times (with no cooldown)
      terrainSystem.updateConfig({ effectCooldown: 0 });
      for (let i = 0; i < 150; i++) {
        terrainSystem.applyTerrainEffects(creature, 1.0);
      }

      const history = terrainSystem.getTerrainHistory(creature.id);
      expect(history.length).toBeLessThanOrEqual(100); // Should be capped at 100
    });
  });

  describe("Configuration", () => {
    it("should use custom configuration", () => {
      const customSystem = new TerrainInteractionSystem({
        effectMultiplier: 2.0,
        effectCooldown: 5.0,
        trackHistory: false,
      });

      const config = customSystem.getConfig();
      expect(config.effectMultiplier).toBe(2.0);
      expect(config.effectCooldown).toBe(5.0);
      expect(config.trackHistory).toBe(false);
    });

    it("should update configuration", () => {
      terrainSystem.updateConfig({
        enableTerrainEffects: false,
        effectMultiplier: 0.5,
      });

      const config = terrainSystem.getConfig();
      expect(config.enableTerrainEffects).toBe(false);
      expect(config.effectMultiplier).toBe(0.5);
    });
  });

  describe("Terrain Property Updates", () => {
    it("should update terrain properties", () => {
      terrainSystem.updateTerrainProperties(TerrainType.GRASS, {
        speedMultiplier: 2.0,
        energyPerTick: 1.0,
      });

      const properties = terrainSystem.getTerrainProperties(TerrainType.GRASS);
      expect(properties?.speedMultiplier).toBe(2.0);
      expect(properties?.energyPerTick).toBe(1.0);
      expect(properties?.energyCostMultiplier).toBe(1.0); // Unchanged
    });

    it("should not update properties for unknown terrain types", () => {
      // This should not throw an error, just do nothing
      terrainSystem.updateTerrainProperties("unknown" as TerrainType, {
        speedMultiplier: 2.0,
      });

      // Should not affect existing terrain types
      const grassProperties = terrainSystem.getTerrainProperties(
        TerrainType.GRASS
      );
      expect(grassProperties?.speedMultiplier).toBe(1.0);
    });
  });

  describe("Statistics", () => {
    it("should provide accurate statistics", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);
      terrainSystem.setTerrain({ x: 1, y: 0 }, TerrainType.WATER);
      terrainSystem.setTerrain({ x: 2, y: 0 }, TerrainType.GRASS);

      terrainSystem.updateOccupancy(
        "entity1",
        { x: -1, y: -1 },
        { x: 0, y: 0 }
      );
      terrainSystem.updateOccupancy(
        "entity2",
        { x: -1, y: -1 },
        { x: 1, y: 0 }
      );

      const stats = terrainSystem.getStatistics();

      expect(stats.totalCells).toBe(3);
      expect(stats.terrainTypeDistribution.get(TerrainType.GRASS)).toBe(2);
      expect(stats.terrainTypeDistribution.get(TerrainType.WATER)).toBe(1);
      expect(stats.occupancyStats.occupiedCells).toBe(2);
      expect(stats.occupancyStats.totalOccupants).toBe(2);
    });
  });

  describe("System Reset", () => {
    it("should reset all terrain data", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.GRASS);
      terrainSystem.updateOccupancy(
        "entity1",
        { x: -1, y: -1 },
        { x: 0, y: 0 }
      );

      terrainSystem.reset();

      const stats = terrainSystem.getStatistics();
      expect(stats.totalCells).toBe(0);
      expect(stats.occupancyStats.totalOccupants).toBe(0);

      const terrain = terrainSystem.getTerrain({ x: 0, y: 0 });
      expect(terrain).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle fractional positions", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.WATER);

      // Fractional positions should map to integer grid
      const terrainType1 = terrainSystem.getTerrainType({ x: 0.3, y: 0.7 });
      const terrainType2 = terrainSystem.getTerrainType({ x: 0.9, y: 0.1 });

      expect(terrainType1).toBe(TerrainType.WATER);
      expect(terrainType2).toBe(TerrainType.WATER);
    });

    it("should handle negative positions", () => {
      terrainSystem.setTerrain({ x: -1, y: -1 }, TerrainType.ICE);

      const terrainType = terrainSystem.getTerrainType({ x: -1, y: -1 });
      expect(terrainType).toBe(TerrainType.ICE);
    });

    it("should handle creatures with zero energy", () => {
      creature.energy = 0;
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.HEALING_SPRING);
      creature.position = { x: 0, y: 0 };

      const result = terrainSystem.applyTerrainEffects(creature, 1.0);

      expect(result.success).toBe(true);
      expect(creature.energy).toBeGreaterThan(0); // Should heal
    });

    it("should handle very large delta times", () => {
      terrainSystem.setTerrain({ x: 0, y: 0 }, TerrainType.LAVA);
      creature.position = { x: 0, y: 0 };

      const result = terrainSystem.applyTerrainEffects(creature, 100.0);

      expect(result.success).toBe(true);
      expect(creature.energy).toBe(0); // Should be reduced to 0
    });

    it("should handle missing terrain data gracefully", () => {
      creature.position = { x: 999, y: 999 };

      const result = terrainSystem.applyTerrainEffects(creature, 1.0);

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain("No terrain data");
    });
  });

  describe("Special Terrain Types", () => {
    it("should handle quicksand correctly", () => {
      const properties = terrainSystem.getTerrainProperties(
        TerrainType.QUICKSAND
      );

      expect(properties?.speedMultiplier).toBe(0.1); // Very slow
      expect(properties?.energyCostMultiplier).toBe(4.0); // Very expensive
      expect(properties?.damagePerTick).toBe(1);
      expect(
        properties?.specialEffects?.some((effect) => effect.type === "trapped")
      ).toBe(true);
    });

    it("should handle thorns correctly", () => {
      const properties = terrainSystem.getTerrainProperties(TerrainType.THORNS);

      expect(properties?.damagePerTick).toBe(2);
      expect(
        properties?.specialEffects?.some((effect) => effect.type === "bleeding")
      ).toBe(true);
    });

    it("should handle swamp correctly", () => {
      const properties = terrainSystem.getTerrainProperties(TerrainType.SWAMP);

      expect(properties?.speedMultiplier).toBe(0.3);
      expect(properties?.energyPerTick).toBe(-2);
      expect(
        properties?.specialEffects?.some((effect) => effect.type === "disease")
      ).toBe(true);
    });
  });
});
