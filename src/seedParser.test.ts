import {
  jest,
  describe,
  beforeEach,
  afterEach,
  expect,
  it,
} from "@jest/globals";
import { parseSeed, CreatureAttributes } from "./seedParser";
import { Creature, DietType, ActivityCycle, PerceptionType } from "./grid";

// Mock console.error to prevent log spamming
let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

describe("parseSeed", () => {
  it("should correctly parse a valid 7-char seed for Herbivore, Diurnal", () => {
    const attributes = parseSeed("H1VD000");
    expect(attributes).toEqual({
      dietType: DietType.HERBIVORE,
      movementSpeed: 1,
      perceptionType: PerceptionType.VISION,
      activityCycle: ActivityCycle.DIURNAL,
      perceptionRange: 1,
      perceptionAngle: 0,
      perceptionArc: 0,
    });
  });

  it("should correctly parse a valid 7-char seed for Carnivore, Nocturnal with max values", () => {
    const attributes = parseSeed("C3SN500");
    expect(attributes).toEqual({
      dietType: DietType.CARNIVORE,
      movementSpeed: 3,
      perceptionType: PerceptionType.SCENT,
      activityCycle: ActivityCycle.NOCTURNAL,
      perceptionRange: 5,
      perceptionAngle: 0,
      perceptionArc: 0,
    });
  });

  it("should correctly parse a valid 7-char seed for Omnivore, Diurnal", () => {
    const attributes = parseSeed("O2ED300");
    expect(attributes).toEqual({
      dietType: DietType.OMNIVORE,
      movementSpeed: 2,
      perceptionType: PerceptionType.HEARING,
      activityCycle: ActivityCycle.DIURNAL,
      perceptionRange: 3,
      perceptionAngle: 0,
      perceptionArc: 0,
    });
  });

  it("should return null for a seed that is too short (e.g. 3 chars or 6 chars)", () => {
    expect(parseSeed("H11")).toBeNull();
    expect(parseSeed("C3")).toBeNull();
    expect(parseSeed("H1VD10")).toBeNull();
  });

  it("should handle invalid diet character, defaulting diet and using other valid parts of 7-char seed", () => {
    const attributes = parseSeed("X1VD100");
    expect(attributes?.dietType).toBe(DietType.UNKNOWN);
    expect(attributes?.movementSpeed).toBe(1);
    expect(attributes?.perceptionType).toBe(PerceptionType.VISION);
    expect(attributes?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(attributes?.perceptionRange).toBe(1);
    expect(attributes?.perceptionAngle).toBe(0);
    expect(attributes?.perceptionArc).toBe(0);
  });

  it("should handle invalid movement speed character, defaulting speed in 7-char seed", () => {
    const attributes = parseSeed("HASN500");
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.movementSpeed).toBe(1);
    expect(attributes?.perceptionType).toBe(PerceptionType.SCENT);
    expect(attributes?.activityCycle).toBe(ActivityCycle.NOCTURNAL);
    expect(attributes?.perceptionRange).toBe(5);
    expect(attributes?.perceptionAngle).toBe(0);
    expect(attributes?.perceptionArc).toBe(0);
  });

  it("should handle out-of-range movement speed, defaulting speed in 7-char seed", () => {
    const attributes = parseSeed("H0DN500");
    expect(attributes?.movementSpeed).toBe(1);
    const attributes2 = parseSeed("H4DN500");
    expect(attributes2?.movementSpeed).toBe(1);
  });

  it("should handle invalid perceptionType character, defaulting type in 7-char seed", () => {
    const attributes = parseSeed("H1XN100");
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.movementSpeed).toBe(1);
    expect(attributes?.perceptionType).toBe(PerceptionType.NONE);
    expect(attributes?.activityCycle).toBe(ActivityCycle.NOCTURNAL);
    expect(attributes?.perceptionRange).toBe(1);
  });

  it("should handle out-of-range perceptionRange, defaulting range in 7-char seed", () => {
    const attributes = parseSeed("H1VD000");
    expect(attributes?.perceptionRange).toBe(1);
    const attributes2 = parseSeed("H1VDX00");
    expect(attributes2?.perceptionRange).toBe(1);
  });

  it("should handle invalid activity cycle character, defaulting to NONE in 7-char seed", () => {
    const attributes = parseSeed("H1VX100");
    expect(attributes?.activityCycle).toBe(ActivityCycle.NONE);
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.movementSpeed).toBe(1);
    expect(attributes?.perceptionType).toBe(PerceptionType.VISION);
    expect(attributes?.perceptionRange).toBe(1);
  });

  it("should handle lowercase characters for all parts of the 7-char seed", () => {
    const attributes = parseSeed("h2vd200");
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.movementSpeed).toBe(2);
    expect(attributes?.perceptionType).toBe(PerceptionType.VISION);
    expect(attributes?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(attributes?.perceptionRange).toBe(2);
    expect(attributes?.perceptionAngle).toBe(0);
    expect(attributes?.perceptionArc).toBe(0);
  });
});

describe("parseSeed: 7-character seed with complex perception", () => {
  it("H1VD108: Herbivore, Spd 1, Vision, Diurnal, Range 1, Angle 0, Arc 360", () => {
    const attributes = parseSeed("H1VD108");
    expect(attributes).toEqual({
      dietType: DietType.HERBIVORE,
      movementSpeed: 1,
      perceptionType: PerceptionType.VISION,
      activityCycle: ActivityCycle.DIURNAL,
      perceptionRange: 1,
      perceptionAngle: 0,
      perceptionArc: 360,
    });
  });

  it("C3SN321: Carnivore, Spd 3, Scent, Nocturnal, Range 3, Angle 90, Arc 45", () => {
    const attributes = parseSeed("C3SN321");
    expect(attributes).toEqual({
      dietType: DietType.CARNIVORE,
      movementSpeed: 3,
      perceptionType: PerceptionType.SCENT,
      activityCycle: ActivityCycle.NOCTURNAL,
      perceptionRange: 3,
      perceptionAngle: 90,
      perceptionArc: 45,
    });
  });

  it("O2ED970: Omnivore, Spd 2, Hearing, Diurnal, Range 9, Angle 315, Arc 0/line", () => {
    const attributes = parseSeed("O2ED970");
    expect(attributes).toEqual({
      dietType: DietType.OMNIVORE,
      movementSpeed: 2,
      perceptionType: PerceptionType.HEARING,
      activityCycle: ActivityCycle.DIURNAL,
      perceptionRange: 9,
      perceptionAngle: 315,
      perceptionArc: 0,
    });
  });

  it("should return null for seeds shorter than 7 characters", () => {
    expect(parseSeed("H1VD10")).toBeNull();
    expect(parseSeed("C3SN3")).toBeNull();
    expect(parseSeed("H11D")).toBeNull();
  });

  it("defaults invalid Perception Type (char 2) to NONE", () => {
    const attributes = parseSeed("H1XD108");
    expect(attributes?.perceptionType).toBe(PerceptionType.NONE);
    expect(attributes?.dietType).toBe(DietType.HERBIVORE);
    expect(attributes?.perceptionArc).toBe(360);
  });

  it("defaults invalid Perception Range (char 4) to 1", () => {
    const attributes = parseSeed("H1VDX08");
    expect(attributes?.perceptionRange).toBe(1);
    const attributes2 = parseSeed("H1VD008");
    expect(attributes2?.perceptionRange).toBe(1);
  });

  it("defaults invalid Perception Angle (char 5) to 0 degrees", () => {
    const attributes = parseSeed("H1VD1X8");
    expect(attributes?.perceptionAngle).toBe(0);
    const attributes2 = parseSeed("H1VD188");
    expect(attributes2?.perceptionAngle).toBe(0);
  });

  it("defaults invalid Perception Arc (char 6) to 45 degrees", () => {
    const attributes = parseSeed("H1VD10X");
    expect(attributes?.perceptionArc).toBe(45);
    const attributes2 = parseSeed("H1VD109");
    expect(attributes2?.perceptionArc).toBe(45);
  });

  it("handles lowercase for all seed characters: c1sn532", () => {
    const attributes = parseSeed("c1sn532");
    expect(attributes).toEqual({
      dietType: DietType.CARNIVORE,
      movementSpeed: 1,
      perceptionType: PerceptionType.SCENT,
      activityCycle: ActivityCycle.NOCTURNAL,
      perceptionRange: 5,
      perceptionAngle: 135,
      perceptionArc: 90,
    });
  });

  it("handles invalid diet char (0), defaults others: X1VD108", () => {
    const attributes = parseSeed("X1VD108");
    expect(attributes?.dietType).toBe(DietType.UNKNOWN);
    expect(attributes?.movementSpeed).toBe(1);
    expect(attributes?.perceptionType).toBe(PerceptionType.VISION);
    expect(attributes?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(attributes?.perceptionRange).toBe(1);
    expect(attributes?.perceptionAngle).toBe(0);
    expect(attributes?.perceptionArc).toBe(360);
  });
});

describe("Creature.fromSeed", () => {
  it('should create a Herbivore Diurnal creature from 7-char seed "H1VD000"', () => {
    const creature = Creature.fromSeed("H1VD000");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("H");
    expect(creature?.dietType).toBe(DietType.HERBIVORE);
    expect(creature?.movementSpeed).toBe(1);
    expect(creature?.perceptionType).toBe(PerceptionType.VISION);
    expect(creature?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(creature?.perceptionRange).toBe(1);
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(0);
  });

  it('should create a Carnivore Nocturnal creature from 7-char seed "C3SN500"', () => {
    const creature = Creature.fromSeed("C3SN500");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("C");
    expect(creature?.dietType).toBe(DietType.CARNIVORE);
    expect(creature?.movementSpeed).toBe(3);
    expect(creature?.perceptionType).toBe(PerceptionType.SCENT);
    expect(creature?.activityCycle).toBe(ActivityCycle.NOCTURNAL);
    expect(creature?.perceptionRange).toBe(5);
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(0);
  });

  it('should create an Omnivore Diurnal creature from 7-char seed "O2ED300"', () => {
    const creature = Creature.fromSeed("O2ED300");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("O");
    expect(creature?.dietType).toBe(DietType.OMNIVORE);
    expect(creature?.movementSpeed).toBe(2);
    expect(creature?.perceptionType).toBe(PerceptionType.HEARING);
    expect(creature?.perceptionRange).toBe(3);
    expect(creature?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(creature?.color).toBe("#DADA22");
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(0);
  });

  it("should return null if seed parsing fails (e.g., seed too short)", () => {
    const creature = Creature.fromSeed("H1D");
    expect(creature).toBeNull();
  });

  it('should create creature with default symbol/color for UNKNOWN diet from 7-char seed "X1VD100"', () => {
    const creature = Creature.fromSeed("X1VD100");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("Z");
    expect(creature?.dietType).toBe(DietType.UNKNOWN);
    expect(creature?.movementSpeed).toBe(1);
    expect(creature?.perceptionType).toBe(PerceptionType.VISION);
    expect(creature?.perceptionRange).toBe(1);
    expect(creature?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(creature?.color).toBe("#CCCCCC");
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(0);
  });

  it('should create creature with default activity NONE from invalid activity char in 7-char seed "H1VX100"', () => {
    const creature = Creature.fromSeed("H1VX100");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("H");
    expect(creature?.dietType).toBe(DietType.HERBIVORE);
    expect(creature?.movementSpeed).toBe(1);
    expect(creature?.perceptionType).toBe(PerceptionType.VISION);
    expect(creature?.activityCycle).toBe(ActivityCycle.NONE);
    expect(creature?.perceptionRange).toBe(1);
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(0);
    expect(creature?.color).toBe("#22DD22");
  });

  it("should use provided defaultSymbol and defaultColor with a 7-char seed", () => {
    const creature = Creature.fromSeed("H1VD000", -1, -1, "S", "#123456");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("S");
    expect(creature?.color).toBe("#123456");
    expect(creature?.dietType).toBe(DietType.HERBIVORE);
    expect(creature?.perceptionType).toBe(PerceptionType.VISION);
    expect(creature?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(creature?.perceptionRange).toBe(1);
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(0);
  });
});

describe("Creature.fromSeed with 7-char seed", () => {
  it("Herbivore from H1VD108", () => {
    const creature = Creature.fromSeed("H1VD108");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("H");
    expect(creature?.dietType).toBe(DietType.HERBIVORE);
    expect(creature?.movementSpeed).toBe(1);
    expect(creature?.perceptionType).toBe(PerceptionType.VISION);
    expect(creature?.activityCycle).toBe(ActivityCycle.DIURNAL);
    expect(creature?.perceptionRange).toBe(1);
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(360);
    expect(creature?.color).toBe("#22DD22");
  });

  it("Carnivore from C3SN321", () => {
    const creature = Creature.fromSeed("C3SN321");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("C");
    expect(creature?.dietType).toBe(DietType.CARNIVORE);
    expect(creature?.movementSpeed).toBe(3);
    expect(creature?.perceptionType).toBe(PerceptionType.SCENT);
    expect(creature?.activityCycle).toBe(ActivityCycle.NOCTURNAL);
    expect(creature?.perceptionRange).toBe(3);
    expect(creature?.perceptionAngle).toBe(90);
    expect(creature?.perceptionArc).toBe(45);
    expect(creature?.color).toBe("#DD2222");
  });

  it("returns null for too short seed: H1VD10", () => {
    const creature = Creature.fromSeed("H1VD10");
    expect(creature).toBeNull();
  });

  it('defaults for invalid parts of seed "X0VX0X0"', () => {
    const creature = Creature.fromSeed("X0VX0X0");
    expect(creature).not.toBeNull();
    expect(creature?.symbol).toBe("Z");
    expect(creature?.dietType).toBe(DietType.UNKNOWN);
    expect(creature?.movementSpeed).toBe(1);
    expect(creature?.perceptionType).toBe(PerceptionType.VISION);
    expect(creature?.activityCycle).toBe(ActivityCycle.NONE);
    expect(creature?.perceptionRange).toBe(1);
    expect(creature?.perceptionAngle).toBe(0);
    expect(creature?.perceptionArc).toBe(0);
    expect(creature?.color).toBe("#CCCCCC");
  });
});
