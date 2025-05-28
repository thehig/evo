/**
 * Configurable logging system for the simulation
 *
 * Provides different log levels to control verbosity during training
 * and other operations.
 */

export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5,
}

export interface ILoggerConfig {
  level: LogLevel;
  prefix?: string;
  enableTimestamps?: boolean;
}

/**
 * Logger class with configurable verbosity levels
 */
export class Logger {
  private config: ILoggerConfig;

  constructor(config: Partial<ILoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      prefix: "",
      enableTimestamps: true,
      ...config,
    };
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<ILoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current log level
   */
  get level(): LogLevel {
    return this.config.level;
  }

  /**
   * Set log level
   */
  set level(level: LogLevel) {
    this.config.level = level;
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.ERROR) {
      this.log("ERROR", message, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.WARN) {
      this.log("WARN", message, ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.INFO) {
      this.log("INFO", message, ...args);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.DEBUG) {
      this.log("DEBUG", message, ...args);
    }
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.VERBOSE) {
      this.log("VERBOSE", message, ...args);
    }
  }

  /**
   * Internal logging method
   */
  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = this.config.enableTimestamps
      ? `[${new Date().toISOString()}] `
      : "";

    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : "";

    const formattedMessage = `${timestamp}${prefix}[${level}] ${message}`;

    // Use appropriate console method based on level
    switch (level) {
      case "ERROR":
        console.error(formattedMessage, ...args);
        break;
      case "WARN":
        console.warn(formattedMessage, ...args);
        break;
      default:
        console.log(formattedMessage, ...args);
        break;
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Environment-based logger configuration
 *
 * Reads from environment variables:
 * - LOG_LEVEL: Set the log level (SILENT, ERROR, WARN, INFO, DEBUG, VERBOSE)
 * - DEBUG: If set to 'true', enables DEBUG level
 * - VERBOSE: If set to 'true', enables VERBOSE level
 */
export function configureFromEnvironment(): void {
  const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
  const isDebug = process.env.DEBUG === "true";
  const isVerbose = process.env.VERBOSE === "true";

  let level = LogLevel.INFO; // Default

  // Priority: VERBOSE > DEBUG > LOG_LEVEL
  if (isVerbose) {
    level = LogLevel.VERBOSE;
  } else if (isDebug) {
    level = LogLevel.DEBUG;
  } else if (envLogLevel && envLogLevel in LogLevel) {
    level = LogLevel[envLogLevel as keyof typeof LogLevel];
  }

  logger.configure({ level });
}

/**
 * Create a logger with a specific prefix
 */
export function createLogger(prefix: string, level?: LogLevel): Logger {
  return new Logger({
    prefix,
    level: level ?? logger.level,
    enableTimestamps: true,
  });
}

// Configure from environment on module load
configureFromEnvironment();
