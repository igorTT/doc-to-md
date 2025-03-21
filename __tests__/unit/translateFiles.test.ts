/**
 * Test Suite: translateFiles.test.ts
 * ===================================
 *
 * Purpose:
 * This test suite validates the file translation functionality of the application,
 * including language detection, file handling, cost estimation, and translation processes.
 *
 * Key Components Tested:
 * - translateFiles function
 * - MistralService integration
 * - TokenCountService integration
 * - File system operations
 *
 * Test Groups:
 * 1. Input validation - Tests for various input parameters and their validation
 * 2. File handling - Tests for file existence, reading, and writing operations
 * 3. Translation process - Tests for the core translation functionality
 * 4. Error handling - Tests for various error scenarios
 * 5. Cost estimation - Tests for token counting and cost estimation
 *
 * Environment Setup:
 * - All external dependencies (fs, path, MistralService, TokenCountService) are mocked
 * - Test data is created in-memory to simulate file operations
 */

import { translateFiles, SUPPORTED_LANGUAGES } from '../../src/translateFiles';
import { MistralService } from '../../src/services/mistralService';
import fs from 'fs-extra';
import path from 'path';
import { TokenCountService } from '../../src/services/tokenCountService';
import readline from 'readline';

// Mock dependencies
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
  copy: jest.fn(),
}));

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

jest.mock('../../src/services/mistralService');
jest.mock('../../src/services/tokenCountService');
jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn(),
    close: jest.fn(),
  }),
}));

describe('translateFiles', () => {
  // Mock MistralService
  const mockTranslateContent = jest.fn();
  // Mock TokenCountService
  const mockCountTokens = jest.fn();
  const mockEstimateCost = jest.fn();
  // Mock readline question
  const mockQuestion = jest.fn();
  const mockReadlineClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup fs mocks
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({
      isFile: () => true,
    });
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      '# Test Markdown\n\nThis is a test.',
    );
    (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.copy as unknown as jest.Mock).mockResolvedValue(undefined);

    // Mock MistralService
    (MistralService as jest.Mock).mockImplementation(() => ({
      translateContent: mockTranslateContent,
    }));

    // Mock TokenCountService
    (TokenCountService as jest.Mock).mockImplementation(() => ({
      countTokens: mockCountTokens,
      estimateCost: mockEstimateCost,
    }));

    // Setup readline mock
    mockQuestion.mockImplementation((question, callback) => {
      // Simulate user confirmation by default
      callback('y');
    });

    (readline.createInterface as jest.Mock).mockReturnValue({
      question: mockQuestion,
      close: mockReadlineClose,
    });

    mockTranslateContent.mockResolvedValue(
      '# Test Markdown Translated\n\nThis is a translated test.',
    );

    // Setup token count mocks
    mockCountTokens.mockReturnValueOnce(100).mockReturnValueOnce(120);
    mockEstimateCost.mockReturnValue(0.0008);

    // Set up path mocks for each test
    (path.basename as jest.Mock).mockImplementation((filePath, ext) => {
      if (ext) {
        if (filePath.includes('input')) return 'input';
        if (filePath.includes('output')) return 'output';
        if (filePath.includes('different-output')) return 'different-output';
      }
      return 'output.md';
    });
    (path.dirname as jest.Mock).mockReturnValue('/path/to');
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.extname as jest.Mock).mockReturnValue('.md');
  });

  it('should translate a markdown file successfully', async () => {
    // Arrange
    const options = {
      input: '/path/to/input.md',
      output: '/path/to/output.md',
      language: 'french',
    };

    // Act
    await translateFiles(options);

    // Assert
    expect(fs.pathExists).toHaveBeenCalledWith(options.input);
    expect(fs.stat).toHaveBeenCalledWith(options.input);
    expect(fs.readFile).toHaveBeenCalledWith(options.input, 'utf-8');
    // Check that user confirmation was requested
    expect(readline.createInterface).toHaveBeenCalled();
    expect(mockQuestion).toHaveBeenCalled();
    expect(mockReadlineClose).toHaveBeenCalled();
    expect(mockTranslateContent).toHaveBeenCalledWith(
      '# Test Markdown\n\nThis is a test.',
      'french',
    );
    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(
      options.output,
      '# Test Markdown Translated\n\nThis is a translated test.',
      'utf-8',
    );

    // Check for images folder path construction
    expect(path.basename).toHaveBeenCalledWith(
      options.input,
      path.extname(options.input),
    );
    expect(path.dirname).toHaveBeenCalledWith(options.input);
    expect(path.join).toHaveBeenCalledWith('/path/to', 'input-images');

    // Check if images folder exists
    expect(fs.pathExists).toHaveBeenCalledWith('/path/to/input-images');
  });

  it('should copy images folder if it exists', async () => {
    // Arrange
    const options = {
      input: '/path/to/input.md',
      output: '/path/to/output.md',
      language: 'french',
    };

    // Mock that images folder exists
    (fs.pathExists as jest.Mock).mockImplementation((path) => {
      if (path === '/path/to/input-images') {
        return Promise.resolve(true);
      }
      return Promise.resolve(true); // Default for other paths
    });

    // Act
    await translateFiles(options);

    // Assert
    // Check for output images folder path construction
    expect(path.basename).toHaveBeenCalledWith(
      options.output,
      path.extname(options.output),
    );
    expect(path.dirname).toHaveBeenCalledWith(options.output);
    expect(path.join).toHaveBeenCalledWith('/path/to', 'output-images');

    // Check that images folder is copied
    expect(fs.copy).toHaveBeenCalledWith(
      '/path/to/input-images',
      '/path/to/output-images',
    );
  });

  it('should update image paths in translated content if filenames differ', async () => {
    // Arrange
    const options = {
      input: '/path/to/input.md',
      output: '/path/to/different-output.md',
      language: 'french',
    };

    // Mock that images folder exists
    (fs.pathExists as jest.Mock).mockImplementation((path) => {
      if (path === '/path/to/input-images') {
        return Promise.resolve(true);
      }
      return Promise.resolve(true); // Default for other paths
    });

    // Mock translated content with image references
    mockTranslateContent.mockResolvedValue(
      '# Test Markdown Translated\n\n![Image](input-images/image-123.png)',
    );

    // Mock the writeFile implementation to capture the last call
    let lastWriteContent = '';
    (fs.writeFile as unknown as jest.Mock).mockImplementation(
      (path, content, encoding) => {
        lastWriteContent = content;
        return Promise.resolve();
      },
    );

    // Act
    await translateFiles(options);

    // Assert
    // Check that content is updated with new image paths
    expect(lastWriteContent).toBe(
      '# Test Markdown Translated\n\n![Image](output-images/image-123.png)',
    );
  });

  it('should throw an error if input file does not exist', async () => {
    // Arrange
    (fs.pathExists as jest.Mock).mockResolvedValue(false);
    const options = {
      input: '/path/to/nonexistent.md',
      output: '/path/to/output.md',
      language: 'french',
    };

    // Act & Assert
    await expect(translateFiles(options)).rejects.toThrow(
      `Input file does not exist: ${options.input}`,
    );
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(mockTranslateContent).not.toHaveBeenCalled();
  });

  it('should throw an error if input is not a file', async () => {
    // Arrange
    (fs.stat as unknown as jest.Mock).mockResolvedValue({
      isFile: () => false,
    });
    const options = {
      input: '/path/to/directory',
      output: '/path/to/output.md',
      language: 'french',
    };

    // Act & Assert
    await expect(translateFiles(options)).rejects.toThrow(
      `Input must be a file, not a directory: ${options.input}`,
    );
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(mockTranslateContent).not.toHaveBeenCalled();
  });

  it('should throw an error if language is not supported', async () => {
    // Arrange
    const options = {
      input: '/path/to/input.md',
      output: '/path/to/output.md',
      language: 'italian', // Unsupported language
    };

    // Act & Assert
    await expect(translateFiles(options)).rejects.toThrow(
      `Unsupported language: ${
        options.language
      }. Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}`,
    );
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(mockTranslateContent).not.toHaveBeenCalled();
  });

  it('should throw an error if translation fails', async () => {
    // Arrange
    mockTranslateContent.mockRejectedValue(new Error('Translation failed'));
    const options = {
      input: '/path/to/input.md',
      output: '/path/to/output.md',
      language: 'french',
    };

    // Act & Assert
    await expect(translateFiles(options)).rejects.toThrow(
      `Failed to translate file ${options.input}: Translation failed`,
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should count tokens in the input and translated content', async () => {
    // Reset all mocks to ensure clean state
    jest.clearAllMocks();

    // Test configuration
    const options = {
      input: 'input.md',
      output: 'output.md',
      language: 'french',
    };

    // Update mock implementations to ensure consistent values
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      '# Test Markdown\n\nThis is a test.',
    );

    // Setup file system mocks
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({
      isFile: () => true,
    });

    // Setup readline mock for confirmation
    const mockQuestionLocal = jest.fn();
    mockQuestionLocal.mockImplementation((question, callback) => {
      callback('y'); // Simulate user confirming
    });

    (readline.createInterface as jest.Mock).mockReturnValue({
      question: mockQuestionLocal,
      close: jest.fn(),
    });

    // Create a more deterministic mock for TokenCountService
    const mockTokenCountServiceInstance = {
      countTokens: jest.fn(),
      estimateCost: jest.fn(),
    };

    // Explicitly set up the return values
    mockTokenCountServiceInstance.countTokens
      .mockReturnValueOnce(100) // First call (input content)
      .mockReturnValueOnce(120); // Second call (translated content)

    mockTokenCountServiceInstance.estimateCost.mockReturnValue(0.0008);

    // Replace the TokenCountService constructor with a function that returns our mock instance
    (TokenCountService as jest.Mock).mockImplementation(
      () => mockTokenCountServiceInstance,
    );

    // Reset MistralService mock
    mockTranslateContent.mockResolvedValue(
      '# Test Markdown Translated\n\nThis is a translated test.',
    );

    // Run the function
    await translateFiles(options);

    // Check that countTokens was called properly
    expect(mockTokenCountServiceInstance.countTokens).toHaveBeenCalledTimes(2);
    expect(mockTokenCountServiceInstance.countTokens).toHaveBeenNthCalledWith(
      1,
      '# Test Markdown\n\nThis is a test.',
    );
    expect(mockTokenCountServiceInstance.countTokens).toHaveBeenNthCalledWith(
      2,
      '# Test Markdown Translated\n\nThis is a translated test.',
    );

    // Check that estimateCost was called with the correct token count
    expect(mockTokenCountServiceInstance.estimateCost).toHaveBeenCalledTimes(1);
    expect(mockTokenCountServiceInstance.estimateCost).toHaveBeenCalledWith(
      100,
      0.008,
    );

    // Verify readline was used for confirmation
    expect(readline.createInterface).toHaveBeenCalled();
    expect(mockQuestionLocal).toHaveBeenCalled();
  });

  it('should translate a markdown file successfully when user confirms', async () => {
    // Arrange
    const options = {
      input: '/path/to/input.md',
      output: '/path/to/output.md',
      language: 'french',
    };

    // Act
    await translateFiles(options);

    // Assert
    expect(fs.pathExists).toHaveBeenCalledWith(options.input);
    expect(fs.stat).toHaveBeenCalledWith(options.input);
    expect(fs.readFile).toHaveBeenCalledWith(options.input, 'utf-8');
    expect(readline.createInterface).toHaveBeenCalled();
    expect(mockQuestion).toHaveBeenCalled();
    expect(mockReadlineClose).toHaveBeenCalled();
    expect(mockTranslateContent).toHaveBeenCalledWith(
      '# Test Markdown\n\nThis is a test.',
      'french',
    );
    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(
      options.output,
      '# Test Markdown Translated\n\nThis is a translated test.',
      'utf-8',
    );
  });

  it('should cancel translation when user declines confirmation', async () => {
    // Arrange
    mockQuestion.mockImplementation((question, callback) => {
      // Simulate user declining the confirmation
      callback('n');
    });

    const options = {
      input: '/path/to/input.md',
      output: '/path/to/output.md',
      language: 'french',
    };

    // Act
    await translateFiles(options);

    // Assert
    expect(fs.pathExists).toHaveBeenCalledWith(options.input);
    expect(fs.stat).toHaveBeenCalledWith(options.input);
    expect(fs.readFile).toHaveBeenCalledWith(options.input, 'utf-8');
    expect(readline.createInterface).toHaveBeenCalled();
    expect(mockQuestion).toHaveBeenCalled();
    expect(mockReadlineClose).toHaveBeenCalled();
    expect(mockTranslateContent).not.toHaveBeenCalled();
    expect(fs.ensureDir).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
