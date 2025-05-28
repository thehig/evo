/**
 * Neural network types and interfaces
 *
 * This module defines the types and interfaces for the neural network system
 * that controls creature behavior in the simulation.
 */

/**
 * Supported activation function types
 */
export enum ActivationType {
  SIGMOID = "sigmoid",
  RELU = "relu",
}

/**
 * Activation function interface
 */
export interface IActivationFunction {
  /** The activation function type */
  readonly type: ActivationType;

  /** Apply the activation function to a value */
  activate(value: number): number;

  /** Get the derivative of the activation function (for future use) */
  derivative(value: number): number;
}

/**
 * Neural network layer configuration
 */
export interface ILayerConfig {
  /** Number of neurons in this layer */
  size: number;

  /** Activation function for this layer */
  activation: ActivationType;

  /** Whether to include bias neurons (default: true) */
  useBias?: boolean;
}

/**
 * Neural network architecture configuration
 */
export interface INeuralNetworkConfig {
  /** Input layer size */
  inputSize: number;

  /** Hidden layer configurations */
  hiddenLayers: ILayerConfig[];

  /** Output layer configuration */
  outputLayer: ILayerConfig;

  /** Weight initialization range */
  weightRange?: {
    min: number;
    max: number;
  };

  /** Random seed for deterministic initialization */
  seed?: number;
}

/**
 * Neural network layer data
 */
export interface ILayer {
  /** Layer configuration */
  readonly config: ILayerConfig;

  /** Neuron values (activations) */
  values: number[];

  /** Weights connecting to the next layer (if any) */
  weights?: number[][];

  /** Bias values for this layer */
  biases?: number[];

  /** Activation function for this layer */
  readonly activation: IActivationFunction;
}

/**
 * Neural network interface
 */
export interface INeuralNetwork {
  /** Network configuration */
  readonly config: INeuralNetworkConfig;

  /** All layers in the network */
  readonly layers: ReadonlyArray<ILayer>;

  /** Input layer */
  readonly inputLayer: ILayer;

  /** Hidden layers */
  readonly hiddenLayers: ReadonlyArray<ILayer>;

  /** Output layer */
  readonly outputLayer: ILayer;

  /** Process input through the network and return output */
  process(inputs: number[]): number[];

  /** Get the current state of all neurons */
  getState(): {
    layers: Array<{
      values: number[];
      weights?: number[][];
      biases?: number[];
    }>;
  };

  /** Set the weights and biases from external data */
  setState(state: {
    layers: Array<{
      weights?: number[][];
      biases?: number[];
    }>;
  }): void;

  /** Clone the neural network */
  clone(): INeuralNetwork;

  /** Get a serializable representation of the network */
  serialize(): string;

  /** Create a network from serialized data */
  deserialize(data: string): void;
}

/**
 * Weight initialization strategy
 */
export interface IWeightInitializer {
  /** Initialize weights for a connection between layers */
  initializeWeights(
    inputSize: number,
    outputSize: number,
    random: () => number
  ): number[][];

  /** Initialize biases for a layer */
  initializeBiases(size: number, random: () => number): number[];
}
