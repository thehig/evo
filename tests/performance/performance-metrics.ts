/**
 * Performance Metrics Collection and Analysis Framework
 *
 * This module provides utilities for collecting, analyzing, and reporting
 * performance metrics during simulation tests.
 */

export interface PerformanceMetrics {
  /** Execution time in milliseconds */
  executionTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Peak memory usage in bytes */
  peakMemoryUsage: number;
  /** Number of operations performed */
  operationCount: number;
  /** Throughput (operations per second) */
  throughput: number;
  /** Average time per operation in milliseconds */
  averageOperationTime: number;
  /** CPU usage percentage (if available) */
  cpuUsage?: number;
  /** Frame rate for real-time simulations */
  frameRate?: number;
  /** Custom metrics specific to the test */
  customMetrics: Record<string, number>;
}

export interface PerformanceThresholds {
  maxExecutionTime: number;
  maxMemoryUsageMB: number;
  maxPeakMemoryUsageMB: number;
  minThroughput: number;
  maxAverageOperationTime: number;
  minFrameRate?: number;
  customThresholds?: Record<string, { min?: number; max?: number }>;
}

export interface SimulationPerformanceMetrics extends PerformanceMetrics {
  /** Number of simulation ticks processed */
  ticksProcessed: number;
  /** Average time per tick in milliseconds */
  averageTickTime: number;
  /** Number of creatures processed */
  creaturesProcessed: number;
  /** Average time per creature per tick */
  averageCreatureProcessingTime: number;
  /** Neural network forward passes performed */
  neuralNetworkPasses: number;
  /** Average time per neural network forward pass */
  averageNeuralNetworkTime: number;
  /** Memory allocations during simulation */
  memoryAllocations: number;
  /** Garbage collection events */
  gcEvents: number;
}

export class PerformanceCollector {
  private startTime: number = 0;
  private endTime: number = 0;
  private startMemory: number = 0;
  private peakMemory: number = 0;
  private operationCount: number = 0;
  private customMetrics: Map<string, number> = new Map();
  private memoryCheckInterval?: NodeJS.Timeout;
  private gcMetrics: { collections: number; duration: number } = {
    collections: 0,
    duration: 0,
  };

  constructor() {
    this.reset();
  }

  /**
   * Reset all metrics to start a new measurement
   */
  reset(): void {
    this.startTime = 0;
    this.endTime = 0;
    this.startMemory = 0;
    this.peakMemory = 0;
    this.operationCount = 0;
    this.customMetrics.clear();
    this.gcMetrics = { collections: 0, duration: 0 };

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }

  /**
   * Start collecting performance metrics
   */
  start(): void {
    this.reset();
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
    this.peakMemory = this.startMemory;

    // Monitor memory usage during the test
    this.memoryCheckInterval = setInterval(() => {
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > this.peakMemory) {
        this.peakMemory = currentMemory;
      }
    }, 10); // Check every 10ms

    // Monitor garbage collection if available
    if (global.gc) {
      this.gcMetrics.collections = 0;
      this.gcMetrics.duration = 0;
    }
  }

  /**
   * Stop collecting metrics and calculate final results
   */
  stop(): void {
    this.endTime = performance.now();

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }

  /**
   * Increment the operation counter
   */
  incrementOperations(count: number = 1): void {
    this.operationCount += count;
  }

  /**
   * Add a custom metric
   */
  addCustomMetric(name: string, value: number): void {
    this.customMetrics.set(name, value);
  }

  /**
   * Get the collected performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const executionTime = this.endTime - this.startTime;
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryUsage = currentMemory - this.startMemory;
    const throughput = this.operationCount / (executionTime / 1000); // ops per second
    const averageOperationTime =
      this.operationCount > 0 ? executionTime / this.operationCount : 0;

    const customMetrics: Record<string, number> = {};
    this.customMetrics.forEach((value, key) => {
      customMetrics[key] = value;
    });

    return {
      executionTime,
      memoryUsage,
      peakMemoryUsage: this.peakMemory - this.startMemory,
      operationCount: this.operationCount,
      throughput,
      averageOperationTime,
      customMetrics,
    };
  }

  /**
   * Get simulation-specific performance metrics
   */
  getSimulationMetrics(additionalData: {
    ticksProcessed: number;
    creaturesProcessed: number;
    neuralNetworkPasses: number;
  }): SimulationPerformanceMetrics {
    const baseMetrics = this.getMetrics();
    const { ticksProcessed, creaturesProcessed, neuralNetworkPasses } =
      additionalData;

    const averageTickTime =
      ticksProcessed > 0 ? baseMetrics.executionTime / ticksProcessed : 0;
    const averageCreatureProcessingTime =
      ticksProcessed > 0 && creaturesProcessed > 0
        ? baseMetrics.executionTime / (ticksProcessed * creaturesProcessed)
        : 0;
    const averageNeuralNetworkTime =
      neuralNetworkPasses > 0
        ? baseMetrics.executionTime / neuralNetworkPasses
        : 0;

    return {
      ...baseMetrics,
      ticksProcessed,
      averageTickTime,
      creaturesProcessed,
      averageCreatureProcessingTime,
      neuralNetworkPasses,
      averageNeuralNetworkTime,
      memoryAllocations: this.customMetrics.get("memoryAllocations") || 0,
      gcEvents: this.gcMetrics.collections,
    };
  }
}

export class PerformanceAnalyzer {
  /**
   * Compare performance metrics against thresholds
   */
  static validateMetrics(
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds
  ): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    if (metrics.executionTime > thresholds.maxExecutionTime) {
      failures.push(
        `Execution time ${metrics.executionTime.toFixed(
          2
        )}ms exceeds threshold ${thresholds.maxExecutionTime}ms`
      );
    }

    const memoryUsageMB = metrics.memoryUsage / (1024 * 1024);
    if (memoryUsageMB > thresholds.maxMemoryUsageMB) {
      failures.push(
        `Memory usage ${memoryUsageMB.toFixed(2)}MB exceeds threshold ${
          thresholds.maxMemoryUsageMB
        }MB`
      );
    }

    const peakMemoryUsageMB = metrics.peakMemoryUsage / (1024 * 1024);
    if (peakMemoryUsageMB > thresholds.maxPeakMemoryUsageMB) {
      failures.push(
        `Peak memory usage ${peakMemoryUsageMB.toFixed(
          2
        )}MB exceeds threshold ${thresholds.maxPeakMemoryUsageMB}MB`
      );
    }

    if (metrics.throughput < thresholds.minThroughput) {
      failures.push(
        `Throughput ${metrics.throughput.toFixed(
          2
        )} ops/sec is below threshold ${thresholds.minThroughput} ops/sec`
      );
    }

    if (metrics.averageOperationTime > thresholds.maxAverageOperationTime) {
      failures.push(
        `Average operation time ${metrics.averageOperationTime.toFixed(
          2
        )}ms exceeds threshold ${thresholds.maxAverageOperationTime}ms`
      );
    }

    if (
      thresholds.minFrameRate &&
      metrics.frameRate &&
      metrics.frameRate < thresholds.minFrameRate
    ) {
      failures.push(
        `Frame rate ${metrics.frameRate.toFixed(2)} FPS is below threshold ${
          thresholds.minFrameRate
        } FPS`
      );
    }

    // Check custom thresholds
    if (thresholds.customThresholds) {
      for (const [metricName, threshold] of Object.entries(
        thresholds.customThresholds
      )) {
        const value = metrics.customMetrics[metricName];
        if (value !== undefined) {
          if (threshold.min !== undefined && value < threshold.min) {
            failures.push(
              `Custom metric ${metricName} value ${value} is below minimum threshold ${threshold.min}`
            );
          }
          if (threshold.max !== undefined && value > threshold.max) {
            failures.push(
              `Custom metric ${metricName} value ${value} exceeds maximum threshold ${threshold.max}`
            );
          }
        }
      }
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  /**
   * Compare two sets of metrics to detect performance regressions
   */
  static compareMetrics(
    baseline: PerformanceMetrics,
    current: PerformanceMetrics,
    tolerancePercent: number = 10
  ): {
    improved: string[];
    regressed: string[];
    unchanged: string[];
  } {
    const improved: string[] = [];
    const regressed: string[] = [];
    const unchanged: string[] = [];

    const checkMetric = (
      name: string,
      baselineValue: number,
      currentValue: number,
      lowerIsBetter: boolean = true
    ) => {
      const changePercent =
        ((currentValue - baselineValue) / baselineValue) * 100;
      const tolerance = tolerancePercent;

      if (Math.abs(changePercent) <= tolerance) {
        unchanged.push(
          `${name}: ${changePercent.toFixed(1)}% (within tolerance)`
        );
      } else if (lowerIsBetter) {
        if (changePercent < -tolerance) {
          improved.push(
            `${name}: ${Math.abs(changePercent).toFixed(1)}% faster`
          );
        } else {
          regressed.push(`${name}: ${changePercent.toFixed(1)}% slower`);
        }
      } else {
        if (changePercent > tolerance) {
          improved.push(`${name}: ${changePercent.toFixed(1)}% higher`);
        } else {
          regressed.push(
            `${name}: ${Math.abs(changePercent).toFixed(1)}% lower`
          );
        }
      }
    };

    checkMetric(
      "Execution Time",
      baseline.executionTime,
      current.executionTime
    );
    checkMetric("Memory Usage", baseline.memoryUsage, current.memoryUsage);
    checkMetric(
      "Peak Memory",
      baseline.peakMemoryUsage,
      current.peakMemoryUsage
    );
    checkMetric("Throughput", baseline.throughput, current.throughput, false);
    checkMetric(
      "Average Operation Time",
      baseline.averageOperationTime,
      current.averageOperationTime
    );

    return { improved, regressed, unchanged };
  }

  /**
   * Generate a formatted performance report
   */
  static generateReport(
    testName: string,
    metrics: PerformanceMetrics | SimulationPerformanceMetrics,
    thresholds?: PerformanceThresholds
  ): string {
    const lines: string[] = [];
    lines.push(`=== Performance Report: ${testName} ===`);
    lines.push(`Execution Time: ${metrics.executionTime.toFixed(2)}ms`);
    lines.push(
      `Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
    );
    lines.push(
      `Peak Memory: ${(metrics.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`
    );
    lines.push(`Operations: ${metrics.operationCount}`);
    lines.push(`Throughput: ${metrics.throughput.toFixed(2)} ops/sec`);
    lines.push(
      `Avg Operation Time: ${metrics.averageOperationTime.toFixed(4)}ms`
    );

    if (metrics.frameRate) {
      lines.push(`Frame Rate: ${metrics.frameRate.toFixed(2)} FPS`);
    }

    // Simulation-specific metrics
    if ("ticksProcessed" in metrics) {
      const simMetrics = metrics as SimulationPerformanceMetrics;
      lines.push(`--- Simulation Metrics ---`);
      lines.push(`Ticks Processed: ${simMetrics.ticksProcessed}`);
      lines.push(
        `Average Tick Time: ${simMetrics.averageTickTime.toFixed(4)}ms`
      );
      lines.push(`Creatures Processed: ${simMetrics.creaturesProcessed}`);
      lines.push(
        `Avg Creature Time: ${simMetrics.averageCreatureProcessingTime.toFixed(
          6
        )}ms`
      );
      lines.push(`Neural Network Passes: ${simMetrics.neuralNetworkPasses}`);
      lines.push(
        `Avg NN Time: ${simMetrics.averageNeuralNetworkTime.toFixed(6)}ms`
      );
      lines.push(`GC Events: ${simMetrics.gcEvents}`);
    }

    // Custom metrics
    if (Object.keys(metrics.customMetrics).length > 0) {
      lines.push(`--- Custom Metrics ---`);
      for (const [name, value] of Object.entries(metrics.customMetrics)) {
        lines.push(`${name}: ${value}`);
      }
    }

    // Threshold validation
    if (thresholds) {
      const validation = this.validateMetrics(metrics, thresholds);
      lines.push(`--- Threshold Validation ---`);
      lines.push(`Status: ${validation.passed ? "PASSED" : "FAILED"}`);
      if (validation.failures.length > 0) {
        lines.push(`Failures:`);
        validation.failures.forEach((failure) => lines.push(`  - ${failure}`));
      }
    }

    return lines.join("\n");
  }
}

/**
 * Utility function to run a performance test with automatic metrics collection
 */
export async function runPerformanceTest<T>(
  testName: string,
  testFunction: (collector: PerformanceCollector) => Promise<T> | T,
  thresholds?: PerformanceThresholds
): Promise<{
  result: T;
  metrics: PerformanceMetrics;
  report: string;
  passed: boolean;
}> {
  const collector = new PerformanceCollector();

  collector.start();
  const result = await testFunction(collector);
  collector.stop();

  const metrics = collector.getMetrics();
  const report = PerformanceAnalyzer.generateReport(
    testName,
    metrics,
    thresholds
  );

  let passed = true;
  if (thresholds) {
    const validation = PerformanceAnalyzer.validateMetrics(metrics, thresholds);
    passed = validation.passed;
  }

  return { result, metrics, report, passed };
}
