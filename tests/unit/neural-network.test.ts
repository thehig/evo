/**
 * Neural Network Unit Tests
 *
 * Tests for the neural network implementation including:
 * - Forward propagation with known inputs and weights
 * - Deterministic behavior verification
 * - Different network configurations
 * - Activation functions
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  NeuralNetwork,
  ActivationType,
  INeuralNetworkConfig,
  SigmoidActivation,
  ReLUActivation,
  createActivationFunction,
  DefaultWeightInitializer,
  XavierWeightInitializer,
  HeWeightInitializer,
} from "@/neural/index.js";

describe("Neural Network", () => {
  describe("Activation Functions", () => {
    describe("SigmoidActivation", () => {
      let sigmoid: SigmoidActivation;

      beforeEach(() => {
        sigmoid = new SigmoidActivation();
      });

      it("should have correct type", () => {
        expect(sigmoid.type).toBe(ActivationType.SIGMOID);
      });

      it("should compute sigmoid correctly", () => {
        expect(sigmoid.activate(0)).toBeCloseTo(0.5, 5);
        expect(sigmoid.activate(1)).toBeCloseTo(0.7311, 4);
        expect(sigmoid.activate(-1)).toBeCloseTo(0.2689, 4);
        expect(sigmoid.activate(10)).toBeCloseTo(0.99995, 4);
        expect(sigmoid.activate(-10)).toBeCloseTo(0.00005, 4);
      });

      it("should handle extreme values without overflow", () => {
        expect(sigmoid.activate(1000)).toBeCloseTo(1, 5);
        expect(sigmoid.activate(-1000)).toBeCloseTo(0, 5);
      });

      it("should compute derivative correctly", () => {
        const value = 0;
        const sigmoid_val = sigmoid.activate(value);
        const expected_derivative = sigmoid_val * (1 - sigmoid_val);
        expect(sigmoid.derivative(value)).toBeCloseTo(expected_derivative, 5);
      });
    });

    describe("ReLUActivation", () => {
      let relu: ReLUActivation;

      beforeEach(() => {
        relu = new ReLUActivation();
      });

      it("should have correct type", () => {
        expect(relu.type).toBe(ActivationType.RELU);
      });

      it("should compute ReLU correctly", () => {
        expect(relu.activate(0)).toBe(0);
        expect(relu.activate(1)).toBe(1);
        expect(relu.activate(-1)).toBe(0);
        expect(relu.activate(5.5)).toBe(5.5);
        expect(relu.activate(-10)).toBe(0);
      });

      it("should compute derivative correctly", () => {
        expect(relu.derivative(1)).toBe(1);
        expect(relu.derivative(-1)).toBe(0);
        expect(relu.derivative(0)).toBe(0);
        expect(relu.derivative(5.5)).toBe(1);
      });
    });

    describe("createActivationFunction", () => {
      it("should create sigmoid activation", () => {
        const activation = createActivationFunction(ActivationType.SIGMOID);
        expect(activation.type).toBe(ActivationType.SIGMOID);
        expect(activation.activate(0)).toBeCloseTo(0.5, 5);
      });

      it("should create ReLU activation", () => {
        const activation = createActivationFunction(ActivationType.RELU);
        expect(activation.type).toBe(ActivationType.RELU);
        expect(activation.activate(-1)).toBe(0);
        expect(activation.activate(1)).toBe(1);
      });

      it("should throw error for unsupported type", () => {
        expect(() =>
          createActivationFunction("invalid" as ActivationType)
        ).toThrow();
      });
    });
  });

  describe("Weight Initializers", () => {
    const mockRandom = () => 0.5; // Always return 0.5 for predictable tests

    describe("DefaultWeightInitializer", () => {
      it("should initialize weights in specified range", () => {
        const initializer = new DefaultWeightInitializer(-2, 2);
        const weights = initializer.initializeWeights(2, 3, mockRandom);

        expect(weights).toHaveLength(2);
        expect(weights[0]).toHaveLength(3);
        expect(weights[1]).toHaveLength(3);

        // With mockRandom returning 0.5, weights should be at midpoint of range
        weights.forEach((row) => {
          row.forEach((weight) => {
            expect(weight).toBeCloseTo(0, 5); // -2 + 0.5 * (2 - (-2)) = 0
          });
        });
      });

      it("should initialize biases in specified range", () => {
        const initializer = new DefaultWeightInitializer(-1, 1);
        const biases = initializer.initializeBiases(3, mockRandom);

        expect(biases).toHaveLength(3);
        biases.forEach((bias) => {
          expect(bias).toBeCloseTo(0, 5); // -1 + 0.5 * (1 - (-1)) = 0
        });
      });

      it("should throw error for invalid range", () => {
        expect(() => new DefaultWeightInitializer(1, -1)).toThrow();
      });
    });

    describe("XavierWeightInitializer", () => {
      it("should initialize weights with Xavier distribution", () => {
        const initializer = new XavierWeightInitializer();
        const weights = initializer.initializeWeights(4, 6, mockRandom);

        expect(weights).toHaveLength(4);
        expect(weights[0]).toHaveLength(6);

        // Xavier limit for 4->6 is sqrt(6/(4+6)) = sqrt(0.6) ≈ 0.7746
        const expectedLimit = Math.sqrt(6 / (4 + 6));
        weights.forEach((row) => {
          row.forEach((weight) => {
            expect(Math.abs(weight)).toBeLessThanOrEqual(expectedLimit);
          });
        });
      });

      it("should initialize biases to zero", () => {
        const initializer = new XavierWeightInitializer();
        const biases = initializer.initializeBiases(5, mockRandom);

        expect(biases).toHaveLength(5);
        biases.forEach((bias) => {
          expect(bias).toBe(0);
        });
      });
    });

    describe("HeWeightInitializer", () => {
      it("should initialize weights with He distribution", () => {
        const initializer = new HeWeightInitializer();
        const weights = initializer.initializeWeights(4, 6, mockRandom);

        expect(weights).toHaveLength(4);
        expect(weights[0]).toHaveLength(6);
      });

      it("should initialize biases to zero", () => {
        const initializer = new HeWeightInitializer();
        const biases = initializer.initializeBiases(5, mockRandom);

        expect(biases).toHaveLength(5);
        biases.forEach((bias) => {
          expect(bias).toBe(0);
        });
      });
    });
  });

  describe("Neural Network Implementation", () => {
    let simpleConfig: INeuralNetworkConfig;
    let complexConfig: INeuralNetworkConfig;

    beforeEach(() => {
      simpleConfig = {
        inputSize: 2,
        hiddenLayers: [{ size: 3, activation: ActivationType.RELU }],
        outputLayer: { size: 1, activation: ActivationType.SIGMOID },
        weightRange: { min: -1, max: 1 },
        seed: 42,
      };

      complexConfig = {
        inputSize: 4,
        hiddenLayers: [
          { size: 6, activation: ActivationType.RELU },
          { size: 4, activation: ActivationType.RELU },
        ],
        outputLayer: { size: 2, activation: ActivationType.SIGMOID },
        weightRange: { min: -0.5, max: 0.5 },
        seed: 123,
      };
    });

    describe("Construction and Configuration", () => {
      it("should create network with simple configuration", () => {
        const network = new NeuralNetwork(simpleConfig);

        expect(network.config).toEqual(simpleConfig);
        expect(network.layers).toHaveLength(3); // input + 1 hidden + output
        expect(network.inputLayer.config.size).toBe(2);
        expect(network.hiddenLayers).toHaveLength(1);
        expect(network.hiddenLayers[0].config.size).toBe(3);
        expect(network.outputLayer.config.size).toBe(1);
      });

      it("should create network with complex configuration", () => {
        const network = new NeuralNetwork(complexConfig);

        expect(network.config).toEqual(complexConfig);
        expect(network.layers).toHaveLength(4); // input + 2 hidden + output
        expect(network.inputLayer.config.size).toBe(4);
        expect(network.hiddenLayers).toHaveLength(2);
        expect(network.hiddenLayers[0].config.size).toBe(6);
        expect(network.hiddenLayers[1].config.size).toBe(4);
        expect(network.outputLayer.config.size).toBe(2);
      });

      it("should validate configuration", () => {
        expect(
          () =>
            new NeuralNetwork({
              ...simpleConfig,
              inputSize: 0,
            })
        ).toThrow("Input size must be positive");

        expect(
          () =>
            new NeuralNetwork({
              ...simpleConfig,
              outputLayer: { ...simpleConfig.outputLayer, size: 0 },
            })
        ).toThrow("Output layer size must be positive");

        expect(
          () =>
            new NeuralNetwork({
              ...simpleConfig,
              hiddenLayers: [{ size: 0, activation: ActivationType.RELU }],
            })
        ).toThrow("Hidden layer 0 size must be positive");

        expect(
          () =>
            new NeuralNetwork({
              ...simpleConfig,
              weightRange: { min: 1, max: -1 },
            })
        ).toThrow("Weight range min must be less than max");
      });
    });

    describe("Forward Propagation", () => {
      it("should process inputs through simple network", () => {
        const network = new NeuralNetwork(simpleConfig);
        const inputs = [0.5, -0.3];
        const outputs = network.process(inputs);

        expect(outputs).toHaveLength(1);
        expect(outputs[0]).toBeGreaterThanOrEqual(0);
        expect(outputs[0]).toBeLessThanOrEqual(1); // Sigmoid output range
      });

      it("should process inputs through complex network", () => {
        const network = new NeuralNetwork(complexConfig);
        const inputs = [0.1, 0.2, 0.3, 0.4];
        const outputs = network.process(inputs);

        expect(outputs).toHaveLength(2);
        outputs.forEach((output) => {
          expect(output).toBeGreaterThanOrEqual(0);
          expect(output).toBeLessThanOrEqual(1); // Sigmoid output range
        });
      });

      it("should throw error for wrong input size", () => {
        const network = new NeuralNetwork(simpleConfig);

        expect(() => network.process([1])).toThrow("Input size mismatch");
        expect(() => network.process([1, 2, 3])).toThrow("Input size mismatch");
      });

      it("should be deterministic with same inputs", () => {
        const network1 = new NeuralNetwork(simpleConfig);
        const network2 = new NeuralNetwork(simpleConfig);
        const inputs = [0.7, -0.2];

        const outputs1 = network1.process(inputs);
        const outputs2 = network2.process(inputs);

        expect(outputs1).toEqual(outputs2);
      });

      it("should produce different outputs for different inputs", () => {
        const network = new NeuralNetwork(simpleConfig);
        const inputs1 = [0.5, 0.5];
        const inputs2 = [-0.5, -0.5];

        const outputs1 = network.process(inputs1);
        const outputs2 = network.process(inputs2);

        expect(outputs1).not.toEqual(outputs2);
      });
    });

    describe("State Management", () => {
      it("should get and set network state", () => {
        const network = new NeuralNetwork(simpleConfig);
        const originalState = network.getState();

        // Modify the state
        const modifiedState = JSON.parse(JSON.stringify(originalState));
        if (modifiedState.layers[0].weights) {
          modifiedState.layers[0].weights[0][0] = 999;
        }

        network.setState(modifiedState);
        const newState = network.getState();

        expect(newState.layers[0].weights?.[0][0]).toBe(999);
      });

      it("should clone network correctly", () => {
        const network = new NeuralNetwork(simpleConfig);
        const inputs = [0.3, 0.7];
        const originalOutputs = network.process(inputs);

        const clonedNetwork = network.clone();
        const clonedOutputs = clonedNetwork.process(inputs);

        expect(clonedOutputs).toEqual(originalOutputs);
      });

      it("should serialize and deserialize correctly", () => {
        const network = new NeuralNetwork(simpleConfig);
        const inputs = [0.3, 0.7];
        const originalOutputs = network.process(inputs);

        const serialized = network.serialize();
        const newNetwork = new NeuralNetwork(simpleConfig);
        newNetwork.deserialize(serialized);

        const deserializedOutputs = newNetwork.process(inputs);
        expect(deserializedOutputs).toEqual(originalOutputs);
      });
    });

    describe("Deterministic Behavior", () => {
      it("should produce identical results with same seed", () => {
        const config1 = { ...simpleConfig, seed: 12345 };
        const config2 = { ...simpleConfig, seed: 12345 };

        const network1 = new NeuralNetwork(config1);
        const network2 = new NeuralNetwork(config2);

        const inputs = [0.5, -0.3];
        const outputs1 = network1.process(inputs);
        const outputs2 = network2.process(inputs);

        expect(outputs1).toEqual(outputs2);
      });

      it("should produce different results with different seeds", () => {
        const config1 = { ...simpleConfig, seed: 12345 };
        const config2 = { ...simpleConfig, seed: 54321 };

        const network1 = new NeuralNetwork(config1);
        const network2 = new NeuralNetwork(config2);

        const inputs = [0.5, -0.3];
        const outputs1 = network1.process(inputs);
        const outputs2 = network2.process(inputs);

        expect(outputs1).not.toEqual(outputs2);
      });

      it("should be consistent across multiple runs", () => {
        const network = new NeuralNetwork(simpleConfig);
        const inputs = [0.2, 0.8];

        const outputs1 = network.process(inputs);
        const outputs2 = network.process(inputs);
        const outputs3 = network.process(inputs);

        expect(outputs1).toEqual(outputs2);
        expect(outputs2).toEqual(outputs3);
      });
    });

    describe("Different Activation Functions", () => {
      it("should work with ReLU hidden layers", () => {
        const config: INeuralNetworkConfig = {
          inputSize: 2,
          hiddenLayers: [{ size: 3, activation: ActivationType.RELU }],
          outputLayer: { size: 1, activation: ActivationType.SIGMOID },
          seed: 42,
        };

        const network = new NeuralNetwork(config);
        const outputs = network.process([0.5, -0.5]);

        expect(outputs).toHaveLength(1);
        expect(outputs[0]).toBeGreaterThanOrEqual(0);
        expect(outputs[0]).toBeLessThanOrEqual(1);
      });

      it("should work with Sigmoid hidden layers", () => {
        const config: INeuralNetworkConfig = {
          inputSize: 2,
          hiddenLayers: [{ size: 3, activation: ActivationType.SIGMOID }],
          outputLayer: { size: 1, activation: ActivationType.RELU },
          seed: 42,
        };

        const network = new NeuralNetwork(config);
        const outputs = network.process([0.5, -0.5]);

        expect(outputs).toHaveLength(1);
        expect(outputs[0]).toBeGreaterThanOrEqual(0);
      });

      it("should work with mixed activation functions", () => {
        const config: INeuralNetworkConfig = {
          inputSize: 3,
          hiddenLayers: [
            { size: 4, activation: ActivationType.RELU },
            { size: 3, activation: ActivationType.SIGMOID },
          ],
          outputLayer: { size: 2, activation: ActivationType.SIGMOID },
          seed: 42,
        };

        const network = new NeuralNetwork(config);
        const outputs = network.process([0.1, 0.2, 0.3]);

        expect(outputs).toHaveLength(2);
        outputs.forEach((output) => {
          expect(output).toBeGreaterThanOrEqual(0);
          expect(output).toBeLessThanOrEqual(1);
        });
      });
    });

    describe("Bias Neurons", () => {
      it("should include bias neurons by default", () => {
        const network = new NeuralNetwork(simpleConfig);

        // Hidden and output layers should have biases
        expect(network.hiddenLayers[0].biases).toBeDefined();
        expect(network.outputLayer.biases).toBeDefined();

        // Input layer should not have biases
        expect(network.inputLayer.biases).toBeUndefined();
      });

      it("should respect useBias configuration", () => {
        const config: INeuralNetworkConfig = {
          inputSize: 2,
          hiddenLayers: [
            { size: 3, activation: ActivationType.RELU, useBias: false },
          ],
          outputLayer: {
            size: 1,
            activation: ActivationType.SIGMOID,
            useBias: true,
          },
          seed: 42,
        };

        const network = new NeuralNetwork(config);

        expect(network.hiddenLayers[0].biases).toBeUndefined();
        expect(network.outputLayer.biases).toBeDefined();
      });
    });
  });
});
