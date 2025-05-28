/**
 * Persistence system types and interfaces
 */

/**
 * Supported file formats for persistence
 */
export enum FileFormat {
  JSON = "json",
  BINARY = "binary",
}

/**
 * Data types that can be persisted
 */
export enum DataType {
  CREATURE = "creature",
  WORLD = "world",
  SNAPSHOT = "snapshot",
  SCENARIO = "scenario",
  SPECIES = "species",
  NEURAL_NETWORK = "neural_network",
}

/**
 * File metadata for version tracking and integrity
 */
export interface IFileMetadata {
  version: string;
  format: FileFormat;
  dataType: DataType;
  checksum: string;
  timestamp: string;
  size: number;
  compressed: boolean;
}

/**
 * Save operation configuration
 */
export interface ISaveConfig {
  format?: FileFormat;
  compress?: boolean;
  includeMetadata?: boolean;
  validateBeforeSave?: boolean;
}

/**
 * Load operation configuration
 */
export interface ILoadConfig {
  validateChecksum?: boolean;
  allowVersionMismatch?: boolean;
  decompress?: boolean;
}

/**
 * Save operation result
 */
export interface ISaveResult {
  success: boolean;
  filePath: string;
  metadata: IFileMetadata;
  error?: string;
}

/**
 * Load operation result
 */
export interface ILoadResult<T> {
  success: boolean;
  data?: T;
  metadata?: IFileMetadata;
  error?: string;
}

/**
 * Directory structure configuration
 */
export interface IDirectoryConfig {
  baseDirectory: string;
  creatures: string;
  worlds: string;
  snapshots: string;
  scenarios: string;
  species: string;
}

/**
 * Serializable data interface
 */
export interface ISerializable {
  serialize(): Record<string, any>;
  deserialize(data: Record<string, any>): void;
}

/**
 * Core persistence manager interface
 */
export interface IPersistenceManager {
  /**
   * Initialize the persistence system
   */
  initialize(config?: Partial<IDirectoryConfig>): Promise<void>;

  /**
   * Save data to file
   */
  save<T extends ISerializable>(
    data: T,
    fileName: string,
    dataType: DataType,
    config?: ISaveConfig
  ): Promise<ISaveResult>;

  /**
   * Load data from file
   */
  load<T>(
    fileName: string,
    dataType: DataType,
    config?: ILoadConfig
  ): Promise<ILoadResult<T>>;

  /**
   * Check if file exists
   */
  exists(fileName: string, dataType: DataType): Promise<boolean>;

  /**
   * Delete file
   */
  delete(fileName: string, dataType: DataType): Promise<boolean>;

  /**
   * List files of a specific data type
   */
  list(dataType: DataType): Promise<string[]>;

  /**
   * Get file metadata
   */
  getMetadata(
    fileName: string,
    dataType: DataType
  ): Promise<IFileMetadata | null>;

  /**
   * Validate file integrity
   */
  validateFile(fileName: string, dataType: DataType): Promise<boolean>;

  /**
   * Get directory path for data type
   */
  getDirectoryPath(dataType: DataType): string;

  /**
   * Cleanup and close persistence system
   */
  cleanup(): Promise<void>;
}

/**
 * Version compatibility information
 */
export interface IVersionInfo {
  current: string;
  supported: string[];
  migrationRequired: boolean;
}

/**
 * Migration handler interface
 */
export interface IMigrationHandler {
  canMigrate(fromVersion: string, toVersion: string): boolean;
  migrate(
    data: Record<string, any>,
    fromVersion: string,
    toVersion: string
  ): Record<string, any>;
}
