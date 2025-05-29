/**
 * Test Utilities Tests
 *
 * Tests the test utilities themselves to ensure they work correctly
 * and provide reliable testing infrastructure.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TestDataGenerators } from "./test-data-generators";
import { AssertionHelpers } from "./assertion-helpers";
import { MockServices } from "./mock-services";

describe("Test Utilities", () => {
  describe("TestDataGenerators", () => {
    it("should create valid world configuration", () => {
      const config = TestDataGenerators.createWorldConfig();

      expect(config).toBeDefined();
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
      expect(config.seed).toBeTypeOf("number");
    });

    it("should create valid neural network configuration", () => {
      const config = TestDataGenerators.createNeuralNetworkConfig();

      expect(config).toBeDefined();
      expect(config.inputSize).toBeGreaterThan(0);
      expect(config.outputLayer.size).toBeGreaterThan(0);
      expect(Array.isArray(config.hiddenLayers)).toBe(true);
      expect(config.seed).toBeTypeOf("number");
    });

    it("should create valid creature configuration", () => {
      const config = TestDataGenerators.createCreatureConfig();

      expect(config).toBeDefined();
      expect(config.id).toBeTypeOf("string");
      expect(config.maxEnergy).toBeGreaterThan(0);
      expect(config.maxAge).toBeGreaterThan(0);
    });

    it("should create valid neural network instance", () => {
      const network = TestDataGenerators.createNeuralNetwork();

      expect(network).toBeDefined();
      expect(network.config.inputSize).toBe(60);
      expect(network.config.outputLayer.size).toBe(16);
      expect(typeof network.process).toBe("function");
    });

    it("should create valid creature instance", () => {
      const creature = TestDataGenerators.createCreature();

      expect(creature).toBeDefined();
      expect(typeof creature.id).toBe("string");
      expect(creature.position).toBeDefined();
      expect(creature.position.x).toBeTypeOf("number");
      expect(creature.position.y).toBeTypeOf("number");
      expect(creature.energy).toBeTypeOf("number");
    });

    it("should create valid world instance", () => {
      const world = TestDataGenerators.createWorld();

      expect(world).toBeDefined();
      expect(world.width).toBeGreaterThan(0);
      expect(world.height).toBeGreaterThan(0);
      expect(Array.isArray(world.creatures)).toBe(true);
      expect(Array.isArray(world.entities)).toBe(true);
    });

    it("should create creature population with correct count", () => {
      const count = 5;
      const creatures = TestDataGenerators.createCreaturePopulation(count);

      expect(Array.isArray(creatures)).toBe(true);
      expect(creatures).toHaveLength(count);

      creatures.forEach((creature) => {
        expect(typeof creature.id).toBe("string");
        expect(creature.position).toBeDefined();
      });
    });

    it("should create deterministic test set", () => {
      const testSet = TestDataGenerators.createDeterministicTestSet(
        42,
        "Test Scenario"
      );

      expect(testSet).toBeDefined();
      expect(testSet.world).toBeDefined();
      expect(Array.isArray(testSet.creatures)).toBe(true);
      expect(Array.isArray(testSet.neuralNetworks)).toBe(true);
      expect(testSet.scenario).toBeDefined();
    });

    it("should generate performance test data with different scales", () => {
      const smallData = TestDataGenerators.createPerformanceTestData("small");
      const mediumData = TestDataGenerators.createPerformanceTestData("medium");
      const largeData = TestDataGenerators.createPerformanceTestData("large");

      expect(smallData.creatureCount).toBeLessThan(mediumData.creatureCount);
      expect(mediumData.creatureCount).toBeLessThan(largeData.creatureCount);

      expect(smallData.worldConfig.width).toBeLessThan(
        mediumData.worldConfig.width
      );
      expect(mediumData.worldConfig.width).toBeLessThan(
        largeData.worldConfig.width
      );
    });
  });

  describe("AssertionHelpers", () => {
    it("should validate creature correctly", () => {
      const creature = TestDataGenerators.createCreature();

      expect(() =>
        AssertionHelpers.assertCreatureValid(creature)
      ).not.toThrow();
    });

    it("should validate world correctly", () => {
      const world = TestDataGenerators.createWorld();

      expect(() => AssertionHelpers.assertWorldValid(world)).not.toThrow();
    });

    it("should validate neural network determinism", () => {
      const network = TestDataGenerators.createNeuralNetwork();
      const inputs = Array.from({ length: 60 }, () => 0.5);

      expect(() =>
        AssertionHelpers.assertNeuralNetworkDeterministic(network, inputs)
      ).not.toThrow();
    });

    it("should validate position equality within tolerance", () => {
      const pos1 = { x: 1.0, y: 2.0 };
      const pos2 = { x: 1.01, y: 2.01 };

      expect(() =>
        AssertionHelpers.assertPositionsEqual(pos1, pos2, 0.1)
      ).not.toThrow();
    });

    it("should validate array uniqueness", () => {
      const uniqueArray = [1, 2, 3, 4, 5];
      const keyFn = (x: number) => x;

      expect(() =>
        AssertionHelpers.assertArrayUnique(uniqueArray, keyFn)
      ).not.toThrow();
    });

    it("should measure execution time correctly", async () => {
      const slowFunction = async () => {
        for (let i = 0; i < 1000; i++) {
          Math.sqrt(i);
        }
        return "test result";
      };

      const result = await AssertionHelpers.measureExecutionTime(slowFunction);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.result).toBe("test result");
    });

    it("should run consistency tests", async () => {
      const deterministicFn = async () => "consistent result"; // Deterministic function for testing

      const results = await AssertionHelpers.runConsistencyTest(
        deterministicFn,
        3
      );
      expect(results).toHaveLength(3);
      // Since it's deterministic, all results should be the same
      expect(results[0]).toBe("consistent result");
      expect(results[1]).toBe("consistent result");
      expect(results[2]).toBe("consistent result");
    });

    it("should reset mocks correctly", () => {
      const mockWorld = MockServices.createMockWorld();
      const mockCreature = MockServices.createMockCreature();

      // Call some methods to create history
      mockWorld.addEntity(mockCreature);
      mockCreature.update(16);

      // Reset mocks
      MockServices.resetMocks(mockWorld, mockCreature);

      // Verify mocks were cleared
      expect(vi.isMockFunction(mockWorld.addEntity)).toBe(true);
      expect(vi.isMockFunction(mockCreature.update)).toBe(true);
    });
  });

  describe("MockServices", () => {
    it("should create mock world with expected interface", () => {
      const mockWorld = MockServices.createMockWorld();

      expect(mockWorld).toBeDefined();
      expect(mockWorld.width).toBeTypeOf("number");
      expect(mockWorld.height).toBeTypeOf("number");
      expect(typeof mockWorld.addEntity).toBe("function");
      expect(typeof mockWorld.update).toBe("function");
      expect(Array.isArray(mockWorld.creatures)).toBe(true);
    });

    it("should create mock creature with expected interface", () => {
      const mockCreature = MockServices.createMockCreature();

      expect(mockCreature).toBeDefined();
      expect(mockCreature.id).toBeTypeOf("string");
      expect(mockCreature.position).toBeDefined();
      expect(typeof mockCreature.update).toBe("function");
      expect(typeof (mockCreature as any).getNextAction).toBe("function");
    });

    it("should create mock neural network with expected interface", () => {
      const mockNetwork = MockServices.createMockNeuralNetwork();

      expect(mockNetwork).toBeDefined();
      expect(mockNetwork.config.inputSize).toBeTypeOf("number");
      expect(mockNetwork.config.outputLayer.size).toBeTypeOf("number");
      expect(typeof mockNetwork.process).toBe("function");
    });

    it("should create integration mock set with relationships", () => {
      const mocks = MockServices.createIntegrationMockSet();

      expect(mocks.world).toBeDefined();
      expect(mocks.creatures).toBeDefined();
      expect(mocks.networks).toBeDefined();
      expect(mocks.persistence).toBeDefined();
      expect(mocks.renderer).toBeDefined();

      expect(mocks.creatures.length).toBe(3);
      expect(mocks.networks.length).toBe(3);
      expect(mocks.world.creatures).toBe(mocks.creatures);
    });

    it("should create performance mocks optimized for speed", () => {
      const mocks = MockServices.createPerformanceMocks();

      expect(mocks.world).toBeDefined();
      expect(mocks.creatures).toBeDefined();
      expect(mocks.networks).toBeDefined();

      expect(mocks.creatures.length).toBe(100);
      expect(mocks.networks.length).toBe(100);
    });

    it("should reset mocks correctly", () => {
      const mockWorld = MockServices.createMockWorld();
      const mockCreature = MockServices.createMockCreature();

      // Call some methods to create history
      mockWorld.addEntity(mockCreature);
      mockCreature.update(16);

      // Reset mocks
      MockServices.resetMocks(mockWorld, mockCreature);

      // Verify mock call history was cleared
      expect((mockWorld.addEntity as any).mock.calls.length).toBe(0);
      expect((mockCreature.update as any).mock.calls.length).toBe(0);
    });
  });

  describe("Integration Tests", () => {
    it("should work together for complete test scenario", () => {
      // Create test data
      const world = TestDataGenerators.createWorld();
      const creatures = TestDataGenerators.createCreaturePopulation(3);

      // Add creatures to world
      creatures.forEach((creature) => world.addEntity(creature));

      // Validate world state
      expect(world.entities.length).toBe(3);

      // Use assertion helpers
      AssertionHelpers.assertWorldValid(world);
      creatures.forEach((creature) =>
        AssertionHelpers.assertCreatureValid(creature)
      );
    });

    it("should support deterministic testing workflow", () => {
      const testSet = TestDataGenerators.createDeterministicTestSet(
        54321,
        "Integration Test"
      );

      // Validate all components
      AssertionHelpers.assertWorldValid(testSet.world);
      testSet.creatures.forEach((creature) =>
        AssertionHelpers.assertCreatureValid(creature)
      );

      // Run simulation steps and validate
      for (let i = 0; i < 5; i++) {
        testSet.world.update(16); // 16ms delta time
        AssertionHelpers.assertWorldValid(testSet.world);
      }
    });
  });
});
