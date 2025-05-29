import { expect } from "vitest";
import { IWorld, ICreature } from "../../src/core/interfaces";
import { INeuralNetwork } from "../../src/neural/types";
import { Position } from "../../src/world/types";

/**
 * Custom Assertion Helpers
 *
 * Provides specialized assertion functions for simulation-specific
 * testing scenarios to improve test readability and maintainability.
 */

export class AssertionHelpers {
  /**
   * Assert that a creature is in a valid state
   */
  static assertCreatureValid(
    creature: ICreature,
    customChecks?: (c: ICreature) => void
  ): void {
    expect(creature).toBeDefined();
    expect(creature.id).toBeTypeOf("string");
    expect(creature.energy).toBeGreaterThanOrEqual(0);
    expect(creature.age).toBeGreaterThanOrEqual(0);
    expect(creature.position).toBeDefined();
    expect(creature.position.x).toBeTypeOf("number");
    expect(creature.position.y).toBeTypeOf("number");
    expect(typeof creature.alive).toBe("boolean");
    expect(typeof creature.active).toBe("boolean");

    if (customChecks) {
      customChecks(creature);
    }
  }

  /**
   * Assert that a world is in a valid state
   */
  static assertWorldValid(
    world: IWorld,
    customChecks?: (w: IWorld) => void
  ): void {
    expect(world).toBeDefined();
    expect(world.width).toBeGreaterThan(0);
    expect(world.height).toBeGreaterThan(0);
    expect(world.creatures).toBeDefined();
    expect(Array.isArray(world.creatures)).toBe(true);

    // Validate all creatures are within world bounds
    world.creatures.forEach((creature) => {
      expect(creature.position.x).toBeGreaterThanOrEqual(0);
      expect(creature.position.x).toBeLessThan(world.width);
      expect(creature.position.y).toBeGreaterThanOrEqual(0);
      expect(creature.position.y).toBeLessThan(world.height);
    });

    if (customChecks) {
      customChecks(world);
    }
  }

  /**
   * Assert that a neural network produces deterministic outputs
   */
  static assertNeuralNetworkDeterministic(
    network: INeuralNetwork,
    inputs: number[],
    iterations: number = 5
  ): void {
    expect(network).toBeDefined();
    expect(inputs.length).toBe(network.config.inputSize);

    const firstOutput = network.process(inputs);
    expect(firstOutput).toBeDefined();
    expect(firstOutput.length).toBe(network.config.outputLayer.size);

    // Run multiple times and ensure identical outputs
    for (let i = 1; i < iterations; i++) {
      const output = network.process(inputs);
      expect(output).toEqual(firstOutput);
    }
  }

  /**
   * Assert that two neural networks produce identical outputs
   */
  static assertNeuralNetworksEquivalent(
    network1: INeuralNetwork,
    network2: INeuralNetwork,
    testInputs: number[][]
  ): void {
    expect(network1.config.inputSize).toBe(network2.config.inputSize);
    expect(network1.config.outputLayer.size).toBe(
      network2.config.outputLayer.size
    );

    testInputs.forEach((inputs) => {
      const output1 = network1.process(inputs);
      const output2 = network2.process(inputs);
      expect(output1).toEqual(output2);
    });
  }

  /**
   * Assert that simulation results are reproducible
   */
  static assertSimulationDeterministic(
    simulationRunner: () => any,
    iterations: number = 3
  ): void {
    const results: any[] = [];

    for (let i = 0; i < iterations; i++) {
      results.push(simulationRunner());
    }

    // Compare all results to the first one
    const firstResult = results[0];
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(firstResult);
    }
  }

  /**
   * Assert that performance metrics are within acceptable bounds
   */
  static assertPerformanceMetrics(
    metrics: {
      executionTime: number;
      memoryUsed?: number;
      frameRate?: number;
    },
    thresholds: {
      maxExecutionTime: number;
      maxMemory?: number;
      minFrameRate?: number;
    }
  ): void {
    expect(metrics.executionTime).toBeLessThanOrEqual(
      thresholds.maxExecutionTime
    );

    if (metrics.memoryUsed && thresholds.maxMemory) {
      expect(metrics.memoryUsed).toBeLessThanOrEqual(thresholds.maxMemory);
    }

    if (metrics.frameRate && thresholds.minFrameRate) {
      expect(metrics.frameRate).toBeGreaterThanOrEqual(thresholds.minFrameRate);
    }
  }

  /**
   * Assert that two positions are equal within a tolerance
   */
  static assertPositionsEqual(
    pos1: Position,
    pos2: Position,
    tolerance: number = 0.001
  ): void {
    expect(Math.abs(pos1.x - pos2.x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(pos1.y - pos2.y)).toBeLessThanOrEqual(tolerance);
  }

  /**
   * Assert that a value is within a specified range
   */
  static assertInRange(
    value: number,
    min: number,
    max: number,
    label?: string
  ): void {
    const message = label
      ? `${label} should be in range [${min}, ${max}]`
      : undefined;
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  }

  /**
   * Assert that an array contains unique elements
   */
  static assertArrayUnique<T>(
    array: T[],
    keyFunction?: (item: T) => any
  ): void {
    const keys = keyFunction ? array.map(keyFunction) : array;
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(array.length);
  }

  /**
   * Assert that genetic algorithm results show improvement
   */
  static assertEvolutionProgress(
    generationStats: Array<{
      generation: number;
      bestFitness: number;
      averageFitness: number;
    }>,
    minImprovement: number = 0.05
  ): void {
    expect(generationStats.length).toBeGreaterThanOrEqual(2);

    const firstGeneration = generationStats[0];
    const lastGeneration = generationStats[generationStats.length - 1];

    const fitnessImprovement =
      lastGeneration.bestFitness - firstGeneration.bestFitness;
    expect(fitnessImprovement).toBeGreaterThanOrEqual(minImprovement);
  }

  /**
   * Assert that a creature's behavior is consistent
   */
  static assertCreatureBehaviorConsistent(
    creature: ICreature,
    testScenarios: Array<() => void>,
    expectedActions: Array<any>
  ): void {
    expect(testScenarios.length).toBe(expectedActions.length);

    testScenarios.forEach((scenario, index) => {
      scenario(); // Set up the scenario

      // Creature should make the expected decision
      const action = (creature as any).getNextAction
        ? (creature as any).getNextAction()
        : null;
      expect(action).toEqual(expectedActions[index]);
    });
  }

  /**
   * Assert that save/load operations preserve data integrity
   */
  static assertSaveLoadIntegrity<T>(
    originalData: T,
    loadedData: T,
    ignoredFields: string[] = []
  ): void {
    const compareData = (obj1: any, obj2: any, path: string = "") => {
      if (typeof obj1 !== typeof obj2) {
        throw new Error(
          `Type mismatch at ${path}: ${typeof obj1} vs ${typeof obj2}`
        );
      }

      if (obj1 === null || obj2 === null) {
        expect(obj1).toBe(obj2);
        return;
      }

      if (typeof obj1 === "object") {
        const keys1 = Object.keys(obj1).filter(
          (key) => !ignoredFields.includes(key)
        );
        const keys2 = Object.keys(obj2).filter(
          (key) => !ignoredFields.includes(key)
        );

        expect(keys1.sort()).toEqual(keys2.sort());

        keys1.forEach((key) => {
          compareData(obj1[key], obj2[key], path ? `${path}.${key}` : key);
        });
      } else {
        expect(obj1).toEqual(obj2);
      }
    };

    compareData(originalData, loadedData);
  }

  /**
   * Assert that memory usage is within reasonable bounds
   */
  static assertMemoryUsage(
    beforeMemory: number,
    afterMemory: number,
    maxIncreaseMB: number
  ): void {
    const increaseMB = (afterMemory - beforeMemory) / (1024 * 1024);
    expect(increaseMB).toBeLessThanOrEqual(maxIncreaseMB);
  }

  /**
   * Helper to measure execution time of a function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T> | T
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = performance.now();
    const result = await fn();
    const executionTime = performance.now() - startTime;

    return { result, executionTime };
  }

  /**
   * Helper to run a test multiple times and verify consistency
   */
  static async runConsistencyTest<T>(
    testFunction: () => Promise<T> | T,
    iterations: number = 5,
    compareFn?: (a: T, b: T) => boolean
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      results.push(await testFunction());
    }

    // Verify all results are consistent
    for (let i = 1; i < results.length; i++) {
      if (compareFn) {
        expect(compareFn(results[0], results[i])).toBe(true);
      } else {
        expect(results[i]).toEqual(results[0]);
      }
    }

    return results;
  }
}
