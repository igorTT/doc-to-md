import { processFiles } from '../../src/processFiles';
import { MistralService } from '../../src/services/mistralService';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock dependencies
jest.mock('fs-extra', () => ({
  pathExists: jest.fn().mockResolvedValue(true),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
  }),
  readFile: jest.fn(),
}));

jest.mock('path', () => ({
  extname: jest.fn().mockReturnValue('.pdf'),
  dirname: jest.fn().mockReturnValue('/test'),
  basename: jest.fn().mockImplementation((filePath, ext) => {
    if (ext) {
      return 'input';
    }
    return 'output.md';
  }),
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  resolve: jest.fn().mockImplementation((...args) => args.join('/')),
}));

jest.mock('../../src/services/mistralService');

// Import mocked modules
import fs from 'fs-extra';
import path from 'path';

describe('processFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MistralService
    (MistralService.prototype.processFile as jest.Mock).mockResolvedValue(
      'Processed content'
    );
    (MistralService.prototype.isFileSupported as jest.Mock).mockReturnValue(
      true
    );
  });

  it('should process a single PDF file', async () => {
    // Arrange
    const options = {
      input: '/test/input.pdf',
      output: '/test/output.md',
    };

    // Act
    await processFiles(options);

    // Assert
    expect(fs.pathExists).toHaveBeenCalledWith(options.input);
    expect(fs.stat).toHaveBeenCalledWith(options.input);

    // Check that the images directory is created
    expect(path.basename).toHaveBeenCalledWith(
      options.input,
      path.extname(options.input)
    );
    expect(path.dirname).toHaveBeenCalledWith(options.output);
    expect(path.join).toHaveBeenCalledWith('/test', 'input-images');
    expect(fs.ensureDir).toHaveBeenCalledWith('/test/input-images');

    // Check that the MistralService is called with the correct parameters
    expect(MistralService.prototype.processFile).toHaveBeenCalledWith(
      options.input,
      '/test/input-images'
    );

    expect(fs.ensureDir).toHaveBeenCalledWith('/test');
    expect(fs.writeFile).toHaveBeenCalledWith(
      options.output,
      'Processed content',
      'utf-8'
    );
  });

  it('should throw an error if input file does not exist', async () => {
    // Arrange
    const options = {
      input: '/test/nonexistent.pdf',
      output: '/test/output.md',
    };

    (fs.pathExists as jest.Mock).mockResolvedValueOnce(false);

    // Act & Assert
    await expect(processFiles(options)).rejects.toThrow(
      `Input file does not exist: ${options.input}`
    );
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('should throw an error if input is not a file', async () => {
    // Arrange
    const options = {
      input: '/test/directory',
      output: '/test/output.md',
    };

    // Use type assertion to fix TypeScript error
    const statMock = fs.stat as unknown as jest.Mock;
    statMock.mockResolvedValueOnce({
      isFile: () => false,
      isDirectory: () => true,
    });

    // Act & Assert
    await expect(processFiles(options)).rejects.toThrow(
      `Input must be a file, not a directory: ${options.input}`
    );
  });

  it('should handle errors from MistralService', async () => {
    // Arrange
    const options = {
      input: '/test/input.pdf',
      output: '/test/output.md',
    };

    const mockError = new Error('API error');
    (MistralService.prototype.processFile as jest.Mock).mockRejectedValueOnce(
      mockError
    );

    // Act & Assert
    await expect(processFiles(options)).rejects.toThrow(
      `Failed to process PDF ${options.input}: API error`
    );
  });
});
