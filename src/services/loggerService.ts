/**
 * A logger service that provides consistent logging across the application
 * with different log levels and formatting options.
 */
export class LoggerService {
  private static instance: LoggerService;
  private logLevel: number = LoggerService.LogLevel.INFO;

  /**
   * Log levels in ascending order of severity
   */
  public static readonly LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  } as const;

  /**
   * Get the singleton instance of LoggerService
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Set the current log level
   * @param level The minimum log level to display
   */
  public setLogLevel(level: number): void {
    this.logLevel = level;
  }

  /**
   * Log a debug message (detailed information, typically for debugging)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LoggerService.LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log an info message (general information about application progress)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public info(message: string, ...args: any[]): void {
    if (this.logLevel <= LoggerService.LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log a warning message (potentially problematic situations)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LoggerService.LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log an error message (errors that prevent normal operation)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public error(message: string, ...args: any[]): void {
    if (this.logLevel <= LoggerService.LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

export type LogLevel =
  (typeof LoggerService.LogLevel)[keyof typeof LoggerService.LogLevel];

/**
 * Convenience function to get the logger instance
 */
export const logger = LoggerService.getInstance();
