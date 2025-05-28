/**
 * Persistence utility functions
 */

import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { FileFormat, IFileMetadata, DataType } from "./types";

/**
 * Calculate SHA-256 checksum for data
 */
export function calculateChecksum(data: string | Buffer): string {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
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
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  return `${baseName}.meta.json`;
}

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Serialize data to string based on format
 */
export function serializeData(data: any, format: FileFormat): string | Buffer {
  switch (format) {
    case FileFormat.JSON:
      return JSON.stringify(data, null, 2);
    case FileFormat.BINARY:
      // For binary format, we'll use JSON as the base and convert to Buffer
      // In a real implementation, you might use a more efficient binary format
      const jsonString = JSON.stringify(data);
      return Buffer.from(jsonString, "utf8");
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Deserialize data from string/buffer based on format
 */
export function deserializeData(
  data: string | Buffer,
  format: FileFormat
): any {
  switch (format) {
    case FileFormat.JSON:
      if (Buffer.isBuffer(data)) {
        return JSON.parse(data.toString("utf8"));
      }
      return JSON.parse(data as string);
    case FileFormat.BINARY:
      if (Buffer.isBuffer(data)) {
        return JSON.parse(data.toString("utf8"));
      }
      throw new Error("Binary format requires Buffer input");
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Create file metadata
 */
export function createFileMetadata(
  data: string | Buffer,
  format: FileFormat,
  dataType: DataType,
  version: string,
  compressed: boolean = false
): IFileMetadata {
  return {
    version,
    format,
    dataType,
    checksum: calculateChecksum(data),
    timestamp: getCurrentTimestamp(),
    size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, "utf8"),
    compressed,
  };
}

/**
 * Validate file against metadata
 */
export async function validateFileIntegrity(
  filePath: string,
  metadata: IFileMetadata
): Promise<boolean> {
  try {
    const fileData = await fs.readFile(filePath);
    const calculatedChecksum = calculateChecksum(fileData);
    return calculatedChecksum === metadata.checksum;
  } catch {
    return false;
  }
}

/**
 * Normalize Windows path separators
 */
export function normalizePath(filePath: string): string {
  return path.resolve(filePath).replace(/\//g, "\\");
}

/**
 * Get safe file name (remove invalid characters)
 */
export function getSafeFileName(fileName: string): string {
  // Remove or replace invalid Windows file name characters
  return fileName.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
}

/**
 * Simple compression using gzip (placeholder for future implementation)
 */
export async function compressData(data: string | Buffer): Promise<Buffer> {
  // For now, just return the data as Buffer
  // In a real implementation, you would use zlib.gzip
  if (Buffer.isBuffer(data)) {
    return data;
  }
  return Buffer.from(data, "utf8");
}

/**
 * Simple decompression using gzip (placeholder for future implementation)
 */
export async function decompressData(data: Buffer): Promise<Buffer> {
  // For now, just return the data
  // In a real implementation, you would use zlib.gunzip
  return data;
}

/**
 * Parse version string to comparable format
 */
export function parseVersion(version: string): number[] {
  return version.split(".").map((v) => parseInt(v, 10));
}

/**
 * Compare two version strings
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
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
