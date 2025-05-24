import { Grid, Rock, Plant, Creature, Entity, Water } from "./grid"; // Import from ./grid.ts

describe("Grid", () => {
  describe("constructor", () => {
    it("should create a grid with the specified width and height", () => {
      const grid = new Grid(10, 5);
      expect(grid.width).toBe(10);
      expect(grid.height).toBe(5);
    });

    it("should initialize all cells to null", () => {
      const grid = new Grid(2, 2);
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          expect(grid.getCell(x, y)).toBeNull();
        }
      }
    });
  });

  describe("setCell and getCell", () => {
    it("should set and get an entity in a cell", () => {
      const grid = new Grid(3, 3);
      const rock = new Rock();
      grid.setCell(1, 1, rock);
      expect(grid.getCell(1, 1)).toBe(rock);
    });

    it("should return null for empty cells after some cells are set", () => {
      const grid = new Grid(3, 3);
      grid.setCell(0, 0, new Plant());
      expect(grid.getCell(1, 1)).toBeNull();
    });

    it("should throw an error when setting a cell out of bounds", () => {
      const grid = new Grid(3, 3);
      const rock = new Rock();
      expect(() => grid.setCell(3, 0, rock)).toThrow(RangeError);
      expect(() => grid.setCell(0, 3, rock)).toThrow(RangeError);
      expect(() => grid.setCell(-1, 0, rock)).toThrow(RangeError);
      expect(() => grid.setCell(0, -1, rock)).toThrow(RangeError);
    });

    it("should throw an error when getting a cell out of bounds", () => {
      const grid = new Grid(3, 3);
      expect(() => grid.getCell(3, 0)).toThrow(RangeError);
      expect(() => grid.getCell(0, 3)).toThrow(RangeError);
      expect(() => grid.getCell(-1, 0)).toThrow(RangeError);
      expect(() => grid.getCell(0, -1)).toThrow(RangeError);
    });
  });

  describe("isWithinBounds", () => {
    const grid = new Grid(5, 4);
    it("should return true for coordinates within bounds", () => {
      expect(grid.isWithinBounds(0, 0)).toBe(true);
      expect(grid.isWithinBounds(4, 3)).toBe(true);
      expect(grid.isWithinBounds(2, 2)).toBe(true);
    });

    it("should return false for coordinates out of bounds", () => {
      expect(grid.isWithinBounds(5, 0)).toBe(false); // x too high
      expect(grid.isWithinBounds(0, 4)).toBe(false); // y too high
      expect(grid.isWithinBounds(-1, 0)).toBe(false); // x too low
      expect(grid.isWithinBounds(0, -1)).toBe(false); // y too low
      expect(grid.isWithinBounds(5, 4)).toBe(false); // x and y too high
    });
  });

  // Example test for a Creature related method if it existed on Grid, or for Entity properties
  // For now, we just ensure entities can be placed.
  it("should allow placing different types of entities", () => {
    const grid = new Grid(2, 1);
    const plant = new Plant();
    const creature = new Creature("C");
    grid.setCell(0, 0, plant);
    grid.setCell(1, 0, creature);
    expect(grid.getCell(0, 0)).toBeInstanceOf(Plant);
    expect(grid.getCell(1, 0)).toBeInstanceOf(Creature);
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
