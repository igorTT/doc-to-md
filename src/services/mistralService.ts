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
   * Process a file with Mistral's OCR API using file upload
   * @param filePath Path to the file to process
   * @returns Extracted text from the file
   */
  public async processFile(filePath: string): Promise<string> {
    if (!this.isFileSupported(filePath)) {
      throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
    }

    try {
      // Read the file
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      // Upload the file
      const uploadedFile = await this.client.files.upload({
        file: {
          fileName: fileName,
          content: fileContent,
        },
        purpose: 'ocr' as any, // Type cast to fix TypeScript error
      });

      // Optionally retrieve file details
      const fileDetails = await this.retrieveFileDetails(uploadedFile.id);

      // Get a signed URL for the uploaded file
      const signedUrl = await this.client.files.getSignedUrl({
        fileId: uploadedFile.id,
      });

      // Process the file with OCR
      const ocrResponse = await this.client.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: signedUrl.url,
        },
        includeImageBase64: true,
      });

      // Extract the text from the OCR response with image handling
      let processedMarkdown = '';
      if (
        ocrResponse &&
        typeof ocrResponse === 'object' &&
        'pages' in ocrResponse &&
        Array.isArray(ocrResponse.pages)
      ) {
        // Process each page and handle embedded images
        const pages = ocrResponse.pages as any[];

        // Helper function to replace image references with base64 data
        const replaceImagesInMarkdown = (
          markdownStr: string,
          imagesDict: Record<string, string>,
        ): string => {
          let result = markdownStr;

          for (const [imgName, base64Str] of Object.entries(imagesDict)) {
            // Make sure the base64 string is properly formatted for markdown image embedding
            const formattedBase64 = base64Str.startsWith('data:')
              ? base64Str
              : `data:image/png;base64,${base64Str}`;

            // Try different possible formats of image references
            const patterns = [
              `![${imgName}](${imgName})`, // Standard format: ![id](id)
              `!\\[${imgName}\\]\\(${imgName}\\)`, // Escaped format
              `\\!\\[${imgName}\\]\\(${imgName}\\)`, // Another escaped format
              `![Image ${imgName}](${imgName})`, // With "Image" prefix
              `![Figure ${imgName}](${imgName})`, // With "Figure" prefix
              `![](${imgName})`, // No alt text
            ];

            // Try each pattern
            patterns.forEach((pattern) => {
              if (result.includes(pattern)) {
                // Handle markdown image syntax
                result = result.replace(
                  pattern,
                  `![${imgName}](${formattedBase64})`,
                );
              }
            });

            // Also try a regex approach for more flexibility
            const imgRegex = new RegExp(`!\\[(.*?)\\]\\(${imgName}\\)`, 'g');
            result = result.replace(imgRegex, (match, altText) => {
              return `![${altText}](${formattedBase64})`;
            });
          }

          return result;
        };

        // Process each page and combine the results
        const processedMarkdowns = pages.map((page) => {
          if (page && typeof page === 'object' && 'markdown' in page) {
            const markdown = page.markdown as string;

            // Create image data dictionary
            const imageData: Record<string, string> = {};
            if ('images' in page && Array.isArray(page.images)) {
              const images = page.images as any[];
              images.forEach((img) => {
                if (
                  img &&
                  typeof img === 'object' &&
                  'id' in img &&
                  'imageBase64' in img
                ) {
                  imageData[img.id] = img.imageBase64;
                }
              });
            }

            // Replace image references with base64 data
            return replaceImagesInMarkdown(markdown, imageData);
          }
          return '';
        });

        processedMarkdown = processedMarkdowns.join('\n\n');

        // Save the processed markdown to a file for easier viewing
        this.saveMarkdownToFile(processedMarkdown, filePath);

        return processedMarkdown;
      } else if (ocrResponse && typeof ocrResponse === 'object') {
        if ('markdown' in ocrResponse) {
          processedMarkdown = ocrResponse.markdown as string;
        } else if ('text' in ocrResponse) {
          processedMarkdown = ocrResponse.text as string;
        } else if ('content' in ocrResponse) {
          processedMarkdown = ocrResponse.content as string;
        }

        // Save the processed markdown to a file for easier viewing
        if (processedMarkdown) {
          this.saveMarkdownToFile(processedMarkdown, filePath);
        }

        return processedMarkdown;
      }

      // Fallback: return stringified response if markdown content not found
      return JSON.stringify(ocrResponse);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to process file with Mistral OCR API: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Retrieve details about an uploaded file
   * @param fileId ID of the file to retrieve
   * @returns File details
   */
  public async retrieveFileDetails(fileId: string): Promise<any> {
    try {
      const fileDetails = await this.client.files.retrieve({
        fileId: fileId,
      });
      return fileDetails;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve file details: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Upload a file to Mistral API (for demonstration purposes)
   * @param filePath Path to the file to upload
   * @returns Uploaded file details
   */
  public async uploadFile(filePath: string): Promise<any> {
    try {
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      const uploadedFile = await this.client.files.upload({
        file: {
          fileName: fileName,
          content: fileContent,
        },
        purpose: 'ocr' as any,
      });

      return uploadedFile;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Saves the processed markdown to a file
   */
  private saveMarkdownToFile(markdown: string, originalFilePath: string): void {
    try {
      const baseDir = path.dirname(originalFilePath);
      const baseName = path.basename(
        originalFilePath,
        path.extname(originalFilePath),
      );

      // Save as markdown
      const mdFilePath = path.join(baseDir, `${baseName}_processed.md`);
      fs.writeFileSync(mdFilePath, markdown);
    } catch (error) {
      console.error('Error saving processed markdown:', error);
    }
  }
}
