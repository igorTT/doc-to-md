import fs from 'fs-extra';
import path from 'path';
import { MistralService } from '../../src/services/mistralService';
import { processFiles } from '../../src/processFiles';

// Mock the MistralService to avoid actual API calls
jest.mock('../../src/services/mistralService');

// Mock fs-extra to avoid actual file operations
jest.mock('fs-extra', () => {
  const originalModule = jest.requireActual('fs-extra');
  return {
    ...originalModule,
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined),
    pathExists: jest.fn().mockResolvedValue(true),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn(),
    readdir: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };
});

describe('Mistral OCR Integration Tests', () => {
  const testDir = '/test/files';
  const inputFile = path.join(testDir, 'test-input.jpg');
  const outputFile = path.join(testDir, 'test-output.md');

  // Store original environment
  const originalEnv = process.env;

  beforeAll(() => {
    // Mock environment variables
    process.env.MISTRAL_API_KEY = 'test-api-key';

    // Mock MistralService.processFile to return a predictable result
    const mockProcessFile = jest
      .fn()
      .mockResolvedValue(
        '# Extracted Text\n\nThis is text extracted from the image.',
      );
    (MistralService.prototype.processFile as jest.Mock) = mockProcessFile;
    (MistralService.prototype.isFileSupported as jest.Mock) = jest
      .fn()
      .mockReturnValue(true);

    // Mock fs.stat to simulate file/directory checks
    (fs.stat as unknown as jest.Mock).mockImplementation((path) => {
      if (path === testDir) {
        return Promise.resolve({
          isFile: () => false,
          isDirectory: () => true,
        });
      } else {
        return Promise.resolve({
          isFile: () => true,
          isDirectory: () => false,
        });
      }
    });

    // Mock fs.readdir to return test files
    (fs.readdir as unknown as jest.Mock).mockResolvedValue([
      'test-input.jpg',
      'unsupported.xyz',
    ]);

    // Mock fs.readFile to return test content
    (fs.readFile as unknown as jest.Mock).mockImplementation(
      (path, options) => {
        if (path === outputFile && options === 'utf-8') {
          return Promise.resolve(
            '# Extracted Text\n\nThis is text extracted from the image.',
          );
        } else {
          return Promise.resolve(Buffer.from('dummy content'));
        }
      },
    );
  });

  afterAll(() => {
    // Restore environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process a file with the Mistral OCR option', async () => {
    // Arrange
    const options = {
      input: inputFile,
      output: outputFile,
      useMistral: true,
    };

    // Act
    await processFiles(options);

    // Assert
    expect(MistralService.prototype.processFile).toHaveBeenCalledWith(
      inputFile,
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      outputFile,
      '# Extracted Text\n\nThis is text extracted from the image.',
      'utf-8',
    );
  });

  it('should skip unsupported files when processing a directory', async () => {
    // Arrange
    const options = {
      input: testDir,
      output: path.join(testDir, 'output'),
      useMistral: true,
    };

    // Mock isFileSupported to return false for the unsupported file
    (MistralService.prototype.isFileSupported as jest.Mock).mockImplementation(
      (filePath: string) => !filePath.includes('unsupported'),
    );

    // Act
    await processFiles(options);

    // Assert
    // Should only process the supported file
    expect(MistralService.prototype.processFile).toHaveBeenCalledTimes(1);
    expect(MistralService.prototype.processFile).toHaveBeenCalledWith(
      path.join(testDir, 'test-input.jpg'),
    );

    // Should not process the unsupported file
    expect(MistralService.prototype.processFile).not.toHaveBeenCalledWith(
      path.join(testDir, 'unsupported.xyz'),
    );
  });
});
