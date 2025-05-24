import { parseSeed, CreatureAttributes } from "./seedParser";
import { Creature, DietType } from "./grid";

describe("parseSeed", () => {
  it("should correctly parse a valid seed for Herbivore", () => {
    const attributes = parseSeed("H11");
    expect(attributes).toEqual<CreatureAttributes>({
      dietType: DietType.HERBIVORE,
      movementSpeed: 1,
      visionRange: 1,
    });
  });

  it("should correctly parse a valid seed for Carnivore with max values", () => {
    const attributes = parseSeed("C35");
    expect(attributes).toEqual<CreatureAttributes>({
      dietType: DietType.CARNIVORE,
      movementSpeed: 3,
      visionRange: 5,
    });
  });

  it("should correctly parse a valid seed for Omnivore", () => {
    const attributes = parseSeed("O23");
    expect(attributes).toEqual<CreatureAttributes>({
      dietType: DietType.OMNIVORE,
      movementSpeed: 2,
      visionRange: 3,
    });
  });

  it("should return null for a seed that is too short", () => {
    expect(parseSeed("H1")).toBeNull();
  });

  it("should handle invalid diet character, defaulting diet to UNKNOWN", () => {
    const attributes = parseSeed("X11");
    expect(attributes?.dietType).toBe(DietType.UNKNOWN);
    expect(attributes?.movementSpeed).toBe(1);
    expect(attributes?.visionRange).toBe(1);
  });

  it("should handle invalid movement speed character, defaulting speed to 1", () => {
    const attributes = parseSeed("HA5");
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.movementSpeed).toBe(1); // Default
    expect(attributes?.visionRange).toBe(5);
  });

  it("should handle out-of-range movement speed, defaulting speed to 1", () => {
    const attributes = parseSeed("H05"); // Speed 0 is invalid
    expect(attributes?.movementSpeed).toBe(1);
    const attributes2 = parseSeed("H45"); // Speed 4 is invalid
    expect(attributes2?.movementSpeed).toBe(1);
  });

  it("should handle invalid vision range character, defaulting vision to 1", () => {
    const attributes = parseSeed("H1X");
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.movementSpeed).toBe(1);
    expect(attributes?.visionRange).toBe(1); // Default
  });

  it("should handle out-of-range vision range, defaulting vision to 1", () => {
    const attributes = parseSeed("H10"); // Vision 0 is invalid
    expect(attributes?.visionRange).toBe(1);
    const attributes2 = parseSeed("H16"); // Vision 6 is invalid
    expect(attributes2?.visionRange).toBe(1);
  });

  it("should handle lowercase diet characters", () => {
    const attributes = parseSeed("h22");
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.movementSpeed).toBe(2);
    expect(attributes?.visionRange).toBe(2);
  });
});

describe("Creature.fromSeed", () => {
  it('should create a Herbivore creature from seed "H11"', () => {
    const creature = Creature.fromSeed("H11");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("H");
    expect(creature?.dietType).toBe(DietType.HERBIVORE);
    expect(creature?.movementSpeed).toBe(1);
    expect(creature?.visionRange).toBe(1);
    expect(creature?.color).toBe("#22DD22");
  });

  it('should create a Carnivore creature from seed "C35"', () => {
    const creature = Creature.fromSeed("C35");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("C");
    expect(creature?.dietType).toBe(DietType.CARNIVORE);
    expect(creature?.movementSpeed).toBe(3);
    expect(creature?.visionRange).toBe(5);
    expect(creature?.color).toBe("#DD2222");
  });

  it('should create an Omnivore creature from seed "O23"', () => {
    const creature = Creature.fromSeed("O23");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("O");
    expect(creature?.dietType).toBe(DietType.OMNIVORE);
    expect(creature?.movementSpeed).toBe(2);
    expect(creature?.visionRange).toBe(3);
    expect(creature?.color).toBe("#DADA22");
  });

  it("should return null if seed parsing fails (e.g., seed too short)", () => {
    const creature = Creature.fromSeed("H");
    expect(creature).toBeNull();
  });

  it('should create creature with default symbol/color for UNKNOWN diet type from bad seed like "X11"', () => {
    const creature = Creature.fromSeed("X11");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("Z"); // Default for UNKNOWN
    expect(creature?.dietType).toBe(DietType.UNKNOWN);
    expect(creature?.movementSpeed).toBe(1);
    expect(creature?.visionRange).toBe(1);
    expect(creature?.color).toBe("#CCCCCC"); // Default for UNKNOWN
  });

  it("should use provided defaultSymbol and defaultColor if seed parts are valid", () => {
    const creature = Creature.fromSeed("H11", "S", "#123456");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("S");
    expect(creature?.color).toBe("#123456");
    expect(creature?.dietType).toBe(DietType.HERBIVORE);
  });
});
