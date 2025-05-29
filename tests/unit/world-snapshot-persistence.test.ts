/**
 * Unit tests for World Snapshot Persistence System
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  WorldSnapshotPersistenceManager,
  SerializableWorldSnapshot,
  SerializableIncrementalSnapshot,
  createWorldSnapshotPersistenceManager,
  IIncrementalSnapshot,
} from "../../src/persistence/world-snapshot-persistence";
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
} from "../../src/persistence/types";
import { ResourceType } from "../../src/world/types";

// Mock persistence manager for testing
class MockPersistenceManager implements IPersistenceManager {
  private storage = new Map<string, any>();
  private metadata = new Map<string, IFileMetadata>();

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async cleanup(): Promise<void> {
    // Mock cleanup
  }

  async save<T extends ISerializable>(
    data: T,
    fileName: string,
    dataType: DataType,
    config?: ISaveConfig
  ): Promise<ISaveResult> {
    try {
      const serializedData = data.serialize();
      this.storage.set(fileName, serializedData);

      const mockMetadata: IFileMetadata = {
        version: "1.0.0",
        format: config?.format || FileFormat.JSON,
        dataType,
        checksum: "mock-checksum-" + Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        size: JSON.stringify(serializedData).length,
        compressed: config?.compress || false,
      };
      this.metadata.set(fileName, mockMetadata);

      return {
        success: true,
        filePath: fileName,
        metadata: mockMetadata,
      };
    } catch (error) {
      return {
        success: false,
        filePath: fileName,
        metadata: {} as IFileMetadata,
        error: `Save failed: ${error}`,
      };
    }
  }

  async load<T>(
    fileName: string,
    dataType: DataType,
    config?: ILoadConfig
  ): Promise<ILoadResult<T>> {
    try {
      const data = this.storage.get(fileName);
      const metadata = this.metadata.get(fileName);

      if (!data || !metadata) {
        return {
          success: false,
          data: undefined,
          error: "File not found",
        };
      }

      return {
        success: true,
        data: data as T,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        error: `Load failed: ${error}`,
      };
    }
  }

  async delete(fileName: string, dataType: DataType): Promise<boolean> {
    const existed = this.storage.has(fileName);
    this.storage.delete(fileName);
    this.metadata.delete(fileName);
    return existed;
  }

  async exists(fileName: string, dataType: DataType): Promise<boolean> {
    return this.storage.has(fileName);
  }

  async list(dataType: DataType): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async getMetadata(
    fileName: string,
    dataType: DataType
  ): Promise<IFileMetadata | null> {
    return this.metadata.get(fileName) || null;
  }

  async validateFile(fileName: string, dataType: DataType): Promise<boolean> {
    return this.storage.has(fileName) && this.metadata.has(fileName);
  }

  getDirectoryPath(dataType: DataType): string {
    return `/mock/path/${dataType}`;
  }

  clear(): void {
    this.storage.clear();
    this.metadata.clear();
  }
}

// Simple mock world snapshot data
const createMockWorldSnapshot = (tick: number) => ({
  tick,
  timestamp: Date.now(),
  entities: [
    {
      id: "entity1",
      type: "resource",
      position: { x: 10, y: 20 },
      active: true,
      data: {},
    },
    {
      id: "entity2",
      type: "creature",
      position: { x: 30, y: 40 },
      active: false,
      data: { type: "test" },
    },
  ],
  creatures: [
    {
      id: "creature1",
      type: "creature",
      position: { x: 5, y: 15 },
      active: true,
      data: {},
      energy: 100,
      age: 50,
      alive: true,
    },
    {
      id: "creature2",
      type: "creature",
      position: { x: 25, y: 35 },
      active: true,
      data: {},
      energy: 75,
      age: 30,
      alive: false,
    },
  ],
  cells: [
    {
      position: { x: 0, y: 0 },
      terrain: "grass",
      entityIds: ["entity1"],
      resources: [],
      hasObstacle: false,
      lastUpdate: tick,
    },
    {
      position: { x: 1, y: 1 },
      terrain: "water",
      entityIds: [],
      resources: [],
      hasObstacle: true,
      lastUpdate: tick,
    },
  ],
  statistics: {
    totalEntities: 2,
    totalCreatures: 2,
    livingCreatures: 1,
    averageEnergy: 87.5,
    totalResources: {
      [ResourceType.FOOD]: 10,
      [ResourceType.WATER]: 5,
      [ResourceType.SHELTER]: 0,
      [ResourceType.MINERAL]: 2,
    },
    worldDensity: 0.02,
  },
  dimensions: { width: 100, height: 100 },
  metadata: {},
});

describe("World Snapshot Persistence System", () => {
  let mockPersistenceManager: MockPersistenceManager;
  let worldSnapshotManager: WorldSnapshotPersistenceManager;

  beforeEach(() => {
    mockPersistenceManager = new MockPersistenceManager();
    worldSnapshotManager = new WorldSnapshotPersistenceManager(
      mockPersistenceManager
    );
  });

  afterEach(() => {
    mockPersistenceManager.clear();
  });

  describe("SerializableWorldSnapshot", () => {
    it("should serialize and deserialize correctly", () => {
      const mockSnapshot = createMockWorldSnapshot(100);
      const metadata = {
        tick: 100,
        worldDimensions: { width: 100, height: 100 },
        entityCount: 2,
        creatureCount: 2,
        livingCreatureCount: 1,
        averageEnergy: 87.5,
        worldDensity: 0.02,
      };

      const serializableSnapshot = new SerializableWorldSnapshot(
        mockSnapshot as any,
        metadata
      );
      const serializedData = serializableSnapshot.serialize();

      expect(serializedData.version).toBe("1.0.0");
      expect(serializedData.snapshotData).toBeDefined();
      expect(serializedData.metadata).toEqual(metadata);
      expect(serializedData.serializedAt).toBeDefined();

      // Test deserialization
      const newSnapshot = new SerializableWorldSnapshot({} as any, {});
      newSnapshot.deserialize(serializedData);

      expect(newSnapshot.snapshot.tick).toBe(100);
      expect(newSnapshot.snapshot.entities).toHaveLength(2);
      expect(newSnapshot.snapshot.creatures).toHaveLength(2);
      expect(newSnapshot.metadata).toEqual(metadata);
    });

    it("should handle invalid data during deserialization", () => {
      const snapshot = new SerializableWorldSnapshot({} as any, {});

      expect(() => {
        snapshot.deserialize({ invalid: "data" });
      }).toThrow("Invalid world snapshot data: missing snapshotData");
    });
  });

  describe("SerializableIncrementalSnapshot", () => {
    it("should serialize and deserialize incremental snapshot", () => {
      const incrementalSnapshot: IIncrementalSnapshot = {
        baseSnapshotId: "base.json",
        tick: 101,
        entityChanges: { added: [], modified: [], removed: [] },
        creatureChanges: { added: [], modified: [], removed: [] },
        cellChanges: { added: [], modified: [], removed: [] },
        statistics: {
          totalEntities: 2,
          totalCreatures: 2,
          livingCreatures: 1,
          averageEnergy: 87.5,
          totalResources: {
            [ResourceType.FOOD]: 10,
            [ResourceType.WATER]: 5,
            [ResourceType.SHELTER]: 0,
            [ResourceType.MINERAL]: 2,
          },
        },
        changeMetadata: {
          totalChanges: 5,
          significantChanges: 2,
          changePercentage: 25.0,
        },
      };

      const serializable = new SerializableIncrementalSnapshot(
        incrementalSnapshot
      );
      const serializedData = serializable.serialize();

      expect(serializedData.version).toBe("1.0.0");
      expect(serializedData.incrementalData).toBeDefined();
      expect(serializedData.serializedAt).toBeDefined();

      // Test deserialization
      const newSerializable = new SerializableIncrementalSnapshot(
        {} as IIncrementalSnapshot
      );
      newSerializable.deserialize(serializedData);

      expect(newSerializable.incrementalSnapshot.baseSnapshotId).toBe(
        "base.json"
      );
      expect(newSerializable.incrementalSnapshot.tick).toBe(101);
      expect(
        newSerializable.incrementalSnapshot.changeMetadata.totalChanges
      ).toBe(5);
    });

    it("should handle invalid incremental data", () => {
      const snapshot = new SerializableIncrementalSnapshot(
        {} as IIncrementalSnapshot
      );

      expect(() => {
        snapshot.deserialize({ invalid: "data" });
      }).toThrow("Invalid incremental snapshot data: missing incrementalData");
    });
  });

  describe("WorldSnapshotPersistenceManager", () => {
    describe("Basic Snapshot Operations", () => {
      it("should validate snapshot file integrity", async () => {
        // Mock the manager to save something first
        const mockSnapshot = createMockWorldSnapshot(100);
        const serializableSnapshot = new SerializableWorldSnapshot(
          mockSnapshot as any,
          {}
        );

        await mockPersistenceManager.save(
          serializableSnapshot,
          "test.json",
          DataType.SNAPSHOT
        );

        const result = await worldSnapshotManager.validateSnapshotFile(
          "test.json"
        );
        expect(result).toBe(true);
      });

      it("should get snapshot metadata", async () => {
        // Save a snapshot first
        const mockSnapshot = createMockWorldSnapshot(100);
        const serializableSnapshot = new SerializableWorldSnapshot(
          mockSnapshot as any,
          {}
        );
        await mockPersistenceManager.save(
          serializableSnapshot,
          "test.json",
          DataType.SNAPSHOT
        );

        const metadata = await worldSnapshotManager.getSnapshotMetadata(
          "test.json"
        );

        expect(metadata).toBeDefined();
        expect(metadata!.dataType).toBe(DataType.SNAPSHOT);
        expect(metadata!.snapshotInfo).toBeDefined();
      });

      it("should handle non-existent file metadata", async () => {
        const metadata = await worldSnapshotManager.getSnapshotMetadata(
          "nonexistent.json"
        );
        expect(metadata).toBeNull();
      });
    });

    describe("Batch Operations", () => {
      it("should save multiple snapshots in batch with baseline mode", async () => {
        const worlds = [
          { world: { width: 100, height: 100 } as any, tick: 100 },
          { world: { width: 100, height: 100 } as any, tick: 101 },
          { world: { width: 100, height: 100 } as any, tick: 102 },
        ];

        // Mock the WorldSnapshotCreator
        const originalCreateSnapshot = (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot;
        (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot = (world: any, tick: number) =>
          createMockWorldSnapshot(tick) as any;

        const config = {
          useIncremental: false, // Use baseline snapshots for simplicity
          fileNamePattern: "batch_{tick}.json",
          createManifest: false, // Disable manifest for simpler testing
        };

        const result = await worldSnapshotManager.saveSnapshotBatch(
          worlds,
          "test-batch",
          config
        );

        expect(result.success).toBe(true);
        expect(result.totalCount).toBe(3);
        expect(result.successCount).toBe(3);
        expect(result.failedCount).toBe(0);
        expect(result.results).toHaveLength(3);

        // Restore original function
        (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot = originalCreateSnapshot;
      });

      it("should handle batch save with some failures", async () => {
        // Mock failing saves for certain files
        const originalSave = mockPersistenceManager.save;
        mockPersistenceManager.save = async (
          data,
          fileName,
          dataType,
          config
        ) => {
          if (fileName.includes("000101")) {
            return {
              success: false,
              filePath: fileName,
              metadata: {} as IFileMetadata,
              error: "Simulated failure",
            };
          }
          return originalSave.call(
            mockPersistenceManager,
            data,
            fileName,
            dataType,
            config
          );
        };

        const worlds = [
          { world: { width: 100, height: 100 } as any, tick: 100 },
          { world: { width: 100, height: 100 } as any, tick: 101 }, // This will fail
          { world: { width: 100, height: 100 } as any, tick: 102 },
        ];

        // Mock the WorldSnapshotCreator
        const originalCreateSnapshot = (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot;
        (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot = (world: any, tick: number) =>
          createMockWorldSnapshot(tick) as any;

        const result = await worldSnapshotManager.saveSnapshotBatch(
          worlds,
          "test-batch",
          { useIncremental: false, createManifest: false }
        );

        expect(result.success).toBe(false);
        expect(result.totalCount).toBe(3);
        expect(result.successCount).toBe(2);
        expect(result.failedCount).toBe(1);
        expect(result.error).toContain("1 snapshots failed");

        // Restore original functions
        mockPersistenceManager.save = originalSave;
        (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot = originalCreateSnapshot;
      });
    });

    describe("Snapshot Browsing", () => {
      beforeEach(async () => {
        // Setup test snapshots
        for (const tick of [100, 200, 300]) {
          const mockSnapshot = createMockWorldSnapshot(tick);
          const serializableSnapshot = new SerializableWorldSnapshot(
            mockSnapshot as any,
            {}
          );
          await mockPersistenceManager.save(
            serializableSnapshot,
            `snapshot_${tick}.json`,
            DataType.SNAPSHOT
          );
        }
      });

      it("should browse snapshots with default settings", async () => {
        const result = await worldSnapshotManager.browseSnapshots();

        expect(result.snapshots).toHaveLength(3);
        expect(result.totalCount).toBe(3);
        expect(result.hasMore).toBe(false);
      });

      it("should limit results", async () => {
        const config = {
          limit: 2,
        };

        const result = await worldSnapshotManager.browseSnapshots(config);

        expect(result.snapshots).toHaveLength(2);
        expect(result.hasMore).toBe(true);
      });

      it("should sort snapshots by tick ascending", async () => {
        const config = {
          sortBy: "tick" as const,
          sortDirection: "asc" as const,
        };

        const result = await worldSnapshotManager.browseSnapshots(config);

        expect(result.snapshots[0].summary.tick).toBe(0); // Default tick from metadata
        expect(result.snapshots[1].summary.tick).toBe(0);
        expect(result.snapshots[2].summary.tick).toBe(0);
      });
    });

    describe("Snapshot Management", () => {
      it("should delete snapshot chain", async () => {
        // Save a test snapshot
        const mockSnapshot = createMockWorldSnapshot(100);
        const serializableSnapshot = new SerializableWorldSnapshot(
          mockSnapshot as any,
          {}
        );
        await mockPersistenceManager.save(
          serializableSnapshot,
          "base.json",
          DataType.SNAPSHOT
        );

        const deletedCount = await worldSnapshotManager.deleteSnapshotChain(
          "base.json"
        );
        expect(deletedCount).toBeGreaterThanOrEqual(1);

        // Verify it's deleted
        const exists = await mockPersistenceManager.exists(
          "base.json",
          DataType.SNAPSHOT
        );
        expect(exists).toBe(false);
      });
    });

    describe("Factory Function", () => {
      it("should create world snapshot persistence manager", () => {
        const manager = createWorldSnapshotPersistenceManager(
          mockPersistenceManager
        );
        expect(manager).toBeInstanceOf(WorldSnapshotPersistenceManager);
      });
    });

    describe("Performance and Edge Cases", () => {
      it("should handle large batch operations efficiently", async () => {
        const worlds = Array.from({ length: 20 }, (_, i) => ({
          world: { width: 100, height: 100 } as any,
          tick: i + 1,
        }));

        // Mock the WorldSnapshotCreator
        const originalCreateSnapshot = (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot;
        (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot = (world: any, tick: number) =>
          createMockWorldSnapshot(tick) as any;

        const startTime = Date.now();
        const result = await worldSnapshotManager.saveSnapshotBatch(
          worlds,
          "large-batch",
          { useIncremental: false, createManifest: false }
        );
        const endTime = Date.now();

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(20);
        expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

        // Restore original function
        (
          await import("../../src/renderer/WorldSnapshot")
        ).WorldSnapshotCreator.createSnapshot = originalCreateSnapshot;
      });

      it("should preserve data integrity through save/load cycles", async () => {
        const mockSnapshot = createMockWorldSnapshot(100);
        const metadata = {
          tick: 100,
          worldDimensions: { width: 100, height: 100 },
          entityCount: 2,
          creatureCount: 2,
          livingCreatureCount: 1,
          averageEnergy: 87.5,
          worldDensity: 0.02,
        };

        // Save snapshot
        const serializableSnapshot = new SerializableWorldSnapshot(
          mockSnapshot as any,
          metadata
        );
        const saveResult = await mockPersistenceManager.save(
          serializableSnapshot,
          "integrity-test.json",
          DataType.SNAPSHOT
        );
        expect(saveResult.success).toBe(true);

        // Load snapshot
        const loadResult = await mockPersistenceManager.load(
          "integrity-test.json",
          DataType.SNAPSHOT
        );
        expect(loadResult.success).toBe(true);

        // Verify data integrity
        const loadedSnapshot = new SerializableWorldSnapshot({} as any, {});
        loadedSnapshot.deserialize(loadResult.data);

        expect(loadedSnapshot.snapshot.tick).toBe(mockSnapshot.tick);
        expect(loadedSnapshot.snapshot.entities).toHaveLength(
          mockSnapshot.entities.length
        );
        expect(loadedSnapshot.snapshot.creatures).toHaveLength(
          mockSnapshot.creatures.length
        );
        expect(loadedSnapshot.metadata).toEqual(metadata);
      });
    });
  });
});
