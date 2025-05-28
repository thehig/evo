export interface NeuralNetworkConfig {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  activationFunction: ActivationFunction;
  mutationRate: number;
  mutationStrength: number;
}

export enum ActivationFunction {
  SIGMOID = "sigmoid",
  TANH = "tanh",
  RELU = "relu",
  LEAKY_RELU = "leaky_relu",
}

export class Matrix {
  public data: number[][];

  constructor(public rows: number, public cols: number) {
    this.data = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(0));
  }

  static fromArray(arr: number[]): Matrix {
    const matrix = new Matrix(arr.length, 1);
    for (let i = 0; i < arr.length; i++) {
      matrix.data[i][0] = arr[i];
    }
    return matrix;
  }

  toArray(): number[] {
    const arr: number[] = [];
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        arr.push(this.data[i][j]);
      }
    }
    return arr;
  }

  randomize(min: number = -1, max: number = 1): void {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.data[i][j] = Math.random() * (max - min) + min;
      }
    }
  }

  multiply(other: Matrix): Matrix {
    if (this.cols !== other.rows) {
      throw new Error("Matrix dimensions don't match for multiplication");
    }

    const result = new Matrix(this.rows, other.cols);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.data[i][k] * other.data[k][j];
        }
        result.data[i][j] = sum;
      }
    }
    return result;
  }

  add(other: Matrix): Matrix {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error("Matrix dimensions don't match for addition");
    }

    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[i][j] = this.data[i][j] + other.data[i][j];
      }
    }
    return result;
  }

  map(func: (value: number) => number): Matrix {
    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[i][j] = func(this.data[i][j]);
      }
    }
    return result;
  }

  copy(): Matrix {
    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[i][j] = this.data[i][j];
      }
    }
    return result;
  }

  mutate(rate: number, strength: number): void {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (Math.random() < rate) {
          this.data[i][j] += (Math.random() * 2 - 1) * strength;
        }
      }
    }
  }
}

export class NeuralNetwork {
  private weights: Matrix[];
  private biases: Matrix[];
  private config: NeuralNetworkConfig;

  constructor(config: NeuralNetworkConfig) {
    this.config = config;
    this.weights = [];
    this.biases = [];

    // Create layers
    const layers = [
      config.inputSize,
      ...config.hiddenLayers,
      config.outputSize,
    ];

    for (let i = 0; i < layers.length - 1; i++) {
      const weight = new Matrix(layers[i + 1], layers[i]);
      weight.randomize(-1, 1);
      this.weights.push(weight);

      const bias = new Matrix(layers[i + 1], 1);
      bias.randomize(-1, 1);
      this.biases.push(bias);
    }
  }

  static fromWeightsAndBiases(
    weights: Matrix[],
    biases: Matrix[],
    config: NeuralNetworkConfig
  ): NeuralNetwork {
    const nn = new NeuralNetwork(config);
    nn.weights = weights.map((w) => w.copy());
    nn.biases = biases.map((b) => b.copy());
    return nn;
  }

  predict(inputs: number[]): number[] {
    if (inputs.length !== this.config.inputSize) {
      throw new Error(
        `Input size mismatch. Expected ${this.config.inputSize}, got ${inputs.length}`
      );
    }

    let current = Matrix.fromArray(inputs);

    for (let i = 0; i < this.weights.length; i++) {
      current = this.weights[i].multiply(current);
      current = current.add(this.biases[i]);
      current = current.map(this.getActivationFunction());
    }

    return current.toArray();
  }

  private getActivationFunction(): (value: number) => number {
    switch (this.config.activationFunction) {
      case ActivationFunction.SIGMOID:
        return (x: number) => 1 / (1 + Math.exp(-x));
      case ActivationFunction.TANH:
        return (x: number) => Math.tanh(x);
      case ActivationFunction.RELU:
        return (x: number) => Math.max(0, x);
      case ActivationFunction.LEAKY_RELU:
        return (x: number) => (x > 0 ? x : 0.01 * x);
      default:
        return (x: number) => 1 / (1 + Math.exp(-x)); // Default to sigmoid
    }
  }

  mutate(): NeuralNetwork {
    const newWeights = this.weights.map((w) => {
      const copy = w.copy();
      copy.mutate(this.config.mutationRate, this.config.mutationStrength);
      return copy;
    });

    const newBiases = this.biases.map((b) => {
      const copy = b.copy();
      copy.mutate(this.config.mutationRate, this.config.mutationStrength);
      return copy;
    });

    return NeuralNetwork.fromWeightsAndBiases(
      newWeights,
      newBiases,
      this.config
    );
  }

  static crossover(
    parent1: NeuralNetwork,
    parent2: NeuralNetwork
  ): NeuralNetwork {
    if (parent1.weights.length !== parent2.weights.length) {
      throw new Error(
        "Neural networks must have the same architecture for crossover"
      );
    }

    const newWeights: Matrix[] = [];
    const newBiases: Matrix[] = [];

    // Crossover weights
    for (let i = 0; i < parent1.weights.length; i++) {
      const w1 = parent1.weights[i];
      const w2 = parent2.weights[i];
      const newWeight = new Matrix(w1.rows, w1.cols);

      for (let r = 0; r < w1.rows; r++) {
        for (let c = 0; c < w1.cols; c++) {
          newWeight.data[r][c] =
            Math.random() < 0.5 ? w1.data[r][c] : w2.data[r][c];
        }
      }
      newWeights.push(newWeight);
    }

    // Crossover biases
    for (let i = 0; i < parent1.biases.length; i++) {
      const b1 = parent1.biases[i];
      const b2 = parent2.biases[i];
      const newBias = new Matrix(b1.rows, b1.cols);

      for (let r = 0; r < b1.rows; r++) {
        for (let c = 0; c < b1.cols; c++) {
          newBias.data[r][c] =
            Math.random() < 0.5 ? b1.data[r][c] : b2.data[r][c];
        }
      }
      newBiases.push(newBias);
    }

    return NeuralNetwork.fromWeightsAndBiases(
      newWeights,
      newBiases,
      parent1.config
    );
  }

  serialize(): string {
    return JSON.stringify({
      weights: this.weights.map((w) => w.data),
      biases: this.biases.map((b) => b.data),
      config: this.config,
    });
  }

  static deserialize(data: string): NeuralNetwork {
    const parsed = JSON.parse(data);
    const config = parsed.config;
    const nn = new NeuralNetwork(config);

    nn.weights = parsed.weights.map((w: number[][]) => {
      const matrix = new Matrix(w.length, w[0].length);
      matrix.data = w;
      return matrix;
    });

    nn.biases = parsed.biases.map((b: number[][]) => {
      const matrix = new Matrix(b.length, b[0].length);
      matrix.data = b;
      return matrix;
    });

    return nn;
  }

  getConfig(): NeuralNetworkConfig {
    return { ...this.config };
  }

  getComplexity(): number {
    let totalConnections = 0;
    for (const weight of this.weights) {
      totalConnections += weight.rows * weight.cols;
    }
    return totalConnections;
  }
}

// Procedural neural network generation
export class NeuralNetworkGenerator {
  static generateRandom(
    inputSize: number,
    outputSize: number,
    complexity: number = 0.5
  ): NeuralNetwork {
    // Generate architecture based on complexity
    const maxHiddenLayers = Math.floor(complexity * 4) + 1;
    const hiddenLayers: number[] = [];

    for (let i = 0; i < maxHiddenLayers; i++) {
      const layerSize = Math.floor(
        (inputSize + outputSize) *
          (0.5 + complexity * 0.5) *
          (1 - i / maxHiddenLayers)
      );
      if (layerSize > 0) {
        hiddenLayers.push(Math.max(1, layerSize));
      }
    }

    const config: NeuralNetworkConfig = {
      inputSize,
      hiddenLayers,
      outputSize,
      activationFunction: this.randomActivationFunction(),
      mutationRate: 0.1 + Math.random() * 0.1,
      mutationStrength: 0.1 + Math.random() * 0.2,
    };

    return new NeuralNetwork(config);
  }

  private static randomActivationFunction(): ActivationFunction {
    const functions = Object.values(ActivationFunction);
    return functions[Math.floor(Math.random() * functions.length)];
  }

  static evolveArchitecture(parent: NeuralNetwork): NeuralNetwork {
    const config = parent.getConfig();
    const newConfig = { ...config };

    // Randomly modify architecture
    if (Math.random() < 0.3) {
      // Add or remove a hidden layer
      if (Math.random() < 0.5 && newConfig.hiddenLayers.length < 5) {
        // Add layer
        const insertIndex = Math.floor(
          Math.random() * (newConfig.hiddenLayers.length + 1)
        );
        const newSize = Math.floor(
          (newConfig.inputSize + newConfig.outputSize) / 2 +
            (Math.random() - 0.5) * 10
        );
        newConfig.hiddenLayers.splice(insertIndex, 0, Math.max(1, newSize));
      } else if (newConfig.hiddenLayers.length > 1) {
        // Remove layer
        const removeIndex = Math.floor(
          Math.random() * newConfig.hiddenLayers.length
        );
        newConfig.hiddenLayers.splice(removeIndex, 1);
      }
    }

    // Modify layer sizes
    if (Math.random() < 0.4) {
      for (let i = 0; i < newConfig.hiddenLayers.length; i++) {
        if (Math.random() < 0.3) {
          const change = Math.floor((Math.random() - 0.5) * 4);
          newConfig.hiddenLayers[i] = Math.max(
            1,
            newConfig.hiddenLayers[i] + change
          );
        }
      }
    }

    // Change activation function
    if (Math.random() < 0.1) {
      newConfig.activationFunction = this.randomActivationFunction();
    }

    return new NeuralNetwork(newConfig);
  }
}
