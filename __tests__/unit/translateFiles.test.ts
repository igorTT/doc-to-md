import { translateFiles, SUPPORTED_LANGUAGES } from '../../src/translateFiles';
import { MistralService } from '../../src/services/mistralService';
import fs from 'fs-extra';
import path from 'path';

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

describe('translateFiles', () => {
  // Mock MistralService
  const mockTranslateContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup fs mocks
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({
      isFile: () => true,
    });
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      '# Test Markdown\n\nThis is a test.'
    );
    (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.copy as unknown as jest.Mock).mockResolvedValue(undefined);

    // Mock MistralService
    (MistralService as jest.Mock).mockImplementation(() => ({
      translateContent: mockTranslateContent,
    }));

    mockTranslateContent.mockResolvedValue(
      '# Test Markdown Translated\n\nThis is a translated test.'
    );

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
    expect(mockTranslateContent).toHaveBeenCalledWith(
      '# Test Markdown\n\nThis is a test.',
      'french'
    );
    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(
      options.output,
      '# Test Markdown Translated\n\nThis is a translated test.',
      'utf-8'
    );

    // Check for images folder path construction
    expect(path.basename).toHaveBeenCalledWith(
      options.input,
      path.extname(options.input)
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
      path.extname(options.output)
    );
    expect(path.dirname).toHaveBeenCalledWith(options.output);
    expect(path.join).toHaveBeenCalledWith('/path/to', 'output-images');

    // Check that images folder is copied
    expect(fs.copy).toHaveBeenCalledWith(
      '/path/to/input-images',
      '/path/to/output-images'
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
      '# Test Markdown Translated\n\n![Image](input-images/image-123.png)'
    );

    // Mock the writeFile implementation to capture the last call
    let lastWriteContent = '';
    (fs.writeFile as unknown as jest.Mock).mockImplementation(
      (path, content, encoding) => {
        lastWriteContent = content;
        return Promise.resolve();
      }
    );

    // Act
    await translateFiles(options);

    // Assert
    // Check that content is updated with new image paths
    expect(lastWriteContent).toBe(
      '# Test Markdown Translated\n\n![Image](output-images/image-123.png)'
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
      `Input file does not exist: ${options.input}`
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
      `Input must be a file, not a directory: ${options.input}`
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
      }. Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}`
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
      `Failed to translate file ${options.input}: Translation failed`
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
