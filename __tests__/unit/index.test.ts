import { Command } from 'commander';
import { processFiles } from '../../src/processFiles';

// Mock action callback
let actionCallback: (options: any) => Promise<void>;

// Mock dependencies
jest.mock('commander', () => {
  const mockCommand = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    requiredOption: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn(function (callback) {
      actionCallback = callback;
      return this;
    }),
    parse: jest.fn().mockReturnThis(),
  };

  return {
    Command: jest.fn(() => mockCommand),
  };
});

jest.mock('../../src/processFiles', () => ({
  processFiles: jest.fn(),
}));

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('CLI', () => {
  let mockExit: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.exit and console methods
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exited with code ${code}`);
    });
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

    // Mock environment variables
    process.env.MISTRAL_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    delete process.env.MISTRAL_API_KEY;
  });

  it('should set up the CLI correctly', () => {
    // Act
    require('../../src/index');

    // Get the mock Command instance
    const commandInstance = new Command();

    // Assert
    expect(commandInstance.name).toHaveBeenCalledWith('doc-to-md');
    expect(commandInstance.description).toHaveBeenCalledWith(
      'CLI to process files and send them to an API',
    );
    expect(commandInstance.version).toHaveBeenCalledWith('1.0.0');
    expect(commandInstance.command).toHaveBeenCalledWith('process');
    expect(commandInstance.requiredOption).toHaveBeenCalledTimes(2);
    expect(commandInstance.option).toHaveBeenCalledTimes(3);
    expect(commandInstance.action).toHaveBeenCalledTimes(1);
    expect(commandInstance.parse).toHaveBeenCalledTimes(1);
  });

  it('should call processFiles when action is triggered with API option', async () => {
    // Arrange
    require('../../src/index');

    // Mock options
    const options = {
      input: '/test/input.txt',
      output: '/test/output.md',
      api: 'https://api.example.com/convert',
      mistral: false,
    };

    // Act
    await actionCallback(options);

    // Assert
    expect(processFiles).toHaveBeenCalledWith({
      input: options.input,
      output: options.output,
      api: options.api,
      recursive: undefined,
      useMistral: options.mistral,
    });
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Processing completed successfully!',
    );
  });

  it('should call processFiles when action is triggered with Mistral option', async () => {
    // Arrange
    require('../../src/index');

    // Mock options
    const options = {
      input: '/test/input.txt',
      output: '/test/output.md',
      mistral: true,
    };

    // Act
    await actionCallback(options);

    // Assert
    expect(processFiles).toHaveBeenCalledWith({
      input: options.input,
      output: options.output,
      api: undefined,
      recursive: undefined,
      useMistral: options.mistral,
    });
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Processing completed successfully!',
    );
  });

  it('should handle errors in the action callback', async () => {
    // Arrange
    require('../../src/index');

    // Mock options
    const options = {
      input: '/test/input.txt',
      output: '/test/output.md',
      api: 'https://api.example.com/convert',
    };

    // Mock processFiles to throw an error
    (processFiles as jest.Mock).mockRejectedValue(new Error('Test error'));

    // Act & Assert
    await expect(actionCallback(options)).rejects.toThrow(
      'Process exited with code 1',
    );
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error processing files:',
      'Test error',
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
