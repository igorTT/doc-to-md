/**
 * Test Suite: processFiles.test.ts
 * ================================
 *
 * Purpose:
 * This test suite validates the core PDF processing functionality that converts
 * PDF documents to markdown using the Mistral OCR service.
 *
 * Key Components Tested:
 * - processFiles function
 * - MistralService integration for OCR processing
 * - File system operations for reading PDFs and writing markdown
 * - TokenCountService for estimating processing costs
 *
 * Test Groups:
 * 1. Basic processing - Tests for successful PDF to markdown conversion
 * 2. Error handling - Tests for input validation and API error scenarios
 * 3. Options handling - Tests for directory output, recursive processing, and other options
 * 4. File types validation - Tests for supported and unsupported file types
 *
 * Environment Setup:
 * - MistralService is mocked to simulate API responses without actual API calls
 * - File system operations are mocked to test without actual file I/O
 * - Various PDF input scenarios are simulated with mock data
 */

import { processFiles } from '../../src/processFiles';
import { MistralService } from '../../src/services/mistralService';
import { TokenCountService } from '../../src/services/tokenCountService';

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
jest.mock('../../src/services/tokenCountService');

// Import mocked modules
import fs from 'fs-extra';
import path from 'path';

describe('processFiles', () => {
  // Mock MistralService
  const mockProcessFile = jest.fn();
  // Mock TokenCountService
  const mockCountTokens = jest.fn();
  const mockEstimateCost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MistralService
    (MistralService as jest.Mock).mockImplementation(() => ({
      processFile: mockProcessFile,
      isFileSupported: jest.fn().mockReturnValue(true),
    }));

    // Mock TokenCountService
    (TokenCountService as jest.Mock).mockImplementation(() => ({
      countTokens: mockCountTokens,
      estimateCost: mockEstimateCost,
    }));

    mockProcessFile.mockResolvedValue(
      '# OCR Result\n\nThis is the extracted text from the PDF.',
    );

    // Setup token count mocks
    mockCountTokens.mockReturnValue(150);
    mockEstimateCost.mockReturnValue(0.0012);
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
      path.extname(options.input),
    );
    expect(path.dirname).toHaveBeenCalledWith(options.output);
    expect(path.join).toHaveBeenCalledWith('/test', 'input-images');
    expect(fs.ensureDir).toHaveBeenCalledWith('/test/input-images');

    // Check that MistralService.processFile is called
    expect(mockProcessFile).toHaveBeenCalledWith(
      options.input,
      '/test/input-images',
    );

    expect(fs.ensureDir).toHaveBeenCalledWith('/test');
    expect(fs.writeFile).toHaveBeenCalledWith(
      options.output,
      '# OCR Result\n\nThis is the extracted text from the PDF.',
      'utf-8',
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
      `Input file does not exist: ${options.input}`,
    );
    expect(mockProcessFile).not.toHaveBeenCalled();
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
      `Input must be a file, not a directory: ${options.input}`,
    );
  });

  it('should handle errors from MistralService', async () => {
    // Arrange
    const options = {
      input: '/test/input.pdf',
      output: '/test/output.md',
    };

    const mockError = new Error('API error');
    mockProcessFile.mockRejectedValueOnce(mockError);

    // Act & Assert
    await expect(processFiles(options)).rejects.toThrow(
      `Failed to process PDF ${options.input}: API error`,
    );
  });

  it('should count tokens in the OCR result and estimate cost', async () => {
    // Test configuration
    const options = {
      input: 'input.pdf',
      output: 'output.md',
    };

    // Run the function
    await processFiles(options);

    // Check if TokenCountService was instantiated
    expect(TokenCountService).toHaveBeenCalledTimes(1);

    // Check if countTokens was called with OCR result
    expect(mockCountTokens).toHaveBeenCalledTimes(1);
    expect(mockCountTokens).toHaveBeenCalledWith(
      '# OCR Result\n\nThis is the extracted text from the PDF.',
    );

    // Check if estimateCost was called with the correct token count
    expect(mockEstimateCost).toHaveBeenCalledTimes(1);
    expect(mockEstimateCost).toHaveBeenCalledWith(150, 0.008);
  });
});
