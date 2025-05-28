/**
 * Mutation strategies for genetic algorithm
 *
 * This module implements different mutation methods for introducing
 * genetic variation in neural networks.
 */

import { INeuralNetwork } from "../neural/types";
import { IMutationStrategy, IMutationConfig, MutationMethod } from "./types";

/**
 * Helper function to generate Gaussian random numbers using Box-Muller transform
 */
function gaussianRandom(
  random: () => number,
  mean: number = 0,
  stdDev: number = 1
): number {
  // Use Box-Muller transform to generate Gaussian random numbers
  const u1 = random();
  const u2 = random();

  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Gaussian mutation strategy
 *
 * Adds Gaussian noise to weights and biases with configurable
 * mutation rate and magnitude (standard deviation).
 */
export class GaussianMutation implements IMutationStrategy {
  constructor(
    private readonly mutationRate: number,
    private readonly magnitude: number
  ) {
    if (mutationRate < 0 || mutationRate > 1) {
      throw new Error("Mutation rate must be between 0 and 1");
    }
    if (magnitude < 0) {
      throw new Error("Mutation magnitude must be non-negative");
    }
  }

  mutate(network: INeuralNetwork, random: () => number): void {
    const state = network.getState();
    const newState: {
      layers: Array<{
        weights?: number[][];
        biases?: number[];
      }>;
    } = { layers: [] };

    for (let i = 0; i < state.layers.length; i++) {
      const layer = state.layers[i];
      const newLayer: { weights?: number[][]; biases?: number[] } = {};

      // Mutate weights
      if (layer.weights) {
        newLayer.weights = [];
        for (let j = 0; j < layer.weights.length; j++) {
          const weightRow: number[] = [];
          for (let k = 0; k < layer.weights[j].length; k++) {
            let weight = layer.weights[j][k];

            // Apply mutation with probability mutationRate
            if (random() < this.mutationRate) {
              const mutation = gaussianRandom(random, 0, this.magnitude);
              weight += mutation;
            }

            weightRow.push(weight);
          }
          newLayer.weights.push(weightRow);
        }
      }

      // Mutate biases
      if (layer.biases) {
        newLayer.biases = [];
        for (let j = 0; j < layer.biases.length; j++) {
          let bias = layer.biases[j];

          // Apply mutation with probability mutationRate
          if (random() < this.mutationRate) {
            const mutation = gaussianRandom(random, 0, this.magnitude);
            bias += mutation;
          }

          newLayer.biases.push(bias);
        }
      }

      newState.layers.push(newLayer);
    }

    network.setState(newState);
  }
}

/**
 * Uniform mutation strategy
 *
 * Replaces weights and biases with uniform random values within
 * a specified range with configurable mutation rate.
 */
export class UniformMutation implements IMutationStrategy {
  constructor(
    private readonly mutationRate: number,
    private readonly minValue: number,
    private readonly maxValue: number
  ) {
    if (mutationRate < 0 || mutationRate > 1) {
      throw new Error("Mutation rate must be between 0 and 1");
    }
    if (minValue >= maxValue) {
      throw new Error("Minimum value must be less than maximum value");
    }
  }

  mutate(network: INeuralNetwork, random: () => number): void {
    const state = network.getState();
    const newState: {
      layers: Array<{
        weights?: number[][];
        biases?: number[];
      }>;
    } = { layers: [] };

    for (let i = 0; i < state.layers.length; i++) {
      const layer = state.layers[i];
      const newLayer: { weights?: number[][]; biases?: number[] } = {};

      // Mutate weights
      if (layer.weights) {
        newLayer.weights = [];
        for (let j = 0; j < layer.weights.length; j++) {
          const weightRow: number[] = [];
          for (let k = 0; k < layer.weights[j].length; k++) {
            let weight = layer.weights[j][k];

            // Apply mutation with probability mutationRate
            if (random() < this.mutationRate) {
              weight =
                this.minValue + random() * (this.maxValue - this.minValue);
            }

            weightRow.push(weight);
          }
          newLayer.weights.push(weightRow);
        }
      }

      // Mutate biases
      if (layer.biases) {
        newLayer.biases = [];
        for (let j = 0; j < layer.biases.length; j++) {
          let bias = layer.biases[j];

          // Apply mutation with probability mutationRate
          if (random() < this.mutationRate) {
            bias = this.minValue + random() * (this.maxValue - this.minValue);
          }

          newLayer.biases.push(bias);
        }
      }

      newState.layers.push(newLayer);
    }

    network.setState(newState);
  }
}

/**
 * Factory function to create mutation strategies
 */
export function createMutationStrategy(
  config: IMutationConfig
): IMutationStrategy {
  switch (config.method) {
    case MutationMethod.GAUSSIAN:
      return new GaussianMutation(config.rate, config.magnitude);

    case MutationMethod.UNIFORM:
      const minValue = config.minValue ?? -1;
      const maxValue = config.maxValue ?? 1;
      return new UniformMutation(config.rate, minValue, maxValue);

    default:
      throw new Error(`Unknown mutation method: ${config.method}`);
  }
}
