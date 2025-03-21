/**
 * Test Suite: loggerService.test.ts
 * =================================
 *
 * Purpose:
 * This test suite validates the logger service functionality which provides consistent
 * logging across the application with different log levels and formatting options.
 *
 * Key Components Tested:
 * - LoggerService singleton pattern
 * - Log level filtering (DEBUG, INFO, WARN, ERROR, NONE)
 * - Message formatting and additional arguments handling
 *
 * Test Groups:
 * 1. Singleton pattern - Tests to ensure the logger follows a singleton pattern
 * 2. Log level filtering - Tests for different log levels and message filtering
 * 3. Additional arguments - Tests for passing extra arguments to log methods
 *
 * Environment Setup:
 * - Console methods (log, warn, error) are mocked to verify logger behavior
 * - Log level is reset between tests to ensure consistent test environment
 */

import { LoggerService, logger } from '../../src/services/loggerService';

describe('LoggerService', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;

  let mockConsoleLog: jest.Mock;
  let mockConsoleWarn: jest.Mock;
  let mockConsoleError: jest.Mock;

  beforeEach(() => {
    // Save original console methods
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    // Create mocks
    mockConsoleLog = jest.fn();
    mockConsoleWarn = jest.fn();
    mockConsoleError = jest.fn();

    // Replace console methods with mocks
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Reset log level to INFO for other tests
    logger.setLogLevel(LoggerService.LogLevel.INFO);
  });

  describe('Singleton pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = LoggerService.getInstance();
      const instance2 = LoggerService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should expose a logger singleton', () => {
      expect(logger).toBeInstanceOf(LoggerService);
    });
  });

  describe('Log level filtering', () => {
    it('should log all levels when log level is DEBUG', () => {
      logger.setLogLevel(LoggerService.LogLevel.DEBUG);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleLog).toHaveBeenCalledWith('[DEBUG] debug message');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] info message');
      expect(mockConsoleWarn).toHaveBeenCalledWith('[WARN] warn message');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should log only INFO and higher when log level is INFO', () => {
      logger.setLogLevel(LoggerService.LogLevel.INFO);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleLog).not.toHaveBeenCalledWith('[DEBUG] debug message');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] info message');
      expect(mockConsoleWarn).toHaveBeenCalledWith('[WARN] warn message');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should log only WARN and higher when log level is WARN', () => {
      logger.setLogLevel(LoggerService.LogLevel.WARN);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleLog).not.toHaveBeenCalledWith('[DEBUG] debug message');
      expect(mockConsoleLog).not.toHaveBeenCalledWith('[INFO] info message');
      expect(mockConsoleWarn).toHaveBeenCalledWith('[WARN] warn message');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should log only ERROR when log level is ERROR', () => {
      logger.setLogLevel(LoggerService.LogLevel.ERROR);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleLog).not.toHaveBeenCalledWith('[DEBUG] debug message');
      expect(mockConsoleLog).not.toHaveBeenCalledWith('[INFO] info message');
      expect(mockConsoleWarn).not.toHaveBeenCalledWith('[WARN] warn message');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should not log anything when log level is NONE', () => {
      logger.setLogLevel(LoggerService.LogLevel.NONE);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('Additional arguments', () => {
    it('should pass additional arguments to console methods', () => {
      const obj = { foo: 'bar' };
      const num = 42;

      logger.debug('debug message', obj, num);
      logger.setLogLevel(LoggerService.LogLevel.DEBUG);
      logger.debug('debug message', obj, num);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[DEBUG] debug message',
        obj,
        num
      );
    });
  });
});
