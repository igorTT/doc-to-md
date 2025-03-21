/**
 * Test Setup: Global Configuration
 * ===============================
 *
 * Purpose:
 * This file configures the global test environment for all test suites.
 * It handles mocking of external dependencies and sets up environment variables
 * required for testing.
 *
 * Key Setup Operations:
 * 1. Mocks for external libraries (tiktoken, ReadableStream)
 * 2. Environment variable configuration
 * 3. Global test utilities and mocks
 *
 * Test Environment:
 * - All API calls are mocked to prevent actual external requests
 * - Environment variables are set with test values
 * - Stream handling is mocked for Mistral API responses
 *
 * Note:
 * This file is loaded before any tests run through the Jest configuration.
 * The order of operations here matters as some mocks need to be in place
 * before other modules are imported.
 */

// Mock tiktoken before it gets imported anywhere else
jest.mock('tiktoken', () => ({
  get_encoding: jest.fn().mockReturnValue({
    encode: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
    free: jest.fn(),
  }),
  TiktokenEncoding: {},
}));

// Mock ReadableStream for Mistral SDK before any imports
// @ts-ignore - We're intentionally creating a minimal mock
global.ReadableStream = class MockReadableStream {
  constructor() {}
  getReader() {
    return {
      read: jest.fn().mockResolvedValue({ done: true }),
      releaseLock: jest.fn(),
    };
  }
  get locked() {
    return false;
  }
  cancel() {
    return Promise.resolve();
  }
  pipeThrough() {
    return new MockReadableStream();
  }
  pipeTo() {
    return Promise.resolve();
  }
  tee() {
    return [new MockReadableStream(), new MockReadableStream()];
  }
} as any;

// Now import and set up other mocks
import { setupMocks } from './mocks';

// Set up all mocks before running tests
setupMocks();

// Mock process.env
process.env.MISTRAL_API_KEY = 'test-api-key';
