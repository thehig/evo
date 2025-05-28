import { Creature, DietType, ActivityCycle, PerceptionType } from "./grid";
import { CreatureBrain } from "./creatureBrain";
import { NeuralNetworkGenerator } from "./neuralNetwork";

export class CreatureFactory {
  static createRandomCreature(x: number = -1, y: number = -1): Creature {
    // Randomly determine diet type
    const dietTypes = [
      DietType.HERBIVORE,
      DietType.CARNIVORE,
      DietType.OMNIVORE,
    ];
    const dietType = dietTypes[Math.floor(Math.random() * dietTypes.length)];

    // Determine symbol and color based on diet
    let symbol: string;
    let color: string;

    switch (dietType) {
      case DietType.HERBIVORE:
        symbol = "H";
        color = "#22DD22";
        break;
      case DietType.CARNIVORE:
        symbol = "C";
        color = "#DD2222";
        break;
      case DietType.OMNIVORE:
        symbol = "O";
        color = "#DADA22";
        break;
      default:
        symbol = "Z";
        color = "#CCCCCC";
    }

    // Random other attributes
    const movementSpeed = Math.floor(Math.random() * 3) + 1; // 1-3
    const activityCycle =
      Math.random() < 0.5 ? ActivityCycle.DIURNAL : ActivityCycle.NOCTURNAL;
    const perceptionType = PerceptionType.VISION; // For simplicity, all use vision
    const perceptionRange = Math.floor(Math.random() * 3) + 1; // 1-3
    const perceptionAngle = Math.floor(Math.random() * 8) * 45; // 0-315 in 45° steps
    const perceptionArc = Math.floor(Math.random() * 9) * 45; // 0-360 in 45° steps

    // Generate a random seed for compatibility (though not used for behavior)
    const seed = this.generateRandomSeed(
      dietType,
      movementSpeed,
      perceptionType,
      activityCycle,
      perceptionRange
    );

    // Create neural network brain
    const brain = new CreatureBrain(new Creature()); // Temporary creature for brain creation

    // Create the actual creature
    const creature = new Creature(
      symbol,
      color,
      "Creature",
      x,
      y,
      dietType,
      movementSpeed,
      activityCycle,
      perceptionType,
      perceptionRange,
      perceptionAngle,
      perceptionArc,
      100, // Initial energy
      seed,
      brain
    );

    // Update brain's creature reference
    brain.setCreature(creature);

    return creature;
  }

  static createCreatureWithComplexity(
    x: number = -1,
    y: number = -1,
    complexity: number = 0.5,
    dietType?: DietType
  ): Creature {
    // Use provided diet type or random
    const finalDietType =
      dietType ||
      [DietType.HERBIVORE, DietType.CARNIVORE, DietType.OMNIVORE][
        Math.floor(Math.random() * 3)
      ];

    // Determine symbol and color based on diet
    let symbol: string;
    let color: string;

    switch (finalDietType) {
      case DietType.HERBIVORE:
        symbol = "H";
        color = "#22DD22";
        break;
      case DietType.CARNIVORE:
        symbol = "C";
        color = "#DD2222";
        break;
      case DietType.OMNIVORE:
        symbol = "O";
        color = "#DADA22";
        break;
      default:
        symbol = "Z";
        color = "#CCCCCC";
    }

    // Attributes influenced by complexity
    const movementSpeed = Math.floor(complexity * 3) + 1; // 1-3
    const activityCycle =
      Math.random() < 0.5 ? ActivityCycle.DIURNAL : ActivityCycle.NOCTURNAL;
    const perceptionType = PerceptionType.VISION;
    const perceptionRange = Math.floor(complexity * 3) + 1; // 1-3
    const perceptionAngle = Math.floor(Math.random() * 8) * 45;
    const perceptionArc = Math.floor(Math.random() * 9) * 45;

    const seed = this.generateRandomSeed(
      finalDietType,
      movementSpeed,
      perceptionType,
      activityCycle,
      perceptionRange
    );

    // Create neural network with specified complexity
    const neuralNetwork = NeuralNetworkGenerator.generateRandom(
      20,
      11,
      complexity
    );
    const brain = new CreatureBrain(new Creature(), neuralNetwork);

    const creature = new Creature(
      symbol,
      color,
      "Creature",
      x,
      y,
      finalDietType,
      movementSpeed,
      activityCycle,
      perceptionType,
      perceptionRange,
      perceptionAngle,
      perceptionArc,
      100,
      seed,
      brain
    );

    brain.setCreature(creature);

    return creature;
  }

  private static generateRandomSeed(
    dietType: DietType,
    movementSpeed: number,
    perceptionType: PerceptionType,
    activityCycle: ActivityCycle,
    perceptionRange: number
  ): string {
    // Generate a compatible seed string for legacy compatibility
    let dietChar: string;
    switch (dietType) {
      case DietType.HERBIVORE:
        dietChar = "H";
        break;
      case DietType.CARNIVORE:
        dietChar = "C";
        break;
      case DietType.OMNIVORE:
        dietChar = "O";
        break;
      default:
        dietChar = "Z";
    }

    const speedChar = movementSpeed.toString();

    let perceptionChar: string;
    switch (perceptionType) {
      case PerceptionType.VISION:
        perceptionChar = "V";
        break;
      case PerceptionType.SCENT:
        perceptionChar = "S";
        break;
      case PerceptionType.HEARING:
        perceptionChar = "E";
        break;
      default:
        perceptionChar = "N";
    }

    let activityChar: string;
    switch (activityCycle) {
      case ActivityCycle.DIURNAL:
        activityChar = "D";
        break;
      case ActivityCycle.NOCTURNAL:
        activityChar = "N";
        break;
      default:
        activityChar = "A";
    }

    const rangeChar = perceptionRange.toString();
    const angleChar = Math.floor(Math.random() * 8).toString();
    const arcChar = Math.floor(Math.random() * 9).toString();

    return (
      dietChar +
      speedChar +
      perceptionChar +
      activityChar +
      rangeChar +
      angleChar +
      arcChar
    );
  }

  static createSpeciesPopulation(
    count: number,
    dietType: DietType,
    complexity: number = 0.5
  ): Creature[] {
    const population: Creature[] = [];

    for (let i = 0; i < count; i++) {
      const creature = this.createCreatureWithComplexity(
        -1,
        -1,
        complexity,
        dietType
      );
      population.push(creature);
    }

    return population;
  }
}
