import { describe, it, expect, beforeEach, afterEach } from "vitest"; // Added Vitest imports
// import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals"; // Removed for Vitest
import { Grid, Rock, Plant, Creature, Entity, Water } from "../src/grid"; // Adjusted import path
// Mock console.error to prevent log spamming
// let consoleErrorSpy: ReturnType<typeof vi.spyOn>; // Replaced jest.SpiedFunction
// let consoleLogSpy: ReturnType<typeof vi.spyOn>; // Replaced jest.SpiedFunction
let grid; // Declare grid here
beforeEach(() => {
    grid = new Grid(3, 2); // Test with a 3x2 grid
    // Console spies are now global from vitest.setup.ts
});
afterEach(() => {
    // Restore specific mocks if any were added in tests, otherwise, global console spies remain.
    // vi.restoreAllMocks(); // Might be too broad if only console spies from setup are used.
    // If tests in this file add their own spies, then vi.restoreAllMocks() is appropriate here.
    // For now, assuming only global console spies are used and they don't need per-test-file restoration.
});
describe("Grid", () => {
    //let grid: Grid; // Remove this line
    describe("constructor", () => {
        it("should create a grid with specified width and height", () => {
            expect(grid.width).toBe(3);
            expect(grid.height).toBe(2);
            expect(grid.cells.length).toBe(2); // height
            expect(grid.cells[0].length).toBe(3); // width
        });
        it("should initialize all cells to null", () => {
            for (let y = 0; y < grid.height; y++) {
                for (let x = 0; x < grid.width; x++) {
                    expect(grid.getCell(x, y)).toBeNull();
                }
            }
        });
    });
    describe("addEntity and getCell", () => {
        it("should add an entity to a valid cell and allow retrieval", () => {
            const rock = new Rock(1, 1); // Pass initial (but will be overwritten by addEntity)
            const result = grid.addEntity(rock, 1, 1);
            expect(result).toBe(true);
            expect(grid.getCell(1, 1)).toBe(rock);
            expect(rock.x).toBe(1);
            expect(rock.y).toBe(1);
        });
        it("should not add an entity to an out-of-bounds cell", () => {
            const plant = new Plant();
            expect(grid.addEntity(plant, 3, 0)).toBe(false); // x out of bounds
            expect(grid.addEntity(plant, 0, 2)).toBe(false); // y out of bounds
        });
        it("should not add an entity to an already occupied cell", () => {
            const rock1 = new Rock();
            grid.addEntity(rock1, 0, 0);
            const rock2 = new Rock();
            expect(grid.addEntity(rock2, 0, 0)).toBe(false);
            expect(grid.getCell(0, 0)).toBe(rock1); // Should still be rock1
        });
    });
    describe("isValidPosition", () => {
        beforeEach(() => {
            grid = new Grid(5, 4); // Use a 5x4 grid for these tests
        });
        // Valid positions
        it("should return true for positions within bounds", () => {
            expect(grid.isValidPosition(0, 0)).toBe(true); // Top-left corner
            expect(grid.isValidPosition(4, 3)).toBe(true); // Bottom-right corner
            expect(grid.isValidPosition(2, 2)).toBe(true); // Middle
        });
        // Invalid positions
        it("should return false for positions outside bounds", () => {
            expect(grid.isValidPosition(5, 0)).toBe(false); // x too high
            expect(grid.isValidPosition(0, 4)).toBe(false); // y too high
            expect(grid.isValidPosition(-1, 0)).toBe(false); // x too low
            expect(grid.isValidPosition(0, -1)).toBe(false); // y too low
            expect(grid.isValidPosition(5, 4)).toBe(false); // x and y too high
        });
    });
    describe("getEntities", () => {
        it("should return an empty array if no entities are on the grid", () => {
            expect(grid.getEntities()).toEqual([]);
        });
        it("should return all entities added to the grid", () => {
            const plant = new Plant();
            const creature = Creature.fromSeed("H1VD100", 1, 0); // Provide x,y for fromSeed
            grid.addEntity(plant, 0, 0);
            if (creature)
                grid.addEntity(creature, 1, 0);
            const entities = grid.getEntities();
            expect(entities.length).toBe(2);
            expect(entities).toContain(plant);
            if (creature)
                expect(entities).toContain(creature);
        });
    });
    describe("removeEntity", () => {
        it("should remove an entity from the grid and the entities list", () => {
            const plant = new Plant();
            grid.addEntity(plant, 0, 0);
            expect(grid.getCell(0, 0)).toBe(plant);
            expect(grid.getEntities()).toContain(plant);
            const result = grid.removeEntity(plant);
            expect(result).toBe(true);
            expect(grid.getCell(0, 0)).toBeNull();
            expect(grid.getEntities()).not.toContain(plant);
            expect(grid.getEntities().length).toBe(0);
        });
        it("should return false if entity to remove is not found at its coordinates", () => {
            const plant1 = new Plant(0, 0); // Entity knows its coords
            grid.addEntity(plant1, 0, 0);
            const plant2 = new Plant(0, 0); // Different instance at same coords conceptually
            // but not actually on grid in this cell
            // plant2 was never added, so grid.cells[0][0] is plant1.
            // Trying to remove plant2 based on its own x,y should fail if grid.cells[y][x] !== entity
            expect(grid.removeEntity(plant2)).toBe(false);
            expect(grid.getCell(0, 0)).toBe(plant1); // plant1 should still be there
        });
        it("should return false if trying to remove from invalid coordinates (e.g., entity moved off grid)", () => {
            const plant = new Plant(0, 0);
            grid.addEntity(plant, 0, 0);
            plant.x = -1; // Simulate entity's coordinates becoming invalid without grid update
            plant.y = -1;
            expect(grid.removeEntity(plant)).toBe(false);
            expect(grid.getCell(0, 0)).toBe(plant); // Plant should still be at its original registered location on grid
        });
    });
    describe("moveEntity", () => {
        let creature;
        beforeEach(() => {
            grid = new Grid(3, 3);
            creature = Creature.fromSeed("C1VD100", 1, 1);
            if (creature) {
                grid.addEntity(creature, 1, 1);
            }
        });
        it("should move an entity to a valid empty cell", () => {
            const result = grid.moveEntity(creature, 1, 0); // Move North
            expect(result).toBe(true);
            expect(grid.getCell(1, 1)).toBeNull();
            expect(grid.getCell(1, 0)).toBe(creature);
            expect(creature.x).toBe(1);
            expect(creature.y).toBe(0);
        });
        it("should not move an entity out of bounds", () => {
            const result = grid.moveEntity(creature, 1, -1); // Try moving North off grid
            expect(result).toBe(false);
            expect(grid.getCell(1, 1)).toBe(creature); // Still at original position
            expect(creature.x).toBe(1);
            expect(creature.y).toBe(1);
        });
        it("should not move an entity into a cell occupied by a Rock", () => {
            const rock = new Rock();
            grid.addEntity(rock, 1, 0);
            const result = grid.moveEntity(creature, 1, 0); // Try moving North into Rock
            expect(result).toBe(false);
            expect(grid.getCell(1, 1)).toBe(creature);
            expect(grid.getCell(1, 0)).toBe(rock);
        });
        it("should allow moving an entity into a cell occupied by a Plant", () => {
            const plant = new Plant();
            grid.addEntity(plant, 1, 0); // Plant is North
            const result = grid.moveEntity(creature, 1, 0); // Move North into Plant
            expect(result).toBe(true);
            expect(grid.getCell(1, 1)).toBeNull(); // Old position is empty
            expect(grid.getCell(1, 0)).toBe(creature); // Creature is now at plant's location
            // (interaction, like eating, is for another task)
            expect(creature.x).toBe(1);
            expect(creature.y).toBe(0);
        });
        it("should not move an entity into a cell occupied by another Creature (for now)", () => {
            const otherCreature = Creature.fromSeed("H1VD100", 1, 0);
            grid.addEntity(otherCreature, 1, 0);
            const result = grid.moveEntity(creature, 1, 0); // Try moving North into other creature
            expect(result).toBe(false);
            expect(grid.getCell(1, 1)).toBe(creature); // Original creature still there
            expect(grid.getCell(1, 0)).toBe(otherCreature); // Other creature still there
        });
        it("should correctly update entity's internal x, y coordinates upon successful move", () => {
            grid.moveEntity(creature, 0, 1); // Move West
            expect(creature.x).toBe(0);
            expect(creature.y).toBe(1);
        });
        it("should clear the old cell after a successful move", () => {
            grid.moveEntity(creature, 0, 1); // Move West
            expect(grid.getCell(1, 1)).toBeNull(); // Original position should be empty
        });
    });
    describe("getCreatures", () => {
        it("should return an empty array if no creatures are on the grid", () => {
            grid.addEntity(new Plant(), 0, 0);
            grid.addEntity(new Rock(), 1, 0);
            expect(grid.getCreatures()).toEqual([]);
        });
        it("should return only Creature instances", () => {
            const c1 = Creature.fromSeed("C1VD100", 0, 0);
            const c2 = Creature.fromSeed("H2SN200", 1, 0);
            grid.addEntity(c1, 0, 0);
            grid.addEntity(new Plant(), 0, 1);
            grid.addEntity(c2, 1, 0);
            grid.addEntity(new Rock(), 1, 1);
            const creatures = grid.getCreatures();
            expect(creatures.length).toBe(2);
            expect(creatures).toContain(c1);
            expect(creatures).toContain(c2);
            expect(creatures.every((c) => c instanceof Creature)).toBe(true);
        });
    });
});
describe("Entity and Subclasses", () => {
    describe("Entity", () => {
        it("should create an entity with a symbol, default color, and default type", () => {
            const entity = new Entity("E");
            expect(entity.symbol).toBe("E");
            expect(entity.color).toBe("#FFFFFF"); // Default color white
            expect(entity.type).toBe("Entity"); // Check default type
        });
        it("should create an entity with a symbol and specified color", () => {
            const entity = new Entity("E", "#FF0000");
            expect(entity.symbol).toBe("E");
            expect(entity.color).toBe("#FF0000");
        });
        it("should create an entity with specified symbol, color, and type", () => {
            const entity = new Entity("E", "#FF0000", "CustomType");
            expect(entity.symbol).toBe("E");
            expect(entity.color).toBe("#FF0000");
            expect(entity.type).toBe("CustomType"); // Check custom type
        });
        it("toString() should return the symbol", () => {
            const entity = new Entity("S");
            expect(entity.toString()).toBe("S");
        });
    });
    describe("Plant", () => {
        it("should have correct symbol, color, and type", () => {
            const plant = new Plant();
            expect(plant.symbol).toBe("P");
            expect(plant.color).toBe("#00FF00"); // Green
            expect(plant.type).toBe("Plant"); // Check type
        });
    });
    describe("Rock", () => {
        it("should have correct symbol, color, and type", () => {
            const rock = new Rock();
            expect(rock.symbol).toBe("R");
            expect(rock.color).toBe("#808080"); // Grey
            expect(rock.type).toBe("Rock"); // Check type
        });
    });
    describe("Water", () => {
        it("should have correct symbol, color, and type", () => {
            const water = new Water();
            expect(water.symbol).toBe("W");
            expect(water.color).toBe("#0000FF"); // Blue
            expect(water.type).toBe("Water"); // Check type
        });
    });
    describe("Creature", () => {
        it("should create a creature with default symbol, color, and type", () => {
            const creature = new Creature();
            expect(creature.symbol).toBe("C");
            expect(creature.color).toBe("#FF0000"); // Default Red
            expect(creature.type).toBe("Creature"); // Check default type
        });
        it("should create a creature with a specified symbol, default color, and default type", () => {
            const creature = new Creature("X");
            expect(creature.symbol).toBe("X");
            expect(creature.color).toBe("#FF0000"); // Default Red (as color not specified)
            expect(creature.type).toBe("Creature"); // Check default type
        });
        it("should create a creature with a specified symbol, color, and type", () => {
            const creature = new Creature("Y", "#00FFFF", "SpecialCreature");
            expect(creature.symbol).toBe("Y");
            expect(creature.color).toBe("#00FFFF"); // Cyan
            expect(creature.type).toBe("SpecialCreature"); // Check custom type
        });
    });
});
