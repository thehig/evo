/**
 * Neural network module exports
 *
 * This module contains the neural network implementation for creature behavior.
 */

// Types and interfaces
export * from "./types";

// Activation functions
export * from "./activation-functions";

// Weight initialization
export * from "./weight-initializer";

// Main neural network implementation
export { NeuralNetwork } from "./neural-network";

// Module version
export const NEURAL_MODULE_VERSION = "0.1.0";
