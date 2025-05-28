/**
 * Core persistence manager implementation
 */

import * as fs from "fs/promises";
import * as path from "path";
import {
  IPersistenceManager,
  IDirectoryConfig,
  ISaveConfig,
  ILoadConfig,
  ISaveResult,
  ILoadResult,
  IFileMetadata,
  ISerializable,
  DataType,
  FileFormat,
} from "./types";
import {
  ensureDirectoryExists,
  fileExists,
  getFileSize,
  serializeData,
  deserializeData,
  createFileMetadata,
  validateFileIntegrity,
  normalizePath,
  getSafeFileName,
  getFileExtension,
  getMetadataFileName,
  compressData,
  decompressData,
} from "./utils";

/**
 * Default directory configuration for Windows
 */
const DEFAULT_DIRECTORY_CONFIG: IDirectoryConfig = {
  baseDirectory: "C:\\SimData",
  creatures: "Creatures",
  worlds: "Worlds",
  snapshots: "Snapshots",
  scenarios: "Scenarios",
  species: "Species",
};

/**
 * Current persistence system version
 */
const PERSISTENCE_VERSION = "1.0.0";

/**
 * Main persistence manager implementation
 */
export class PersistenceManager implements IPersistenceManager {
  private directoryConfig: IDirectoryConfig;
  private initialized: boolean = false;

  constructor() {
    this.directoryConfig = { ...DEFAULT_DIRECTORY_CONFIG };
  }

  /**
   * Initialize the persistence system
   */
  async initialize(config?: Partial<IDirectoryConfig>): Promise<void> {
    if (config) {
      this.directoryConfig = { ...this.directoryConfig, ...config };
    }

    // Ensure all directories exist
    await this.createDirectoryStructure();
    this.initialized = true;
  }

  /**
   * Save data to file
   */
  async save<T extends ISerializable>(
    data: T,
    fileName: string,
    dataType: DataType,
    config: ISaveConfig = { format: FileFormat.JSON }
  ): Promise<ISaveResult> {
    this.ensureInitialized();

    try {
      // Validate before save if requested
      if (config.validateBeforeSave) {
        if (!data || typeof data.serialize !== "function") {
          return {
            success: false,
            filePath: "",
            metadata: {} as IFileMetadata,
            error: "Data must implement ISerializable interface",
          };
        }
      }

      // Serialize the data
      const serializedData = data.serialize();
      let fileData = serializeData(serializedData, config.format);

      // Compress if requested
      if (config.compress) {
        fileData = await compressData(fileData);
      }

      // Create file paths
      const safeFileName = getSafeFileName(fileName);
      const extension = getFileExtension(config.format);
      const fullFileName = safeFileName.endsWith(extension)
        ? safeFileName
        : `${safeFileName}${extension}`;
      const directoryPath = this.getDirectoryPath(dataType);
      const filePath = normalizePath(path.join(directoryPath, fullFileName));

      // Ensure directory exists
      await ensureDirectoryExists(directoryPath);

      // Create metadata
      const metadata = createFileMetadata(
        fileData,
        config.format,
        dataType,
        PERSISTENCE_VERSION,
        config.compress || false
      );

      // Write data file
      await fs.writeFile(filePath, fileData);

      // Write metadata file if requested
      if (config.includeMetadata !== false) {
        const metadataPath = normalizePath(
          path.join(directoryPath, getMetadataFileName(fullFileName))
        );
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      }

      return {
        success: true,
        filePath,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        filePath: "",
        metadata: {} as IFileMetadata,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Load data from file
   */
  async load<T>(
    fileName: string,
    dataType: DataType,
    config: ILoadConfig = {}
  ): Promise<ILoadResult<T>> {
    this.ensureInitialized();

    try {
      // Build file path
      const directoryPath = this.getDirectoryPath(dataType);
      const filePath = normalizePath(path.join(directoryPath, fileName));

      // Check if file exists
      if (!(await fileExists(filePath))) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      // Load metadata if available
      const metadataPath = normalizePath(
        path.join(directoryPath, getMetadataFileName(fileName))
      );
      let metadata: IFileMetadata | undefined;

      if (await fileExists(metadataPath)) {
        const metadataContent = await fs.readFile(metadataPath, "utf8");
        metadata = JSON.parse(metadataContent);

        // Validate checksum if requested
        if (config.validateChecksum !== false && metadata) {
          const isValid = await validateFileIntegrity(filePath, metadata);
          if (!isValid) {
            return {
              success: false,
              error: "File integrity validation failed - checksum mismatch",
            };
          }
        }
      }

      // Read file data
      let fileData = await fs.readFile(filePath);

      // Decompress if needed
      if (metadata?.compressed && config.decompress !== false) {
        fileData = await decompressData(fileData);
      }

      // Determine format from metadata or file extension
      const format = metadata?.format || this.getFormatFromExtension(fileName);

      // Deserialize data
      const deserializedData = deserializeData(fileData, format);

      return {
        success: true,
        data: deserializedData as T,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Check if file exists
   */
  async exists(fileName: string, dataType: DataType): Promise<boolean> {
    this.ensureInitialized();
    const directoryPath = this.getDirectoryPath(dataType);
    const filePath = normalizePath(path.join(directoryPath, fileName));
    return fileExists(filePath);
  }

  /**
   * Delete file
   */
  async delete(fileName: string, dataType: DataType): Promise<boolean> {
    this.ensureInitialized();

    try {
      const directoryPath = this.getDirectoryPath(dataType);
      const filePath = normalizePath(path.join(directoryPath, fileName));
      const metadataPath = normalizePath(
        path.join(directoryPath, getMetadataFileName(fileName))
      );

      // Delete main file
      if (await fileExists(filePath)) {
        await fs.unlink(filePath);
      }

      // Delete metadata file if it exists
      if (await fileExists(metadataPath)) {
        await fs.unlink(metadataPath);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files of a specific data type
   */
  async list(dataType: DataType): Promise<string[]> {
    this.ensureInitialized();

    try {
      const directoryPath = this.getDirectoryPath(dataType);

      if (!(await fileExists(directoryPath))) {
        return [];
      }

      const files = await fs.readdir(directoryPath);

      // Filter out metadata files and return only data files
      return files.filter((file) => !file.endsWith(".meta.json"));
    } catch {
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(
    fileName: string,
    dataType: DataType
  ): Promise<IFileMetadata | null> {
    this.ensureInitialized();

    try {
      const directoryPath = this.getDirectoryPath(dataType);
      const metadataPath = normalizePath(
        path.join(directoryPath, getMetadataFileName(fileName))
      );

      if (!(await fileExists(metadataPath))) {
        return null;
      }

      const metadataContent = await fs.readFile(metadataPath, "utf8");
      return JSON.parse(metadataContent);
    } catch {
      return null;
    }
  }

  /**
   * Validate file integrity
   */
  async validateFile(fileName: string, dataType: DataType): Promise<boolean> {
    this.ensureInitialized();

    try {
      const metadata = await this.getMetadata(fileName, dataType);
      if (!metadata) {
        return false;
      }

      const directoryPath = this.getDirectoryPath(dataType);
      const filePath = normalizePath(path.join(directoryPath, fileName));

      return validateFileIntegrity(filePath, metadata);
    } catch {
      return false;
    }
  }

  /**
   * Get directory path for data type
   */
  getDirectoryPath(dataType: DataType): string {
    const baseDir = this.directoryConfig.baseDirectory;

    switch (dataType) {
      case DataType.CREATURE:
        return normalizePath(
          path.join(baseDir, this.directoryConfig.creatures)
        );
      case DataType.WORLD:
        return normalizePath(path.join(baseDir, this.directoryConfig.worlds));
      case DataType.SNAPSHOT:
        return normalizePath(
          path.join(baseDir, this.directoryConfig.snapshots)
        );
      case DataType.SCENARIO:
        return normalizePath(
          path.join(baseDir, this.directoryConfig.scenarios)
        );
      case DataType.SPECIES:
        return normalizePath(path.join(baseDir, this.directoryConfig.species));
      case DataType.NEURAL_NETWORK:
        return normalizePath(
          path.join(baseDir, this.directoryConfig.creatures, "Networks")
        );
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  /**
   * Cleanup and close persistence system
   */
  async cleanup(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Create the directory structure
   */
  private async createDirectoryStructure(): Promise<void> {
    const directories = [
      this.directoryConfig.baseDirectory,
      this.getDirectoryPath(DataType.CREATURE),
      this.getDirectoryPath(DataType.WORLD),
      this.getDirectoryPath(DataType.SNAPSHOT),
      this.getDirectoryPath(DataType.SCENARIO),
      this.getDirectoryPath(DataType.SPECIES),
      this.getDirectoryPath(DataType.NEURAL_NETWORK),
    ];

    for (const dir of directories) {
      await ensureDirectoryExists(dir);
    }
  }

  /**
   * Ensure the persistence manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("PersistenceManager must be initialized before use");
    }
  }

  /**
   * Get file format from file extension
   */
  private getFormatFromExtension(fileName: string): FileFormat {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case ".json":
        return FileFormat.JSON;
      case ".bin":
        return FileFormat.BINARY;
      default:
        return FileFormat.JSON; // Default to JSON
    }
  }
}
