/**
 * Persistence system unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
  PersistenceManager,
  createPersistenceManager,
  createInitializedPersistenceManager,
  createTestPersistenceManager,
  DataType,
  FileFormat,
  ISerializable,
} from "../../src/persistence";

// Import Node.js-specific utility functions directly from utils
import {
  calculateChecksum,
  getCurrentTimestamp,
  getFileExtension,
  getSafeFileName,
  normalizePath,
  compareVersions,
  parseVersion,
} from "../../src/persistence/utils";

// Test data class that implements ISerializable
class TestData implements ISerializable {
  constructor(public id: string, public name: string, public value: number) {}

  serialize(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      value: this.value,
    };
  }

  deserialize(data: Record<string, any>): void {
    this.id = data.id;
    this.name = data.name;
    this.value = data.value;
  }
}

describe("Persistence System", () => {
  let tempDir: string;
  let persistenceManager: PersistenceManager;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "evo-persistence-test-"));
    persistenceManager = createTestPersistenceManager(
      tempDir
    ) as PersistenceManager;
    await persistenceManager.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await persistenceManager.cleanup();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Utility Functions", () => {
    it("should calculate correct checksums", () => {
      const data = "test data";
      const checksum = calculateChecksum(data);
      expect(checksum).toBe(
        "916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9"
      );

      // Same data should produce same checksum
      const checksum2 = calculateChecksum(data);
      expect(checksum).toBe(checksum2);
    });

    it("should generate valid timestamps", () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      // Should be parseable as Date
      const date = new Date(timestamp);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it("should get correct file extensions", () => {
      expect(getFileExtension(FileFormat.JSON)).toBe(".json");
      expect(getFileExtension(FileFormat.BINARY)).toBe(".bin");
    });

    it("should create safe file names", () => {
      expect(getSafeFileName("test<>file")).toBe("test__file");
      expect(getSafeFileName("test file.json")).toBe("test_file.json");
      expect(getSafeFileName("test/\\|file")).toBe("test___file");
    });

    it("should normalize Windows paths", () => {
      const testPath = "C:/test/path";
      const normalized = normalizePath(testPath);
      expect(normalized).toContain("\\");
    });

    it("should parse and compare versions correctly", () => {
      expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
      expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
      expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    });
  });

  describe("PersistenceManager", () => {
    it("should initialize correctly", async () => {
      const manager = createPersistenceManager();
      await manager.initialize({ baseDirectory: tempDir });

      // Check that directories were created
      const creatureDir = manager.getDirectoryPath(DataType.CREATURE);
      const worldDir = manager.getDirectoryPath(DataType.WORLD);

      expect(
        await fs
          .access(creatureDir)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
      expect(
        await fs
          .access(worldDir)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);

      await manager.cleanup();
    });

    it("should throw error when not initialized", async () => {
      const manager = createPersistenceManager();
      const testData = new TestData("1", "test", 42);

      await expect(
        manager.save(testData, "test.json", DataType.CREATURE)
      ).rejects.toThrow("PersistenceManager must be initialized before use");
    });

    it("should save and load data correctly", async () => {
      const testData = new TestData("test-1", "Test Creature", 42);

      // Save data
      const saveResult = await persistenceManager.save(
        testData,
        "test-creature.json",
        DataType.CREATURE,
        { format: FileFormat.JSON }
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.filePath).toContain("test-creature.json");
      expect(saveResult.metadata.dataType).toBe(DataType.CREATURE);
      expect(saveResult.metadata.format).toBe(FileFormat.JSON);

      // Load data
      const loadResult = await persistenceManager.load<TestData>(
        "test-creature.json",
        DataType.CREATURE
      );

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();
      expect(loadResult.data!.id).toBe("test-1");
      expect(loadResult.data!.name).toBe("Test Creature");
      expect(loadResult.data!.value).toBe(42);
    });

    it("should handle binary format", async () => {
      const testData = new TestData("binary-1", "Binary Test", 123);

      // Save in binary format
      const saveResult = await persistenceManager.save(
        testData,
        "test-binary.bin",
        DataType.CREATURE,
        { format: FileFormat.BINARY }
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.metadata.format).toBe(FileFormat.BINARY);

      // Load binary data
      const loadResult = await persistenceManager.load<TestData>(
        "test-binary.bin",
        DataType.CREATURE
      );

      expect(loadResult.success).toBe(true);
      expect(loadResult.data!.id).toBe("binary-1");
    });

    it("should validate checksums", async () => {
      const testData = new TestData("checksum-test", "Checksum Test", 999);

      // Save data
      await persistenceManager.save(
        testData,
        "checksum-test.json",
        DataType.CREATURE
      );

      // Validate file
      const isValid = await persistenceManager.validateFile(
        "checksum-test.json",
        DataType.CREATURE
      );

      expect(isValid).toBe(true);

      // Corrupt the file
      const filePath = path.join(
        persistenceManager.getDirectoryPath(DataType.CREATURE),
        "checksum-test.json"
      );
      await fs.writeFile(filePath, "corrupted data");

      // Validation should fail
      const isValidAfterCorruption = await persistenceManager.validateFile(
        "checksum-test.json",
        DataType.CREATURE
      );

      expect(isValidAfterCorruption).toBe(false);
    });

    it("should handle file existence checks", async () => {
      const testData = new TestData("exists-test", "Exists Test", 456);

      // File should not exist initially
      const existsBefore = await persistenceManager.exists(
        "exists-test.json",
        DataType.CREATURE
      );
      expect(existsBefore).toBe(false);

      // Save file
      await persistenceManager.save(
        testData,
        "exists-test.json",
        DataType.CREATURE
      );

      // File should exist now
      const existsAfter = await persistenceManager.exists(
        "exists-test.json",
        DataType.CREATURE
      );
      expect(existsAfter).toBe(true);
    });

    it("should delete files correctly", async () => {
      const testData = new TestData("delete-test", "Delete Test", 789);

      // Save file
      await persistenceManager.save(
        testData,
        "delete-test.json",
        DataType.CREATURE
      );

      // Verify file exists
      expect(
        await persistenceManager.exists("delete-test.json", DataType.CREATURE)
      ).toBe(true);

      // Delete file
      const deleteResult = await persistenceManager.delete(
        "delete-test.json",
        DataType.CREATURE
      );

      expect(deleteResult).toBe(true);
      expect(
        await persistenceManager.exists("delete-test.json", DataType.CREATURE)
      ).toBe(false);
    });

    it("should list files correctly", async () => {
      const testData1 = new TestData("list-1", "List Test 1", 100);
      const testData2 = new TestData("list-2", "List Test 2", 200);

      // Save multiple files
      await persistenceManager.save(
        testData1,
        "list-test-1.json",
        DataType.CREATURE
      );
      await persistenceManager.save(
        testData2,
        "list-test-2.json",
        DataType.CREATURE
      );

      // List files
      const files = await persistenceManager.list(DataType.CREATURE);

      expect(files).toContain("list-test-1.json");
      expect(files).toContain("list-test-2.json");
      expect(files.length).toBeGreaterThanOrEqual(2);

      // Should not include metadata files
      expect(files.some((f) => f.endsWith(".meta.json"))).toBe(false);
    });

    it("should get metadata correctly", async () => {
      const testData = new TestData("metadata-test", "Metadata Test", 333);

      // Save file
      await persistenceManager.save(
        testData,
        "metadata-test.json",
        DataType.CREATURE
      );

      // Get metadata
      const metadata = await persistenceManager.getMetadata(
        "metadata-test.json",
        DataType.CREATURE
      );

      expect(metadata).toBeDefined();
      expect(metadata!.dataType).toBe(DataType.CREATURE);
      expect(metadata!.format).toBe(FileFormat.JSON);
      expect(metadata!.version).toBe("1.0.0");
      expect(metadata!.checksum).toBeDefined();
      expect(metadata!.timestamp).toBeDefined();
    });

    it("should handle load errors gracefully", async () => {
      // Try to load non-existent file
      const loadResult = await persistenceManager.load<TestData>(
        "non-existent.json",
        DataType.CREATURE
      );

      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain("File not found");
    });

    it("should handle save validation", async () => {
      const invalidData = { invalid: "data" } as any;

      // Try to save invalid data with validation
      const saveResult = await persistenceManager.save(
        invalidData,
        "invalid.json",
        DataType.CREATURE,
        { format: FileFormat.JSON, validateBeforeSave: true }
      );

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toContain("ISerializable interface");
    });

    it("should get correct directory paths", () => {
      const creatureDir = persistenceManager.getDirectoryPath(
        DataType.CREATURE
      );
      const worldDir = persistenceManager.getDirectoryPath(DataType.WORLD);
      const snapshotDir = persistenceManager.getDirectoryPath(
        DataType.SNAPSHOT
      );

      expect(creatureDir).toContain("Creatures");
      expect(worldDir).toContain("Worlds");
      expect(snapshotDir).toContain("Snapshots");
    });
  });

  describe("Factory Functions", () => {
    it("should create persistence manager", () => {
      const manager = createPersistenceManager();
      expect(manager).toBeDefined();
      expect(typeof manager.initialize).toBe("function");
    });

    it("should create initialized persistence manager", async () => {
      const manager = await createInitializedPersistenceManager({
        baseDirectory: tempDir,
      });

      expect(manager).toBeDefined();

      // Should be able to use immediately
      const testData = new TestData("factory-test", "Factory Test", 555);
      const result = await manager.save(
        testData,
        "factory-test.json",
        DataType.CREATURE
      );
      expect(result.success).toBe(true);

      await manager.cleanup();
    });

    it("should create test persistence manager", async () => {
      const testManager = createTestPersistenceManager("C:\\tmp\\test");
      expect(testManager).toBeDefined();

      // Initialize the manager first
      await testManager.initialize();

      expect(testManager.getDirectoryPath(DataType.CREATURE)).toContain(
        "C:\\tmp\\test"
      );

      await testManager.cleanup();
    });
  });

  describe("Error Handling", () => {
    it("should handle corrupted JSON files", async () => {
      // Create a corrupted JSON file
      const filePath = path.join(
        persistenceManager.getDirectoryPath(DataType.CREATURE),
        "corrupted.json"
      );
      await fs.writeFile(filePath, "{ invalid json }");

      // Try to load it
      const loadResult = await persistenceManager.load<TestData>(
        "corrupted.json",
        DataType.CREATURE
      );

      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toBeDefined();
    });

    it("should handle unsupported data types", () => {
      expect(() => {
        persistenceManager.getDirectoryPath("INVALID" as DataType);
      }).toThrow("Unsupported data type");
    });
  });
});
