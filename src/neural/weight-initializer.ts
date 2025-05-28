/**
 * Weight initialization strategies for neural networks
 *
 * This module implements weight and bias initialization strategies
 * for neural network layers with deterministic behavior.
 */

import { IWeightInitializer } from "./types";

/**
 * Default weight initializer with configurable range
 */
export class DefaultWeightInitializer implements IWeightInitializer {
  constructor(
    private readonly minWeight: number = -1,
    private readonly maxWeight: number = 1
  ) {
    if (minWeight >= maxWeight) {
      throw new Error("minWeight must be less than maxWeight");
    }
  }

  /**
   * Initialize weights with uniform random distribution in the specified range
   */
  initializeWeights(
    inputSize: number,
    outputSize: number,
    random: () => number
  ): number[][] {
    const weights: number[][] = [];

    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        // Scale random value to the specified range
        const range = this.maxWeight - this.minWeight;
        weights[i][j] = this.minWeight + random() * range;
      }
    }

    return weights;
  }

  /**
   * Initialize biases with uniform random distribution in the specified range
   */
  initializeBiases(size: number, random: () => number): number[] {
    const biases: number[] = [];

    for (let i = 0; i < size; i++) {
      // Scale random value to the specified range
      const range = this.maxWeight - this.minWeight;
      biases[i] = this.minWeight + random() * range;
    }

    return biases;
  }
}

/**
 * Xavier/Glorot weight initializer
 * Good for sigmoid and tanh activation functions
 */
export class XavierWeightInitializer implements IWeightInitializer {
  /**
   * Initialize weights using Xavier initialization
   * Range: [-sqrt(6/(inputSize + outputSize)), sqrt(6/(inputSize + outputSize))]
   */
  initializeWeights(
    inputSize: number,
    outputSize: number,
    random: () => number
  ): number[][] {
    const limit = Math.sqrt(6 / (inputSize + outputSize));
    const weights: number[][] = [];

    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        // Scale random value to Xavier range
        weights[i][j] = (random() * 2 - 1) * limit;
      }
    }

    return weights;
  }

  /**
   * Initialize biases to zero (common practice with Xavier initialization)
   */
  initializeBiases(size: number, _random: () => number): number[] {
    return new Array(size).fill(0);
  }
}

/**
 * He weight initializer
 * Good for ReLU activation functions
 */
export class HeWeightInitializer implements IWeightInitializer {
  /**
   * Initialize weights using He initialization
   * Range: [0, sqrt(2/inputSize)] with normal distribution approximation
   */
  initializeWeights(
    inputSize: number,
    outputSize: number,
    random: () => number
  ): number[][] {
    const stddev = Math.sqrt(2 / inputSize);
    const weights: number[][] = [];

    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        // Approximate normal distribution using Box-Muller transform
        const u1 = random();
        const u2 = random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        weights[i][j] = z0 * stddev;
      }
    }

    return weights;
  }

  /**
   * Initialize biases to zero (common practice with He initialization)
   */
  initializeBiases(size: number, _random: () => number): number[] {
    return new Array(size).fill(0);
  }
}

/**
 * Factory function to create weight initializers
 */
export function createWeightInitializer(
  type: "default" | "xavier" | "he",
  minWeight?: number,
  maxWeight?: number
): IWeightInitializer {
  switch (type) {
    case "default":
      return new DefaultWeightInitializer(minWeight, maxWeight);
    case "xavier":
      return new XavierWeightInitializer();
    case "he":
      return new HeWeightInitializer();
    default:
      throw new Error(`Unsupported weight initializer type: ${type}`);
  }
}
