/**
 * Neural Network Persistence System Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
  NeuralNetworkPersistenceManager,
  createNeuralNetworkPersistenceManager,
  SerializableNeuralNetwork,
  INeuralNetworkMetadata,
  IBatchSaveResult,
  IBatchLoadResult,
} from "../../src/persistence/neural-network-persistence";
import {
  createTestPersistenceManager,
  DataType,
  FileFormat,
} from "../../src/persistence";
import { NeuralNetwork } from "../../src/neural/neural-network";
import { ActivationType, INeuralNetworkConfig } from "../../src/neural/types";

describe("Neural Network Persistence System", () => {
  let tempDir: string;
  let nnPersistenceManager: NeuralNetworkPersistenceManager;

  // Test neural network configurations
  const simpleConfig: INeuralNetworkConfig = {
    inputSize: 5,
    hiddenLayers: [
      { size: 8, activation: ActivationType.SIGMOID, useBias: true },
      { size: 6, activation: ActivationType.RELU, useBias: true },
    ],
    outputLayer: { size: 3, activation: ActivationType.SIGMOID, useBias: true },
    weightRange: {
      min: -0.5,
      max: 0.5,
    },
    seed: 12345,
  };

  const complexConfig: INeuralNetworkConfig = {
    inputSize: 154,
    hiddenLayers: [
      { size: 64, activation: ActivationType.RELU, useBias: true },
      { size: 32, activation: ActivationType.RELU, useBias: true },
      { size: 16, activation: ActivationType.SIGMOID, useBias: false },
    ],
    outputLayer: { size: 8, activation: ActivationType.SIGMOID, useBias: true },
    weightRange: {
      min: -1.0,
      max: 1.0,
    },
    seed: 67890,
  };

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "evo-nn-persistence-test-")
    );

    const basePersistenceManager = createTestPersistenceManager(tempDir);
    await basePersistenceManager.initialize();

    nnPersistenceManager = createNeuralNetworkPersistenceManager(
      basePersistenceManager
    );
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("SerializableNeuralNetwork", () => {
    it("should wrap and serialize neural networks correctly", () => {
      const network = new NeuralNetwork(simpleConfig);
      const serializableNetwork = new SerializableNeuralNetwork(network, {
        generation: 5,
        fitness: 0.75,
        parentIds: ["parent1", "parent2"],
      });

      const serialized = serializableNetwork.serialize();

      expect(serialized).toHaveProperty("version", "1.0.0");
      expect(serialized).toHaveProperty("networkData");
      expect(serialized).toHaveProperty("metadata");
      expect(serialized).toHaveProperty("serializedAt");
      expect(serialized.metadata).toEqual({
        generation: 5,
        fitness: 0.75,
        parentIds: ["parent1", "parent2"],
      });
    });

    it("should deserialize neural networks correctly", () => {
      const originalNetwork = new NeuralNetwork(simpleConfig);
      const serializableNetwork = new SerializableNeuralNetwork(
        originalNetwork
      );

      const serialized = serializableNetwork.serialize();

      // Create new network to deserialize into
      const newNetwork = new NeuralNetwork(simpleConfig);
      const newSerializableNetwork = new SerializableNeuralNetwork(newNetwork);

      newSerializableNetwork.deserialize(serialized);

      // Verify the networks have the same configuration
      expect(newSerializableNetwork.network.config).toEqual(
        originalNetwork.config
      );
    });

    it("should create from config using static method", () => {
      const serializableNetwork =
        SerializableNeuralNetwork.fromConfig(simpleConfig);

      expect(serializableNetwork.network).toBeDefined();
      expect(serializableNetwork.network.config).toEqual(simpleConfig);
      expect(serializableNetwork.metadata).toEqual({});
    });

    it("should handle invalid deserialize data", () => {
      const network = new NeuralNetwork(simpleConfig);
      const serializableNetwork = new SerializableNeuralNetwork(network);

      expect(() => {
        serializableNetwork.deserialize({ invalid: "data" });
      }).toThrow("Invalid neural network data: missing networkData");
    });
  });

  describe("Single Network Operations", () => {
    it("should save and load a neural network successfully", async () => {
      const network = new NeuralNetwork(simpleConfig);
      const fileName = "test-network.json";

      // Save the network
      const saveResult = await nnPersistenceManager.saveNetwork(
        network,
        fileName,
        {
          trainingInfo: {
            generation: 10,
            fitness: 0.85,
            mutationRate: 0.1,
          },
        }
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.filePath).toContain(fileName);
      expect(saveResult.metadata.dataType).toBe(DataType.NEURAL_NETWORK);
      expect(saveResult.metadata.format).toBe(FileFormat.JSON);
      expect(saveResult.metadata.compressed).toBe(true);

      // Load the network
      const loadResult = await nnPersistenceManager.loadNetwork(fileName);

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();
      expect(loadResult.data!.config).toEqual(simpleConfig);

      // Verify the network produces the same outputs for the same inputs
      const testInput = [0.1, 0.2, 0.3, 0.4, 0.5];
      const originalOutput = network.process(testInput);
      const loadedOutput = loadResult.data!.process(testInput);

      expect(loadedOutput).toEqual(originalOutput);
    });

    it("should handle network file existence checks", async () => {
      const network = new NeuralNetwork(simpleConfig);
      const fileName = "existence-test.json";

      // Check non-existent file
      expect(await nnPersistenceManager.networkExists(fileName)).toBe(false);

      // Save network
      await nnPersistenceManager.saveNetwork(network, fileName);

      // Check existing file
      expect(await nnPersistenceManager.networkExists(fileName)).toBe(true);
    });

    it("should delete network files", async () => {
      const network = new NeuralNetwork(simpleConfig);
      const fileName = "delete-test.json";

      // Save and verify existence
      await nnPersistenceManager.saveNetwork(network, fileName);
      expect(await nnPersistenceManager.networkExists(fileName)).toBe(true);

      // Delete and verify removal
      const deleteResult = await nnPersistenceManager.deleteNetwork(fileName);
      expect(deleteResult).toBe(true);
      expect(await nnPersistenceManager.networkExists(fileName)).toBe(false);
    });

    it("should validate network file integrity", async () => {
      const network = new NeuralNetwork(simpleConfig);
      const fileName = "integrity-test.json";

      // Save network
      await nnPersistenceManager.saveNetwork(network, fileName);

      // Validate integrity
      const isValid = await nnPersistenceManager.validateNetworkFile(fileName);
      expect(isValid).toBe(true);
    });

    it("should get enhanced metadata for networks", async () => {
      const network = new NeuralNetwork(complexConfig);
      const fileName = "metadata-test.json";

      // Save network with training info
      await nnPersistenceManager.saveNetwork(network, fileName, {
        trainingInfo: {
          generation: 25,
          fitness: 0.92,
          parentIds: ["parent1", "parent2"],
          mutationRate: 0.05,
        },
      });

      // Get enhanced metadata
      const metadata = await nnPersistenceManager.getNetworkMetadata(fileName);

      expect(metadata).toBeDefined();
      expect(metadata!.networkConfig).toEqual({
        inputSize: 154,
        outputSize: 8,
        hiddenLayerCount: 3,
        totalParameters: expect.any(Number),
        activationTypes: ["relu", "relu", "sigmoid", "sigmoid"],
      });
    });
  });

  describe("Batch Operations", () => {
    it("should save multiple networks in batch (parallel)", async () => {
      const networks = [
        new NeuralNetwork(simpleConfig),
        new NeuralNetwork(simpleConfig),
        new NeuralNetwork(simpleConfig),
      ];

      const batchResult = await nnPersistenceManager.saveNetworkBatch(
        networks,
        "batch-test",
        {
          parallel: true,
          maxConcurrency: 2,
          createManifest: true,
        }
      );

      expect(batchResult.success).toBe(true);
      expect(batchResult.totalCount).toBe(3);
      expect(batchResult.successCount).toBe(3);
      expect(batchResult.failedCount).toBe(0);
      expect(batchResult.results).toHaveLength(3);
      expect(batchResult.manifestPath).toBeDefined();

      // Verify all files were created
      for (let i = 0; i < 3; i++) {
        const fileName = `batch-test_${i.toString().padStart(4, "0")}.json`;
        expect(await nnPersistenceManager.networkExists(fileName)).toBe(true);
      }
    });

    it("should save multiple networks in batch (sequential)", async () => {
      const networks = [
        new NeuralNetwork(simpleConfig),
        new NeuralNetwork(simpleConfig),
      ];

      const batchResult = await nnPersistenceManager.saveNetworkBatch(
        networks,
        "sequential-test",
        {
          parallel: false,
          createManifest: false,
        }
      );

      expect(batchResult.success).toBe(true);
      expect(batchResult.totalCount).toBe(2);
      expect(batchResult.successCount).toBe(2);
      expect(batchResult.manifestPath).toBeUndefined();
    });

    it("should load multiple networks in batch", async () => {
      // First save some networks
      const originalNetworks = [
        new NeuralNetwork(simpleConfig),
        new NeuralNetwork(simpleConfig),
        new NeuralNetwork(simpleConfig),
      ];

      await nnPersistenceManager.saveNetworkBatch(
        originalNetworks,
        "load-test"
      );

      // Load them back
      const fileNames = [
        "load-test_0000.json",
        "load-test_0001.json",
        "load-test_0002.json",
      ];

      const loadResult = await nnPersistenceManager.loadNetworkBatch(
        fileNames,
        {
          parallel: true,
          validateAll: true,
        }
      );

      expect(loadResult.success).toBe(true);
      expect(loadResult.totalCount).toBe(3);
      expect(loadResult.successCount).toBe(3);
      expect(loadResult.networks).toHaveLength(3);

      // Verify all networks are properly loaded
      for (const network of loadResult.networks) {
        expect(network.config).toEqual(simpleConfig);
      }
    });

    it("should handle batch validation errors", async () => {
      // Save networks with different configurations
      const network1 = new NeuralNetwork(simpleConfig);
      const network2 = new NeuralNetwork(complexConfig);

      await nnPersistenceManager.saveNetwork(network1, "different1.json");
      await nnPersistenceManager.saveNetwork(network2, "different2.json");

      // Try to load as batch with validation
      const loadResult = await nnPersistenceManager.loadNetworkBatch(
        ["different1.json", "different2.json"],
        { validateAll: true }
      );

      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain("Validation failed");
    });

    it("should use custom file naming patterns", async () => {
      const networks = [
        new NeuralNetwork(simpleConfig),
        new NeuralNetwork(simpleConfig),
      ];

      const batchResult = await nnPersistenceManager.saveNetworkBatch(
        networks,
        "custom",
        {
          fileNamePattern: "custom_network_{index}_v1.json",
        }
      );

      expect(batchResult.success).toBe(true);
      expect(
        await nnPersistenceManager.networkExists("custom_network_0000_v1.json")
      ).toBe(true);
      expect(
        await nnPersistenceManager.networkExists("custom_network_0001_v1.json")
      ).toBe(true);
    });
  });

  describe("Network Listing and Management", () => {
    it("should list all neural networks with metadata", async () => {
      // Save a few test networks
      const network1 = new NeuralNetwork(simpleConfig);
      const network2 = new NeuralNetwork(complexConfig);

      await nnPersistenceManager.saveNetwork(network1, "list-test-1.json");
      await nnPersistenceManager.saveNetwork(network2, "list-test-2.json");

      const networkList = await nnPersistenceManager.listNetworks();

      expect(networkList).toHaveLength(2);

      const network1Entry = networkList.find(
        (n) => n.fileName === "list-test-1.json"
      );
      const network2Entry = networkList.find(
        (n) => n.fileName === "list-test-2.json"
      );

      expect(network1Entry).toBeDefined();
      expect(network2Entry).toBeDefined();
      expect(network1Entry!.metadata?.networkConfig.inputSize).toBe(5);
      expect(network2Entry!.metadata?.networkConfig.inputSize).toBe(154);
    });
  });

  describe("Error Handling", () => {
    it("should handle load failures gracefully", async () => {
      const loadResult = await nnPersistenceManager.loadNetwork(
        "non-existent.json"
      );

      expect(loadResult.success).toBe(false);
      expect(loadResult.data).toBeUndefined();
      expect(loadResult.error).toBeDefined();
    });

    it("should handle empty batch operations", async () => {
      const saveResult = await nnPersistenceManager.saveNetworkBatch(
        [],
        "empty-batch"
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.totalCount).toBe(0);
      expect(saveResult.successCount).toBe(0);

      const loadResult = await nnPersistenceManager.loadNetworkBatch([]);

      expect(loadResult.success).toBe(true);
      expect(loadResult.totalCount).toBe(0);
      expect(loadResult.networks).toHaveLength(0);
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle large batches efficiently", async () => {
      const largeNetworkCount = 20;
      const networks = Array.from(
        { length: largeNetworkCount },
        () => new NeuralNetwork(simpleConfig)
      );

      const startTime = Date.now();

      const saveResult = await nnPersistenceManager.saveNetworkBatch(
        networks,
        "large-batch",
        { maxConcurrency: 5 }
      );

      const saveTime = Date.now() - startTime;

      expect(saveResult.success).toBe(true);
      expect(saveResult.totalCount).toBe(largeNetworkCount);
      expect(saveResult.successCount).toBe(largeNetworkCount);

      // Performance check: should complete in reasonable time (less than 10 seconds)
      expect(saveTime).toBeLessThan(10000);

      // Load them back
      const fileNames = Array.from(
        { length: largeNetworkCount },
        (_, i) => `large-batch_${i.toString().padStart(4, "0")}.json`
      );

      const loadStartTime = Date.now();
      const loadResult = await nnPersistenceManager.loadNetworkBatch(fileNames);
      const loadTime = Date.now() - loadStartTime;

      expect(loadResult.success).toBe(true);
      expect(loadResult.networks).toHaveLength(largeNetworkCount);
      expect(loadTime).toBeLessThan(10000);
    });

    it("should calculate network parameters correctly", async () => {
      const network = new NeuralNetwork(complexConfig);
      const fileName = "params-test.json";

      await nnPersistenceManager.saveNetwork(network, fileName);
      const metadata = await nnPersistenceManager.getNetworkMetadata(fileName);

      // Expected parameters:
      // Input to Hidden1: 154 * 64 = 9,856 weights + 64 biases = 9,920
      // Hidden1 to Hidden2: 64 * 32 = 2,048 weights + 32 biases = 2,080
      // Hidden2 to Hidden3: 32 * 16 = 512 weights + 0 biases (useBias: false) = 512
      // Hidden3 to Output: 16 * 8 = 128 weights + 8 biases = 136
      // Total: 9,920 + 2,080 + 512 + 136 = 12,648

      expect(metadata!.networkConfig.totalParameters).toBe(12648);
    });

    it("should preserve network determinism through save/load", async () => {
      const network = new NeuralNetwork(simpleConfig);
      const testInput = [0.1, 0.2, 0.3, 0.4, 0.5];

      // Get original output
      const originalOutput = network.process(testInput);

      // Save and load
      await nnPersistenceManager.saveNetwork(network, "determinism-test.json");
      const loadResult = await nnPersistenceManager.loadNetwork(
        "determinism-test.json"
      );

      expect(loadResult.success).toBe(true);

      // Get output from loaded network
      const loadedOutput = loadResult.data!.process(testInput);

      // Should be identical (deterministic)
      expect(loadedOutput).toEqual(originalOutput);

      // Multiple saves and loads should maintain determinism
      await nnPersistenceManager.saveNetwork(
        loadResult.data!,
        "determinism-test-2.json"
      );
      const secondLoadResult = await nnPersistenceManager.loadNetwork(
        "determinism-test-2.json"
      );

      const secondLoadOutput = secondLoadResult.data!.process(testInput);
      expect(secondLoadOutput).toEqual(originalOutput);
    });
  });
});
