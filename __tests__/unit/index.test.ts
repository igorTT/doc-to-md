/**
 * Test Suite: index.test.ts
 * ========================
 *
 * Purpose:
 * This test suite validates the command-line interface setup and command handling
 * of the application, ensuring proper configuration of commands, options, and actions.
 *
 * Key Components Tested:
 * - CLI configuration with Commander
 * - Command registration and option parsing
 * - Integration with processFiles and translateFiles functions
 * - Error handling and help text
 *
 * Test Groups:
 * 1. CLI setup - Tests for proper initialization of the Commander instance
 * 2. Command registration - Tests for correct command configuration
 * 3. Option handling - Tests for required and optional parameters
 * 4. Action handling - Tests for command execution and error handling
 *
 * Environment Setup:
 * - Commander is fully mocked to test command configuration without actual execution
 * - Process environment is controlled to test different execution contexts
 * - Command handlers (processFiles, translateFiles) are mocked to verify proper integration
 */

import { Command } from 'commander';
import { processFiles } from '../../src/processFiles';
import { translateFiles } from '../../src/translateFiles';

// Mock dependencies
jest.mock('commander', () => {
  const mockCommand = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    requiredOption: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn(),
  };

  return {
    Command: jest.fn().mockImplementation(() => mockCommand),
  };
});

jest.mock('../../src/processFiles');
jest.mock('../../src/translateFiles');
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Store the action callbacks
let processActionCallback: (options: any) => Promise<void>;
let translateActionCallback: (options: any) => Promise<void>;

describe('CLI', () => {
  // Mock console methods
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  const mockProcessExit = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset action callbacks
    processActionCallback = undefined as any;
    translateActionCallback = undefined as any;

    // Mock the action method to capture the callbacks
    const commandInstance = new Command();
    let commandCount = 0;
    (commandInstance.command as jest.Mock).mockImplementation(() => {
      commandCount++;
      return commandInstance;
    });
    (commandInstance.action as jest.Mock).mockImplementation((callback) => {
      if (commandCount === 1) {
        processActionCallback = callback;
      } else if (commandCount === 2) {
        translateActionCallback = callback;
      }
      return commandInstance;
    });

    // Load the index.ts file to set up the CLI
    jest.isolateModules(() => {
      require('../../src/index');
    });
  });

  it('should set up the CLI correctly', () => {
    // Arrange
    const commandInstance = new Command();

    // Assert
    expect(commandInstance.name).toHaveBeenCalledWith('doc-to-md');
    expect(commandInstance.description).toHaveBeenCalledWith(
      'CLI to process PDF files using Mistral OCR'
    );
    expect(commandInstance.version).toHaveBeenCalledWith('1.0.0');
  });

  describe('process command', () => {
    it('should call processFiles when action is triggered', async () => {
      // Arrange
      process.env.MISTRAL_API_KEY = 'test-api-key';
      const options = {
        input: '/test/input.pdf',
        output: '/test/output.md',
      };

      // Act
      await processActionCallback(options);

      // Assert
      expect(processFiles).toHaveBeenCalledWith({
        input: options.input,
        output: options.output,
      });
    });

    it('should handle errors in the action callback', async () => {
      // Arrange
      process.env.MISTRAL_API_KEY = 'test-api-key';
      const options = {
        input: '/test/input.pdf',
        output: '/test/output.md',
      };
      const testError = new Error('Test error');
      (processFiles as jest.Mock).mockRejectedValueOnce(testError);

      // Act
      await processActionCallback(options);

      // Assert
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ERROR] Error processing PDF:',
        'Test error'
      );
    });

    it('should throw an error if MISTRAL_API_KEY is not set', async () => {
      // Arrange
      delete process.env.MISTRAL_API_KEY;
      const options = {
        input: '/test/input.pdf',
        output: '/test/output.md',
      };

      // Act
      await processActionCallback(options);

      // Assert
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ERROR] Error processing PDF:',
        'MISTRAL_API_KEY is not set in environment variables. Create a .env file with your API key.'
      );
    });
  });

  describe('translate command', () => {
    it('should call translateFiles when action is triggered', async () => {
      // Arrange
      process.env.MISTRAL_API_KEY = 'test-api-key';
      const options = {
        input: '/test/input.md',
        output: '/test/output.md',
        language: 'french',
      };

      // Act
      await translateActionCallback(options);

      // Assert
      expect(translateFiles).toHaveBeenCalledWith({
        input: options.input,
        output: options.output,
        language: options.language,
      });
    });

    it('should handle errors in the action callback', async () => {
      // Arrange
      process.env.MISTRAL_API_KEY = 'test-api-key';
      const options = {
        input: '/test/input.md',
        output: '/test/output.md',
        language: 'french',
      };
      const testError = new Error('Test error');
      (translateFiles as jest.Mock).mockRejectedValueOnce(testError);

      // Act
      await translateActionCallback(options);

      // Assert
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ERROR] Error translating file:',
        'Test error'
      );
    });

    it('should throw an error if MISTRAL_API_KEY is not set', async () => {
      // Arrange
      delete process.env.MISTRAL_API_KEY;
      const options = {
        input: '/test/input.md',
        output: '/test/output.md',
        language: 'french',
      };

      // Act
      await translateActionCallback(options);

      // Assert
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ERROR] Error translating file:',
        'MISTRAL_API_KEY is not set in environment variables. Create a .env file with your API key.'
      );
    });
  });
});
