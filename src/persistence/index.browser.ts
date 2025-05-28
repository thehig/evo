/**
 * Browser-compatible persistence module exports
 * This file is used when building for browser environments
 */

// Export types (these are environment-agnostic)
export * from "./types";

// Export browser-compatible utilities
export * from "./browser-persistence";

// Export a simplified browser persistence manager
export class BrowserPersistenceManager {
  constructor() {
    // Browser persistence manager is always "initialized"
  }

  /**
   * Initialize the persistence system (no-op in browser)
   */
  async initialize(): Promise<void> {
    // No-op in browser
  }

  /**
   * Save data to localStorage
   */
  async save<T extends { serialize(): any }>(
    data: T,
    fileName: string,
    dataType: string,
    _config: { format?: string; compress?: boolean } = {}
  ): Promise<{ success: boolean; filePath: string; error?: string }> {
    try {
      const serializedData = data.serialize();
      const key = `${dataType}_${fileName}`;
      localStorage.setItem(key, JSON.stringify(serializedData));

      return {
        success: true,
        filePath: key,
      };
    } catch (error) {
      return {
        success: false,
        filePath: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Load data from localStorage
   */
  async load<T>(
    fileName: string,
    dataType: string
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const key = `${dataType}_${fileName}`;
      const data = localStorage.getItem(key);

      if (!data) {
        return {
          success: false,
          error: `Data not found: ${key}`,
        };
      }

      return {
        success: true,
        data: JSON.parse(data) as T,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if data exists in localStorage
   */
  async exists(fileName: string, dataType: string): Promise<boolean> {
    const key = `${dataType}_${fileName}`;
    return localStorage.getItem(key) !== null;
  }

  /**
   * Delete data from localStorage
   */
  async delete(fileName: string, dataType: string): Promise<boolean> {
    try {
      const key = `${dataType}_${fileName}`;
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all keys for a data type
   */
  async list(dataType: string): Promise<string[]> {
    const prefix = `${dataType}_`;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  }

  /**
   * Clear all data (no-op in browser for safety)
   */
  async cleanup(): Promise<void> {
    // Don't clear all localStorage as it might contain other app data
    console.warn("Browser persistence cleanup is disabled for safety");
  }
}

// Export the browser persistence manager as the default
export const PersistenceManager = BrowserPersistenceManager;
