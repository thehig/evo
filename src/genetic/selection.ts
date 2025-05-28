/**
 * Selection strategies for genetic algorithm
 *
 * This module implements different selection methods for choosing parents
 * for reproduction in the genetic algorithm.
 */

import {
  IIndividual,
  ISelectionStrategy,
  ISelectionConfig,
  SelectionMethod,
} from "./types";

/**
 * Tournament selection strategy
 *
 * Selects individuals by running tournaments between random subsets
 * of the population and choosing the best from each tournament.
 */
export class TournamentSelection implements ISelectionStrategy {
  constructor(private readonly tournamentSize: number = 3) {
    if (tournamentSize < 1) {
      throw new Error("Tournament size must be at least 1");
    }
  }

  select(
    population: IIndividual[],
    count: number,
    random: () => number
  ): IIndividual[] {
    if (population.length === 0) {
      throw new Error("Population cannot be empty");
    }

    if (count < 0) {
      throw new Error("Selection count must be non-negative");
    }

    const selected: IIndividual[] = [];

    for (let i = 0; i < count; i++) {
      // Run tournament
      let best = population[Math.floor(random() * population.length)];

      for (let j = 1; j < this.tournamentSize; j++) {
        const competitor = population[Math.floor(random() * population.length)];
        if (competitor.fitness > best.fitness) {
          best = competitor;
        }
      }

      selected.push(best);
    }

    return selected;
  }
}

/**
 * Roulette wheel selection strategy
 *
 * Selects individuals with probability proportional to their fitness.
 * Uses fitness-proportionate selection with optional selection pressure.
 */
export class RouletteWheelSelection implements ISelectionStrategy {
  constructor(private readonly selectionPressure: number = 1.0) {
    if (selectionPressure <= 0) {
      throw new Error("Selection pressure must be positive");
    }
  }

  select(
    population: IIndividual[],
    count: number,
    random: () => number
  ): IIndividual[] {
    if (population.length === 0) {
      throw new Error("Population cannot be empty");
    }

    if (count < 0) {
      throw new Error("Selection count must be non-negative");
    }

    // Handle edge case where all fitness values are the same or negative
    const minFitness = Math.min(...population.map((ind) => ind.fitness));
    const adjustedFitnesses = population.map((ind) =>
      Math.pow(
        Math.max(0, ind.fitness - minFitness + 1),
        this.selectionPressure
      )
    );

    const totalFitness = adjustedFitnesses.reduce(
      (sum, fitness) => sum + fitness,
      0
    );

    if (totalFitness === 0) {
      // Fallback to uniform random selection if all fitness values are zero
      const selected: IIndividual[] = [];
      for (let i = 0; i < count; i++) {
        selected.push(population[Math.floor(random() * population.length)]);
      }
      return selected;
    }

    // Create cumulative probability distribution
    const cumulativeProbabilities: number[] = [];
    let cumulative = 0;

    for (let i = 0; i < adjustedFitnesses.length; i++) {
      cumulative += adjustedFitnesses[i] / totalFitness;
      cumulativeProbabilities.push(cumulative);
    }

    // Select individuals
    const selected: IIndividual[] = [];

    for (let i = 0; i < count; i++) {
      const randomValue = random();

      // Find the first individual whose cumulative probability >= randomValue
      let selectedIndex = 0;
      for (let j = 0; j < cumulativeProbabilities.length; j++) {
        if (randomValue <= cumulativeProbabilities[j]) {
          selectedIndex = j;
          break;
        }
      }

      selected.push(population[selectedIndex]);
    }

    return selected;
  }
}

/**
 * Factory function to create selection strategies
 */
export function createSelectionStrategy(
  config: ISelectionConfig
): ISelectionStrategy {
  switch (config.method) {
    case SelectionMethod.TOURNAMENT:
      return new TournamentSelection(config.tournamentSize || 3);

    case SelectionMethod.ROULETTE_WHEEL:
      return new RouletteWheelSelection(config.selectionPressure || 1.0);

    default:
      throw new Error(`Unknown selection method: ${config.method}`);
  }
}
