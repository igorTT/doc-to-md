import fs from 'fs-extra';
import axios from 'axios';

// Mock fs-extra
export const mockFs = {
  pathExists: jest.fn(),
  ensureDir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  remove: jest.fn(),
  copy: jest.fn(),
  writeFileSync: jest.fn(),
};

// Mock axios
export const mockAxios = {
  post: jest.fn(),
  isAxiosError: jest.fn(),
};

// Mock Mistral SDK
export const mockMistral = {
  files: {
    upload: jest.fn(),
    getSignedUrl: jest.fn(),
    retrieve: jest.fn(),
  },
  ocr: {
    process: jest.fn(),
  },
  chat: {
    complete: jest.fn(),
  },
};

// Mock file stats
export const createMockFileStats = (isFile = true, isDirectory = false) => ({
  isFile: jest.fn().mockReturnValue(isFile),
  isDirectory: jest.fn().mockReturnValue(isDirectory),
});

// Setup mocks
export const setupMocks = () => {
  // Setup fs-extra mocks
  jest.mock('fs-extra', () => mockFs);

  // Setup axios mocks
  jest.mock('axios', () => mockAxios);

  // Setup Mistral SDK mock
  jest.mock('@mistralai/mistralai', () => ({
    Mistral: jest.fn().mockImplementation(() => mockMistral),
  }));

  // Setup path mocks
  jest.mock('path', () => ({
    ...jest.requireActual('path'),
    dirname: jest.fn().mockReturnValue('/mock/dir'),
    join: jest.fn().mockImplementation((...args) => args.join('/')),
    basename: jest.fn().mockImplementation((filePath, ext) => {
      const base = filePath.split('/').pop() || '';
      return ext ? base.replace(ext, '') : base;
    }),
    extname: jest.fn().mockReturnValue('.txt'),
  }));

  // Setup crypto mock
  jest.mock('crypto', () => ({
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('abc123'),
    }),
  }));
};
