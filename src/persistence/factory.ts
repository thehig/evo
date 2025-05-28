/**
 * Persistence system factory functions
 */

import { PersistenceManager } from "./persistence-manager";
import { IPersistenceManager, IDirectoryConfig } from "./types";

/**
 * Create a new persistence manager instance
 */
export function createPersistenceManager(): IPersistenceManager {
  const manager = new PersistenceManager();
  return manager;
}

/**
 * Create and initialize a persistence manager
 */
export async function createInitializedPersistenceManager(
  config?: Partial<IDirectoryConfig>
): Promise<IPersistenceManager> {
  const manager = createPersistenceManager();
  await manager.initialize(config);
  return manager;
}

/**
 * Create a persistence manager for testing with temporary directory
 */
export function createTestPersistenceManager(
  testDir: string
): IPersistenceManager {
  const manager = new PersistenceManager();
  // We need to create a custom manager that will use the test directory
  // when initialized. We'll return a wrapper that ensures proper initialization.
  return {
    async initialize(config?: Partial<IDirectoryConfig>): Promise<void> {
      const testConfig: Partial<IDirectoryConfig> = {
        baseDirectory: testDir,
        ...config,
      };
      return manager.initialize(testConfig);
    },
    save: manager.save.bind(manager),
    load: manager.load.bind(manager),
    exists: manager.exists.bind(manager),
    delete: manager.delete.bind(manager),
    list: manager.list.bind(manager),
    getMetadata: manager.getMetadata.bind(manager),
    validateFile: manager.validateFile.bind(manager),
    getDirectoryPath: manager.getDirectoryPath.bind(manager),
    cleanup: manager.cleanup.bind(manager),
  };
}

/**
 * Create a persistence manager with custom base directory
 */
export function createCustomPersistenceManager(
  baseDirectory: string
): IPersistenceManager {
  return createTestPersistenceManager(baseDirectory);
}
