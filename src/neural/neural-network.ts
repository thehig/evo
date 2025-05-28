/**
 * Neural Network implementation
 *
 * This module implements the main neural network class with configurable
 * architecture, deterministic forward propagation, and bias neurons.
 */

import { IRandom } from "../core/interfaces";
import { Random } from "../core/random";
import {
  INeuralNetwork,
  INeuralNetworkConfig,
  ILayer,
  ILayerConfig,
  IWeightInitializer,
  ActivationType,
} from "./types";
import { createActivationFunction } from "./activation-functions";
import { DefaultWeightInitializer } from "./weight-initializer";

/**
 * Layer implementation
 */
class Layer implements ILayer {
  public values: number[];
  public weights?: number[][];
  public biases?: number[];

  constructor(
    public readonly config: ILayerConfig,
    public readonly activation = createActivationFunction(config.activation)
  ) {
    this.values = new Array(config.size).fill(0);

    // Initialize biases if enabled
    if (config.useBias !== false) {
      this.biases = new Array(config.size).fill(0);
    }
  }

  /**
   * Initialize weights connecting to the next layer
   */
  initializeWeights(
    nextLayerSize: number,
    initializer: IWeightInitializer,
    random: IRandom
  ): void {
    this.weights = initializer.initializeWeights(
      this.config.size,
      nextLayerSize,
      () => random.random()
    );
  }

  /**
   * Initialize biases for this layer
   */
  initializeBiases(initializer: IWeightInitializer, random: IRandom): void {
    if (this.config.useBias !== false) {
      this.biases = initializer.initializeBiases(this.config.size, () =>
        random.random()
      );
    }
  }

  /**
   * Apply activation function to all values in the layer
   */
  applyActivation(): void {
    for (let i = 0; i < this.values.length; i++) {
      this.values[i] = this.activation.activate(this.values[i]);
    }
  }

  /**
   * Reset all values to zero
   */
  reset(): void {
    this.values.fill(0);
  }
}

/**
 * Neural Network implementation
 */
export class NeuralNetwork implements INeuralNetwork {
  private readonly _layers: Layer[];
  private readonly random: IRandom;

  constructor(public readonly config: INeuralNetworkConfig) {
    this.validateConfig(config);

    // Initialize random number generator
    this.random = new Random(config.seed || 42);

    // Create layers
    this._layers = [];

    // Input layer
    const inputLayerConfig: ILayerConfig = {
      size: config.inputSize,
      activation: ActivationType.RELU, // Input layer doesn't use activation
      useBias: false, // Input layer doesn't need bias
    };
    this._layers.push(new Layer(inputLayerConfig));

    // Hidden layers
    for (const hiddenConfig of config.hiddenLayers) {
      this._layers.push(new Layer(hiddenConfig));
    }

    // Output layer
    this._layers.push(new Layer(config.outputLayer));

    // Initialize weights and biases
    this.initializeNetwork();
  }

  /**
   * Validate network configuration
   */
  private validateConfig(config: INeuralNetworkConfig): void {
    if (config.inputSize <= 0) {
      throw new Error("Input size must be positive");
    }

    if (config.outputLayer.size <= 0) {
      throw new Error("Output layer size must be positive");
    }

    for (let i = 0; i < config.hiddenLayers.length; i++) {
      if (config.hiddenLayers[i].size <= 0) {
        throw new Error(`Hidden layer ${i} size must be positive`);
      }
    }

    if (config.weightRange) {
      if (config.weightRange.min >= config.weightRange.max) {
        throw new Error("Weight range min must be less than max");
      }
    }
  }

  /**
   * Initialize network weights and biases
   */
  private initializeNetwork(): void {
    const weightRange = this.config.weightRange || { min: -1, max: 1 };
    const initializer = new DefaultWeightInitializer(
      weightRange.min,
      weightRange.max
    );

    // Initialize weights between layers
    for (let i = 0; i < this._layers.length - 1; i++) {
      const currentLayer = this._layers[i];
      const nextLayer = this._layers[i + 1];

      currentLayer.initializeWeights(
        nextLayer.config.size,
        initializer,
        this.random
      );
    }

    // Initialize biases for all layers except input
    for (let i = 1; i < this._layers.length; i++) {
      this._layers[i].initializeBiases(initializer, this.random);
    }
  }

  /**
   * Get all layers
   */
  get layers(): ReadonlyArray<ILayer> {
    return this._layers;
  }

  /**
   * Get input layer
   */
  get inputLayer(): ILayer {
    return this._layers[0];
  }

  /**
   * Get hidden layers
   */
  get hiddenLayers(): ReadonlyArray<ILayer> {
    return this._layers.slice(1, -1);
  }

  /**
   * Get output layer
   */
  get outputLayer(): ILayer {
    return this._layers[this._layers.length - 1];
  }

  /**
   * Process input through the network and return output
   */
  process(inputs: number[]): number[] {
    if (inputs.length !== this.config.inputSize) {
      throw new Error(
        `Input size mismatch: expected ${this.config.inputSize}, got ${inputs.length}`
      );
    }

    // Set input values
    for (let i = 0; i < inputs.length; i++) {
      this.inputLayer.values[i] = inputs[i];
    }

    // Forward propagation through all layers
    for (let layerIndex = 1; layerIndex < this._layers.length; layerIndex++) {
      const currentLayer = this._layers[layerIndex];
      const previousLayer = this._layers[layerIndex - 1];

      // Reset current layer values
      currentLayer.reset();

      // Calculate weighted sum from previous layer
      if (previousLayer.weights) {
        for (let i = 0; i < previousLayer.config.size; i++) {
          for (let j = 0; j < currentLayer.config.size; j++) {
            currentLayer.values[j] +=
              previousLayer.values[i] * previousLayer.weights[i][j];
          }
        }
      }

      // Add bias values
      if (currentLayer.biases) {
        for (let i = 0; i < currentLayer.config.size; i++) {
          currentLayer.values[i] += currentLayer.biases[i];
        }
      }

      // Apply activation function
      currentLayer.applyActivation();
    }

    // Return output layer values
    return [...this.outputLayer.values];
  }

  /**
   * Get the current state of all neurons
   */
  getState(): {
    layers: Array<{
      values: number[];
      weights?: number[][];
      biases?: number[];
    }>;
  } {
    return {
      layers: this._layers.map((layer) => ({
        values: [...layer.values],
        weights: layer.weights
          ? layer.weights.map((row) => [...row])
          : undefined,
        biases: layer.biases ? [...layer.biases] : undefined,
      })),
    };
  }

  /**
   * Set the weights and biases from external data
   */
  setState(state: {
    layers: Array<{
      weights?: number[][];
      biases?: number[];
    }>;
  }): void {
    if (state.layers.length !== this._layers.length) {
      throw new Error("State layer count mismatch");
    }

    for (let i = 0; i < this._layers.length; i++) {
      const layer = this._layers[i];
      const layerState = state.layers[i];

      if (layerState.weights) {
        if (!layer.weights) {
          throw new Error(`Layer ${i} does not have weights`);
        }
        if (
          layerState.weights.length !== layer.weights.length ||
          layerState.weights[0]?.length !== layer.weights[0]?.length
        ) {
          throw new Error(`Layer ${i} weight dimensions mismatch`);
        }
        layer.weights = layerState.weights.map((row) => [...row]);
      }

      if (layerState.biases) {
        if (!layer.biases) {
          throw new Error(`Layer ${i} does not have biases`);
        }
        if (layerState.biases.length !== layer.biases.length) {
          throw new Error(`Layer ${i} bias dimensions mismatch`);
        }
        layer.biases = [...layerState.biases];
      }
    }
  }

  /**
   * Clone the neural network
   */
  clone(): INeuralNetwork {
    const clonedNetwork = new NeuralNetwork(this.config);
    clonedNetwork.setState(this.getState());
    return clonedNetwork;
  }

  /**
   * Get a serializable representation of the network
   */
  serialize(): string {
    return JSON.stringify({
      config: this.config,
      state: this.getState(),
    });
  }

  /**
   * Create a network from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);

      if (!parsed.config || !parsed.state) {
        throw new Error("Invalid serialized data format");
      }

      // Validate that the config matches
      if (
        parsed.config.inputSize !== this.config.inputSize ||
        parsed.config.outputLayer.size !== this.config.outputLayer.size ||
        parsed.config.hiddenLayers.length !== this.config.hiddenLayers.length
      ) {
        throw new Error("Serialized network configuration mismatch");
      }

      this.setState(parsed.state);
    } catch (error) {
      throw new Error(`Failed to deserialize neural network: ${error}`);
    }
  }
}
