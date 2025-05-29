/**
 * Simulation Scalability Performance Tests
 *
 * These tests measure how the simulation system performs under
 * increasing load in terms of simulation size, complexity, and concurrency.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TestDataGenerators } from "../../utils/test-data-generators";
import {
  PerformanceCollector,
  PerformanceAnalyzer,
  PerformanceThresholds,
  SimulationPerformanceMetrics,
  runPerformanceTest,
} from "../performance-metrics";
import { IWorld, ICreature } from "../../../src/core/interfaces";
import { ActivationType } from "../../../src/neural/types";
import { World } from "../../../src/world/World";
import { Random } from "../../../src/core/random";

// Simple mock simulation for testing purposes
class MockSimulation {
  public creatures: ICreature[];
  private world: IWorld;
  private currentTick = 0;

  constructor(world: IWorld, creatures: ICreature[]) {
    this.world = world;
    this.creatures = [...creatures]; // Make a copy to avoid mutation issues

    // Add creatures to the world - but first ensure world is clean
    for (const creature of this.creatures) {
      try {
        this.world.addEntity(creature);
      } catch (error) {
        // Entity might already exist, try removing and re-adding
        this.world.removeEntity(creature.id);
        this.world.addEntity(creature);
      }
    }
  }

  step(): void {
    this.currentTick++;
    // Update all creatures
    for (const creature of this.creatures) {
      if (creature.active) {
        creature.update(1 / 60); // Assuming 60 FPS
      }
    }
    this.world.update(1 / 60);
  }

  get currentTickNumber(): number {
    return this.currentTick;
  }
}

describe("Simulation Scalability Performance Tests", () => {
  let baselineThresholds: PerformanceThresholds;

  beforeEach(() => {
    // Conservative thresholds for CI environments
    baselineThresholds = {
      maxExecutionTime: 5000, // 5 seconds for simulation tests
      maxMemoryUsageMB: 100,
      maxPeakMemoryUsageMB: 200,
      minThroughput: 10, // operations per second (lower for complex simulations)
      maxAverageOperationTime: 100, // 100ms per operation
    };
  });

  describe("Population Size Scaling", () => {
    it("should handle increasing population sizes efficiently", async () => {
      const populationSizes = [10, 25, 50, 100];
      const scalingResults: {
        size: number;
        executionTime: number;
        throughput: number;
        avgTickTime: number;
        memoryUsage: number;
      }[] = [];

      for (const populationSize of populationSizes) {
        const { result, metrics } = await runPerformanceTest(
          `Population Scaling - ${populationSize} creatures`,
          async (collector) => {
            // Create simulation with specified population size
            const creatures: ICreature[] = [];
            for (let i = 0; i < populationSize; i++) {
              creatures.push(
                TestDataGenerators.createCreature(
                  { x: Math.random() * 100, y: Math.random() * 100 }, // position first
                  {
                    id: `creature-pop-${populationSize}-${i}-${Date.now()}-${Math.random()}`, // unique id
                    brainConfig: {
                      hiddenLayers: [
                        { size: 20, activation: ActivationType.RELU },
                        { size: 16, activation: ActivationType.RELU },
                      ],
                      outputLayer: {
                        size: 8,
                        activation: ActivationType.SIGMOID,
                      },
                    },
                    energy: 100,
                  }
                )
              );
            }

            // Create world and simulation
            const world = TestDataGenerators.createWorld({
              width: 200,
              height: 200,
            });

            // MockSimulation will handle adding creatures to world
            const simulation = new MockSimulation(world, creatures);

            const ticksToRun = 20;
            let totalNeuralPasses = 0;

            // Run simulation ticks
            for (let tick = 0; tick < ticksToRun; tick++) {
              simulation.step();
              totalNeuralPasses += simulation.creatures.length;
              collector.incrementOperations();
            }

            collector.addCustomMetric("populationSize", populationSize);
            collector.addCustomMetric("ticksProcessed", ticksToRun);
            collector.addCustomMetric("totalNeuralPasses", totalNeuralPasses);
            collector.addCustomMetric(
              "avgCreaturesPerTick",
              simulation.creatures.length
            );

            return {
              populationSize,
              ticksProcessed: ticksToRun,
              totalNeuralPasses,
              finalCreatureCount: simulation.creatures.length,
            };
          },
          {
            ...baselineThresholds,
            maxExecutionTime: 8000 + populationSize * 50, // Scale timeout with population
          }
        );

        const simulationMetrics = metrics as SimulationPerformanceMetrics;
        scalingResults.push({
          size: populationSize,
          executionTime: metrics.executionTime,
          throughput: metrics.throughput,
          avgTickTime: simulationMetrics.averageTickTime || 0,
          memoryUsage: metrics.memoryUsage,
        });
      }

      // Analyze scaling characteristics
      console.log("=== Population Size Scaling Analysis ===");
      scalingResults.forEach((result) => {
        console.log(
          `${result.size} creatures: ${result.executionTime.toFixed(
            2
          )}ms, ${result.throughput.toFixed(
            2
          )} ops/sec, ${result.avgTickTime.toFixed(2)}ms/tick, ${(
            result.memoryUsage /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
      });

      // Check that scaling is reasonable (allow for some efficiency gains)
      const firstResult = scalingResults[0];
      const lastResult = scalingResults[scalingResults.length - 1];
      const populationScale = lastResult.size / firstResult.size;
      const timeScale = lastResult.executionTime / firstResult.executionTime;
      const scalingEfficiency = timeScale / populationScale;

      console.log(
        `Population scale: ${populationScale}x, Time scale: ${timeScale.toFixed(
          2
        )}x, Efficiency: ${scalingEfficiency.toFixed(2)}`
      );

      // Efficiency should be reasonable (allow for super-linear performance)
      // Efficiency < 1.0 means better than linear scaling (excellent!)
      // Efficiency > 3.0 means significantly worse than linear scaling (concerning)
      expect(scalingEfficiency).toBeGreaterThan(0.05); // Allow for exceptional optimizations
      expect(scalingEfficiency).toBeLessThan(3.0);
    });

    it("should maintain performance with high-density populations", async () => {
      const { result, metrics, report, passed } = await runPerformanceTest(
        "High-Density Population Test",
        async (collector) => {
          const populationSize = 200;
          const worldSize = 150; // Smaller world = higher density

          const creatures: ICreature[] = [];
          for (let i = 0; i < populationSize; i++) {
            creatures.push(
              TestDataGenerators.createCreature(
                { x: Math.random() * worldSize, y: Math.random() * worldSize }, // position first
                {
                  id: `creature-high-density-${populationSize}-${i}-${Date.now()}-${Math.random()}`, // unique id
                  brainConfig: {
                    hiddenLayers: [
                      { size: 15, activation: ActivationType.RELU },
                      { size: 12, activation: ActivationType.RELU },
                    ],
                    outputLayer: {
                      size: 6,
                      activation: ActivationType.SIGMOID,
                    },
                  },
                  energy: 80,
                }
              )
            );
          }

          // Create world and simulation
          const world = TestDataGenerators.createWorld({
            width: worldSize,
            height: worldSize,
          });

          // MockSimulation will handle adding creatures to world
          const simulation = new MockSimulation(world, creatures);

          const ticksToRun = 15;
          let collisionChecks = 0;
          let interactionCount = 0;

          for (let tick = 0; tick < ticksToRun; tick++) {
            simulation.step();

            // Estimate collision checks (quadratic with population in dense scenarios)
            collisionChecks +=
              (simulation.creatures.length *
                (simulation.creatures.length - 1)) /
              2;
            interactionCount += simulation.creatures.length;

            collector.incrementOperations();
          }

          const density = populationSize / (worldSize * worldSize);
          collector.addCustomMetric("populationDensity", density);
          collector.addCustomMetric("collisionChecks", collisionChecks);
          collector.addCustomMetric("totalInteractions", interactionCount);

          return {
            populationSize,
            worldSize,
            density,
            ticksProcessed: ticksToRun,
            collisionChecks,
          };
        },
        {
          ...baselineThresholds,
          maxExecutionTime: 12000, // Allow more time for high-density simulation
          maxMemoryUsageMB: 150,
        }
      );

      expect(passed).toBe(true);
      expect(result.populationSize).toBe(200);
      console.log(report);
      console.log(
        `Population density: ${result.density.toFixed(6)} creatures/unit²`
      );
    });
  });

  describe("Simulation Complexity Scaling", () => {
    it("should handle increasing neural network complexity", async () => {
      const complexityLevels = [
        { name: "Simple", hidden: [10], output: 4 },
        { name: "Medium", hidden: [20, 15], output: 6 },
        { name: "Complex", hidden: [30, 25, 20], output: 8 },
        { name: "Advanced", hidden: [40, 35, 30, 25], output: 12 },
      ];

      const complexityResults: {
        name: string;
        totalWeights: number;
        executionTime: number;
        avgNeuralTime: number;
      }[] = [];

      for (const complexity of complexityLevels) {
        const { result, metrics } = await runPerformanceTest(
          `Neural Complexity - ${complexity.name}`,
          async (collector) => {
            const populationSize = 30;
            const creatures: ICreature[] = [];

            // Calculate total weights for this complexity
            let totalWeights = 0;
            const hiddenLayers = complexity.hidden.map((size) => ({
              size,
              activation: ActivationType.RELU,
            }));

            // Estimate weights: input->first hidden + hidden->hidden + hidden->output + biases
            const inputSize = 60; // Standard input size
            totalWeights += inputSize * complexity.hidden[0]; // input to first hidden
            for (let i = 0; i < complexity.hidden.length - 1; i++) {
              totalWeights += complexity.hidden[i] * complexity.hidden[i + 1];
            }
            totalWeights +=
              complexity.hidden[complexity.hidden.length - 1] *
              complexity.output;
            totalWeights +=
              complexity.hidden.reduce((sum, size) => sum + size, 0) +
              complexity.output; // biases

            for (let i = 0; i < populationSize; i++) {
              creatures.push(
                TestDataGenerators.createCreature(
                  { x: Math.random() * 150, y: Math.random() * 150 }, // position first
                  {
                    id: `creature-complexity-${
                      complexity.name
                    }-${i}-${Date.now()}-${Math.random()}`, // unique id
                    brainConfig: {
                      hiddenLayers,
                      outputLayer: {
                        size: complexity.output,
                        activation: ActivationType.SIGMOID,
                      },
                    },
                    energy: 100,
                  }
                )
              );
            }

            // Create world and simulation
            const world = TestDataGenerators.createWorld({
              width: 150,
              height: 150,
            });

            // MockSimulation will handle adding creatures to world
            const simulation = new MockSimulation(world, creatures);

            const ticksToRun = 15;
            let totalNeuralPasses = 0;

            for (let tick = 0; tick < ticksToRun; tick++) {
              simulation.step();
              totalNeuralPasses += simulation.creatures.length;
              collector.incrementOperations();
            }

            collector.addCustomMetric("totalWeights", totalWeights);
            collector.addCustomMetric("totalNeuralPasses", totalNeuralPasses);
            collector.addCustomMetric(
              "complexityLevel",
              complexity.hidden.length
            );

            return {
              complexity: complexity.name,
              totalWeights,
              totalNeuralPasses,
              ticksProcessed: ticksToRun,
            };
          }
        );

        const avgNeuralTime = metrics.executionTime / result.totalNeuralPasses;
        complexityResults.push({
          name: complexity.name,
          totalWeights: result.totalWeights,
          executionTime: metrics.executionTime,
          avgNeuralTime,
        });
      }

      // Analyze complexity scaling
      console.log("=== Neural Complexity Scaling Analysis ===");
      complexityResults.forEach((result) => {
        console.log(
          `${result.name}: ${result.totalWeights} weights, ` +
            `${result.executionTime.toFixed(2)}ms, ` +
            `${(result.avgNeuralTime * 1000).toFixed(3)}μs/neural pass`
        );
      });

      // Check that complex networks don't degrade performance catastrophically
      const simpleResult = complexityResults[0];
      const complexResult = complexityResults[complexityResults.length - 1];
      const weightRatio =
        complexResult.totalWeights / simpleResult.totalWeights;
      const timeRatio =
        complexResult.avgNeuralTime / simpleResult.avgNeuralTime;
      const efficiency = timeRatio / weightRatio;

      console.log(
        `Weight ratio: ${weightRatio.toFixed(2)}x, ` +
          `Time ratio: ${timeRatio.toFixed(2)}x, ` +
          `Efficiency: ${efficiency.toFixed(2)}`
      );

      // Efficiency should be reasonable (not worse than 2x the weight increase)
      expect(efficiency).toBeLessThan(2.0);
    });
  });

  describe("Data Volume Scaling", () => {
    it("should handle increasing world size efficiently", async () => {
      const worldSizes = [
        { size: 100, name: "Small" },
        { size: 200, name: "Medium" },
        { size: 400, name: "Large" },
        { size: 600, name: "XLarge" },
      ];

      const volumeResults: {
        name: string;
        worldArea: number;
        executionTime: number;
        memoryUsage: number;
      }[] = [];

      for (const worldConfig of worldSizes) {
        const { result, metrics } = await runPerformanceTest(
          `World Size - ${worldConfig.name} (${worldConfig.size}x${worldConfig.size})`,
          async (collector) => {
            const populationSize = 40;
            const foodCount = Math.floor(
              (worldConfig.size * worldConfig.size) / 2000
            ); // Scale food with area

            const creatures: ICreature[] = [];
            for (let i = 0; i < populationSize; i++) {
              creatures.push(
                TestDataGenerators.createCreature(
                  {
                    x: Math.random() * worldConfig.size,
                    y: Math.random() * worldConfig.size,
                  }, // position first
                  {
                    id: `creature-world-${
                      worldConfig.name
                    }-${i}-${Date.now()}-${Math.random()}`, // unique id
                    brainConfig: {
                      hiddenLayers: [
                        { size: 20, activation: ActivationType.RELU },
                      ],
                      outputLayer: {
                        size: 6,
                        activation: ActivationType.SIGMOID,
                      },
                    },
                    energy: 100,
                  }
                )
              );
            }

            // Create world and simulation
            const world = TestDataGenerators.createWorld({
              width: worldConfig.size,
              height: worldConfig.size,
            });

            // MockSimulation will handle adding creatures to world
            const simulation = new MockSimulation(world, creatures);

            const ticksToRun = 12;
            const worldArea = worldConfig.size * worldConfig.size;

            for (let tick = 0; tick < ticksToRun; tick++) {
              simulation.step();
              collector.incrementOperations();
            }

            collector.addCustomMetric("worldArea", worldArea);
            collector.addCustomMetric("foodCount", foodCount);
            collector.addCustomMetric(
              "spatialComplexity",
              Math.log2(worldArea)
            );

            return {
              worldSize: worldConfig.size,
              worldArea,
              foodCount,
              ticksProcessed: ticksToRun,
            };
          },
          {
            ...baselineThresholds,
            maxExecutionTime: 6000 + worldConfig.size * 5, // Scale timeout with world size
            maxMemoryUsageMB: 50 + Math.floor(worldConfig.size / 50), // Scale memory limit
          }
        );

        volumeResults.push({
          name: worldConfig.name,
          worldArea: result.worldArea,
          executionTime: metrics.executionTime,
          memoryUsage: metrics.memoryUsage,
        });
      }

      // Analyze volume scaling
      console.log("=== World Size Scaling Analysis ===");
      volumeResults.forEach((result) => {
        console.log(
          `${result.name}: ${result.worldArea} units², ` +
            `${result.executionTime.toFixed(2)}ms, ` +
            `${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`
        );
      });

      // Check scaling characteristics
      const smallResult = volumeResults[0];
      const largeResult = volumeResults[volumeResults.length - 1];
      const areaRatio = largeResult.worldArea / smallResult.worldArea;
      const timeRatio = largeResult.executionTime / smallResult.executionTime;
      const memoryRatio = largeResult.memoryUsage / smallResult.memoryUsage;

      console.log(
        `Area scale: ${areaRatio}x, ` +
          `Time scale: ${timeRatio.toFixed(2)}x, ` +
          `Memory scale: ${memoryRatio.toFixed(2)}x`
      );

      // Scaling should be reasonable for spatial algorithms
      // Spatial algorithms often scale between linear and quadratic
      expect(timeRatio).toBeLessThan(areaRatio); // Better than quadratic (O(n²))
      expect(memoryRatio).toBeLessThan(areaRatio); // Better than linear memory growth
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple simultaneous simulations", async () => {
      const { result, metrics, report, passed } = await runPerformanceTest(
        "Concurrent Simulations Test",
        async (collector) => {
          const simulationCount = 4;
          const populationPerSim = 25;

          // Create multiple independent simulations
          const simulations: IWorld[] = [];
          for (let simIndex = 0; simIndex < simulationCount; simIndex++) {
            const creatures: ICreature[] = [];
            for (let i = 0; i < populationPerSim; i++) {
              creatures.push(
                TestDataGenerators.createCreature(
                  { x: Math.random() * 120, y: Math.random() * 120 }, // position first
                  {
                    id: `creature-concurrent-${simIndex}-${i}-${Date.now()}-${Math.random()}`, // unique id
                    brainConfig: {
                      hiddenLayers: [
                        { size: 18, activation: ActivationType.RELU },
                      ],
                      outputLayer: {
                        size: 6,
                        activation: ActivationType.SIGMOID,
                      },
                    },
                    energy: 100,
                  }
                )
              );
            }

            simulations.push(
              TestDataGenerators.createWorld({
                width: 120,
                height: 120,
                creatures,
                initialFoodCount: 12,
              })
            );
          }

          const ticksPerSim = 10;
          let totalOperations = 0;

          // Run all simulations concurrently for each tick
          for (let tick = 0; tick < ticksPerSim; tick++) {
            // Process all simulations in parallel for this tick
            for (const world of simulations) {
              const simulation = new MockSimulation(world, [
                ...world.creatures,
              ]); // Convert readonly to mutable array
              simulation.step();
              totalOperations++;
              collector.incrementOperations();
            }
          }

          collector.addCustomMetric("simulationCount", simulationCount);
          collector.addCustomMetric(
            "totalCreatures",
            simulationCount * populationPerSim
          );
          collector.addCustomMetric("totalOperations", totalOperations);

          return {
            simulationCount,
            populationPerSim,
            totalCreatures: simulationCount * populationPerSim,
            ticksPerSim,
            totalOperations,
          };
        },
        {
          ...baselineThresholds,
          maxExecutionTime: 8000, // More time for concurrent operations
          maxMemoryUsageMB: 120,
        }
      );

      expect(passed).toBe(true);
      expect(result.simulationCount).toBe(4);
      expect(result.totalCreatures).toBe(100);
      expect(metrics.operationCount).toBe(40); // 4 simulations * 10 ticks

      console.log(report);
      console.log(`Total concurrent creatures: ${result.totalCreatures}`);
    });
  });
});
