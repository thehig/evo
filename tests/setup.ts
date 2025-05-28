/**
 * Test setup file
 *
 * Configures the test environment before running tests.
 */

import { logger, LogLevel } from "../src/utils/logger";

// Configure logger for tests - set to SILENT by default to reduce console output
// Can be overridden by setting environment variables:
// - LOG_LEVEL=DEBUG npm test (for debug output)
// - VERBOSE=true npm test (for verbose output)
// - DEBUG=true npm test (for debug output)

const testLogLevel = process.env.LOG_LEVEL?.toUpperCase();
const isDebug = process.env.DEBUG === "true";
const isVerbose = process.env.VERBOSE === "true";

let level = LogLevel.SILENT; // Default for tests

if (isVerbose) {
  level = LogLevel.VERBOSE;
} else if (isDebug) {
  level = LogLevel.DEBUG;
} else if (testLogLevel && testLogLevel in LogLevel) {
  level = LogLevel[testLogLevel as keyof typeof LogLevel];
}

logger.configure({
  level,
  enableTimestamps: false, // Disable timestamps in tests for cleaner output
});

// Log the configuration for debugging test setup issues
if (level > LogLevel.SILENT) {
  logger.info(`Test logging configured to level: ${LogLevel[level]}`);
}
