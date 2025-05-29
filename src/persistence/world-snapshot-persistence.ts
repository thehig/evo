/**
 * World Snapshot Persistence System
 *
 * Provides specialized save/load functionality for world snapshots including:
 * - Complete world state serialization/deserialization
 * - Incremental snapshot system for efficient storage
 * - Snapshot metadata tracking and validation
 * - Compression for large world snapshots
 * - Snapshot browsing and version management
 */

import { World } from "../world/World";
import {
  WorldSnapshot,
  EntitySnapshot,
  CreatureSnapshot,
  CellSnapshot,
} from "../renderer/types";
import { WorldSnapshotCreator } from "../renderer/WorldSnapshot";
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
 * World snapshot-specific metadata
 */
export interface IWorldSnapshotMetadata extends IFileMetadata {
  /** World snapshot information */
  snapshotInfo: {
    tick: number;
    worldDimensions: { width: number; height: number };
    entityCount: number;
    creatureCount: number;
    livingCreatureCount: number;
    averageEnergy: number;
    worldDensity: number;
  };
  /** Incremental snapshot information */
  incrementalInfo?: {
    baseSnapshotId?: string;
    changeCount: number;
    compressionRatio: number;
    isBaseline: boolean;
  };
  /** Performance information */
  performanceInfo?: {
    serializationTimeMs: number;
    compressionTimeMs: number;
    totalTimeMs: number;
  };
}

/**
 * Serializable wrapper for world snapshots
 */
export class SerializableWorldSnapshot implements ISerializable {
  constructor(
    public snapshot: WorldSnapshot,
    public metadata: Partial<IWorldSnapshotMetadata["snapshotInfo"]> = {}
  ) {}

  serialize(): Record<string, any> {
    return {
      version: "1.0.0",
      snapshotData: this.snapshot,
      metadata: this.metadata || {},
      serializedAt: getCurrentTimestamp(),
    };
  }

  deserialize(data: Record<string, any>): void {
    if (!data.snapshotData) {
      throw new Error("Invalid world snapshot data: missing snapshotData");
    }

    this.snapshot = data.snapshotData;
    this.metadata = data.metadata || {};
  }

  /**
   * Create a snapshot from a world instance
   */
  static fromWorld(world: World, tick: number): SerializableWorldSnapshot {
    const snapshot = WorldSnapshotCreator.createSnapshot(world, tick);
    return new SerializableWorldSnapshot(snapshot, {
      tick,
      worldDimensions: { width: world.width, height: world.height },
      entityCount: snapshot.entities.length,
      creatureCount: snapshot.creatures.length,
      livingCreatureCount: snapshot.creatures.filter((c) => c.alive).length,
      averageEnergy: snapshot.statistics.averageEnergy,
      worldDensity:
        typeof snapshot.statistics.worldDensity === "number"
          ? snapshot.statistics.worldDensity
          : 0,
    });
  }
}

/**
 * Incremental snapshot for efficient storage
 */
export interface IIncrementalSnapshot {
  /** Base snapshot ID this increment references */
  baseSnapshotId: string;
  /** Tick number for this increment */
  tick: number;
  /** Entity changes (added, modified, removed) */
  entityChanges: {
    added: EntitySnapshot[];
    modified: { id: string; changes: Partial<EntitySnapshot> }[];
    removed: string[];
  };
  /** Creature changes */
  creatureChanges: {
    added: CreatureSnapshot[];
    modified: { id: string; changes: Partial<CreatureSnapshot> }[];
    removed: string[];
  };
  /** Cell changes */
  cellChanges: {
    added: CellSnapshot[];
    modified: {
      position: { x: number; y: number };
      changes: Partial<CellSnapshot>;
    }[];
    removed: { x: number; y: number }[];
  };
  /** Updated statistics */
  statistics: WorldSnapshot["statistics"];
  /** Metadata about the changes */
  changeMetadata: {
    totalChanges: number;
    significantChanges: number;
    changePercentage: number;
  };
}

/**
 * Serializable incremental snapshot
 */
export class SerializableIncrementalSnapshot implements ISerializable {
  constructor(public incrementalSnapshot: IIncrementalSnapshot) {}

  serialize(): Record<string, any> {
    return {
      version: "1.0.0",
      incrementalData: this.incrementalSnapshot,
      serializedAt: getCurrentTimestamp(),
    };
  }

  deserialize(data: Record<string, any>): void {
    if (!data.incrementalData) {
      throw new Error(
        "Invalid incremental snapshot data: missing incrementalData"
      );
    }

    this.incrementalSnapshot = data.incrementalData;
  }
}

/**
 * Batch snapshot operation configuration
 */
export interface IBatchSnapshotConfig extends ISaveConfig {
  /** Whether to create incremental snapshots */
  useIncremental?: boolean;
  /** Base snapshot ID for incremental snapshots */
  baseSnapshotId?: string;
  /** Maximum number of incremental snapshots before creating a new baseline */
  maxIncrementalCount?: number;
  /** File naming pattern with {tick} placeholder */
  fileNamePattern?: string;
  /** Whether to create a manifest file */
  createManifest?: boolean;
  /** Whether to clean up old snapshots */
  cleanupOldSnapshots?: boolean;
  /** Maximum number of snapshots to keep */
  maxSnapshotsToKeep?: number;
}

/**
 * Batch snapshot result
 */
export interface IBatchSnapshotResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: ISaveResult[];
  manifestPath?: string;
  cleanedUpCount?: number;
  error?: string;
}

/**
 * Snapshot browser configuration
 */
export interface ISnapshotBrowserConfig {
  /** Sort order for snapshots */
  sortBy?: "tick" | "timestamp" | "size";
  /** Sort direction */
  sortDirection?: "asc" | "desc";
  /** Filter by tick range */
  tickRange?: { min: number; max: number };
  /** Filter by metadata criteria */
  metadataFilter?: Record<string, any>;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Snapshot browser result
 */
export interface ISnapshotBrowserResult {
  snapshots: Array<{
    fileName: string;
    metadata: IWorldSnapshotMetadata;
    summary: {
      tick: number;
      timestamp: string;
      size: number;
      entityCount: number;
      isIncremental: boolean;
    };
  }>;
  totalCount: number;
  hasMore: boolean;
}

/**
 * World Snapshot Persistence Manager
 *
 * Provides specialized functionality for saving/loading world snapshots
 * with support for incremental snapshots and efficient storage.
 */
export class WorldSnapshotPersistenceManager {
  private persistenceManager: IPersistenceManager;
  private readonly SNAPSHOT_VERSION = "1.0.0";
  private baselineSnapshots: Map<string, string> = new Map(); // tick -> filename
  private incrementalChains: Map<string, string[]> = new Map(); // baseline -> incrementals

  constructor(persistenceManager: IPersistenceManager) {
    this.persistenceManager = persistenceManager;
  }

  /**
   * Save a complete world snapshot
   */
  async saveWorldSnapshot(
    world: World,
    tick: number,
    fileName: string,
    config: ISaveConfig = {}
  ): Promise<ISaveResult> {
    const startTime = Date.now();
    const serializableSnapshot = SerializableWorldSnapshot.fromWorld(
      world,
      tick
    );

    // Use compression by default for world snapshots
    const saveConfig: ISaveConfig = {
      format: FileFormat.JSON,
      compress: true,
      includeMetadata: true,
      validateBeforeSave: true,
      ...config,
    };

    const serializationTime = Date.now() - startTime;
    const compressionStart = Date.now();

    const result = await this.persistenceManager.save(
      serializableSnapshot,
      fileName,
      DataType.SNAPSHOT,
      saveConfig
    );

    const compressionTime = Date.now() - compressionStart;
    const totalTime = Date.now() - startTime;

    // Add performance info to metadata if save was successful
    if (result.success) {
      // Track this as a baseline snapshot
      this.baselineSnapshots.set(tick.toString(), fileName);
    }

    return result;
  }

  /**
   * Load a world snapshot
   */
  async loadWorldSnapshot(
    fileName: string,
    config: ILoadConfig = {}
  ): Promise<ILoadResult<WorldSnapshot>> {
    const loadResult =
      await this.persistenceManager.load<SerializableWorldSnapshot>(
        fileName,
        DataType.SNAPSHOT,
        config
      );

    if (!loadResult.success || !loadResult.data) {
      return {
        success: false,
        data: undefined,
        metadata: loadResult.metadata,
        error: loadResult.error || "Failed to load world snapshot",
      };
    }

    try {
      const rawData = loadResult.data as any;

      // Create a SerializableWorldSnapshot and deserialize
      const serializableSnapshot = new SerializableWorldSnapshot(
        {} as WorldSnapshot,
        {}
      );
      serializableSnapshot.deserialize(rawData);

      return {
        success: true,
        data: serializableSnapshot.snapshot,
        metadata: loadResult.metadata,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        metadata: loadResult.metadata,
        error: `Failed to deserialize world snapshot: ${error}`,
      };
    }
  }

  /**
   * Create an incremental snapshot
   */
  async createIncrementalSnapshot(
    currentWorld: World,
    currentTick: number,
    baseSnapshotFileName: string
  ): Promise<IIncrementalSnapshot | null> {
    // Load the base snapshot
    const baseResult = await this.loadWorldSnapshot(baseSnapshotFileName);
    if (!baseResult.success || !baseResult.data) {
      return null;
    }

    const baseSnapshot = baseResult.data;
    const currentSnapshot = WorldSnapshotCreator.createSnapshot(
      currentWorld,
      currentTick
    );

    // Calculate differences
    const entityChanges = this.calculateEntityChanges(
      baseSnapshot.entities,
      currentSnapshot.entities
    );
    const creatureChanges = this.calculateCreatureChanges(
      baseSnapshot.creatures,
      currentSnapshot.creatures
    );
    const cellChanges = this.calculateCellChanges(
      baseSnapshot.cells,
      currentSnapshot.cells
    );

    const totalChanges =
      entityChanges.added.length +
      entityChanges.modified.length +
      entityChanges.removed.length +
      creatureChanges.added.length +
      creatureChanges.modified.length +
      creatureChanges.removed.length +
      cellChanges.added.length +
      cellChanges.modified.length +
      cellChanges.removed.length;

    const significantChanges =
      entityChanges.added.length +
      entityChanges.removed.length +
      creatureChanges.added.length +
      creatureChanges.removed.length +
      cellChanges.added.length +
      cellChanges.removed.length;

    const totalPossibleChanges = Math.max(
      baseSnapshot.entities.length + currentSnapshot.entities.length,
      1
    );
    const changePercentage = (totalChanges / totalPossibleChanges) * 100;

    return {
      baseSnapshotId: baseSnapshotFileName,
      tick: currentTick,
      entityChanges,
      creatureChanges,
      cellChanges,
      statistics: currentSnapshot.statistics,
      changeMetadata: {
        totalChanges,
        significantChanges,
        changePercentage,
      },
    };
  }

  /**
   * Save an incremental snapshot
   */
  async saveIncrementalSnapshot(
    incrementalSnapshot: IIncrementalSnapshot,
    fileName: string,
    config: ISaveConfig = {}
  ): Promise<ISaveResult> {
    const serializableIncremental = new SerializableIncrementalSnapshot(
      incrementalSnapshot
    );

    const saveConfig: ISaveConfig = {
      format: FileFormat.JSON,
      compress: true,
      includeMetadata: true,
      validateBeforeSave: true,
      ...config,
    };

    const result = await this.persistenceManager.save(
      serializableIncremental,
      fileName,
      DataType.SNAPSHOT,
      saveConfig
    );

    // Track incremental chain
    if (result.success) {
      const baseId = incrementalSnapshot.baseSnapshotId;
      if (!this.incrementalChains.has(baseId)) {
        this.incrementalChains.set(baseId, []);
      }
      this.incrementalChains.get(baseId)!.push(fileName);
    }

    return result;
  }

  /**
   * Load and reconstruct a world snapshot from incremental chain
   */
  async loadIncrementalSnapshot(
    incrementalFileName: string,
    config: ILoadConfig = {}
  ): Promise<ILoadResult<WorldSnapshot>> {
    // Load the incremental snapshot
    const incrementalResult =
      await this.persistenceManager.load<SerializableIncrementalSnapshot>(
        incrementalFileName,
        DataType.SNAPSHOT,
        config
      );

    if (!incrementalResult.success || !incrementalResult.data) {
      return {
        success: false,
        data: undefined,
        metadata: incrementalResult.metadata,
        error: "Failed to load incremental snapshot",
      };
    }

    try {
      const rawData = incrementalResult.data as any;
      const serializableIncremental = new SerializableIncrementalSnapshot(
        {} as IIncrementalSnapshot
      );
      serializableIncremental.deserialize(rawData);

      const incrementalSnapshot = serializableIncremental.incrementalSnapshot;

      // Load the base snapshot
      const baseResult = await this.loadWorldSnapshot(
        incrementalSnapshot.baseSnapshotId
      );
      if (!baseResult.success || !baseResult.data) {
        return {
          success: false,
          data: undefined,
          error: "Failed to load base snapshot for incremental reconstruction",
        };
      }

      // Apply incremental changes to reconstruct the snapshot
      const reconstructedSnapshot = this.applyIncrementalChanges(
        baseResult.data,
        incrementalSnapshot
      );

      return {
        success: true,
        data: reconstructedSnapshot,
        metadata: incrementalResult.metadata,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        error: `Failed to reconstruct incremental snapshot: ${error}`,
      };
    }
  }

  /**
   * Save multiple snapshots in batch with optional incremental compression
   */
  async saveSnapshotBatch(
    worlds: Array<{ world: World; tick: number }>,
    batchName: string,
    config: IBatchSnapshotConfig = {}
  ): Promise<IBatchSnapshotResult> {
    const {
      useIncremental = true,
      maxIncrementalCount = 10,
      fileNamePattern = `${batchName}_{tick}.json`,
      createManifest = true,
      cleanupOldSnapshots = false,
      maxSnapshotsToKeep = 50,
      ...saveConfig
    } = config;

    const results: ISaveResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let currentBaselineId: string | undefined;
    let incrementalCount = 0;

    for (let i = 0; i < worlds.length; i++) {
      const { world, tick } = worlds[i];
      const fileName = fileNamePattern.replace(
        "{tick}",
        tick.toString().padStart(6, "0")
      );

      try {
        let result: ISaveResult;

        // Decide whether to create baseline or incremental
        const shouldCreateBaseline =
          !useIncremental ||
          !currentBaselineId ||
          incrementalCount >= maxIncrementalCount ||
          i === 0; // Always baseline for first snapshot

        if (shouldCreateBaseline) {
          // Create baseline snapshot
          result = await this.saveWorldSnapshot(
            world,
            tick,
            fileName,
            saveConfig
          );
          if (result.success) {
            currentBaselineId = fileName;
            incrementalCount = 0;
          }
        } else {
          // Create incremental snapshot
          const incrementalSnapshot = await this.createIncrementalSnapshot(
            world,
            tick,
            currentBaselineId!
          );

          if (incrementalSnapshot) {
            result = await this.saveIncrementalSnapshot(
              incrementalSnapshot,
              fileName,
              saveConfig
            );
            if (result.success) {
              incrementalCount++;
            }
          } else {
            // Fall back to baseline if incremental creation fails
            result = await this.saveWorldSnapshot(
              world,
              tick,
              fileName,
              saveConfig
            );
            if (result.success) {
              currentBaselineId = fileName;
              incrementalCount = 0;
            }
          }
        }

        results.push(result);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        const failedResult: ISaveResult = {
          success: false,
          filePath: fileName,
          metadata: {} as IFileMetadata,
          error: `Failed to save snapshot: ${error}`,
        };
        results.push(failedResult);
        failedCount++;
      }
    }

    let manifestPath: string | undefined;
    if (createManifest && successCount > 0) {
      manifestPath = await this.createSnapshotManifest(
        batchName,
        results.filter((r) => r.success)
      );
    }

    let cleanedUpCount = 0;
    if (cleanupOldSnapshots) {
      cleanedUpCount = await this.cleanupOldSnapshots(maxSnapshotsToKeep);
    }

    return {
      success: failedCount === 0,
      totalCount: worlds.length,
      successCount,
      failedCount,
      results,
      manifestPath,
      cleanedUpCount,
      error:
        failedCount > 0 ? `${failedCount} snapshots failed to save` : undefined,
    };
  }

  /**
   * Browse available snapshots with filtering and sorting
   */
  async browseSnapshots(
    config: ISnapshotBrowserConfig = {}
  ): Promise<ISnapshotBrowserResult> {
    const {
      sortBy = "tick",
      sortDirection = "desc",
      tickRange,
      metadataFilter,
      limit = 100,
    } = config;

    const fileNames = await this.persistenceManager.list(DataType.SNAPSHOT);
    const snapshots: ISnapshotBrowserResult["snapshots"] = [];

    for (const fileName of fileNames) {
      const metadata = await this.getSnapshotMetadata(fileName);
      if (!metadata) continue;

      // Apply filters
      if (tickRange && metadata.snapshotInfo) {
        const tick = metadata.snapshotInfo.tick;
        if (tick < tickRange.min || tick > tickRange.max) {
          continue;
        }
      }

      if (metadataFilter) {
        const matchesFilter = Object.entries(metadataFilter).every(
          ([key, value]) => {
            return (metadata as any)[key] === value;
          }
        );
        if (!matchesFilter) continue;
      }

      snapshots.push({
        fileName,
        metadata,
        summary: {
          tick: metadata.snapshotInfo?.tick || 0,
          timestamp: metadata.timestamp,
          size: metadata.size,
          entityCount: metadata.snapshotInfo?.entityCount || 0,
          isIncremental: !!metadata.incrementalInfo,
        },
      });
    }

    // Sort snapshots
    snapshots.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "tick":
          comparison = a.summary.tick - b.summary.tick;
          break;
        case "timestamp":
          comparison =
            new Date(a.summary.timestamp).getTime() -
            new Date(b.summary.timestamp).getTime();
          break;
        case "size":
          comparison = a.summary.size - b.summary.size;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    // Apply limit
    const hasMore = snapshots.length > limit;
    const limitedSnapshots = snapshots.slice(0, limit);

    return {
      snapshots: limitedSnapshots,
      totalCount: snapshots.length,
      hasMore,
    };
  }

  /**
   * Get enhanced metadata for a snapshot file
   */
  async getSnapshotMetadata(
    fileName: string
  ): Promise<IWorldSnapshotMetadata | null> {
    const baseMetadata = await this.persistenceManager.getMetadata(
      fileName,
      DataType.SNAPSHOT
    );
    if (!baseMetadata) {
      return null;
    }

    // For now, return base metadata with placeholder snapshot info
    // In a full implementation, this would parse the snapshot file to extract detailed info
    return {
      ...baseMetadata,
      snapshotInfo: {
        tick: 0,
        worldDimensions: { width: 0, height: 0 },
        entityCount: 0,
        creatureCount: 0,
        livingCreatureCount: 0,
        averageEnergy: 0,
        worldDensity: 0,
      },
    } as IWorldSnapshotMetadata;
  }

  /**
   * Validate snapshot file integrity
   */
  async validateSnapshotFile(fileName: string): Promise<boolean> {
    return this.persistenceManager.validateFile(fileName, DataType.SNAPSHOT);
  }

  /**
   * Delete a snapshot and its associated incremental chain
   */
  async deleteSnapshotChain(baselineFileName: string): Promise<number> {
    let deletedCount = 0;

    // Delete the baseline
    if (
      await this.persistenceManager.delete(baselineFileName, DataType.SNAPSHOT)
    ) {
      deletedCount++;
    }

    // Delete associated incrementals
    const incrementals = this.incrementalChains.get(baselineFileName) || [];
    for (const incrementalFile of incrementals) {
      if (
        await this.persistenceManager.delete(incrementalFile, DataType.SNAPSHOT)
      ) {
        deletedCount++;
      }
    }

    // Clean up tracking maps
    this.baselineSnapshots.delete(baselineFileName);
    this.incrementalChains.delete(baselineFileName);

    return deletedCount;
  }

  /**
   * Calculate entity changes between snapshots
   */
  private calculateEntityChanges(
    baseEntities: EntitySnapshot[],
    currentEntities: EntitySnapshot[]
  ): IIncrementalSnapshot["entityChanges"] {
    const baseMap = new Map(baseEntities.map((e) => [e.id, e]));
    const currentMap = new Map(currentEntities.map((e) => [e.id, e]));

    const added: EntitySnapshot[] = [];
    const modified: { id: string; changes: Partial<EntitySnapshot> }[] = [];
    const removed: string[] = [];

    // Find added and modified entities
    for (const [id, currentEntity] of currentMap) {
      const baseEntity = baseMap.get(id);
      if (!baseEntity) {
        added.push(currentEntity);
      } else {
        const changes = this.calculateEntityDifferences(
          baseEntity,
          currentEntity
        );
        if (Object.keys(changes).length > 0) {
          modified.push({ id, changes });
        }
      }
    }

    // Find removed entities
    for (const id of baseMap.keys()) {
      if (!currentMap.has(id)) {
        removed.push(id);
      }
    }

    return { added, modified, removed };
  }

  /**
   * Calculate creature changes between snapshots
   */
  private calculateCreatureChanges(
    baseCreatures: CreatureSnapshot[],
    currentCreatures: CreatureSnapshot[]
  ): IIncrementalSnapshot["creatureChanges"] {
    const baseMap = new Map(baseCreatures.map((c) => [c.id, c]));
    const currentMap = new Map(currentCreatures.map((c) => [c.id, c]));

    const added: CreatureSnapshot[] = [];
    const modified: { id: string; changes: Partial<CreatureSnapshot> }[] = [];
    const removed: string[] = [];

    // Find added and modified creatures
    for (const [id, currentCreature] of currentMap) {
      const baseCreature = baseMap.get(id);
      if (!baseCreature) {
        added.push(currentCreature);
      } else {
        const changes = this.calculateCreatureDifferences(
          baseCreature,
          currentCreature
        );
        if (Object.keys(changes).length > 0) {
          modified.push({ id, changes });
        }
      }
    }

    // Find removed creatures
    for (const id of baseMap.keys()) {
      if (!currentMap.has(id)) {
        removed.push(id);
      }
    }

    return { added, modified, removed };
  }

  /**
   * Calculate cell changes between snapshots
   */
  private calculateCellChanges(
    baseCells: CellSnapshot[],
    currentCells: CellSnapshot[]
  ): IIncrementalSnapshot["cellChanges"] {
    const getCellKey = (cell: CellSnapshot) =>
      `${cell.position.x},${cell.position.y}`;
    const baseMap = new Map(baseCells.map((c) => [getCellKey(c), c]));
    const currentMap = new Map(currentCells.map((c) => [getCellKey(c), c]));

    const added: CellSnapshot[] = [];
    const modified: {
      position: { x: number; y: number };
      changes: Partial<CellSnapshot>;
    }[] = [];
    const removed: { x: number; y: number }[] = [];

    // Find added and modified cells
    for (const [key, currentCell] of currentMap) {
      const baseCell = baseMap.get(key);
      if (!baseCell) {
        added.push(currentCell);
      } else {
        const changes = this.calculateCellDifferences(baseCell, currentCell);
        if (Object.keys(changes).length > 0) {
          modified.push({ position: currentCell.position, changes });
        }
      }
    }

    // Find removed cells
    for (const [key, baseCell] of baseMap) {
      if (!currentMap.has(key)) {
        removed.push(baseCell.position);
      }
    }

    return { added, modified, removed };
  }

  /**
   * Calculate differences between two entities
   */
  private calculateEntityDifferences(
    base: EntitySnapshot,
    current: EntitySnapshot
  ): Partial<EntitySnapshot> {
    const changes: Partial<EntitySnapshot> = {};

    if (
      base.position.x !== current.position.x ||
      base.position.y !== current.position.y
    ) {
      changes.position = current.position;
    }
    if (base.active !== current.active) {
      changes.active = current.active;
    }
    if (JSON.stringify(base.data) !== JSON.stringify(current.data)) {
      changes.data = current.data;
    }

    return changes;
  }

  /**
   * Calculate differences between two creatures
   */
  private calculateCreatureDifferences(
    base: CreatureSnapshot,
    current: CreatureSnapshot
  ): Partial<CreatureSnapshot> {
    const changes: Partial<CreatureSnapshot> = {};

    // Include entity-level changes
    const entityChanges = this.calculateEntityDifferences(base, current);
    Object.assign(changes, entityChanges);

    // Creature-specific changes
    if (base.energy !== current.energy) {
      changes.energy = current.energy;
    }
    if (base.age !== current.age) {
      changes.age = current.age;
    }
    if (base.alive !== current.alive) {
      changes.alive = current.alive;
    }

    return changes;
  }

  /**
   * Calculate differences between two cells
   */
  private calculateCellDifferences(
    base: CellSnapshot,
    current: CellSnapshot
  ): Partial<CellSnapshot> {
    const changes: Partial<CellSnapshot> = {};

    if (base.terrain !== current.terrain) {
      changes.terrain = current.terrain;
    }
    if (JSON.stringify(base.entityIds) !== JSON.stringify(current.entityIds)) {
      changes.entityIds = current.entityIds;
    }
    if (JSON.stringify(base.resources) !== JSON.stringify(current.resources)) {
      changes.resources = current.resources;
    }
    if (base.hasObstacle !== current.hasObstacle) {
      changes.hasObstacle = current.hasObstacle;
    }
    if (base.lastUpdate !== current.lastUpdate) {
      changes.lastUpdate = current.lastUpdate;
    }

    return changes;
  }

  /**
   * Apply incremental changes to reconstruct a snapshot
   */
  private applyIncrementalChanges(
    baseSnapshot: WorldSnapshot,
    incrementalSnapshot: IIncrementalSnapshot
  ): WorldSnapshot {
    // Deep clone the base snapshot
    const reconstructed: WorldSnapshot = JSON.parse(
      JSON.stringify(baseSnapshot)
    );

    // Update tick and timestamp
    reconstructed.tick = incrementalSnapshot.tick;
    reconstructed.timestamp = Date.now(); // Current timestamp for reconstruction

    // Apply entity changes
    const entityMap = new Map(reconstructed.entities.map((e) => [e.id, e]));

    // Remove entities
    for (const removedId of incrementalSnapshot.entityChanges.removed) {
      entityMap.delete(removedId);
    }

    // Add new entities
    for (const addedEntity of incrementalSnapshot.entityChanges.added) {
      entityMap.set(addedEntity.id, addedEntity);
    }

    // Apply modifications
    for (const modification of incrementalSnapshot.entityChanges.modified) {
      const entity = entityMap.get(modification.id);
      if (entity) {
        Object.assign(entity, modification.changes);
      }
    }

    reconstructed.entities = Array.from(entityMap.values());

    // Apply creature changes (similar pattern)
    const creatureMap = new Map(reconstructed.creatures.map((c) => [c.id, c]));

    for (const removedId of incrementalSnapshot.creatureChanges.removed) {
      creatureMap.delete(removedId);
    }

    for (const addedCreature of incrementalSnapshot.creatureChanges.added) {
      creatureMap.set(addedCreature.id, addedCreature);
    }

    for (const modification of incrementalSnapshot.creatureChanges.modified) {
      const creature = creatureMap.get(modification.id);
      if (creature) {
        Object.assign(creature, modification.changes);
      }
    }

    reconstructed.creatures = Array.from(creatureMap.values());

    // Apply cell changes
    const getCellKey = (pos: { x: number; y: number }) => `${pos.x},${pos.y}`;
    const cellMap = new Map(
      reconstructed.cells.map((c) => [getCellKey(c.position), c])
    );

    for (const removedPos of incrementalSnapshot.cellChanges.removed) {
      cellMap.delete(getCellKey(removedPos));
    }

    for (const addedCell of incrementalSnapshot.cellChanges.added) {
      cellMap.set(getCellKey(addedCell.position), addedCell);
    }

    for (const modification of incrementalSnapshot.cellChanges.modified) {
      const cell = cellMap.get(getCellKey(modification.position));
      if (cell) {
        Object.assign(cell, modification.changes);
      }
    }

    reconstructed.cells = Array.from(cellMap.values());

    // Update statistics
    reconstructed.statistics = incrementalSnapshot.statistics;

    return reconstructed;
  }

  /**
   * Create a manifest file for batch snapshots
   */
  private async createSnapshotManifest(
    batchName: string,
    results: ISaveResult[]
  ): Promise<string> {
    const manifest = {
      batchName,
      createdAt: getCurrentTimestamp(),
      totalSnapshots: results.length,
      snapshots: results.map((result, index) => ({
        index,
        fileName: result.filePath.split(/[/\\]/).pop() || "",
        filePath: result.filePath,
        size: result.metadata.size,
        checksum: result.metadata.checksum,
        dataType: result.metadata.dataType,
        format: result.metadata.format,
        compressed: result.metadata.compressed,
      })),
    };

    const manifestFileName = `${batchName}_manifest.json`;
    const manifestData = JSON.stringify(manifest, null, 2);

    // Save manifest in the snapshot directory
    const manifestPath = this.persistenceManager.getDirectoryPath(
      DataType.SNAPSHOT
    );
    const fs = await import("fs/promises");
    const path = await import("path");
    const fullManifestPath = path.join(manifestPath, manifestFileName);

    await fs.writeFile(fullManifestPath, manifestData);
    return fullManifestPath;
  }

  /**
   * Clean up old snapshots to maintain storage limits
   */
  private async cleanupOldSnapshots(
    maxSnapshotsToKeep: number
  ): Promise<number> {
    const browser = await this.browseSnapshots({
      sortBy: "timestamp",
      sortDirection: "desc",
    });

    if (browser.snapshots.length <= maxSnapshotsToKeep) {
      return 0; // No cleanup needed
    }

    const snapshotsToDelete = browser.snapshots.slice(maxSnapshotsToKeep);
    let deletedCount = 0;

    for (const snapshot of snapshotsToDelete) {
      try {
        if (snapshot.summary.isIncremental) {
          // Just delete the incremental file
          if (
            await this.persistenceManager.delete(
              snapshot.fileName,
              DataType.SNAPSHOT
            )
          ) {
            deletedCount++;
          }
        } else {
          // Delete the entire chain for baseline snapshots
          const chainDeletedCount = await this.deleteSnapshotChain(
            snapshot.fileName
          );
          deletedCount += chainDeletedCount;
        }
      } catch (error) {
        // Continue with other deletions if one fails
        console.warn(`Failed to delete snapshot ${snapshot.fileName}:`, error);
      }
    }

    return deletedCount;
  }
}

/**
 * Factory function to create a world snapshot persistence manager
 */
export function createWorldSnapshotPersistenceManager(
  persistenceManager: IPersistenceManager
): WorldSnapshotPersistenceManager {
  return new WorldSnapshotPersistenceManager(persistenceManager);
}
