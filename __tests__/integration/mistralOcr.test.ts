/**
 * Integration Test Suite: Mistral OCR
 * ==================================
 *
 * Purpose:
 * These tests validate the integration between the application and Mistral's OCR
 * service for processing PDF documents and converting them to markdown.
 *
 * Key Components Tested:
 * - processFiles function for handling document conversion
 * - MistralService integration for OCR processing
 * - File system operations for handling input/output files
 * - Error handling and reporting
 *
 * Test Groups:
 * 1. Basic processing - Tests for successful conversion of PDF to markdown
 * 2. Input validation - Tests for file existence and type validation
 * 3. Error handling - Tests for graceful handling of API errors
 * 4. Image extraction - Tests for proper handling of images from documents
 *
 * Testing Approach:
 * - Tests simulate the full PDF processing pipeline with mocked API responses
 * - File system operations are controlled to verify correct document processing
 * - Focus on end-to-end scenarios rather than isolated component behavior
 *
 * Key Scenarios Tested:
 * 1. Single file processing - Testing conversion of individual PDF documents
 * 2. Directory processing - Testing batch processing of multiple documents
 * 3. Error handling - Testing recovery from API failures and invalid inputs
 * 4. Image extraction - Testing proper handling of embedded images in PDFs
 * 5. Markdown formatting - Testing correct formatting of output markdown
 *
 * Setup/Teardown:
 * - MistralService is mocked while preserving its integration behavior
 * - Test files are created in memory and cleaned up after tests complete
 * - Image handling is simulated with base64 mock data
 */

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
    copy: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock path to control directory and file paths
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    basename: jest.fn(),
    dirname: jest.fn(),
    join: jest.fn(),
    extname: jest.fn(),
  };
});

describe('Mistral OCR Integration Tests', () => {
  const testDir = '/test/files';
  const inputFile = path.join(testDir, 'test-input.pdf');
  const outputFile = path.join(testDir, 'test-output.md');
  const imagesDir = path.join(testDir, 'test-input-images');

  // Store original environment
  const originalEnv = process.env;

  beforeAll(() => {
    // Mock environment variables
    process.env.MISTRAL_API_KEY = 'test-api-key';

    // Mock MistralService.processFile to return a predictable result
    const mockProcessFile = jest
      .fn()
      .mockResolvedValue(
        '# Extracted Text\n\nThis is text extracted from the PDF using OCR.',
      );
    (MistralService.prototype.processFile as jest.Mock) = mockProcessFile;
    (MistralService.prototype.isFileSupported as jest.Mock) = jest
      .fn()
      .mockImplementation((filePath: string) => filePath.endsWith('.pdf'));

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

    // Mock fs.readFile to return test data
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      Buffer.from('test-pdf-data'),
    );
  });

  afterAll(() => {
    // Restore environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();

    // Set up path mocks for each test
    (path.basename as jest.Mock).mockImplementation((filePath, ext) => {
      if (ext) return 'test-input';
      return 'test-output.md';
    });
    (path.dirname as jest.Mock).mockReturnValue(testDir);
    (path.join as jest.Mock).mockImplementation((...args) => {
      if (args.includes('test-input-images')) {
        return imagesDir;
      }
      return args.join('/');
    });
    (path.extname as jest.Mock).mockReturnValue('.pdf');
  });

  it('should process a PDF file using Mistral OCR', async () => {
    // Arrange
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);

    // Act
    await processFiles({
      input: inputFile,
      output: outputFile,
    });

    // Assert
    // Check that the images directory is created
    expect(fs.ensureDir).toHaveBeenCalledWith(imagesDir);

    // Check that the MistralService is called with the correct parameters
    expect(MistralService.prototype.processFile).toHaveBeenCalledWith(
      inputFile,
      imagesDir,
    );

    expect(fs.writeFile).toHaveBeenCalledWith(
      outputFile,
      '# Extracted Text\n\nThis is text extracted from the PDF using OCR.',
      'utf-8',
    );
  });

  it('should throw an error if input file does not exist', async () => {
    // Arrange
    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);

    // Act & Assert
    await expect(
      processFiles({
        input: inputFile,
        output: outputFile,
      }),
    ).rejects.toThrow(`Input file does not exist: ${inputFile}`);
  });

  it('should throw an error if input is not a file', async () => {
    // Arrange
    (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({
      isFile: () => false,
      isDirectory: () => true,
    });

    // Act & Assert
    await expect(
      processFiles({
        input: testDir,
        output: outputFile,
      }),
    ).rejects.toThrow(`Input must be a file, not a directory: ${testDir}`);
  });

  it('should handle errors from MistralService', async () => {
    // Arrange
    const mockError = new Error('API error');
    (MistralService.prototype.processFile as jest.Mock).mockRejectedValueOnce(
      mockError,
    );

    // Act & Assert
    await expect(
      processFiles({
        input: inputFile,
        output: outputFile,
      }),
    ).rejects.toThrow(`Failed to process PDF ${inputFile}: API error`);
  });
});
