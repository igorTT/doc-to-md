import { MistralService } from '../../src/services/mistralService';
import { Mistral } from '@mistralai/mistralai';
import fs from 'fs-extra';
import path from 'path';

// Mock dependencies
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  pathExists: jest.fn(),
  writeFileSync: jest.fn(),
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
  const mockOcrProcess = jest.fn().mockResolvedValue({
    pages: [
      {
        markdown:
          '# Test Document\n\nThis is a test document with an image: ![image-1](image-1)',
        images: [
          {
            id: 'image-1',
            imageBase64: 'base64-image-data',
          },
        ],
      },
    ],
  });
  const mockChatComplete = jest.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: '# Titre Traduit\n\nCeci est un test traduit.',
        },
      },
    ],
  });

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
          chat: {
            complete: mockChatComplete,
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
      process.env = { ...originalEnv };
      delete process.env.MISTRAL_API_KEY;

      // Act & Assert
      expect(() => new MistralService()).toThrow(
        'MISTRAL_API_KEY environment variable is not set',
      );
    });
  });

  describe('isFileSupported', () => {
    it('should return true for PDF files', () => {
      // Arrange
      const service = new MistralService();
      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');

      // Act & Assert
      expect(service.isFileSupported('test.pdf')).toBe(true);
    });

    it('should return false for unsupported file types', () => {
      // Arrange
      const service = new MistralService();
      const unsupportedExtensions = ['.txt', '.doc', '.docx', '.html', '.xml'];

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
        'Only PDF files are supported. Received: .txt',
      );
    });

    it('should process a PDF file using the OCR API', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.pdf';

      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');
      (path.dirname as unknown as jest.Mock).mockReturnValue('/path/to');
      (path.join as unknown as jest.Mock).mockReturnValue(
        '/path/to/test_mistral_ocr.md',
      );

      // Act
      const result = await service.processFile(filePath);

      // Assert
      expect(result).toBe(
        '# Test Document\n\nThis is a test document with an image: ![image-1](data:image/png;base64,base64-image-data)',
      );
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
        includeImageBase64: true,
      });
      // Remove the expectation for writeFileSync since we no longer save to the original location
      // expect(fs.writeFileSync).toHaveBeenCalledWith(
      //   '/path/to/test_mistral_ocr.md',
      //   '# Test Document\n\nThis is a test document with an image: ![image-1](data:image/png;base64,base64-image-data)',
      // );
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.pdf';

      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');

      // Mock API error
      const mockError = new Error('API rate limit exceeded');
      mockFilesUpload.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(service.processFile(filePath)).rejects.toThrow(
        'Failed to process PDF with Mistral OCR API: API rate limit exceeded',
      );
    });

    it('should throw an error for invalid OCR response', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.pdf';

      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');

      // Mock invalid OCR response
      mockOcrProcess.mockResolvedValueOnce({ some: 'data' });

      // Act & Assert
      await expect(service.processFile(filePath)).rejects.toThrow(
        'Invalid OCR response from Mistral API',
      );
    });

    it('should handle OCR response with empty pages', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.pdf';

      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');
      (path.dirname as unknown as jest.Mock).mockReturnValue('/path/to');
      (path.join as unknown as jest.Mock).mockReturnValue(
        '/path/to/test_mistral_ocr.md',
      );

      // Mock fs.writeFileSync for saveMarkdownToFile
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      // Mock OCR response with empty pages
      mockOcrProcess.mockResolvedValueOnce({
        pages: [
          {
            markdown: '',
            images: [],
          },
        ],
      });

      // Act
      const result = await service.processFile(filePath);

      // Assert
      expect(result).toBe('');
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
      const fileId = 'nonexistent-file';

      // Mock API error
      const mockError = new Error('File not found');
      mockFilesRetrieve.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(service.retrieveFileDetails(fileId)).rejects.toThrow(
        'Failed to retrieve PDF file details: File not found',
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.pdf';

      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');

      // Mock a simpler upload result
      mockFilesUpload.mockResolvedValueOnce({ id: 'file-123' });

      // Act
      const result = await service.uploadFile(filePath);

      // Assert
      expect(result).toEqual({ id: 'file-123' });
      expect(mockFilesUpload).toHaveBeenCalledWith({
        file: {
          fileName: 'test-file.jpg',
          content: Buffer.from('test-file-data'),
        },
        purpose: 'ocr',
      });
    });

    it('should handle errors when uploading a file', async () => {
      // Arrange
      const service = new MistralService();
      const filePath = 'test.pdf';

      (path.extname as unknown as jest.Mock).mockReturnValue('.pdf');

      // Mock API error
      const mockError = new Error('Upload failed');
      mockFilesUpload.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(service.uploadFile(filePath)).rejects.toThrow(
        'Failed to upload PDF file: Upload failed',
      );
    });
  });

  describe('replaceImagesInMarkdown', () => {
    it('should replace image references with base64 data', () => {
      // Arrange
      const service = new MistralService();
      const markdown =
        '# Test Document\n\nThis is a test with an image: ![image-1](image-1)';
      const imageData = {
        'image-1': 'base64-image-data',
      };

      // Access the private method using type assertion
      const replaceImagesInMarkdown = (
        service as any
      ).replaceImagesInMarkdown.bind(service);

      // Act
      const result = replaceImagesInMarkdown(markdown, imageData);

      // Assert
      expect(result).toBe(
        '# Test Document\n\nThis is a test with an image: ![image-1](data:image/png;base64,base64-image-data)',
      );
    });

    it('should handle markdown with multiple image references', () => {
      // Arrange
      const service = new MistralService();
      const markdown =
        '# Test Document\n\nImage 1: ![image-1](image-1)\n\nImage 2: ![image-2](image-2)';
      const imageData = {
        'image-1': 'base64-data-1',
        'image-2': 'base64-data-2',
      };

      // Access the private method using type assertion
      const replaceImagesInMarkdown = (
        service as any
      ).replaceImagesInMarkdown.bind(service);

      // Act
      const result = replaceImagesInMarkdown(markdown, imageData);

      // Assert
      expect(result).toBe(
        '# Test Document\n\nImage 1: ![image-1](data:image/png;base64,base64-data-1)\n\nImage 2: ![image-2](data:image/png;base64,base64-data-2)',
      );
    });

    it('should handle markdown with no image references', () => {
      // Arrange
      const service = new MistralService();
      const markdown = '# Test Document\n\nThis is a test with no images.';
      const imageData = {
        'image-1': 'base64-image-data',
      };

      // Access the private method using type assertion
      const replaceImagesInMarkdown = (
        service as any
      ).replaceImagesInMarkdown.bind(service);

      // Act
      const result = replaceImagesInMarkdown(markdown, imageData);

      // Assert
      expect(result).toBe('# Test Document\n\nThis is a test with no images.');
    });

    it('should handle empty markdown', () => {
      // Arrange
      const service = new MistralService();
      const markdown = '';
      const imageData = {
        'image-1': 'base64-image-data',
      };

      // Access the private method using type assertion
      const replaceImagesInMarkdown = (
        service as any
      ).replaceImagesInMarkdown.bind(service);

      // Act
      const result = replaceImagesInMarkdown(markdown, imageData);

      // Assert
      expect(result).toBe('');
    });

    it('should handle already formatted base64 data', () => {
      // Arrange
      const service = new MistralService();
      const markdown =
        '# Test Document\n\nThis is a test with an image: ![image-1](image-1)';
      const imageData = {
        'image-1': 'data:image/jpeg;base64,already-formatted-data',
      };

      // Access the private method using type assertion
      const replaceImagesInMarkdown = (
        service as any
      ).replaceImagesInMarkdown.bind(service);

      // Act
      const result = replaceImagesInMarkdown(markdown, imageData);

      // Assert
      expect(result).toBe(
        '# Test Document\n\nThis is a test with an image: ![image-1](data:image/jpeg;base64,already-formatted-data)',
      );
    });
  });

  describe('translateContent', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Setup environment
      process.env.MISTRAL_API_KEY = 'test-api-key';

      // Mock successful response
      mockChatComplete.mockResolvedValue({
        choices: [
          {
            message: {
              content: '# Titre Traduit\n\nCeci est un test traduit.',
            },
          },
        ],
      });
    });

    it('should translate content to French successfully', async () => {
      // Arrange
      const service = new MistralService();
      const content = '# Test Title\n\nThis is a test.';
      const language = 'french';

      // Act
      const result = await service.translateContent(content, language);

      // Assert
      expect(result).toBe('# Titre Traduit\n\nCeci est un test traduit.');
      expect(mockChatComplete).toHaveBeenCalledWith({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining(
              'Translate the provided markdown content into French',
            ),
          },
          { role: 'user', content },
        ],
      });
    });

    it('should translate content to German successfully', async () => {
      // Arrange
      const service = new MistralService();
      const content = '# Test Title\n\nThis is a test.';
      const language = 'german';

      // Mock German translation response
      mockChatComplete.mockResolvedValue({
        choices: [
          {
            message: {
              content: '# Test Titel\n\nDies ist ein Test.',
            },
          },
        ],
      });

      // Act
      const result = await service.translateContent(content, language);

      // Assert
      expect(result).toBe('# Test Titel\n\nDies ist ein Test.');
      expect(mockChatComplete).toHaveBeenCalledWith({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining(
              'Translate the provided markdown content into German',
            ),
          },
          { role: 'user', content },
        ],
      });
    });

    it('should translate content to Russian successfully', async () => {
      // Arrange
      const service = new MistralService();
      const content = '# Test Title\n\nThis is a test.';
      const language = 'russian';

      // Mock Russian translation response
      mockChatComplete.mockResolvedValue({
        choices: [
          {
            message: {
              content: '# Тестовый заголовок\n\nЭто тест.',
            },
          },
        ],
      });

      // Act
      const result = await service.translateContent(content, language);

      // Assert
      expect(result).toBe('# Тестовый заголовок\n\nЭто тест.');
      expect(mockChatComplete).toHaveBeenCalledWith({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining(
              'Translate the provided markdown content into Russian',
            ),
          },
          { role: 'user', content },
        ],
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const service = new MistralService();
      const content = '# Test Title\n\nThis is a test.';
      const language = 'spanish';

      // Mock API error
      mockChatComplete.mockRejectedValue(new Error('API request failed'));

      // Act & Assert
      await expect(service.translateContent(content, language)).rejects.toThrow(
        'Failed to translate content: API request failed',
      );
    });

    it('should throw an error if response is invalid', async () => {
      // Arrange
      const service = new MistralService();
      const content = '# Test Title\n\nThis is a test.';
      const language = 'french';

      // Mock invalid response
      mockChatComplete.mockResolvedValue({
        choices: [],
      });

      // Act & Assert
      await expect(service.translateContent(content, language)).rejects.toThrow(
        'Invalid response from Mistral API',
      );
    });
  });
});
