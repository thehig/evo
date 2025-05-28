import { DietType, ActivityCycle, PerceptionType } from "./grid.js";

export interface CreatureAttributes {
  dietType: DietType;
  movementSpeed: number;
  perceptionType: PerceptionType;
  activityCycle: ActivityCycle;
  perceptionRange: number;
  perceptionAngle: number;
  perceptionArc: number;
  // visionRange: number; // Removed visionRange
  // We can add symbol, color, type later if the seed should also control them
  // or if the parser should return a fully configured Creature instance.
}

const ANGLE_STEP = 45; // For 8 directions (0-7)
const ARC_STEP = 45; // For 8 arc steps + 1 for line (0-8)

export function parseSeed(seed: string): CreatureAttributes | null {
  if (typeof seed !== "string" || seed.length < 7) {
    console.error(
      "Invalid seed: Seed must be a string of at least 7 characters."
    );
    return null;
  }

  let dietType: DietType;
  const dietChar = seed[0].toUpperCase();
  switch (dietChar) {
    case "H":
      dietType = DietType.HERBIVORE;
      break;
    case "C":
      dietType = DietType.CARNIVORE;
      break;
    case "O":
      dietType = DietType.OMNIVORE;
      break;
    default:
      dietType = DietType.UNKNOWN;
  }

  const speedChar = seed[1];
  let movementSpeed = parseInt(speedChar, 10);
  if (isNaN(movementSpeed) || movementSpeed < 1 || movementSpeed > 3)
    movementSpeed = 1;

  let perceptionType: PerceptionType;
  const perceptionTypeChar = seed[2].toUpperCase();
  switch (perceptionTypeChar) {
    case "V":
      perceptionType = PerceptionType.VISION;
      break;
    case "S":
      perceptionType = PerceptionType.SCENT;
      break;
    case "E":
      perceptionType = PerceptionType.HEARING;
      break; // E for Ears/Hearing
    default:
      perceptionType = PerceptionType.NONE;
  }

  let activityCycle: ActivityCycle;
  const activityChar = seed[3].toUpperCase();
  switch (activityChar) {
    case "N":
      activityCycle = ActivityCycle.NOCTURNAL;
      break;
    case "D":
      activityCycle = ActivityCycle.DIURNAL;
      break;
    default:
      activityCycle = ActivityCycle.NONE;
  }

  const rangeChar = seed[4];
  let perceptionRange = parseInt(rangeChar, 10);
  if (isNaN(perceptionRange) || perceptionRange < 1 || perceptionRange > 9)
    perceptionRange = 1;

  const angleChar = seed[5];
  let perceptionAngleNum = parseInt(angleChar, 10);
  let perceptionAngle = 0; // Default to 0 degrees
  if (
    !isNaN(perceptionAngleNum) &&
    perceptionAngleNum >= 0 &&
    perceptionAngleNum <= 7
  ) {
    perceptionAngle = perceptionAngleNum * ANGLE_STEP;
  } else {
    perceptionAngleNum = 0; // For default if char is bad
  }

  const arcChar = seed[6];
  let perceptionArcNum = parseInt(arcChar, 10);
  let perceptionArc = 45; // Default to 45 degrees arc
  if (
    !isNaN(perceptionArcNum) &&
    perceptionArcNum >= 0 &&
    perceptionArcNum <= 8
  ) {
    if (perceptionArcNum === 0) perceptionArc = 0; // Line
    else if (perceptionArcNum === 8) perceptionArc = 360; // Omni
    else perceptionArc = perceptionArcNum * ARC_STEP;
  } else {
    perceptionArcNum = 1; // Default to 45 deg if char is bad (maps to arcStep * 1)
  }

  // Log errors for invalid characters, but use defaults
  if (dietType === DietType.UNKNOWN)
    console.error(`Invalid diet character '${dietChar}'. Defaulting.`);
  if (movementSpeed === 1 && speedChar !== "1")
    console.error(`Invalid speed '${speedChar}'. Defaulting.`);
  if (
    perceptionType === PerceptionType.NONE &&
    !["V", "S", "E"].includes(perceptionTypeChar)
  )
    console.error(
      `Invalid perception type '${perceptionTypeChar}'. Defaulting.`
    );
  if (
    activityCycle === ActivityCycle.NONE &&
    !["N", "D"].includes(activityChar)
  )
    console.error(`Invalid activity '${activityChar}'. Defaulting.`);
  if (perceptionRange === 1 && rangeChar !== "1")
    console.error(`Invalid range '${rangeChar}'. Defaulting.`);
  if (perceptionAngle === 0 && perceptionAngleNum !== 0)
    console.error(`Invalid angle char '${angleChar}'. Defaulting angle.`);
  if (perceptionArc === 45 && perceptionArcNum !== 1)
    console.error(`Invalid arc char '${arcChar}'. Defaulting arc.`);

  // Assuming visionRange is the same as perceptionRange for now - REMOVING THIS LOGIC
  // const visionRange = perceptionRange;

  return {
    dietType,
    movementSpeed,
    perceptionType,
    activityCycle,
    perceptionRange,
    perceptionAngle,
    perceptionArc,
    // visionRange, // Removed visionRange
  };
}

// Example of how to use the parser to create a Creature
// This would typically be in a CreatureFactory or similar, not here directly.
/*
import { Creature } from './grid';

export function createCreatureFromSeed(seed: string): Creature | null {
    const attributes = parseSeed(seed);
    if (!attributes) {
        return null;
    }
    // Potentially derive symbol/color from seed too, or use defaults
    const symbol = attributes.dietType.charAt(0); // e.g., H, C, O
    // Color could be mapped from diet type or other seed parts
    let color = '#FF0000'; // Default creature color
    if (attributes.dietType === DietType.HERBIVORE) color = '#00DD00';
    else if (attributes.dietType === DietType.CARNIVORE) color = '#DD0000';
    else if (attributes.dietType === DietType.OMNIVORE) color = '#DDDD00';

    return new Creature(
        symbol, 
        color, 
        'Creature', // type
        attributes.dietType,
        attributes.movementSpeed,
        attributes.visionRange
    );
}
*/
