import { NeuralNetwork, NeuralNetworkGenerator } from "./neuralNetwork.js";
import { Grid, Creature, IEntity, DietType } from "./grid.js";

export interface SensoryInput {
  // Vision inputs (8 directions + distance)
  northFood: number;
  northEastFood: number;
  eastFood: number;
  southEastFood: number;
  southFood: number;
  southWestFood: number;
  westFood: number;
  northWestFood: number;

  // Threat detection (predators)
  northThreat: number;
  northEastThreat: number;
  eastThreat: number;
  southEastThreat: number;
  southThreat: number;
  southWestThreat: number;
  westThreat: number;
  northWestThreat: number;

  // Internal state
  energy: number;
  canReproduce: number;

  // Environmental
  nearWater: number;
  nearRock: number;
}

export interface BehaviorOutput {
  // Movement (8 directions)
  moveNorth: number;
  moveNorthEast: number;
  moveEast: number;
  moveSouthEast: number;
  moveSouth: number;
  moveSouthWest: number;
  moveWest: number;
  moveNorthWest: number;

  // Actions
  eat: number;
  reproduce: number;
  rest: number; // Stay still to conserve energy
}

export class CreatureBrain {
  private neuralNetwork: NeuralNetwork;
  private creature: Creature;

  constructor(creature: Creature, neuralNetwork?: NeuralNetwork) {
    this.creature = creature;

    if (neuralNetwork) {
      this.neuralNetwork = neuralNetwork;
    } else {
      // Generate a random neural network
      this.neuralNetwork = NeuralNetworkGenerator.generateRandom(
        20, // Input size: 8 food + 8 threat + 2 internal + 2 environmental = 20
        11, // Output size (BehaviorOutput fields)
        Math.random() // Random complexity
      );
    }
  }

  public getNeuralNetwork(): NeuralNetwork {
    return this.neuralNetwork;
  }

  public setNeuralNetwork(network: NeuralNetwork): void {
    this.neuralNetwork = network;
  }

  public setCreature(creature: Creature): void {
    this.creature = creature;
  }

  public processEnvironment(grid: Grid): { newX: number; newY: number } | null {
    const sensoryInput = this.gatherSensoryInput(grid);
    const behaviorOutput = this.makeBehaviorDecision(sensoryInput);

    return this.executeBehavior(behaviorOutput, grid);
  }

  private gatherSensoryInput(grid: Grid): SensoryInput {
    const input: SensoryInput = {
      northFood: 0,
      northEastFood: 0,
      eastFood: 0,
      southEastFood: 0,
      southFood: 0,
      southWestFood: 0,
      westFood: 0,
      northWestFood: 0,
      northThreat: 0,
      northEastThreat: 0,
      eastThreat: 0,
      southEastThreat: 0,
      southThreat: 0,
      southWestThreat: 0,
      westThreat: 0,
      northWestThreat: 0,
      energy: this.creature.energy / 200, // Normalize to 0-1
      canReproduce: this.creature.canReproduce() ? 1 : 0,
      nearWater: 0,
      nearRock: 0,
    };

    // Define 8 directions
    const directions = [
      { dx: 0, dy: -1, name: "north" },
      { dx: 1, dy: -1, name: "northEast" },
      { dx: 1, dy: 0, name: "east" },
      { dx: 1, dy: 1, name: "southEast" },
      { dx: 0, dy: 1, name: "south" },
      { dx: -1, dy: 1, name: "southWest" },
      { dx: -1, dy: 0, name: "west" },
      { dx: -1, dy: -1, name: "northWest" },
    ];

    // Scan in each direction for food and threats
    for (const dir of directions) {
      let foodStrength = 0;
      let threatStrength = 0;

      // Look up to 3 cells in each direction
      for (let distance = 1; distance <= 3; distance++) {
        const checkX = this.creature.x + dir.dx * distance;
        const checkY = this.creature.y + dir.dy * distance;

        if (!grid.isValidPosition(checkX, checkY)) break;

        const entity = grid.getCell(checkX, checkY);
        if (entity) {
          const distanceWeight = 1 / distance; // Closer = stronger signal

          if (this.isFood(entity)) {
            foodStrength = Math.max(foodStrength, distanceWeight);
          } else if (this.isThreat(entity)) {
            threatStrength = Math.max(threatStrength, distanceWeight);
          } else if (entity.type === "Water") {
            input.nearWater = Math.max(input.nearWater, distanceWeight);
          } else if (entity.type === "Rock") {
            input.nearRock = Math.max(input.nearRock, distanceWeight);
          }
        }
      }

      // Set the input values
      (input as any)[`${dir.name}Food`] = foodStrength;
      (input as any)[`${dir.name}Threat`] = threatStrength;
    }

    return input;
  }

  private isFood(entity: IEntity): boolean {
    if (entity.type === "Plant") {
      return (
        this.creature.dietType === DietType.HERBIVORE ||
        this.creature.dietType === DietType.OMNIVORE
      );
    }

    if (entity instanceof Creature && entity !== this.creature) {
      return (
        this.creature.dietType === DietType.CARNIVORE ||
        this.creature.dietType === DietType.OMNIVORE
      );
    }

    return false;
  }

  private isThreat(entity: IEntity): boolean {
    if (entity instanceof Creature && entity !== this.creature) {
      // Other carnivores or omnivores are threats
      return (
        entity.dietType === DietType.CARNIVORE ||
        entity.dietType === DietType.OMNIVORE
      );
    }
    return false;
  }

  private makeBehaviorDecision(sensoryInput: SensoryInput): BehaviorOutput {
    // Convert sensory input to array
    const inputArray = [
      sensoryInput.northFood,
      sensoryInput.northEastFood,
      sensoryInput.eastFood,
      sensoryInput.southEastFood,
      sensoryInput.southFood,
      sensoryInput.southWestFood,
      sensoryInput.westFood,
      sensoryInput.northWestFood,
      sensoryInput.northThreat,
      sensoryInput.northEastThreat,
      sensoryInput.eastThreat,
      sensoryInput.southEastThreat,
      sensoryInput.southThreat,
      sensoryInput.southWestThreat,
      sensoryInput.westThreat,
      sensoryInput.northWestThreat,
      sensoryInput.energy,
      sensoryInput.canReproduce,
      sensoryInput.nearWater,
      sensoryInput.nearRock,
    ];

    // Get neural network output
    const output = this.neuralNetwork.predict(inputArray);

    return {
      moveNorth: output[0],
      moveNorthEast: output[1],
      moveEast: output[2],
      moveSouthEast: output[3],
      moveSouth: output[4],
      moveSouthWest: output[5],
      moveWest: output[6],
      moveNorthWest: output[7],
      eat: output[8],
      reproduce: output[9],
      rest: output[10],
    };
  }

  private executeBehavior(
    behavior: BehaviorOutput,
    grid: Grid
  ): { newX: number; newY: number } | null {
    // Find the strongest movement direction
    const movements = [
      { value: behavior.moveNorth, dx: 0, dy: -1 },
      { value: behavior.moveNorthEast, dx: 1, dy: -1 },
      { value: behavior.moveEast, dx: 1, dy: 0 },
      { value: behavior.moveSouthEast, dx: 1, dy: 1 },
      { value: behavior.moveSouth, dx: 0, dy: 1 },
      { value: behavior.moveSouthWest, dx: -1, dy: 1 },
      { value: behavior.moveWest, dx: -1, dy: 0 },
      { value: behavior.moveNorthWest, dx: -1, dy: -1 },
    ];

    // Sort by activation strength
    movements.sort((a, b) => b.value - a.value);

    // Check if creature wants to rest (stay still)
    if (behavior.rest > movements[0].value) {
      return null; // Don't move
    }

    // Try to move in the preferred direction
    const preferredMove = movements[0];
    const newX = this.creature.x + preferredMove.dx;
    const newY = this.creature.y + preferredMove.dy;

    // Validate the move
    if (grid.isValidPosition(newX, newY)) {
      const targetCell = grid.getCell(newX, newY);

      // Can't move into rocks
      if (targetCell && targetCell.type === "Rock") {
        // Try second best option
        if (movements.length > 1) {
          const secondChoice = movements[1];
          const altX = this.creature.x + secondChoice.dx;
          const altY = this.creature.y + secondChoice.dy;

          if (grid.isValidPosition(altX, altY)) {
            const altTarget = grid.getCell(altX, altY);
            if (!altTarget || altTarget.type !== "Rock") {
              return { newX: altX, newY: altY };
            }
          }
        }
        return null; // Can't move
      }

      // Can't move into other creatures (except plants which can be eaten)
      if (targetCell && targetCell instanceof Creature) {
        return null;
      }

      return { newX, newY };
    }

    return null; // Invalid position
  }

  public shouldAttemptReproduction(grid: Grid): boolean {
    if (!this.creature.canReproduce()) {
      return false;
    }

    const sensoryInput = this.gatherSensoryInput(grid);
    const behaviorOutput = this.makeBehaviorDecision(sensoryInput);

    // Use neural network to decide if reproduction is desired
    return behaviorOutput.reproduce > 0.5;
  }

  public static createOffspringBrain(
    parent1: CreatureBrain,
    parent2: CreatureBrain
  ): CreatureBrain {
    let offspringNetwork: NeuralNetwork;

    // Try to crossover if networks are compatible
    try {
      offspringNetwork = NeuralNetwork.crossover(
        parent1.neuralNetwork,
        parent2.neuralNetwork
      );

      // Apply mutation
      if (Math.random() < 0.8) {
        // 80% chance of mutation
        offspringNetwork = offspringNetwork.mutate();
      }

      // Small chance of architectural evolution
      if (Math.random() < 0.1) {
        // 10% chance
        offspringNetwork =
          NeuralNetworkGenerator.evolveArchitecture(offspringNetwork);
      }
    } catch (error) {
      // If crossover fails (incompatible architectures), create a new random network
      console.log("Crossover failed, generating new random network:", error);
      offspringNetwork = NeuralNetworkGenerator.generateRandom(
        20,
        11,
        Math.random()
      );
    }

    // Create a temporary creature for the brain (will be replaced with actual offspring)
    const tempCreature = new Creature();
    return new CreatureBrain(tempCreature, offspringNetwork);
  }

  public serialize(): string {
    return this.neuralNetwork.serialize();
  }

  public static deserialize(creature: Creature, data: string): CreatureBrain {
    const network = NeuralNetwork.deserialize(data);
    return new CreatureBrain(creature, network);
  }
}
