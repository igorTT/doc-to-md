import { Mistral } from '@mistralai/mistralai';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supported file extensions for OCR
const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
];
const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf'];
const SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
];

/**
 * Service for interacting with Mistral AI's OCR API
 */
export class MistralService {
  private client: Mistral;

  /**
   * Create a new MistralService instance
   */
  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not set in environment variables');
    }

    this.client = new Mistral({
      apiKey,
    });
  }

  /**
   * Check if a file is supported for OCR processing
   * @param filePath Path to the file
   * @returns True if the file is supported, false otherwise
   */
  public isFileSupported(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(extension);
  }

  /**
   * Process a file with Mistral's OCR API
   * @param filePath Path to the file to process
   * @returns Extracted text from the file
   */
  public async processFile(filePath: string): Promise<string> {
    if (!this.isFileSupported(filePath)) {
      throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
    }

    try {
      // Read file as base64
      const fileBuffer = await fs.readFile(filePath);
      const base64File = fileBuffer.toString('base64');
      const fileExtension = path.extname(filePath).toLowerCase();

      // Determine content type based on file extension
      let contentType = 'application/octet-stream';
      if (SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension)) {
        contentType = `image/${fileExtension.substring(1)}`;
        // Special case for jpeg
        if (fileExtension === '.jpg') {
          contentType = 'image/jpeg';
        }
      } else if (fileExtension === '.pdf') {
        contentType = 'application/pdf';
      }

      // Call Mistral API with vision capabilities
      const response = await this.client.chat.complete({
        model: 'mistral-large-vision',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this document and format it as markdown.',
              },
              {
                type: 'image_url',
                imageUrl: {
                  url: `data:${contentType};base64,${base64File}`,
                },
              },
            ],
          },
        ],
      });

      // Extract content from response
      const content = response.choices?.[0]?.message?.content || '';
      return typeof content === 'string' ? content : JSON.stringify(content);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to process file with Mistral OCR API: ${error.message}`,
        );
      }
      throw error;
    }
  }
}
