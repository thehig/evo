/**
 * Activation functions for neural networks
 *
 * This module implements the activation functions used in the neural network layers.
 * All functions are deterministic and suitable for creature behavior control.
 */

import { ActivationType, IActivationFunction } from "./types";

/**
 * Sigmoid activation function
 * Output range: (0, 1)
 * Smooth, differentiable, good for output layers
 */
export class SigmoidActivation implements IActivationFunction {
  readonly type = ActivationType.SIGMOID;

  /**
   * Apply sigmoid activation: 1 / (1 + e^(-x))
   */
  activate(value: number): number {
    // Clamp input to prevent overflow
    const clampedValue = Math.max(-500, Math.min(500, value));
    return 1 / (1 + Math.exp(-clampedValue));
  }

  /**
   * Sigmoid derivative: sigmoid(x) * (1 - sigmoid(x))
   */
  derivative(value: number): number {
    const sigmoid = this.activate(value);
    return sigmoid * (1 - sigmoid);
  }
}

/**
 * ReLU (Rectified Linear Unit) activation function
 * Output range: [0, +∞)
 * Fast computation, good for hidden layers
 */
export class ReLUActivation implements IActivationFunction {
  readonly type = ActivationType.RELU;

  /**
   * Apply ReLU activation: max(0, x)
   */
  activate(value: number): number {
    return Math.max(0, value);
  }

  /**
   * ReLU derivative: 1 if x > 0, 0 otherwise
   */
  derivative(value: number): number {
    return value > 0 ? 1 : 0;
  }
}

/**
 * Factory function to create activation functions
 */
export function createActivationFunction(
  type: ActivationType
): IActivationFunction {
  switch (type) {
    case ActivationType.SIGMOID:
      return new SigmoidActivation();
    case ActivationType.RELU:
      return new ReLUActivation();
    default:
      throw new Error(`Unsupported activation function type: ${type}`);
  }
}

/**
 * Get all available activation function types
 */
export function getAvailableActivationTypes(): ActivationType[] {
  return Object.values(ActivationType);
}
