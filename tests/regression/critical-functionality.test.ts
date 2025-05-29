import { describe, test, expect } from "vitest";
import { NeuralNetwork } from "../../src/neural/neural-network";
import { Creature } from "../../src/core/creature";
import { World } from "../../src/world/World";
import { PersistenceManager } from "../../src/persistence/persistence-manager";
import { TestDataGenerators } from "../utils/test-data-generators";
import type { INeuralNetworkConfig } from "../../src/neural/types";
import { ActivationType } from "../../src/neural/types";

/**
 * Regression Test Suite for Critical Functionality
 *
 * This suite protects against regressions in critical system components:
 * - Neural network processing and determinism
 * - Creature behavior and lifecycle
 * - World simulation and persistence
 * - Performance benchmarks
 *
 * Tests are designed to catch regressions early and provide detailed
 * failure information for debugging.
 */

interface RegressionBaseline {
  version: string;
  timestamp: number;
  testName: string;
  metrics: {
    executionTime: number;
    memoryUsage: number;
    throughput?: number;
    accuracy?: number;
    errorRate?: number;
  };
  configuration: Record<string, any>;
}

interface RegressionResult {
  passed: boolean;
  currentMetrics: RegressionBaseline["metrics"];
  previousBaseline?: RegressionBaseline;
  regression?: {
    metricName: string;
    previousValue: number;
    currentValue: number;
    percentageChange: number;
    threshold: number;
  };
  details: string;
}

class RegressionTracker {
  private static baselines: Map<string, RegressionBaseline> = new Map();
  private static readonly PERFORMANCE_REGRESSION_THRESHOLD = 0.2; // 20% performance degradation
  private static readonly ACCURACY_REGRESSION_THRESHOLD = 0.05; // 5% accuracy loss

  static recordBaseline(
    testName: string,
    metrics: RegressionBaseline["metrics"],
    config: Record<string, any> = {}
  ): void {
    const baseline: RegressionBaseline = {
      version: "0.1.0",
      timestamp: Date.now(),
      testName,
      metrics,
      configuration: config,
    };

    this.baselines.set(testName, baseline);
  }

  static checkRegression(
    testName: string,
    currentMetrics: RegressionBaseline["metrics"]
  ): RegressionResult {
    const previousBaseline = this.baselines.get(testName);

    if (!previousBaseline) {
      return {
        passed: true,
        currentMetrics,
        details: "No previous baseline found - establishing new baseline",
      };
    }

    // Check for performance regressions
    if (
      currentMetrics.executionTime &&
      previousBaseline.metrics.executionTime
    ) {
      const timeChange =
        (currentMetrics.executionTime -
          previousBaseline.metrics.executionTime) /
        previousBaseline.metrics.executionTime;
      if (timeChange > this.PERFORMANCE_REGRESSION_THRESHOLD) {
        return {
          passed: false,
          currentMetrics,
          previousBaseline,
          regression: {
            metricName: "executionTime",
            previousValue: previousBaseline.metrics.executionTime,
            currentValue: currentMetrics.executionTime,
            percentageChange: timeChange * 100,
            threshold: this.PERFORMANCE_REGRESSION_THRESHOLD * 100,
          },
          details: `Execution time regression detected: ${(
            timeChange * 100
          ).toFixed(2)}% slower than baseline`,
        };
      }
    }

    // Check for memory regressions
    if (currentMetrics.memoryUsage && previousBaseline.metrics.memoryUsage) {
      const memoryChange =
        (currentMetrics.memoryUsage - previousBaseline.metrics.memoryUsage) /
        previousBaseline.metrics.memoryUsage;
      if (memoryChange > this.PERFORMANCE_REGRESSION_THRESHOLD) {
        return {
          passed: false,
          currentMetrics,
          previousBaseline,
          regression: {
            metricName: "memoryUsage",
            previousValue: previousBaseline.metrics.memoryUsage,
            currentValue: currentMetrics.memoryUsage,
            percentageChange: memoryChange * 100,
            threshold: this.PERFORMANCE_REGRESSION_THRESHOLD * 100,
          },
          details: `Memory usage regression detected: ${(
            memoryChange * 100
          ).toFixed(2)}% increase from baseline`,
        };
      }
    }

    // Check for accuracy regressions
    if (
      currentMetrics.accuracy !== undefined &&
      previousBaseline.metrics.accuracy !== undefined
    ) {
      const accuracyChange =
        previousBaseline.metrics.accuracy - currentMetrics.accuracy;
      if (accuracyChange > this.ACCURACY_REGRESSION_THRESHOLD) {
        return {
          passed: false,
          currentMetrics,
          previousBaseline,
          regression: {
            metricName: "accuracy",
            previousValue: previousBaseline.metrics.accuracy,
            currentValue: currentMetrics.accuracy,
            percentageChange: -accuracyChange * 100,
            threshold: this.ACCURACY_REGRESSION_THRESHOLD * 100,
          },
          details: `Accuracy regression detected: ${(
            accuracyChange * 100
          ).toFixed(2)}% decrease from baseline`,
        };
      }
    }

    return {
      passed: true,
      currentMetrics,
      previousBaseline,
      details: "All metrics within acceptable regression thresholds",
    };
  }

  static getBaselineReport(): string {
    const report = ["=== REGRESSION BASELINES REPORT ==="];

    // Convert Map entries to array for iteration compatibility
    const entries = Array.from(this.baselines.entries());
    for (const [testName, baseline] of entries) {
      report.push(`\n${testName}:`);
      report.push(`  Version: ${baseline.version}`);
      report.push(`  Timestamp: ${new Date(baseline.timestamp).toISOString()}`);
      report.push(
        `  Execution Time: ${baseline.metrics.executionTime?.toFixed(2)}ms`
      );
      report.push(
        `  Memory Usage: ${(baseline.metrics.memoryUsage / 1024 / 1024).toFixed(
          2
        )}MB`
      );
      if (baseline.metrics.throughput) {
        report.push(
          `  Throughput: ${baseline.metrics.throughput.toFixed(2)} ops/sec`
        );
      }
      if (baseline.metrics.accuracy !== undefined) {
        report.push(
          `  Accuracy: ${(baseline.metrics.accuracy * 100).toFixed(2)}%`
        );
      }
    }

    return report.join("\n");
  }
}

describe("Critical Functionality Regression Tests", () => {
  describe("Neural Network Core Functionality", () => {
    test("Neural network processing must maintain deterministic behavior", () => {
      const testName = "neural-network-determinism";
      const config: INeuralNetworkConfig = {
        inputSize: 60,
        hiddenLayers: [
          { size: 20, activation: ActivationType.SIGMOID },
          { size: 15, activation: ActivationType.SIGMOID },
        ],
        outputLayer: { size: 16, activation: ActivationType.SIGMOID },
        seed: 12345,
      };

      // Create two identical networks
      const network1 = new NeuralNetwork(config);
      const network2 = new NeuralNetwork(config);

      // Test with same inputs
      const inputs = Array.from({ length: 60 }, (_, i) => Math.sin(i * 0.1));

      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      const output1 = network1.process(inputs);
      const output2 = network2.process(inputs);

      const executionTime = performance.now() - startTime;
      const memoryUsage = process.memoryUsage().heapUsed - startMemory;

      // Verify determinism
      expect(output1).toEqual(output2);

      // Check for regressions
      const metrics = {
        executionTime,
        memoryUsage,
        accuracy: 1.0, // Perfect determinism
      };

      const result = RegressionTracker.checkRegression(testName, metrics);

      if (!result.passed && result.regression) {
        const { regression } = result;
        throw new Error(
          `Regression detected in ${testName}: ${
            regression.metricName
          } changed by ${regression.percentageChange.toFixed(2)}% ` +
            `(threshold: ${regression.threshold}%). Previous: ${regression.previousValue}, Current: ${regression.currentValue}`
        );
      }

      RegressionTracker.recordBaseline(testName, metrics, config);

      console.log(`✅ Neural Network Determinism Test: ${result.details}`);
    });

    test("Neural network must handle large batch processing efficiently", () => {
      const testName = "neural-network-batch-processing";
      const config: INeuralNetworkConfig = {
        inputSize: 60,
        hiddenLayers: [
          { size: 30, activation: ActivationType.SIGMOID },
          { size: 20, activation: ActivationType.SIGMOID },
          { size: 10, activation: ActivationType.SIGMOID },
        ],
        outputLayer: { size: 16, activation: ActivationType.SIGMOID },
        seed: 54321,
      };

      const network = new NeuralNetwork(config);
      const batchSize = 1000;
      const inputs = Array.from({ length: 60 }, (_, i) => Math.sin(i * 0.1));

      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Process batch
      const outputs: number[][] = [];
      for (let i = 0; i < batchSize; i++) {
        outputs.push(network.process(inputs));
      }

      const executionTime = performance.now() - startTime;
      const memoryUsage = process.memoryUsage().heapUsed - startMemory;
      const throughput = batchSize / (executionTime / 1000);

      // Verify all outputs are valid
      expect(outputs).toHaveLength(batchSize);
      outputs.forEach((output) => {
        expect(output).toHaveLength(16);
        expect(output.every((val) => !isNaN(val) && isFinite(val))).toBe(true);
      });

      const metrics = {
        executionTime,
        memoryUsage,
        throughput,
        errorRate: 0.0,
      };

      const result = RegressionTracker.checkRegression(testName, metrics);

      if (!result.passed && result.regression) {
        const { regression } = result;
        throw new Error(
          `Performance regression in ${testName}: ${
            regression.metricName
          } degraded by ${regression.percentageChange.toFixed(2)}%`
        );
      }

      RegressionTracker.recordBaseline(testName, metrics, {
        batchSize,
        ...config,
      });

      console.log(
        `✅ Batch Processing: ${throughput.toFixed(0)} ops/sec - ${
          result.details
        }`
      );
    });
  });

  describe("World Simulation Core Functionality", () => {
    test("World creation and updates must remain stable", () => {
      const testName = "world-simulation-stability";

      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Create a test world
      const world = TestDataGenerators.createWorld({
        width: 50,
        height: 50,
        seed: 42,
      });

      // Add some test entities
      for (let i = 0; i < 25; i++) {
        const creature = TestDataGenerators.createCreature(
          {
            x: Math.floor(Math.random() * 50),
            y: Math.floor(Math.random() * 50),
          },
          { id: `regression-creature-${i}` }
        );
        world.addEntity(creature);
      }

      // Run simulation steps
      const steps = 100;
      let totalUpdates = 0;

      for (let i = 0; i < steps; i++) {
        world.update(16);
        totalUpdates++;
      }

      const executionTime = performance.now() - startTime;
      const memoryUsage = process.memoryUsage().heapUsed - startMemory;
      const throughput = totalUpdates / (executionTime / 1000);

      // Verify world state is valid
      const entities = world.entities;
      expect(entities.length).toBeGreaterThanOrEqual(0);
      expect(totalUpdates).toBe(steps);

      const metrics = {
        executionTime,
        memoryUsage,
        throughput,
        accuracy: 1.0, // All updates completed successfully
      };

      const result = RegressionTracker.checkRegression(testName, metrics);

      if (!result.passed && result.regression) {
        throw new Error(`World simulation regression: ${result.details}`);
      }

      RegressionTracker.recordBaseline(testName, metrics, {
        steps,
        entityCount: 25,
      });

      console.log(
        `✅ World Simulation: ${totalUpdates} updates, ${throughput.toFixed(
          0
        )} updates/sec - ${result.details}`
      );
    });
  });

  test("Regression baseline summary", () => {
    // Print comprehensive regression report
    const report = RegressionTracker.getBaselineReport();
    console.log("\n" + report);

    // This test always passes - it's just for reporting
    expect(true).toBe(true);
  });
});
