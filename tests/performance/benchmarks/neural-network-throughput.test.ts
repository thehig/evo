/**
 * Neural Network Throughput Performance Tests
 *
 * These tests measure the performance characteristics of neural network
 * processing under various load conditions and configurations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TestDataGenerators } from "../../utils/test-data-generators";
import {
  PerformanceCollector,
  PerformanceAnalyzer,
  PerformanceThresholds,
  runPerformanceTest,
} from "../performance-metrics";
import { INeuralNetwork, ActivationType } from "../../../src/neural/types";

describe("Neural Network Performance Tests", () => {
  let standardThresholds: PerformanceThresholds;

  beforeEach(() => {
    // Set conservative thresholds for CI environments
    standardThresholds = {
      maxExecutionTime: 1000, // 1 second
      maxMemoryUsageMB: 50,
      maxPeakMemoryUsageMB: 100,
      minThroughput: 100, // operations per second
      maxAverageOperationTime: 10, // 10ms per operation
    };
  });

  // Helper function to calculate total weights in a network
  function calculateTotalWeights(network: INeuralNetwork): number {
    let totalWeights = 0;
    for (const layer of network.layers) {
      if (layer.weights) {
        totalWeights += layer.weights.length * layer.weights[0].length;
      }
      if (layer.biases) {
        totalWeights += layer.biases.length;
      }
    }
    return totalWeights;
  }

  describe("Single Neural Network Performance", () => {
    it("should process inputs efficiently with small network", async () => {
      const { result, metrics, report, passed } = await runPerformanceTest(
        "Small Neural Network Processing",
        async (collector) => {
          // Create a small network (60 inputs, 2 hidden layers of 30 neurons, 16 outputs)
          const network = TestDataGenerators.createNeuralNetwork(60, {
            hiddenLayers: [
              { size: 30, activation: ActivationType.SIGMOID },
              { size: 30, activation: ActivationType.SIGMOID },
            ],
            outputLayer: { size: 16, activation: ActivationType.SIGMOID },
            seed: 12345,
          });

          const inputs = Array.from({ length: 60 }, (_, i) =>
            Math.sin(i * 0.1)
          );
          const iterations = 1000;

          collector.addCustomMetric(
            "networkSize",
            calculateTotalWeights(network)
          );
          collector.addCustomMetric("inputSize", inputs.length);

          // Perform multiple forward passes
          const results: number[][] = [];
          for (let i = 0; i < iterations; i++) {
            const output = network.process(inputs);
            results.push(output);
            collector.incrementOperations();
          }

          return { network, results, iterations };
        },
        standardThresholds
      );

      expect(passed).toBe(true);
      expect(result.results).toHaveLength(1000);
      expect(metrics.operationCount).toBe(1000);

      console.log(report);
    });

    it("should handle large network architecture efficiently", async () => {
      const { result, metrics, report, passed } = await runPerformanceTest(
        "Large Neural Network Processing",
        async (collector) => {
          // Create a larger network (154 inputs, 3 hidden layers, 16 outputs)
          const network = TestDataGenerators.createNeuralNetwork(154, {
            hiddenLayers: [
              { size: 80, activation: ActivationType.RELU },
              { size: 60, activation: ActivationType.RELU },
              { size: 40, activation: ActivationType.RELU },
            ],
            outputLayer: { size: 16, activation: ActivationType.SIGMOID },
            seed: 54321,
          });

          const inputs = Array.from(
            { length: 154 },
            (_, i) => Math.random() * 2 - 1
          );
          const iterations = 500; // Fewer iterations for larger network

          collector.addCustomMetric(
            "networkSize",
            calculateTotalWeights(network)
          );
          collector.addCustomMetric("layerCount", 5); // input + 3 hidden + output

          const results: number[][] = [];
          for (let i = 0; i < iterations; i++) {
            const output = network.process(inputs);
            results.push(output);
            collector.incrementOperations();
          }

          return { network, results, iterations };
        },
        {
          ...standardThresholds,
          maxExecutionTime: 2000, // Allow more time for larger network
          maxAverageOperationTime: 20,
        }
      );

      expect(passed).toBe(true);
      expect(result.results).toHaveLength(500);
      expect(metrics.operationCount).toBe(500);

      console.log(report);
    });

    it("should maintain performance with different activation functions", async () => {
      const activationTypes = [ActivationType.SIGMOID, ActivationType.RELU];
      const results: { [key: string]: any } = {};

      for (const activationType of activationTypes) {
        const { result, metrics } = await runPerformanceTest(
          `Neural Network - ${activationType}`,
          async (collector) => {
            const network = TestDataGenerators.createNeuralNetwork(60, {
              hiddenLayers: [
                { size: 40, activation: activationType },
                { size: 30, activation: activationType },
              ],
              outputLayer: { size: 16, activation: ActivationType.SIGMOID },
              seed: 11111,
            });

            const inputs = Array.from({ length: 60 }, (_, i) =>
              Math.sin(i * 0.1)
            );
            const iterations = 800;

            for (let i = 0; i < iterations; i++) {
              network.process(inputs);
              collector.incrementOperations();
            }

            return { activationType, iterations };
          },
          standardThresholds
        );

        results[activationType] = metrics;
      }

      // Compare performance between activation functions
      const sigmoidMetrics = results[ActivationType.SIGMOID];
      const reluMetrics = results[ActivationType.RELU];

      expect(sigmoidMetrics.executionTime).toBeGreaterThan(0);
      expect(reluMetrics.executionTime).toBeGreaterThan(0);

      // ReLU should generally be faster than Sigmoid
      console.log(
        `Sigmoid execution time: ${sigmoidMetrics.executionTime.toFixed(2)}ms`
      );
      console.log(
        `ReLU execution time: ${reluMetrics.executionTime.toFixed(2)}ms`
      );
      console.log(
        `ReLU speedup: ${(
          sigmoidMetrics.executionTime / reluMetrics.executionTime
        ).toFixed(2)}x`
      );
    });
  });

  describe("Batch Neural Network Processing", () => {
    it("should efficiently process multiple networks in parallel", async () => {
      const { result, metrics, report, passed } = await runPerformanceTest(
        "Batch Neural Network Processing",
        async (collector) => {
          const networkCount = 50;
          const networks: INeuralNetwork[] = [];

          // Create multiple networks
          for (let i = 0; i < networkCount; i++) {
            networks.push(
              TestDataGenerators.createNeuralNetwork(60, {
                hiddenLayers: [
                  { size: 30, activation: ActivationType.SIGMOID },
                  { size: 20, activation: ActivationType.SIGMOID },
                ],
                outputLayer: { size: 16, activation: ActivationType.SIGMOID },
                seed: 10000 + i,
              })
            );
          }

          const inputs = Array.from({ length: 60 }, (_, i) =>
            Math.sin(i * 0.1)
          );
          const iterations = 10;

          collector.addCustomMetric("networkCount", networkCount);
          collector.addCustomMetric(
            "totalOperations",
            networkCount * iterations
          );

          const allResults: number[][][] = [];

          // Process all networks for each iteration
          for (let iter = 0; iter < iterations; iter++) {
            const batchResults: number[][] = [];

            for (const network of networks) {
              const output = network.process(inputs);
              batchResults.push(output);
              collector.incrementOperations();
            }

            allResults.push(batchResults);
          }

          return { networks, results: allResults, networkCount, iterations };
        },
        {
          ...standardThresholds,
          maxExecutionTime: 5000, // 5 seconds for batch processing
          maxMemoryUsageMB: 100,
          minThroughput: 50, // Lower throughput expected for batch
        }
      );

      expect(passed).toBe(true);
      expect(result.results).toHaveLength(10);
      expect(result.results[0]).toHaveLength(50); // 50 networks per iteration
      expect(metrics.operationCount).toBe(500); // 50 networks * 10 iterations

      console.log(report);
    });

    it("should scale linearly with network count", async () => {
      const networkCounts = [10, 25, 50];
      const scalingResults: {
        count: number;
        executionTime: number;
        throughput: number;
      }[] = [];

      for (const networkCount of networkCounts) {
        const { result, metrics } = await runPerformanceTest(
          `Scaling Test - ${networkCount} networks`,
          async (collector) => {
            const networks: INeuralNetwork[] = [];

            for (let i = 0; i < networkCount; i++) {
              networks.push(
                TestDataGenerators.createNeuralNetwork(60, {
                  hiddenLayers: [
                    { size: 30, activation: ActivationType.SIGMOID },
                  ],
                  outputLayer: { size: 16, activation: ActivationType.SIGMOID },
                  seed: 20000 + i,
                })
              );
            }

            const inputs = Array.from({ length: 60 }, () => Math.random());
            const iterations = 5;

            for (let iter = 0; iter < iterations; iter++) {
              for (const network of networks) {
                network.process(inputs);
                collector.incrementOperations();
              }
            }

            return { networkCount, iterations };
          }
        );

        scalingResults.push({
          count: networkCount,
          executionTime: metrics.executionTime,
          throughput: metrics.throughput,
        });
      }

      // Analyze scaling characteristics
      console.log("=== Scaling Analysis ===");
      scalingResults.forEach((result) => {
        console.log(
          `${result.count} networks: ${result.executionTime.toFixed(
            2
          )}ms, ${result.throughput.toFixed(2)} ops/sec`
        );
      });

      // Check that scaling is roughly linear (allow some variance)
      const firstResult = scalingResults[0];
      const lastResult = scalingResults[scalingResults.length - 1];
      const expectedScaling = lastResult.count / firstResult.count;
      const actualScaling =
        lastResult.executionTime / firstResult.executionTime;
      const scalingRatio = actualScaling / expectedScaling;

      console.log(
        `Expected scaling: ${expectedScaling.toFixed(
          2
        )}x, Actual: ${actualScaling.toFixed(
          2
        )}x, Ratio: ${scalingRatio.toFixed(2)}`
      );

      // Scaling should be reasonable (allow for better-than-linear performance)
      // Ratio < 1.0 means better than linear scaling (good!)
      // Ratio > 2.0 means significantly worse than linear scaling (bad)
      expect(scalingRatio).toBeGreaterThan(0.2); // Allow for significant optimizations
      expect(scalingRatio).toBeLessThan(2.0); // But not too much worse than linear
    });
  });

  describe("Memory Usage and Efficiency", () => {
    it("should maintain stable memory usage during extended processing", async () => {
      const { result, metrics, report, passed } = await runPerformanceTest(
        "Extended Neural Network Processing",
        async (collector) => {
          const network = TestDataGenerators.createNeuralNetwork(100, {
            hiddenLayers: [
              { size: 60, activation: ActivationType.RELU },
              { size: 40, activation: ActivationType.RELU },
            ],
            outputLayer: { size: 20, activation: ActivationType.SIGMOID },
            seed: 33333,
          });

          const iterations = 2000;
          const inputs = Array.from({ length: 100 }, () => Math.random());

          // Track memory usage at intervals
          const memorySnapshots: number[] = [];
          const snapshotInterval = 200;

          for (let i = 0; i < iterations; i++) {
            network.process(inputs);
            collector.incrementOperations();

            // Take memory snapshots
            if (i % snapshotInterval === 0) {
              memorySnapshots.push(process.memoryUsage().heapUsed);
            }
          }

          collector.addCustomMetric("memorySnapshots", memorySnapshots.length);

          // Calculate memory growth
          const firstSnapshot = memorySnapshots[0];
          const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
          const memoryGrowthMB = (lastSnapshot - firstSnapshot) / (1024 * 1024);
          collector.addCustomMetric("memoryGrowthMB", memoryGrowthMB);

          return { iterations, memorySnapshots, memoryGrowthMB };
        },
        {
          ...standardThresholds,
          maxExecutionTime: 3000,
          maxMemoryUsageMB: 30,
          maxPeakMemoryUsageMB: 50,
          customThresholds: {
            memoryGrowthMB: { max: 5 }, // Memory growth should be minimal
          },
        }
      );

      expect(passed).toBe(true);
      expect(result.iterations).toBe(2000);
      expect(result.memoryGrowthMB).toBeLessThan(5); // Memory growth should be minimal

      console.log(report);
      console.log(
        `Memory growth during processing: ${result.memoryGrowthMB.toFixed(2)}MB`
      );
    });

    it("should efficiently handle network creation and destruction", async () => {
      const { result, metrics, report, passed } = await runPerformanceTest(
        "Neural Network Creation/Destruction Cycle",
        async (collector) => {
          const cycles = 100;
          const networksPerCycle = 5;

          collector.addCustomMetric(
            "totalNetworksCreated",
            cycles * networksPerCycle
          );

          for (let cycle = 0; cycle < cycles; cycle++) {
            const networks: INeuralNetwork[] = [];

            // Create networks
            for (let i = 0; i < networksPerCycle; i++) {
              networks.push(
                TestDataGenerators.createNeuralNetwork(60, {
                  hiddenLayers: [
                    { size: 30, activation: ActivationType.SIGMOID },
                  ],
                  outputLayer: { size: 16, activation: ActivationType.SIGMOID },
                  seed: 40000 + cycle * networksPerCycle + i,
                })
              );
            }

            // Process once with each network
            const inputs = Array.from({ length: 60 }, () => Math.random());
            for (const network of networks) {
              network.process(inputs);
              collector.incrementOperations();
            }

            // Allow networks to be garbage collected
            networks.length = 0;
          }

          return { cycles, networksPerCycle };
        },
        {
          ...standardThresholds,
          maxExecutionTime: 2000,
          maxMemoryUsageMB: 40,
          maxPeakMemoryUsageMB: 60,
        }
      );

      expect(passed).toBe(true);
      expect(result.cycles).toBe(100);
      expect(metrics.operationCount).toBe(500); // 100 cycles * 5 networks

      console.log(report);
    });
  });

  describe("Performance Regression Detection", () => {
    it("should establish performance baseline for regression testing", async () => {
      const baselineConfig = {
        inputSize: 60,
        hiddenLayers: [
          { size: 30, activation: ActivationType.SIGMOID },
          { size: 30, activation: ActivationType.SIGMOID },
        ],
        outputLayer: { size: 16, activation: ActivationType.SIGMOID },
        iterations: 1000,
        seed: 99999,
      };

      const { result, metrics, report } = await runPerformanceTest(
        "Baseline Performance Test",
        async (collector) => {
          const network = TestDataGenerators.createNeuralNetwork(
            baselineConfig.inputSize,
            {
              hiddenLayers: baselineConfig.hiddenLayers,
              outputLayer: baselineConfig.outputLayer,
              seed: baselineConfig.seed,
            }
          );

          const inputs = Array.from(
            { length: baselineConfig.inputSize },
            (_, i) => Math.sin(i * 0.1)
          );

          for (let i = 0; i < baselineConfig.iterations; i++) {
            network.process(inputs);
            collector.incrementOperations();
          }

          collector.addCustomMetric(
            "configHash",
            JSON.stringify(baselineConfig).length // Simple config hash
          );

          return { config: baselineConfig, network };
        }
      );

      // Store baseline metrics for future comparison
      const baselineMetrics = {
        executionTime: metrics.executionTime,
        throughput: metrics.throughput,
        memoryUsage: metrics.memoryUsage,
        averageOperationTime: metrics.averageOperationTime,
      };

      console.log("=== BASELINE METRICS FOR REGRESSION TESTING ===");
      console.log(JSON.stringify(baselineMetrics, null, 2));
      console.log(report);

      // These values serve as reference points for detecting regressions
      expect(metrics.executionTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.operationCount).toBe(baselineConfig.iterations);
    });
  });
});
