/**
 * Neural Network Persistence System
 *
 * Provides specialized save/load functionality for neural networks including:
 * - Efficient serialization/deserialization
 * - Compression for large networks
 * - Batch operations for populations
 * - Version compatibility
 * - Metadata management
 */

import { INeuralNetwork, INeuralNetworkConfig } from "../neural/types";
import { NeuralNetwork } from "../neural/neural-network";
import {
  IPersistenceManager,
  DataType,
  FileFormat,
  ISaveConfig,
  ILoadConfig,
  ISaveResult,
  ILoadResult,
  IFileMetadata,
  ISerializable,
} from "./types";
import {
  compressData,
  decompressData,
  createFileMetadata,
  calculateChecksum,
  getCurrentTimestamp,
} from "./utils";

/**
 * Neural network-specific metadata
 */
export interface INeuralNetworkMetadata extends IFileMetadata {
  /** Neural network configuration summary */
  networkConfig: {
    inputSize: number;
    outputSize: number;
    hiddenLayerCount: number;
    totalParameters: number;
    activationTypes: string[];
  };
  /** Training information */
  trainingInfo?: {
    generation?: number;
    fitness?: number;
    parentIds?: string[];
    mutationRate?: number;
  };
  /** Compression information */
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

/**
 * Serializable wrapper for neural networks
 */
export class SerializableNeuralNetwork implements ISerializable {
  constructor(
    public network: INeuralNetwork,
    public metadata: Partial<INeuralNetworkMetadata["trainingInfo"]> = {}
  ) {}

  serialize(): Record<string, any> {
    const networkData = JSON.parse(this.network.serialize());

    return {
      version: "1.0.0",
      networkData,
      metadata: this.metadata || {},
      serializedAt: getCurrentTimestamp(),
    };
  }

  deserialize(data: Record<string, any>): void {
    if (!data.networkData) {
      throw new Error("Invalid neural network data: missing networkData");
    }

    this.network.deserialize(JSON.stringify(data.networkData));
    this.metadata = data.metadata || {};
  }

  /**
   * Create a new neural network from configuration
   */
  static fromConfig(config: INeuralNetworkConfig): SerializableNeuralNetwork {
    const network = new NeuralNetwork(config);
    return new SerializableNeuralNetwork(network, {});
  }
}

/**
 * Batch operation for saving multiple neural networks
 */
export interface IBatchSaveConfig extends ISaveConfig {
  /** Whether to save networks in parallel */
  parallel?: boolean;
  /** Maximum concurrent saves (default: 5) */
  maxConcurrency?: number;
  /** File naming pattern with {index} placeholder */
  fileNamePattern?: string;
  /** Whether to create a batch manifest file */
  createManifest?: boolean;
}

/**
 * Batch operation result
 */
export interface IBatchSaveResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: ISaveResult[];
  manifestPath?: string;
  error?: string;
}

/**
 * Batch operation for loading multiple neural networks
 */
export interface IBatchLoadConfig extends ILoadConfig {
  /** Whether to load networks in parallel */
  parallel?: boolean;
  /** Maximum concurrent loads (default: 5) */
  maxConcurrency?: number;
  /** File name patterns to match */
  filePattern?: string;
  /** Whether to validate all networks before returning */
  validateAll?: boolean;
}

/**
 * Batch load result
 */
export interface IBatchLoadResult<T> {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  networks: T[];
  error?: string;
}

/**
 * Neural Network Persistence Manager
 *
 * Provides specialized functionality for saving/loading neural networks
 * with optimizations for evolution and training scenarios.
 */
export class NeuralNetworkPersistenceManager {
  private persistenceManager: IPersistenceManager;
  private readonly NEURAL_NETWORK_VERSION = "1.0.0";

  constructor(persistenceManager: IPersistenceManager) {
    this.persistenceManager = persistenceManager;
  }

  /**
   * Save a single neural network
   */
  async saveNetwork(
    network: INeuralNetwork,
    fileName: string,
    config: ISaveConfig & {
      trainingInfo?: INeuralNetworkMetadata["trainingInfo"];
    } = {}
  ): Promise<ISaveResult> {
    const serializableNetwork = new SerializableNeuralNetwork(
      network,
      config.trainingInfo
    );

    // Use compression by default for neural networks
    const saveConfig: ISaveConfig = {
      format: FileFormat.JSON,
      compress: true,
      includeMetadata: true,
      validateBeforeSave: true,
      ...config,
    };

    return this.persistenceManager.save(
      serializableNetwork,
      fileName,
      DataType.NEURAL_NETWORK,
      saveConfig
    );
  }

  /**
   * Load a single neural network
   */
  async loadNetwork(
    fileName: string,
    config: ILoadConfig = {}
  ): Promise<ILoadResult<INeuralNetwork>> {
    const loadResult =
      await this.persistenceManager.load<SerializableNeuralNetwork>(
        fileName,
        DataType.NEURAL_NETWORK,
        config
      );

    if (!loadResult.success || !loadResult.data) {
      return {
        success: false,
        data: undefined,
        metadata: loadResult.metadata,
        error: loadResult.error || "Failed to load neural network",
      };
    }

    // The persistence manager returns raw data, we need to create a SerializableNeuralNetwork
    // and deserialize the data into it
    try {
      const rawData = loadResult.data as any;

      // Extract the network configuration from the serialized data
      if (!rawData.networkData || !rawData.networkData.config) {
        throw new Error("Invalid neural network data format");
      }

      // Create a new network with the loaded configuration
      const networkConfig = rawData.networkData.config;
      const network = new NeuralNetwork(networkConfig);
      const serializableNetwork = new SerializableNeuralNetwork(
        network,
        rawData.metadata || {}
      );

      // Deserialize the complete data
      serializableNetwork.deserialize(rawData);

      return {
        success: true,
        data: serializableNetwork.network,
        metadata: loadResult.metadata,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        metadata: loadResult.metadata,
        error: `Failed to deserialize neural network: ${error}`,
      };
    }
  }

  /**
   * Save multiple neural networks in batch
   */
  async saveNetworkBatch(
    networks: INeuralNetwork[],
    batchName: string,
    config: IBatchSaveConfig = {}
  ): Promise<IBatchSaveResult> {
    const {
      parallel = true,
      maxConcurrency = 5,
      fileNamePattern = `${batchName}_{index}.json`,
      createManifest = true,
      ...saveConfig
    } = config;

    const results: ISaveResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    if (parallel) {
      // Process networks in batches to control concurrency
      const batches = this.createBatches(networks, maxConcurrency);

      for (const batch of batches) {
        const batchPromises = batch.map((network, batchIndex) => {
          const globalIndex =
            batches.indexOf(batch) * maxConcurrency + batchIndex;
          const fileName = fileNamePattern.replace(
            "{index}",
            globalIndex.toString().padStart(4, "0")
          );

          return this.saveNetwork(network, fileName, saveConfig);
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        successCount += batchResults.filter((r) => r.success).length;
        failedCount += batchResults.filter((r) => !r.success).length;
      }
    } else {
      // Sequential processing
      for (let i = 0; i < networks.length; i++) {
        const fileName = fileNamePattern.replace(
          "{index}",
          i.toString().padStart(4, "0")
        );
        const result = await this.saveNetwork(
          networks[i],
          fileName,
          saveConfig
        );
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }
    }

    let manifestPath: string | undefined;
    if (createManifest && successCount > 0) {
      manifestPath = await this.createBatchManifest(
        batchName,
        results.filter((r) => r.success)
      );
    }

    return {
      success: failedCount === 0,
      totalCount: networks.length,
      successCount,
      failedCount,
      results,
      manifestPath,
      error:
        failedCount > 0 ? `${failedCount} networks failed to save` : undefined,
    };
  }

  /**
   * Load multiple neural networks in batch
   */
  async loadNetworkBatch(
    fileNames: string[],
    config: IBatchLoadConfig = {}
  ): Promise<IBatchLoadResult<INeuralNetwork>> {
    const { parallel = true, maxConcurrency = 5, validateAll = false } = config;

    const networks: INeuralNetwork[] = [];
    let successCount = 0;
    let failedCount = 0;

    if (parallel) {
      // Process files in batches to control concurrency
      const batches = this.createBatches(fileNames, maxConcurrency);

      for (const batch of batches) {
        const batchPromises = batch.map((fileName) =>
          this.loadNetwork(fileName, config)
        );
        const batchResults = await Promise.all(batchPromises);

        for (const result of batchResults) {
          if (result.success && result.data) {
            networks.push(result.data);
            successCount++;
          } else {
            failedCount++;
          }
        }
      }
    } else {
      // Sequential processing
      for (const fileName of fileNames) {
        const result = await this.loadNetwork(fileName, config);

        if (result.success && result.data) {
          networks.push(result.data);
          successCount++;
        } else {
          failedCount++;
        }
      }
    }

    // Validate all networks if requested
    if (validateAll && networks.length > 0) {
      const validationErrors = this.validateNetworkBatch(networks);
      if (validationErrors.length > 0) {
        return {
          success: false,
          totalCount: fileNames.length,
          successCount: 0,
          failedCount: fileNames.length,
          networks: [],
          error: `Validation failed: ${validationErrors.join(", ")}`,
        };
      }
    }

    return {
      success: failedCount === 0,
      totalCount: fileNames.length,
      successCount,
      failedCount,
      networks,
      error:
        failedCount > 0 ? `${failedCount} networks failed to load` : undefined,
    };
  }

  /**
   * Get enhanced metadata for a neural network file
   */
  async getNetworkMetadata(
    fileName: string
  ): Promise<INeuralNetworkMetadata | null> {
    const baseMetadata = await this.persistenceManager.getMetadata(
      fileName,
      DataType.NEURAL_NETWORK
    );

    if (!baseMetadata) {
      return null;
    }

    // Load the network to extract configuration details
    const loadResult = await this.loadNetwork(fileName);

    if (!loadResult.success || !loadResult.data) {
      return baseMetadata as INeuralNetworkMetadata;
    }

    const network = loadResult.data;
    const config = network.config;

    // Calculate total parameters
    const totalParameters = this.calculateNetworkParameters(network);

    // Extract activation types
    const activationTypes = [
      ...config.hiddenLayers.map((layer) => layer.activation),
      config.outputLayer.activation,
    ];

    const enhancedMetadata: INeuralNetworkMetadata = {
      ...baseMetadata,
      networkConfig: {
        inputSize: config.inputSize,
        outputSize: config.outputLayer.size,
        hiddenLayerCount: config.hiddenLayers.length,
        totalParameters,
        activationTypes,
      },
    };

    return enhancedMetadata;
  }

  /**
   * List all neural network files with metadata
   */
  async listNetworks(): Promise<
    Array<{ fileName: string; metadata: INeuralNetworkMetadata | null }>
  > {
    const fileNames = await this.persistenceManager.list(
      DataType.NEURAL_NETWORK
    );

    const networkFiles = await Promise.all(
      fileNames.map(async (fileName) => ({
        fileName,
        metadata: await this.getNetworkMetadata(fileName),
      }))
    );

    return networkFiles;
  }

  /**
   * Delete a neural network file
   */
  async deleteNetwork(fileName: string): Promise<boolean> {
    return this.persistenceManager.delete(fileName, DataType.NEURAL_NETWORK);
  }

  /**
   * Check if a neural network file exists
   */
  async networkExists(fileName: string): Promise<boolean> {
    return this.persistenceManager.exists(fileName, DataType.NEURAL_NETWORK);
  }

  /**
   * Validate file integrity
   */
  async validateNetworkFile(fileName: string): Promise<boolean> {
    return this.persistenceManager.validateFile(
      fileName,
      DataType.NEURAL_NETWORK
    );
  }

  /**
   * Create batches of items for controlled concurrency
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Create a manifest file for a batch save operation
   */
  private async createBatchManifest(
    batchName: string,
    results: ISaveResult[]
  ): Promise<string> {
    const manifest = {
      batchName,
      createdAt: getCurrentTimestamp(),
      totalNetworks: results.length,
      networks: results.map((result, index) => ({
        index,
        fileName: result.filePath.split(/[/\\]/).pop() || "",
        filePath: result.filePath,
        size: result.metadata.size,
        checksum: result.metadata.checksum,
      })),
    };

    const manifestFileName = `${batchName}_manifest.json`;
    const manifestData = JSON.stringify(manifest, null, 2);

    // Save manifest in the neural network directory
    const manifestPath = this.persistenceManager.getDirectoryPath(
      DataType.NEURAL_NETWORK
    );
    const fs = await import("fs/promises");
    const path = await import("path");
    const fullManifestPath = path.join(manifestPath, manifestFileName);

    await fs.writeFile(fullManifestPath, manifestData);

    return fullManifestPath;
  }

  /**
   * Calculate total number of parameters in a neural network
   */
  private calculateNetworkParameters(network: INeuralNetwork): number {
    let totalParams = 0;

    const layers = network.layers;

    for (let i = 0; i < layers.length - 1; i++) {
      const currentLayer = layers[i];
      const nextLayer = layers[i + 1];

      // Count weights (connections between layers)
      totalParams += currentLayer.config.size * nextLayer.config.size;

      // Count biases in the next layer
      if (nextLayer.config.useBias) {
        totalParams += nextLayer.config.size;
      }
    }

    return totalParams;
  }

  /**
   * Validate a batch of networks for consistency
   */
  private validateNetworkBatch(networks: INeuralNetwork[]): string[] {
    const errors: string[] = [];

    if (networks.length === 0) {
      return ["No networks to validate"];
    }

    const firstConfig = networks[0].config;

    for (let i = 1; i < networks.length; i++) {
      const config = networks[i].config;

      if (config.inputSize !== firstConfig.inputSize) {
        errors.push(
          `Network ${i}: Input size mismatch (${config.inputSize} vs ${firstConfig.inputSize})`
        );
      }

      if (config.outputLayer.size !== firstConfig.outputLayer.size) {
        errors.push(
          `Network ${i}: Output size mismatch (${config.outputLayer.size} vs ${firstConfig.outputLayer.size})`
        );
      }

      if (config.hiddenLayers.length !== firstConfig.hiddenLayers.length) {
        errors.push(
          `Network ${i}: Hidden layer count mismatch (${config.hiddenLayers.length} vs ${firstConfig.hiddenLayers.length})`
        );
      }
    }

    return errors;
  }
}

/**
 * Factory function to create a neural network persistence manager
 */
export function createNeuralNetworkPersistenceManager(
  persistenceManager: IPersistenceManager
): NeuralNetworkPersistenceManager {
  return new NeuralNetworkPersistenceManager(persistenceManager);
}
