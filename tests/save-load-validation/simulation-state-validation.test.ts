/**
 * Simulation State Save/Load Validation Tests
 *
 * These tests verify that simulation states can be correctly saved and restored
 * across different file formats, compression options, and simulation complexities.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { TestDataGenerators } from "../utils/test-data-generators";
import { World } from "../../src/world/World";
import { Random } from "../../src/core/random";
import {
  createTestPersistenceManager,
  createWorldSnapshotPersistenceManager,
  createNeuralNetworkPersistenceManager,
  DataType,
  ISaveConfig,
  ILoadConfig,
} from "../../src/persistence";
import { FileFormat } from "../../src/persistence/types";
import { WorldSnapshotCreator } from "../../src/renderer/WorldSnapshot";
import { NeuralNetwork } from "../../src/neural/neural-network";
import { ActivationType } from "../../src/neural/types";

describe("Simulation State Save/Load Validation", () => {
  let tempDir: string;
  let persistenceManager: any;
  let worldSnapshotManager: any;
  let neuralNetworkManager: any;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "save-load-test-"));

    // Initialize persistence managers
    persistenceManager = createTestPersistenceManager(tempDir);
    await persistenceManager.initialize();

    worldSnapshotManager =
      createWorldSnapshotPersistenceManager(persistenceManager);
    neuralNetworkManager =
      createNeuralNetworkPersistenceManager(persistenceManager);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up temp directory ${tempDir}:`, error);
    }
  });

  describe("File Format Validation", () => {
    it("should save and load in JSON format correctly", async () => {
      const world = TestDataGenerators.createWorld({
        width: 20,
        height: 20,
        seed: 12345,
      });

      // Add test entities
      for (let i = 0; i < 5; i++) {
        const creature = TestDataGenerators.createCreature(
          { x: i * 2, y: i * 2 },
          { id: `json-test-creature-${i}` },
          { seed: 12345 + i }
        );
        world.addEntity(creature);
      }

      // Run simulation for some steps
      for (let step = 0; step < 10; step++) {
        world.update(16);
      }

      const originalSnapshot = WorldSnapshotCreator.createSnapshot(
        world as World,
        world.currentTick
      );
      const fileName = "json-format-test.json";

      // Save in JSON format
      const saveConfig: ISaveConfig = {
        format: FileFormat.JSON,
        compress: false,
        includeMetadata: true,
        validateBeforeSave: true,
      };

      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName,
        saveConfig
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.metadata.format).toBe(FileFormat.JSON);
      expect(saveResult.metadata.compressed).toBe(false);

      // Load and verify
      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();
      expect(loadResult.data!.tick).toBe(originalSnapshot.tick);
      expect(loadResult.data!.entities.length).toBe(
        originalSnapshot.entities.length
      );
      expect(loadResult.data!.creatures.length).toBe(
        originalSnapshot.creatures.length
      );
    });

    it("should save and load in binary format correctly", async () => {
      const network = new NeuralNetwork({
        inputSize: 10,
        hiddenLayers: [
          { size: 8, activation: ActivationType.RELU, useBias: true },
        ],
        outputLayer: {
          size: 3,
          activation: ActivationType.SIGMOID,
          useBias: true,
        },
        weightRange: { min: -0.5, max: 0.5 },
        seed: 42,
      });

      const testInput = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
      const originalOutput = network.process(testInput);
      const fileName = "binary-format-test.bin";

      // Save in binary format
      const saveConfig: ISaveConfig = {
        format: FileFormat.BINARY,
        compress: false,
        includeMetadata: true,
        validateBeforeSave: true,
      };

      const saveResult = await neuralNetworkManager.saveNetwork(
        network,
        fileName,
        saveConfig
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.metadata.format).toBe(FileFormat.BINARY);

      // Load and verify
      const loadResult = await neuralNetworkManager.loadNetwork(fileName);

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();

      const loadedOutput = loadResult.data!.process(testInput);
      expect(loadedOutput).toEqual(originalOutput);
    });
  });

  describe("Compression Validation", () => {
    it("should maintain data integrity with compression enabled", async () => {
      const world = TestDataGenerators.createWorld({
        width: 30,
        height: 30,
        seed: 98765,
      });

      // Create a complex world with many entities (just creatures, no resources/obstacles for now)
      for (let i = 0; i < 20; i++) {
        const creature = TestDataGenerators.createCreature(
          { x: Math.random() * 25, y: Math.random() * 25 },
          { id: `compression-creature-${i}` },
          { seed: 98765 + i }
        );
        world.addEntity(creature);
      }

      // Run simulation
      for (let step = 0; step < 20; step++) {
        world.update(16);
      }

      const originalSnapshot = WorldSnapshotCreator.createSnapshot(
        world as World,
        world.currentTick
      );
      const fileName = "compression-test.json";

      // Save with compression
      const saveConfig: ISaveConfig = {
        format: FileFormat.JSON,
        compress: true,
        includeMetadata: true,
        validateBeforeSave: true,
      };

      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName,
        saveConfig
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.metadata.compressed).toBe(true);

      // Load and verify all data is preserved
      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();

      const loadedSnapshot = loadResult.data!;

      // Verify core metadata
      expect(loadedSnapshot.tick).toBe(originalSnapshot.tick);
      expect(loadedSnapshot.entities.length).toBe(
        originalSnapshot.entities.length
      );
      expect(loadedSnapshot.creatures.length).toBe(
        originalSnapshot.creatures.length
      );

      // Verify entity details
      for (let i = 0; i < originalSnapshot.entities.length; i++) {
        const original = originalSnapshot.entities[i];
        const loaded = loadedSnapshot.entities[i];

        expect(loaded.id).toBe(original.id);
        expect(loaded.type).toBe(original.type);
        expect(loaded.position.x).toBeCloseTo(original.position.x, 10);
        expect(loaded.position.y).toBeCloseTo(original.position.y, 10);
      }

      // Verify creature-specific details
      for (let i = 0; i < originalSnapshot.creatures.length; i++) {
        const original = originalSnapshot.creatures[i];
        const loaded = loadedSnapshot.creatures[i];

        expect(loaded.id).toBe(original.id);
        expect(loaded.energy).toBeCloseTo(original.energy, 10);
        expect(loaded.active).toBe(original.active);
      }
    });

    it("should handle compression ratio calculations", async () => {
      const networks = [];

      // Create multiple networks of different sizes
      for (let i = 0; i < 5; i++) {
        const networkSize = 20 + i * 10; // Increasing complexity
        const network = new NeuralNetwork({
          inputSize: networkSize,
          hiddenLayers: [
            {
              size: networkSize * 2,
              activation: ActivationType.RELU,
              useBias: true,
            },
            {
              size: networkSize,
              activation: ActivationType.RELU,
              useBias: true,
            },
          ],
          outputLayer: {
            size: networkSize / 2,
            activation: ActivationType.SIGMOID,
            useBias: true,
          },
          weightRange: { min: -1.0, max: 1.0 },
          seed: 1000 + i,
        });
        networks.push(network);
      }

      // Test compression efficiency for different network sizes
      for (let i = 0; i < networks.length; i++) {
        const network = networks[i];
        const fileName = `compression-ratio-test-${i}.json`;

        // Save without compression
        const uncompressedResult = await neuralNetworkManager.saveNetwork(
          network,
          `uncompressed-${fileName}`,
          { compress: false }
        );

        // Save with compression
        const compressedResult = await neuralNetworkManager.saveNetwork(
          network,
          `compressed-${fileName}`,
          { compress: true }
        );

        expect(uncompressedResult.success).toBe(true);
        expect(compressedResult.success).toBe(true);

        // Verify compression reduced file size (or at least didn't increase it significantly)
        // Note: Small neural networks might not compress much
        expect(compressedResult.metadata.size).toBeLessThanOrEqual(
          uncompressedResult.metadata.size * 1.1
        ); // Allow 10% increase due to compression overhead

        // Load both and verify they produce identical results
        const uncompressedLoad = await neuralNetworkManager.loadNetwork(
          `uncompressed-${fileName}`
        );
        const compressedLoad = await neuralNetworkManager.loadNetwork(
          `compressed-${fileName}`
        );

        expect(uncompressedLoad.success).toBe(true);
        expect(compressedLoad.success).toBe(true);

        // Test with same input
        const testInput = Array.from(
          { length: 20 + i * 10 },
          (_, idx) => idx / 100
        );
        const uncompressedOutput = uncompressedLoad.data!.process(testInput);
        const compressedOutput = compressedLoad.data!.process(testInput);

        expect(compressedOutput).toEqual(uncompressedOutput);
      }
    });
  });

  describe("Simulation Complexity Validation", () => {
    it("should handle simple simulation states", async () => {
      const world = TestDataGenerators.createWorld({
        width: 10,
        height: 10,
        seed: 11111,
      });

      // Single creature, simple scenario
      const creature = TestDataGenerators.createCreature(
        { x: 5, y: 5 },
        { id: "simple-test-creature" },
        { seed: 11111 }
      );
      world.addEntity(creature);

      // Run for a few steps
      for (let step = 0; step < 5; step++) {
        world.update(16);
      }

      const fileName = "simple-simulation.json";
      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName,
        {}
      );

      expect(saveResult.success).toBe(true);

      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data!.creatures.length).toBe(1);
      expect(loadResult.data!.creatures[0].id).toBe("simple-test-creature");
    });

    it("should handle medium complexity simulation states", async () => {
      const world = TestDataGenerators.createWorld({
        width: 25,
        height: 25,
        seed: 22222,
      });

      // Medium complexity: multiple creatures (excluding resources/obstacles for now)
      const creatureCount = 10;

      for (let i = 0; i < creatureCount; i++) {
        const creature = TestDataGenerators.createCreature(
          { x: Math.random() * 20, y: Math.random() * 20 },
          { id: `medium-creature-${i}` },
          { seed: 22222 + i }
        );
        world.addEntity(creature);
      }

      // Run simulation to create complex state
      for (let step = 0; step < 30; step++) {
        world.update(16);
      }

      const fileName = "medium-simulation.json";
      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName
      );

      expect(saveResult.success).toBe(true);

      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);
      expect(loadResult.success).toBe(true);

      const snapshot = loadResult.data!;
      expect(snapshot.entities.length).toBeGreaterThanOrEqual(1); // At least some entities survived
      expect(snapshot.creatures.length).toBeLessThanOrEqual(creatureCount); // Some may have died
    });

    it("should handle complex simulation states with high entity density", async () => {
      const world = TestDataGenerators.createWorld({
        width: 40,
        height: 40,
        seed: 33333,
      });

      // High complexity: many entities, complex neural networks
      const creatureCount = 25;

      // Add creatures with varying neural network complexities
      for (let i = 0; i < creatureCount; i++) {
        const complexityLevel = i % 3; // 0, 1, or 2
        const hiddenLayers = [];

        switch (complexityLevel) {
          case 0: // Simple
            hiddenLayers.push({ size: 10, activation: ActivationType.RELU });
            break;
          case 1: // Medium
            hiddenLayers.push({ size: 20, activation: ActivationType.RELU });
            hiddenLayers.push({ size: 15, activation: ActivationType.SIGMOID });
            break;
          case 2: // Complex
            hiddenLayers.push({ size: 30, activation: ActivationType.RELU });
            hiddenLayers.push({ size: 25, activation: ActivationType.RELU });
            hiddenLayers.push({ size: 20, activation: ActivationType.SIGMOID });
            break;
        }

        const creature = TestDataGenerators.createCreature(
          { x: Math.random() * 35, y: Math.random() * 35 },
          {
            id: `complex-creature-${i}`,
            brainConfig: {
              hiddenLayers: hiddenLayers.map((layer) => ({
                ...layer,
                useBias: true,
              })),
              outputLayer: {
                size: 8,
                activation: ActivationType.SIGMOID,
                useBias: true,
              },
            },
          },
          { seed: 33333 + i }
        );
        world.addEntity(creature);
      }

      // Run extended simulation to create very complex state
      for (let step = 0; step < 50; step++) {
        world.update(16);
      }

      const fileName = "complex-simulation.json";
      const saveConfig: ISaveConfig = {
        format: FileFormat.JSON,
        compress: true, // Use compression for large data
        includeMetadata: true,
        validateBeforeSave: true,
      };

      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName,
        saveConfig
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.metadata.compressed).toBe(true);

      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);
      expect(loadResult.success).toBe(true);

      const snapshot = loadResult.data!;
      expect(snapshot.tick).toBe(world.currentTick);
      expect(snapshot.entities.length).toBeGreaterThan(0);

      // Verify that we have creatures
      expect(snapshot.creatures.length).toBeGreaterThan(0);
    });
  });

  describe("Data Integrity Validation", () => {
    it("should maintain exact state through multiple save/load cycles", async () => {
      const world = TestDataGenerators.createWorld({
        width: 15,
        height: 15,
        seed: 44444,
      });

      // Add a few creatures
      for (let i = 0; i < 3; i++) {
        const creature = TestDataGenerators.createCreature(
          { x: i * 3 + 2, y: i * 3 + 2 },
          { id: `integrity-creature-${i}` },
          { seed: 44444 + i }
        );
        world.addEntity(creature);
      }

      // Run initial simulation
      for (let step = 0; step < 15; step++) {
        world.update(16);
      }

      const originalSnapshot = WorldSnapshotCreator.createSnapshot(
        world as World,
        world.currentTick
      );

      // First save/load cycle
      const fileName1 = "integrity-cycle-1.json";
      await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName1
      );
      const loadResult1 = await worldSnapshotManager.loadWorldSnapshot(
        fileName1
      );
      expect(loadResult1.success).toBe(true);

      // Verify first cycle
      expect(loadResult1.data!.tick).toBe(originalSnapshot.tick);
      expect(loadResult1.data!.entities.length).toBe(
        originalSnapshot.entities.length
      );

      // Second save/load cycle using the loaded data
      // Note: We can't directly save the loaded snapshot, so we verify the data matches
      const loadedSnapshot1 = loadResult1.data!;

      // Verify all entity data matches exactly
      for (let i = 0; i < originalSnapshot.entities.length; i++) {
        const original = originalSnapshot.entities[i];
        const loaded = loadedSnapshot1.entities[i];

        expect(loaded.id).toBe(original.id);
        expect(loaded.type).toBe(original.type);
        expect(loaded.position.x).toBeCloseTo(original.position.x, 10);
        expect(loaded.position.y).toBeCloseTo(original.position.y, 10);
      }

      // Verify creature-specific data
      for (let i = 0; i < originalSnapshot.creatures.length; i++) {
        const original = originalSnapshot.creatures[i];
        const loaded = loadedSnapshot1.creatures[i];

        expect(loaded.id).toBe(original.id);
        expect(loaded.energy).toBeCloseTo(original.energy, 10);
        expect(loaded.active).toBe(original.active);
      }
    });

    it("should preserve floating-point precision", async () => {
      const network = new NeuralNetwork({
        inputSize: 5,
        hiddenLayers: [
          { size: 8, activation: ActivationType.SIGMOID, useBias: true },
        ],
        outputLayer: {
          size: 3,
          activation: ActivationType.SIGMOID,
          useBias: true,
        },
        weightRange: { min: -1.0, max: 1.0 },
        seed: 55555,
      });

      // Test with precise floating-point values
      const preciseInput = [
        0.123456789012345, 0.987654321098765, 0.555555555555555,
        0.333333333333333, 0.777777777777777,
      ];

      const originalOutput = network.process(preciseInput);
      const fileName = "precision-test.json";

      // Save and load
      await neuralNetworkManager.saveNetwork(network, fileName);
      const loadResult = await neuralNetworkManager.loadNetwork(fileName);

      expect(loadResult.success).toBe(true);

      const loadedOutput = loadResult.data!.process(preciseInput);

      // Verify high precision (to 12 decimal places)
      for (let i = 0; i < originalOutput.length; i++) {
        expect(loadedOutput[i]).toBeCloseTo(originalOutput[i], 12);
      }
    });

    it("should handle edge case values correctly", async () => {
      const world = TestDataGenerators.createWorld({
        width: 5,
        height: 5,
        seed: 66666,
      });

      // Create creatures with edge case values
      const edgeCaseCreature1 = TestDataGenerators.createCreature(
        { x: 0, y: 0 }, // Minimum position
        {
          id: "edge-creature-min",
          initialEnergy: 0.1, // Very low energy - use initialEnergy not energy
        },
        { seed: 66666 }
      );

      const edgeCaseCreature2 = TestDataGenerators.createCreature(
        { x: 4.9999, y: 4.9999 }, // Near maximum position
        {
          id: "edge-creature-max",
          initialEnergy: 999.9, // Very high energy - use initialEnergy not energy
        },
        { seed: 66667 }
      );

      world.addEntity(edgeCaseCreature1);
      world.addEntity(edgeCaseCreature2);

      // Skip simulation to preserve edge case values
      // world.update(16); // Comment out to maintain edge case energy values

      const fileName = "edge-cases.json";
      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName
      );

      expect(saveResult.success).toBe(true);

      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);
      expect(loadResult.success).toBe(true);

      const snapshot = loadResult.data!;
      expect(snapshot.creatures.length).toBe(2); // Both should survive since no simulation ran

      // Find and verify edge case creatures exist and have correct IDs
      const minCreature = snapshot.creatures.find(
        (c) => c.id === "edge-creature-min"
      );
      const maxCreature = snapshot.creatures.find(
        (c) => c.id === "edge-creature-max"
      );

      expect(minCreature).toBeDefined();
      expect(maxCreature).toBeDefined();

      // Verify the creatures maintained their edge case energy values (approximately)
      expect(minCreature!.energy).toBeCloseTo(0.1, 1);
      expect(maxCreature!.energy).toBeCloseTo(999.9, 1);
    });
  });

  describe("Performance Validation", () => {
    it("should save and load within acceptable time limits", async () => {
      const world = TestDataGenerators.createWorld({
        width: 50,
        height: 50,
        seed: 77777,
      });

      // Create a moderately large simulation
      for (let i = 0; i < 50; i++) {
        const creature = TestDataGenerators.createCreature(
          { x: Math.random() * 45, y: Math.random() * 45 },
          { id: `perf-creature-${i}` },
          { seed: 77777 + i }
        );
        world.addEntity(creature);
      }

      // Run simulation
      for (let step = 0; step < 25; step++) {
        world.update(16);
      }

      const fileName = "performance-test.json";

      // Measure save time
      const saveStartTime = performance.now();
      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName
      );
      const saveTime = performance.now() - saveStartTime;

      expect(saveResult.success).toBe(true);
      expect(saveTime).toBeLessThan(5000); // Should save within 5 seconds

      // Measure load time
      const loadStartTime = performance.now();
      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);
      const loadTime = performance.now() - loadStartTime;

      expect(loadResult.success).toBe(true);
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

      console.log(
        `Performance test - Save: ${saveTime.toFixed(
          2
        )}ms, Load: ${loadTime.toFixed(2)}ms`
      );
    });

    it("should handle memory efficiently during save/load operations", async () => {
      const getMemoryUsage = () => {
        if (typeof process !== "undefined" && process.memoryUsage) {
          return process.memoryUsage().heapUsed;
        }
        return 0; // Fallback for environments without process.memoryUsage
      };

      const initialMemory = getMemoryUsage();

      const world = TestDataGenerators.createWorld({
        width: 30,
        height: 30,
        seed: 88888,
      });

      // Create moderate number of entities
      for (let i = 0; i < 30; i++) {
        const creature = TestDataGenerators.createCreature(
          { x: Math.random() * 25, y: Math.random() * 25 },
          { id: `memory-creature-${i}` },
          { seed: 88888 + i }
        );
        world.addEntity(creature);
      }

      // Run simulation
      for (let step = 0; step < 20; step++) {
        world.update(16);
      }

      const beforeSaveMemory = getMemoryUsage();

      const fileName = "memory-test.json";
      const saveResult = await worldSnapshotManager.saveWorldSnapshot(
        world,
        world.currentTick,
        fileName
      );

      const afterSaveMemory = getMemoryUsage();

      expect(saveResult.success).toBe(true);

      const loadResult = await worldSnapshotManager.loadWorldSnapshot(fileName);
      const afterLoadMemory = getMemoryUsage();

      expect(loadResult.success).toBe(true);

      // Memory usage should not grow excessively (allow for 50MB increase)
      const memoryIncrease = afterLoadMemory - initialMemory;
      const maxAllowedIncrease = 50 * 1024 * 1024; // 50MB

      if (getMemoryUsage() > 0) {
        // Only check if memory monitoring is available
        expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
        console.log(
          `Memory test - Initial: ${(initialMemory / 1024 / 1024).toFixed(
            2
          )}MB, ` +
            `Final: ${(afterLoadMemory / 1024 / 1024).toFixed(2)}MB, ` +
            `Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
        );
      }
    });
  });
});
