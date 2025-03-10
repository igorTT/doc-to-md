import { MistralService } from '../../src/services/mistralService';
import { Mistral } from '@mistralai/mistralai';

// Mock dependencies
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  pathExists: jest.fn(),
}));

jest.mock('path', () => ({
  extname: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn(),
  join: jest.fn(),
}));

jest.mock('@mistralai/mistralai');
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Import mocked modules
import fs from 'fs-extra';
import path from 'path';

describe('MistralService', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock environment variables
    process.env = { ...originalEnv, MISTRAL_API_KEY: 'test-api-key' };

    // Mock path functions
    (path.extname as jest.Mock).mockImplementation((filePath: string) => {
      const parts = filePath.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });

    // Mock Mistral client
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(
      () =>
        ({
          chat: {
            complete: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'Extracted text from image',
                  },
                },
              ],
            }),
          },
        } as any),
    );
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create a Mistral client with the API key', () => {
      // Act
      new MistralService();

      // Assert
      expect(Mistral).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should throw an error if API key is not set', () => {
      // Arrange
      delete process.env.MISTRAL_API_KEY;

      // Act & Assert
      expect(() => new MistralService()).toThrow(
        'MISTRAL_API_KEY is not set in environment variables',
      );
    });
  });

  describe('isFileSupported', () => {
    it('should return true for supported image files', () => {
      // Arrange
      const service = new MistralService();
      const supportedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.webp',
      ];

      // Act & Assert
      supportedExtensions.forEach((ext) => {
        (path.extname as jest.Mock).mockReturnValueOnce(ext);
        expect(service.isFileSupported(`test${ext}`)).toBe(true);
      });
    });

    it('should return true for supported document files', () => {
      // Arrange
      const service = new MistralService();
      (path.extname as jest.Mock).mockReturnValue('.pdf');

      // Act & Assert
      expect(service.isFileSupported('test.pdf')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      // Arrange
      const service = new MistralService();
      const unsupportedExtensions = ['.txt', '.docx', '.xlsx', '.html', '.js'];

      // Act & Assert
      unsupportedExtensions.forEach((ext) => {
        (path.extname as jest.Mock).mockReturnValueOnce(ext);
        expect(service.isFileSupported(`test${ext}`)).toBe(false);
      });
    });
  });

  describe('processFile', () => {
    it('should throw an error for unsupported file types', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.txt';
      (path.extname as jest.Mock).mockReturnValue('.txt');

      // Act & Assert
      await expect(service.processFile(filePath)).rejects.toThrow(
        'Unsupported file type: .txt',
      );
    });

    it('should process a JPG image file correctly', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';

      // Mock file reading
      (fs.readFile as unknown as jest.Mock).mockResolvedValue(
        Buffer.from('test-image-data'),
      );
      (path.extname as unknown as jest.Mock).mockReturnValue('.jpg');

      // Act
      const result = await service.processFile(filePath);

      // Assert
      expect(fs.readFile).toHaveBeenCalledWith(filePath);
      expect(result).toBe('Extracted text from image');
    });
  });
});
