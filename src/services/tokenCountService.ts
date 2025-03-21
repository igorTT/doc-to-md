import { get_encoding, TiktokenEncoding } from 'tiktoken';
import { logger } from './loggerService';

/**
 * Service for counting tokens in text content
 * This service uses tiktoken to count tokens which gives accurate estimates
 * for token usage when using various LLM providers.
 */
export class TokenCountService {
  /**
   * Count the number of tokens in a text string using the specified encoding
   *
   * @param text The text content to count tokens in
   * @param encodingName The encoding to use (default: 'cl100k_base' which is used by many modern models)
   * @returns The number of tokens in the text
   */
  public countTokens(
    text: string,
    encodingName: TiktokenEncoding = 'cl100k_base'
  ): number {
    try {
      const encoding = get_encoding(encodingName);
      const tokens = encoding.encode(text);
      const tokenCount = tokens.length;

      // Always free the encoder to prevent memory leaks
      encoding.free();

      return tokenCount;
    } catch (error) {
      logger.error(
        `Error counting tokens: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new Error(
        `Failed to count tokens: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Estimate the cost of processing text based on token count and rate per 1000 tokens
   *
   * @param tokenCount The number of tokens in the text
   * @param ratePerThousandTokens The cost per 1000 tokens (varies by model and provider)
   * @returns The estimated cost in the provider's currency unit
   */
  public estimateCost(
    tokenCount: number,
    ratePerThousandTokens: number
  ): number {
    return (tokenCount / 1000) * ratePerThousandTokens;
  }
}
