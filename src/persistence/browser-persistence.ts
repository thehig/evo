/**
 * Browser-compatible persistence implementation
 * Uses localStorage and IndexedDB instead of file system
 */

import { FileFormat, IFileMetadata, DataType } from "./types";

/**
 * Calculate SHA-256 checksum for data using Web Crypto API
 */
export async function calculateChecksum(
  data: string | ArrayBuffer
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === "string" ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: FileFormat): string {
  switch (format) {
    case FileFormat.JSON:
      return ".json";
    case FileFormat.BINARY:
      return ".bin";
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Create metadata file name for a data file
 */
export function getMetadataFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const baseName =
    lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  return `${baseName}.meta.json`;
}

/**
 * Browser storage operations (no-op for directories)
 */
export async function ensureDirectoryExists(_dirPath: string): Promise<void> {
  // No-op in browser environment
  return Promise.resolve();
}

/**
 * Check if data exists in localStorage
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return localStorage.getItem(filePath) !== null;
}

/**
 * Get data size in localStorage
 */
export async function getFileSize(filePath: string): Promise<number> {
  const data = localStorage.getItem(filePath);
  return data ? new Blob([data]).size : 0;
}

/**
 * Serialize data to string based on format
 */
export function serializeData(
  data: any,
  format: FileFormat
): string | ArrayBuffer {
  switch (format) {
    case FileFormat.JSON:
      return JSON.stringify(data, null, 2);
    case FileFormat.BINARY:
      // For binary format, we'll use JSON as the base and convert to ArrayBuffer
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      return encoder.encode(jsonString).buffer;
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Deserialize data from string/ArrayBuffer based on format
 */
export function deserializeData(
  data: string | ArrayBuffer,
  format: FileFormat
): any {
  switch (format) {
    case FileFormat.JSON:
      if (data instanceof ArrayBuffer) {
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(data));
      }
      return JSON.parse(data as string);
    case FileFormat.BINARY:
      if (data instanceof ArrayBuffer) {
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(data));
      }
      throw new Error("Binary format requires ArrayBuffer input");
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Create file metadata
 */
export async function createFileMetadata(
  data: string | ArrayBuffer,
  format: FileFormat,
  dataType: DataType,
  version: string,
  compressed: boolean = false
): Promise<IFileMetadata> {
  const checksum = await calculateChecksum(data);
  const size =
    data instanceof ArrayBuffer ? data.byteLength : new Blob([data]).size;

  return {
    version,
    format,
    dataType,
    checksum,
    timestamp: getCurrentTimestamp(),
    size,
    compressed,
  };
}

/**
 * Validate data against metadata
 */
export async function validateFileIntegrity(
  filePath: string,
  metadata: IFileMetadata
): Promise<boolean> {
  try {
    const data = localStorage.getItem(filePath);
    if (!data) return false;

    const calculatedChecksum = await calculateChecksum(data);
    return calculatedChecksum === metadata.checksum;
  } catch {
    return false;
  }
}

/**
 * Normalize path for browser storage (just clean the key)
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/[\\\/]/g, "_");
}

/**
 * Get safe storage key (remove invalid characters)
 */
export function getSafeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
}

/**
 * Simple compression placeholder (browser environment)
 */
export async function compressData(
  data: string | ArrayBuffer
): Promise<ArrayBuffer> {
  // For now, just return the data as ArrayBuffer
  // In a real implementation, you could use CompressionStream
  if (data instanceof ArrayBuffer) {
    return data;
  }
  const encoder = new TextEncoder();
  return encoder.encode(data).buffer;
}

/**
 * Simple decompression placeholder (browser environment)
 */
export async function decompressData(data: ArrayBuffer): Promise<ArrayBuffer> {
  // For now, just return the data
  // In a real implementation, you could use DecompressionStream
  return data;
}

/**
 * Parse version string to comparable format
 */
export function parseVersion(version: string): number[] {
  return version.split(".").map((v) => parseInt(v, 10) || 0);
}

/**
 * Compare two version strings
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}
