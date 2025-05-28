/**
 * Crossover strategies for genetic algorithm
 *
 * This module implements different crossover methods for combining
 * parent neural networks to create offspring.
 */

import { INeuralNetwork } from "../neural/types";
import { ICrossoverStrategy, ICrossoverConfig, CrossoverMethod } from "./types";

/**
 * Helper function to extract all weights and biases from a neural network
 */
function extractGenome(network: INeuralNetwork): number[] {
  const genome: number[] = [];

  const state = network.getState();

  for (const layer of state.layers) {
    // Add weights
    if (layer.weights) {
      for (const weightRow of layer.weights) {
        genome.push(...weightRow);
      }
    }

    // Add biases
    if (layer.biases) {
      genome.push(...layer.biases);
    }
  }

  return genome;
}

/**
 * Helper function to apply genome back to a neural network
 */
function applyGenome(network: INeuralNetwork, genome: number[]): void {
  const state = network.getState();
  let genomeIndex = 0;

  const newState: {
    layers: Array<{
      weights?: number[][];
      biases?: number[];
    }>;
  } = { layers: [] };

  for (let i = 0; i < state.layers.length; i++) {
    const layer = state.layers[i];
    const newLayer: { weights?: number[][]; biases?: number[] } = {};

    // Apply weights
    if (layer.weights) {
      newLayer.weights = [];
      for (let j = 0; j < layer.weights.length; j++) {
        const weightRow: number[] = [];
        for (let k = 0; k < layer.weights[j].length; k++) {
          weightRow.push(genome[genomeIndex++]);
        }
        newLayer.weights.push(weightRow);
      }
    }

    // Apply biases
    if (layer.biases) {
      newLayer.biases = [];
      for (let j = 0; j < layer.biases.length; j++) {
        newLayer.biases.push(genome[genomeIndex++]);
      }
    }

    newState.layers.push(newLayer);
  }

  network.setState(newState);
}

/**
 * Single-point crossover strategy
 *
 * Selects a random crossover point and swaps genetic material
 * between parents at that point.
 */
export class SinglePointCrossover implements ICrossoverStrategy {
  crossover(
    parent1: INeuralNetwork,
    parent2: INeuralNetwork,
    random: () => number
  ): [INeuralNetwork, INeuralNetwork] {
    const genome1 = extractGenome(parent1);
    const genome2 = extractGenome(parent2);

    if (genome1.length !== genome2.length) {
      throw new Error("Parent networks must have the same structure");
    }

    // Select crossover point
    const crossoverPoint = Math.floor(random() * genome1.length);

    // Create offspring genomes
    const offspring1Genome = [
      ...genome1.slice(0, crossoverPoint),
      ...genome2.slice(crossoverPoint),
    ];

    const offspring2Genome = [
      ...genome2.slice(0, crossoverPoint),
      ...genome1.slice(crossoverPoint),
    ];

    // Create offspring networks
    const offspring1 = parent1.clone();
    const offspring2 = parent2.clone();

    applyGenome(offspring1, offspring1Genome);
    applyGenome(offspring2, offspring2Genome);

    return [offspring1, offspring2];
  }
}

/**
 * Multi-point crossover strategy
 *
 * Selects multiple random crossover points and alternates
 * genetic material between parents.
 */
export class MultiPointCrossover implements ICrossoverStrategy {
  constructor(private readonly points: number = 2) {
    if (points < 1) {
      throw new Error("Number of crossover points must be at least 1");
    }
  }

  crossover(
    parent1: INeuralNetwork,
    parent2: INeuralNetwork,
    random: () => number
  ): [INeuralNetwork, INeuralNetwork] {
    const genome1 = extractGenome(parent1);
    const genome2 = extractGenome(parent2);

    if (genome1.length !== genome2.length) {
      throw new Error("Parent networks must have the same structure");
    }

    // Generate and sort crossover points
    const crossoverPoints: number[] = [];
    for (let i = 0; i < this.points; i++) {
      crossoverPoints.push(Math.floor(random() * genome1.length));
    }
    crossoverPoints.sort((a, b) => a - b);

    // Remove duplicates
    const uniquePoints = [...new Set(crossoverPoints)];

    // Create offspring genomes
    const offspring1Genome: number[] = [];
    const offspring2Genome: number[] = [];

    let currentParent = 1; // Start with parent 1
    let lastPoint = 0;

    for (const point of uniquePoints) {
      if (currentParent === 1) {
        offspring1Genome.push(...genome1.slice(lastPoint, point));
        offspring2Genome.push(...genome2.slice(lastPoint, point));
      } else {
        offspring1Genome.push(...genome2.slice(lastPoint, point));
        offspring2Genome.push(...genome1.slice(lastPoint, point));
      }

      currentParent = currentParent === 1 ? 2 : 1; // Switch parent
      lastPoint = point;
    }

    // Add remaining genes
    if (currentParent === 1) {
      offspring1Genome.push(...genome1.slice(lastPoint));
      offspring2Genome.push(...genome2.slice(lastPoint));
    } else {
      offspring1Genome.push(...genome2.slice(lastPoint));
      offspring2Genome.push(...genome1.slice(lastPoint));
    }

    // Create offspring networks
    const offspring1 = parent1.clone();
    const offspring2 = parent2.clone();

    applyGenome(offspring1, offspring1Genome);
    applyGenome(offspring2, offspring2Genome);

    return [offspring1, offspring2];
  }
}

/**
 * Uniform crossover strategy
 *
 * For each gene, randomly selects which parent to inherit from
 * based on a uniform probability.
 */
export class UniformCrossover implements ICrossoverStrategy {
  constructor(private readonly uniformRate: number = 0.5) {
    if (uniformRate < 0 || uniformRate > 1) {
      throw new Error("Uniform rate must be between 0 and 1");
    }
  }

  crossover(
    parent1: INeuralNetwork,
    parent2: INeuralNetwork,
    random: () => number
  ): [INeuralNetwork, INeuralNetwork] {
    const genome1 = extractGenome(parent1);
    const genome2 = extractGenome(parent2);

    if (genome1.length !== genome2.length) {
      throw new Error("Parent networks must have the same structure");
    }

    // Create offspring genomes
    const offspring1Genome: number[] = [];
    const offspring2Genome: number[] = [];

    for (let i = 0; i < genome1.length; i++) {
      if (random() < this.uniformRate) {
        // Take from parent 1 for offspring 1, parent 2 for offspring 2
        offspring1Genome.push(genome1[i]);
        offspring2Genome.push(genome2[i]);
      } else {
        // Take from parent 2 for offspring 1, parent 1 for offspring 2
        offspring1Genome.push(genome2[i]);
        offspring2Genome.push(genome1[i]);
      }
    }

    // Create offspring networks
    const offspring1 = parent1.clone();
    const offspring2 = parent2.clone();

    applyGenome(offspring1, offspring1Genome);
    applyGenome(offspring2, offspring2Genome);

    return [offspring1, offspring2];
  }
}

/**
 * Factory function to create crossover strategies
 */
export function createCrossoverStrategy(
  config: ICrossoverConfig
): ICrossoverStrategy {
  switch (config.method) {
    case CrossoverMethod.SINGLE_POINT:
      return new SinglePointCrossover();

    case CrossoverMethod.MULTI_POINT:
      return new MultiPointCrossover(config.points || 2);

    case CrossoverMethod.UNIFORM:
      return new UniformCrossover(config.uniformRate || 0.5);

    default:
      throw new Error(`Unknown crossover method: ${config.method}`);
  }
}
