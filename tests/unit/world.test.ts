/**
 * Tests for the World class
 */

import { World } from "../../src/world/World";
import { Random } from "../../src/core/random";
import { IEntity, ICreature } from "../../src/core/interfaces";
import {
  TerrainType,
  Position,
  WorldConfig,
  WorldGenerationOptions,
} from "../../src/world/types";

// Mock entity for testing
class MockEntity implements IEntity {
  constructor(
    public id: string,
    public position: Position,
    public active: boolean = true
  ) {}

  update(_deltaTime: number): void {
    // Mock implementation
  }

  destroy(): void {
    this.active = false;
  }
}

// Mock creature for testing
class MockCreature implements ICreature {
  public genome: unknown = null;
  public brain: unknown = null;
  public energy: number = 1.0;
  public age: number = 0;
  public alive: boolean = true;

  constructor(
    public id: string,
    public position: Position,
    public active: boolean = true
  ) {}

  update(_deltaTime: number): void {
    this.age++;
  }

  destroy(): void {
    this.active = false;
    this.alive = false;
  }

  reproduce(_partner: ICreature): ICreature | null {
    return null;
  }

  think(): void {
    // Mock implementation
  }

  act(): void {
    // Mock implementation
  }
}

describe("World", () => {
  let random: Random;
  let world: World;

  beforeEach(() => {
    random = new Random(12345);
    world = new World(random, { width: 20, height: 20, useChunking: false });
  });

  describe("Basic Properties", () => {
    it("should have correct dimensions", () => {
      expect(world.width).toBe(20);
      expect(world.height).toBe(20);
    });

    it("should start with no entities", () => {
      expect(world.entities).toHaveLength(0);
      expect(world.creatures).toHaveLength(0);
    });

    it("should start at tick 0", () => {
      expect(world.currentTick).toBe(0);
    });
  });

  describe("Entity Management", () => {
    it("should add entity successfully", () => {
      const entity = new MockEntity("test1", { x: 5, y: 5 });

      world.addEntity(entity);

      expect(world.entities).toHaveLength(1);
      expect(world.getEntity("test1")).toBe(entity);
    });

    it("should add creature successfully", () => {
      const creature = new MockCreature("creature1", { x: 10, y: 10 });

      world.addEntity(creature);

      expect(world.entities).toHaveLength(1);
      expect(world.creatures).toHaveLength(1);
      expect(world.getEntity("creature1")).toBe(creature);
    });

    it("should throw error for duplicate entity ID", () => {
      const entity1 = new MockEntity("duplicate", { x: 5, y: 5 });
      const entity2 = new MockEntity("duplicate", { x: 10, y: 10 });

      world.addEntity(entity1);

      expect(() => world.addEntity(entity2)).toThrow(
        "Entity with ID duplicate already exists"
      );
    });

    it("should throw error for invalid position", () => {
      const entity = new MockEntity("invalid", { x: -1, y: 5 });

      expect(() => world.addEntity(entity)).toThrow("Invalid position (-1, 5)");
    });

    it("should remove entity successfully", () => {
      const entity = new MockEntity("remove", { x: 5, y: 5 });

      world.addEntity(entity);
      expect(world.entities).toHaveLength(1);

      const removed = world.removeEntity("remove");
      expect(removed).toBe(true);
      expect(world.entities).toHaveLength(0);
      expect(world.getEntity("remove")).toBeUndefined();
    });

    it("should return false when removing non-existent entity", () => {
      const removed = world.removeEntity("nonexistent");
      expect(removed).toBe(false);
    });
  });

  describe("Entity Queries", () => {
    beforeEach(() => {
      // Add test entities
      world.addEntity(new MockEntity("center", { x: 10, y: 10 }));
      world.addEntity(new MockEntity("near1", { x: 11, y: 10 }));
      world.addEntity(new MockEntity("near2", { x: 10, y: 11 }));
      world.addEntity(new MockEntity("far", { x: 15, y: 15 }));
      world.addEntity(new MockCreature("creature", { x: 12, y: 10 }));
    });

    it("should find entities in radius", () => {
      const entities = world.getEntitiesInRadius({ x: 10, y: 10 }, 2);

      expect(entities).toHaveLength(4); // center, near1, near2, creature
      expect(entities.map((e) => e.id)).toContain("center");
      expect(entities.map((e) => e.id)).toContain("near1");
      expect(entities.map((e) => e.id)).toContain("near2");
      expect(entities.map((e) => e.id)).toContain("creature");
      expect(entities.map((e) => e.id)).not.toContain("far");
    });

    it("should query entities with advanced filtering", () => {
      const result = world.queryEntities({
        position: { x: 10, y: 10 },
        radius: 3,
        entityType: "creature",
        activeOnly: true,
      });

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].id).toBe("creature");
      expect(result.distances).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it("should respect query limit", () => {
      const result = world.queryEntities({
        position: { x: 10, y: 10 },
        radius: 5,
        limit: 2,
      });

      expect(result.entities).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it("should filter inactive entities", () => {
      const inactiveEntity = new MockEntity("inactive", { x: 9, y: 10 }, false);
      world.addEntity(inactiveEntity);

      const result = world.queryEntities({
        position: { x: 10, y: 10 },
        radius: 2,
        activeOnly: true,
      });

      expect(result.entities.map((e) => e.id)).not.toContain("inactive");
    });
  });

  describe("Terrain System", () => {
    it("should have terrain at all positions", () => {
      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          const terrain = world.getTerrainAt(x, y);
          expect(terrain).not.toBeNull();
          expect(Object.values(TerrainType)).toContain(terrain!);
        }
      }
    });

    it("should return null for invalid positions", () => {
      expect(world.getTerrainAt(-1, 0)).toBeNull();
      expect(world.getTerrainAt(0, -1)).toBeNull();
      expect(world.getTerrainAt(world.width, 0)).toBeNull();
      expect(world.getTerrainAt(0, world.height)).toBeNull();
    });

    it("should have consistent terrain generation with same seed", () => {
      const world1 = new World(new Random(12345), { width: 10, height: 10 });
      const world2 = new World(new Random(12345), { width: 10, height: 10 });

      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(world1.getTerrainAt(x, y)).toBe(world2.getTerrainAt(x, y));
        }
      }
    });
  });

  describe("Resource System", () => {
    it("should have resources distributed in world", () => {
      let totalResources = 0;

      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          const resources = world.getResourcesAt(x, y);
          totalResources += resources.length;
        }
      }

      expect(totalResources).toBeGreaterThan(0);
    });

    it("should return empty array for invalid positions", () => {
      expect(world.getResourcesAt(-1, 0)).toEqual([]);
      expect(world.getResourcesAt(world.width, 0)).toEqual([]);
    });

    it("should regenerate resources over time", () => {
      // Find a cell with resources
      let resourceCell: { x: number; y: number } | null = null;

      for (let y = 0; y < world.height && !resourceCell; y++) {
        for (let x = 0; x < world.width && !resourceCell; x++) {
          const resources = world.getResourcesAt(x, y);
          if (resources.length > 0) {
            resourceCell = { x, y };
          }
        }
      }

      if (resourceCell) {
        const initialResources = world.getResourcesAt(
          resourceCell.x,
          resourceCell.y
        );
        const initialAmount = initialResources[0].amount;

        // Reduce resource amount
        initialResources[0].amount = Math.max(0, initialAmount - 10);

        // Update world multiple times
        for (let i = 0; i < 10; i++) {
          world.update(1);
        }

        const updatedResources = world.getResourcesAt(
          resourceCell.x,
          resourceCell.y
        );
        expect(updatedResources[0].amount).toBeGreaterThan(initialAmount - 10);
      }
    });
  });

  describe("Obstacle System", () => {
    it("should have some obstacles in world", () => {
      let obstacleCount = 0;

      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          if (world.hasObstacleAt(x, y)) {
            obstacleCount++;
          }
        }
      }

      expect(obstacleCount).toBeGreaterThan(0);
    });

    it("should consider out of bounds as obstacles", () => {
      expect(world.hasObstacleAt(-1, 0)).toBe(true);
      expect(world.hasObstacleAt(world.width, 0)).toBe(true);
      expect(world.hasObstacleAt(0, -1)).toBe(true);
      expect(world.hasObstacleAt(0, world.height)).toBe(true);
    });
  });

  describe("Entity Movement", () => {
    it("should handle entity movement correctly", () => {
      const entity = new MockEntity("mover", { x: 5, y: 5 });
      world.addEntity(entity);

      // Move entity
      entity.position.x = 6;
      entity.position.y = 6;

      world.update(1);

      // Entity should be in new position
      const entitiesAtOld = world.getEntitiesInRadius({ x: 5, y: 5 }, 0.1);
      const entitiesAtNew = world.getEntitiesInRadius({ x: 6, y: 6 }, 0.1);

      expect(entitiesAtOld).toHaveLength(0);
      expect(entitiesAtNew).toHaveLength(1);
      expect(entitiesAtNew[0]).toBe(entity);
    });

    it("should prevent movement to invalid positions", () => {
      const entity = new MockEntity("boundary", { x: 5, y: 5 });
      world.addEntity(entity);

      // Try to move out of bounds
      entity.position.x = -1;
      entity.position.y = -1;

      world.update(1);

      // Entity should be reverted to original position
      expect(entity.position.x).toBe(5);
      expect(entity.position.y).toBe(5);
    });
  });

  describe("World Update", () => {
    it("should increment tick on update", () => {
      const initialTick = world.currentTick;

      world.update(1);

      expect(world.currentTick).toBe(initialTick + 1);
    });

    it("should update all active entities", () => {
      const entity1 = new MockEntity("active", { x: 5, y: 5 }, true);
      const entity2 = new MockEntity("inactive", { x: 6, y: 6 }, false);

      let entity1Updated = false;
      let entity2Updated = false;

      entity1.update = () => {
        entity1Updated = true;
      };
      entity2.update = () => {
        entity2Updated = true;
      };

      world.addEntity(entity1);
      world.addEntity(entity2);

      world.update(1);

      expect(entity1Updated).toBe(true);
      expect(entity2Updated).toBe(false);
    });
  });

  describe("World Reset", () => {
    it("should reset world to initial state", () => {
      const entity = new MockEntity("test", { x: 5, y: 5 });
      world.addEntity(entity);

      world.update(1);
      world.update(1);

      expect(world.entities).toHaveLength(1);
      expect(world.currentTick).toBe(2);

      world.reset();

      expect(world.entities).toHaveLength(0);
      expect(world.currentTick).toBe(0);
      expect(entity.active).toBe(false); // Entity should be destroyed
    });
  });

  describe("World Statistics", () => {
    it("should provide accurate statistics", () => {
      const entity = new MockEntity("test", { x: 5, y: 5 });
      const creature = new MockCreature("creature", { x: 6, y: 6 });

      world.addEntity(entity);
      world.addEntity(creature);

      const stats = world.getStatistics();

      expect(stats.totalCells).toBe(400); // 20x20
      expect(stats.entityCount).toBe(2);
      expect(stats.creatureCount).toBe(1);
      expect(stats.currentTick).toBe(0);
      expect(stats.terrainCounts).toBeDefined();
      expect(stats.resourceCounts).toBeDefined();
      expect(stats.obstacleCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Chunking System", () => {
    it("should work with chunking enabled", () => {
      const chunkedWorld = new World(new Random(12345), {
        width: 32,
        height: 32,
        chunkSize: 16,
        useChunking: true,
      });

      const entity = new MockEntity("chunked", { x: 15, y: 15 });
      chunkedWorld.addEntity(entity);

      expect(chunkedWorld.entities).toHaveLength(1);
      expect(chunkedWorld.getEntity("chunked")).toBe(entity);

      const entitiesInRadius = chunkedWorld.getEntitiesInRadius(
        { x: 15, y: 15 },
        1
      );
      expect(entitiesInRadius).toHaveLength(1);
    });

    it("should handle entity movement across chunks", () => {
      const chunkedWorld = new World(new Random(12345), {
        width: 32,
        height: 32,
        chunkSize: 16,
        useChunking: true,
      });

      const entity = new MockEntity("crosser", { x: 15, y: 15 });
      chunkedWorld.addEntity(entity);

      // Move to different chunk
      entity.position.x = 17;
      entity.position.y = 17;

      chunkedWorld.update(1);

      const entitiesAtNew = chunkedWorld.getEntitiesInRadius(
        { x: 17, y: 17 },
        0.1
      );
      expect(entitiesAtNew).toHaveLength(1);
      expect(entitiesAtNew[0]).toBe(entity);
    });
  });

  describe("Configuration", () => {
    it("should use custom configuration", () => {
      const config: Partial<WorldConfig> = {
        width: 50,
        height: 30,
        resourceDensity: 0.2,
        obstacleDensity: 0.1,
      };

      const customWorld = new World(new Random(12345), config);

      expect(customWorld.width).toBe(50);
      expect(customWorld.height).toBe(30);

      const worldConfig = customWorld.getConfig();
      expect(worldConfig.resourceDensity).toBe(0.2);
      expect(worldConfig.obstacleDensity).toBe(0.1);
    });

    it("should use custom generation options", () => {
      const generationOptions: Partial<WorldGenerationOptions> = {
        terrainAlgorithm: "random",
        resourcePlacement: "random",
        obstaclePlacement: "random",
        smoothingPasses: 0,
      };

      const customWorld = new World(
        new Random(12345),
        { width: 10, height: 10 },
        generationOptions
      );

      // Should create world without errors
      expect(customWorld.width).toBe(10);
      expect(customWorld.height).toBe(10);
    });
  });
});
