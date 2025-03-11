import { Mistral } from '@mistralai/mistralai';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Service for processing PDF documents using Mistral AI's OCR capabilities
 * This service is specifically designed to work with Mistral's API for PDF text extraction
 * and image handling, providing markdown output with embedded images.
 */
export class MistralService {
  private client: Mistral;
  private readonly OCR_MODEL = 'mistral-ocr-latest';
  private readonly CHAT_MODEL = 'mistral-large-latest';

  /**
   * Create a new MistralService instance
   * Initializes the Mistral client with API key from environment variables
   * @throws Error if MISTRAL_API_KEY is not set in environment variables
   */
  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error(
        'MISTRAL_API_KEY environment variable is not set. Please set it to use the Mistral OCR service.',
      );
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
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.pdf';
  }

  /**
   * Process a PDF file with Mistral's OCR API
   * Extracts text and images from PDF documents using Mistral's advanced OCR capabilities
   * The extracted content is returned as markdown with embedded base64 images
   *
   * @param filePath Path to the PDF file to process
   * @returns Markdown string with extracted text and embedded images
   * @throws Error if the file is not a PDF or if processing fails
   */
  public async processFile(filePath: string): Promise<string> {
    if (!this.isFileSupported(filePath)) {
      throw new Error(
        `Only PDF files are supported. Received: ${path.extname(filePath)}`,
      );
    }

    try {
      // Read the PDF file
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      // Upload the PDF file to Mistral
      const uploadedFile = await this.client.files.upload({
        file: {
          fileName,
          content: fileContent,
        },
        purpose: 'ocr' as any, // Type cast to fix TypeScript error
      });

      // Get a signed URL for the uploaded PDF
      const signedUrl = await this.client.files.getSignedUrl({
        fileId: uploadedFile.id,
      });

      // Process the PDF with Mistral's OCR
      const ocrResponse = await this.client.ocr.process({
        model: this.OCR_MODEL,
        document: {
          type: 'document_url',
          documentUrl: signedUrl.url,
        },
        includeImageBase64: true,
      });

      // Process the OCR response
      if (
        !ocrResponse ||
        !ocrResponse.pages ||
        !Array.isArray(ocrResponse.pages)
      ) {
        throw new Error('Invalid OCR response from Mistral API');
      }

      // Process each page and handle embedded images
      const processedMarkdowns = ocrResponse.pages.map((page) => {
        if (!page.markdown) {
          return ''; // Skip pages without markdown content
        }

        // Create image data dictionary
        const imageData: Record<string, string> = {};
        if (page.images && Array.isArray(page.images)) {
          page.images.forEach((img) => {
            if (img.id && img.imageBase64) {
              imageData[img.id] = img.imageBase64;
            }
          });
        }

        // Replace image references with base64 data
        return this.replaceImagesInMarkdown(page.markdown, imageData);
      });

      // Combine all pages into a single markdown document
      const processedMarkdown = processedMarkdowns.filter(Boolean).join('\n\n');

      // Remove the automatic saving to the original file location
      // this.saveMarkdownToFile(processedMarkdown, filePath);

      return processedMarkdown;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to process PDF with Mistral OCR API: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Replace image references in markdown with base64 data
   * @param markdown Markdown content with image references
   * @param imageData Dictionary of image IDs to base64 data
   * @returns Markdown with embedded base64 images
   */
  private replaceImagesInMarkdown(
    markdown: string,
    imageData: Record<string, string>,
  ): string {
    let result = markdown;

    for (const [imgId, base64Data] of Object.entries(imageData)) {
      // Format the base64 data for markdown
      const formattedBase64 = base64Data.startsWith('data:')
        ? base64Data
        : `data:image/png;base64,${base64Data}`;

      // Replace image references with base64 data
      // Escape special characters in the pattern
      const escapedImgId = imgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `!\\[${escapedImgId}\\]\\(${escapedImgId}\\)`;
      result = result.replace(
        new RegExp(pattern, 'g'),
        `![${imgId}](${formattedBase64})`,
      );
    }

    return result;
  }

  /**
   * Retrieve details about an uploaded PDF file
   * @param fileId ID of the uploaded file
   * @returns File details
   */
  public async retrieveFileDetails(fileId: string): Promise<any> {
    try {
      const fileDetails = await this.client.files.retrieve({
        fileId,
      });
      return fileDetails;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to retrieve PDF file details: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Upload a PDF file to Mistral
   * @param filePath Path to the PDF file
   * @returns Uploaded file details
   */
  public async uploadFile(filePath: string): Promise<any> {
    if (!this.isFileSupported(filePath)) {
      throw new Error(
        `Only PDF files are supported. Received: ${path.extname(filePath)}`,
      );
    }

    try {
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      const uploadedFile = await this.client.files.upload({
        file: {
          fileName,
          content: fileContent,
        },
        purpose: 'ocr' as any,
      });

      return uploadedFile;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload PDF file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Translate markdown content to the specified language using Mistral AI
   * @param content Markdown content to translate
   * @param language Target language for translation (french, german, spanish, russian)
   * @returns Translated markdown content
   * @throws Error if translation fails
   */
  public async translateContent(
    content: string,
    language: string,
  ): Promise<string> {
    try {
      // Normalize language name
      const normalizedLanguage = language.toLowerCase();

      // Map of language codes to full names
      const languageMap: Record<string, string> = {
        french: 'French',
        german: 'German',
        spanish: 'Spanish',
        russian: 'Russian',
      };

      const targetLanguage =
        languageMap[normalizedLanguage] || normalizedLanguage;

      // Create a system prompt for translation
      const systemPrompt = `You are a professional translator. Translate the provided markdown content into ${targetLanguage}. 
      Preserve all markdown formatting, including headers, lists, code blocks, and image references. 
      Do not translate code blocks or URLs. Keep image references intact.`;

      // Send the translation request to Mistral AI
      const response = await this.client.chat.complete({
        model: this.CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
      });

      // Extract the translated content from the response
      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid response from Mistral API');
      }

      const translatedContent = response.choices[0].message.content as string;
      if (!translatedContent) {
        throw new Error('Empty translation response from Mistral API');
      }

      return translatedContent;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to translate content: ${error.message}`);
      }
      throw error;
    }
  }
}
