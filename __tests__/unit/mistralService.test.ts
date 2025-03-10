import { MistralService } from '../../src/services/mistralService';
import { Mistral } from '@mistralai/mistralai';
import fs from 'fs-extra';
import path from 'path';

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

describe('MistralService', () => {
  // Store original environment
  const originalEnv = process.env;

  // Mock Mistral client and its methods
  const mockFilesUpload = jest.fn().mockResolvedValue({ id: 'file-123' });
  const mockFilesGetSignedUrl = jest
    .fn()
    .mockResolvedValue({ url: 'https://signed-url.com/file-123' });
  const mockFilesRetrieve = jest.fn().mockResolvedValue({
    id: 'file-123',
    object: 'file',
    size_bytes: 3749788,
    created_at: 1741023462,
    filename: 'test-file.jpg',
    purpose: 'ocr',
    sample_type: 'ocr_input',
    source: 'upload',
    deleted: false,
    num_lines: null,
  });
  const mockOcrProcess = jest
    .fn()
    .mockResolvedValue({ text: 'OCR extracted text' });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock environment variables
    process.env = { ...originalEnv, MISTRAL_API_KEY: 'test-api-key' };

    // Mock path functions
    (path.extname as unknown as jest.Mock).mockImplementation(
      (filePath: string) => {
        const parts = filePath.split('.');
        return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
      },
    );

    (path.basename as unknown as jest.Mock).mockReturnValue('test-file.jpg');

    // Mock Mistral client
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(
      () =>
        ({
          files: {
            upload: mockFilesUpload,
            getSignedUrl: mockFilesGetSignedUrl,
            retrieve: mockFilesRetrieve,
          },
          ocr: {
            process: mockOcrProcess,
          },
        } as any),
    );

    // Mock fs.readFile
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      Buffer.from('test-file-data'),
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
        (path.extname as unknown as jest.Mock).mockReturnValueOnce(ext);
        expect(service.isFileSupported(`test${ext}`)).toBe(true);
      });
    });

    it('should return true for supported document files', () => {
      // Arrange
      const service = new MistralService();
      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');

      // Act & Assert
      expect(service.isFileSupported('test.pdf')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      // Arrange
      const service = new MistralService();
      const unsupportedExtensions = ['.txt', '.docx', '.xlsx', '.html', '.js'];

      // Act & Assert
      unsupportedExtensions.forEach((ext) => {
        (path.extname as unknown as jest.Mock).mockReturnValueOnce(ext);
        expect(service.isFileSupported(`test${ext}`)).toBe(false);
      });
    });
  });

  describe('processFile', () => {
    it('should throw an error for unsupported file types', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.txt';
      (path.extname as unknown as jest.Mock).mockReturnValue('.txt');

      // Act & Assert
      await expect(service.processFile(filePath)).rejects.toThrow(
        'Unsupported file type: .txt',
      );
    });

    it('should process a file using the OCR API', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';

      (path.extname as unknown as jest.Mock).mockReturnValue('.jpg');

      // Act
      const result = await service.processFile(filePath);

      // Assert
      expect(result).toBe('OCR extracted text');
      expect(mockFilesUpload).toHaveBeenCalledWith({
        file: {
          fileName: 'test-file.jpg',
          content: Buffer.from('test-file-data'),
        },
        purpose: 'ocr',
      });
      expect(mockFilesGetSignedUrl).toHaveBeenCalledWith({
        fileId: 'file-123',
      });
      expect(mockOcrProcess).toHaveBeenCalledWith({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: 'https://signed-url.com/file-123',
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';

      (path.extname as unknown as jest.Mock).mockReturnValue('.jpg');

      // Mock API error
      const mockError = new Error('API rate limit exceeded');
      mockFilesUpload.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(service.processFile(filePath)).rejects.toThrow(
        'Failed to process file with Mistral OCR API: API rate limit exceeded',
      );
    });

    it('should handle missing text in OCR response', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';

      (path.extname as unknown as jest.Mock).mockReturnValue('.jpg');

      // Mock OCR response without text property
      mockOcrProcess.mockResolvedValueOnce({ some: 'data' });

      // Act
      const result = await service.processFile(filePath);

      // Assert
      expect(result).toBe('{"some":"data"}');
    });

    it('should handle OCR response with content property', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';

      (path.extname as unknown as jest.Mock).mockReturnValue('.jpg');

      // Mock OCR response with content property
      mockOcrProcess.mockResolvedValueOnce({
        content: 'OCR extracted content',
      });

      // Act
      const result = await service.processFile(filePath);

      // Assert
      expect(result).toBe('OCR extracted content');
    });

    it('should handle OCR response with pages array', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';

      (path.extname as unknown as jest.Mock).mockReturnValue('.jpg');

      // Mock OCR response with pages array
      mockOcrProcess.mockResolvedValueOnce({
        pages: [
          { content: 'Page 1 content' },
          { content: 'Page 2 content' },
          { content: 'Page 3 content' },
        ],
      });

      // Act
      const result = await service.processFile(filePath);

      // Assert
      expect(result).toBe('Page 1 content\n\nPage 2 content\n\nPage 3 content');
    });

    it('should handle OCR response with empty or invalid pages', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';

      (path.extname as unknown as jest.Mock).mockReturnValue('.jpg');

      // Mock OCR response with some invalid pages
      mockOcrProcess.mockResolvedValueOnce({
        pages: [
          { content: 'Valid page content' },
          null,
          {},
          { other: 'property' },
        ],
      });

      // Act
      const result = await service.processFile(filePath);

      // Assert
      // Instead of checking the exact string, check that it contains the valid content
      // and has the expected number of page separators
      expect(result).toContain('Valid page content');
      expect(result.split('\n\n').length).toBe(4); // 4 pages (including empty ones)
    });
  });

  describe('retrieveFileDetails', () => {
    it('should retrieve file details successfully', async () => {
      // Arrange
      const service = new MistralService();
      const fileId = 'file-123';
      const mockFileDetails = {
        id: fileId,
        object: 'file',
        size_bytes: 3749788,
        created_at: 1741023462,
        filename: 'test-file.jpg',
        purpose: 'ocr',
        sample_type: 'ocr_input',
        source: 'upload',
        deleted: false,
        num_lines: null,
      };

      mockFilesRetrieve.mockResolvedValueOnce(mockFileDetails);

      // Act
      const result = await service.retrieveFileDetails(fileId);

      // Assert
      expect(mockFilesRetrieve).toHaveBeenCalledWith({
        fileId: fileId,
      });
      expect(result).toEqual(mockFileDetails);
    });

    it('should handle errors when retrieving file details', async () => {
      // Arrange
      const service = new MistralService();
      const fileId = 'file-123';
      const mockError = new Error('File not found');

      mockFilesRetrieve.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(service.retrieveFileDetails(fileId)).rejects.toThrow(
        'Failed to retrieve file details: File not found',
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';
      const mockUploadResult = { id: 'file-123' };

      (path.basename as unknown as jest.Mock).mockReturnValue('test.jpg');

      // Act
      const result = await service.uploadFile(filePath);

      // Assert
      expect(mockFilesUpload).toHaveBeenCalledWith({
        file: {
          fileName: 'test.jpg',
          content: Buffer.from('test-file-data'),
        },
        purpose: 'ocr',
      });
      expect(result).toEqual(mockUploadResult);
    });

    it('should handle errors when uploading a file', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.jpg';
      const mockError = new Error('Upload failed');

      (path.basename as unknown as jest.Mock).mockReturnValue('test.jpg');
      mockFilesUpload.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(service.uploadFile(filePath)).rejects.toThrow(
        'Failed to upload file: Upload failed',
      );
    });
  });
});
