import { DietType } from "./grid"; // Assuming DietType is exported from grid.ts

export interface CreatureAttributes {
  dietType: DietType;
  movementSpeed: number;
  visionRange: number;
  // We can add symbol, color, type later if the seed should also control them
  // or if the parser should return a fully configured Creature instance.
}

export function parseSeed(seed: string): CreatureAttributes | null {
  if (typeof seed !== "string" || seed.length < 3) {
    console.error(
      "Invalid seed: Seed must be a string of at least 3 characters."
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
      console.error(
        `Invalid diet character '${dietChar}' in seed. Defaulting to UNKNOWN.`
      );
      dietType = DietType.UNKNOWN;
    // Optionally, we could return null here if any part of the seed is invalid
    // return null;
  }

  const speedChar = seed[1];
  const movementSpeed = parseInt(speedChar, 10);
  if (isNaN(movementSpeed) || movementSpeed < 1 || movementSpeed > 3) {
    console.error(
      `Invalid movement speed '${speedChar}' in seed. Must be 1-3. Defaulting to 1.`
    );
    // Defaulting or returning null: for now, let's default as per PRD (ensure creature always generates)
    // return null;
    // For now, let the Creature constructor handle default if parse fails strictly
    // For a robust system, this might default or throw, depending on desired strictness
  }

  const visionChar = seed[2];
  const visionRange = parseInt(visionChar, 10);
  if (isNaN(visionRange) || visionRange < 1 || visionRange > 5) {
    console.error(
      `Invalid vision range '${visionChar}' in seed. Must be 1-5. Defaulting to 1.`
    );
    // As above, defaulting or strict failure
  }

  // If any parse failed and we need to ensure valid values, or rely on constructor defaults:
  // For now, let's return what we parsed, and Creature constructor has defaults.
  // A more robust parser might return an object with success flags or use defaults directly here.
  return {
    dietType,
    movementSpeed:
      isNaN(movementSpeed) || movementSpeed < 1 || movementSpeed > 3
        ? 1
        : movementSpeed, // Ensure valid or default
    visionRange:
      isNaN(visionRange) || visionRange < 1 || visionRange > 5
        ? 1
        : visionRange, // Ensure valid or default
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
