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
}));
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
      '# Test Markdown\n\nThis is a test.',
    );
    (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

    // Mock MistralService
    (MistralService as jest.Mock).mockImplementation(() => ({
      translateContent: mockTranslateContent,
    }));

    mockTranslateContent.mockResolvedValue(
      '# Test Markdown Translated\n\nThis is a translated test.',
    );
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
      'french',
    );
    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(
      options.output,
      '# Test Markdown Translated\n\nThis is a translated test.',
      'utf-8',
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
});
