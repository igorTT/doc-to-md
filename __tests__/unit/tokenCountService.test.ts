import { TokenCountService } from '../../src/services/tokenCountService';
import * as tiktoken from 'tiktoken';

// Mock tiktoken
jest.mock('tiktoken', () => ({
  get_encoding: jest.fn(),
}));

describe('TokenCountService', () => {
  let tokenCountService: TokenCountService;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenCountService = new TokenCountService();
  });

  describe('countTokens', () => {
    it('should count tokens correctly in a text string', () => {
      // Mock tiktoken implementation
      const mockEncode = jest.fn().mockReturnValue(new Uint32Array(10));
      const mockFree = jest.fn();
      (tiktoken.get_encoding as jest.Mock).mockReturnValue({
        encode: mockEncode,
        free: mockFree,
      });

      // Execute the method
      const result = tokenCountService.countTokens(
        'Test text for token counting',
      );

      // Check if encode was called with the correct text
      expect(mockEncode).toHaveBeenCalledWith('Test text for token counting');

      // Check that the encoder was freed
      expect(mockFree).toHaveBeenCalled();

      // Check the result is correct
      expect(result).toBe(10); // From the mocked encode function
    });

    it('should use the specified encoding if provided', () => {
      // Mock tiktoken implementation
      const mockEncode = jest.fn().mockReturnValue(new Uint32Array(15));
      const mockFree = jest.fn();
      (tiktoken.get_encoding as jest.Mock).mockReturnValue({
        encode: mockEncode,
        free: mockFree,
      });

      // Execute the method with a specific encoding
      const result = tokenCountService.countTokens('Test text', 'r50k_base');

      // Check if get_encoding was called with the right encoding
      expect(tiktoken.get_encoding).toHaveBeenCalledWith('r50k_base');

      // Check the result is correct
      expect(result).toBe(15);
    });

    it('should handle errors in token counting', () => {
      // Mock tiktoken to throw an error
      (tiktoken.get_encoding as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      // Execute the method and expect it to throw
      expect(() => tokenCountService.countTokens('Test text')).toThrow(
        'Failed to count tokens: Test error',
      );
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost correctly based on token count', () => {
      // Test with various token counts and rates
      expect(tokenCountService.estimateCost(1000, 0.008)).toBe(0.008);
      expect(tokenCountService.estimateCost(2500, 0.008)).toBe(0.02);
      expect(tokenCountService.estimateCost(10000, 0.002)).toBe(0.02);
      expect(tokenCountService.estimateCost(0, 0.01)).toBe(0);
    });
  });
});
