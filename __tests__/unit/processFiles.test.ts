import { mockFs, mockAxios, createMockFileStats } from '../mocks';
import { processFiles } from '../../src/processFiles';

// Mock dependencies
jest.mock('fs-extra', () => mockFs);
jest.mock('axios', () => mockAxios);
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

describe('processFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockFs.pathExists.mockResolvedValue(true);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue(createMockFileStats(true, false));
    mockFs.readFile.mockResolvedValue('test content');
    mockFs.writeFile.mockResolvedValue(undefined);
    mockAxios.post.mockResolvedValue({ data: 'processed content' });
  });

  it('should process a single file', async () => {
    // Arrange
    const options = {
      input: '/test/input.txt',
      output: '/test/output.md',
      api: 'https://api.example.com',
    };

    // Act
    await processFiles(options);

    // Assert
    expect(mockFs.pathExists).toHaveBeenCalledWith(options.input);
    expect(mockFs.ensureDir).toHaveBeenCalledWith('/mock/dir');
    expect(mockFs.stat).toHaveBeenCalledWith(options.input);
    expect(mockFs.readFile).toHaveBeenCalledWith(options.input, 'utf-8');
    expect(mockAxios.post).toHaveBeenCalledWith(
      options.api,
      { content: 'test content' },
      { headers: { 'Content-Type': 'application/json' } },
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      options.output,
      'processed content',
      'utf-8',
    );
  });

  it('should throw an error if input path does not exist', async () => {
    // Arrange
    mockFs.pathExists.mockResolvedValue(false);
    const options = {
      input: '/test/nonexistent.txt',
      output: '/test/output.md',
      api: 'https://api.example.com',
    };

    // Act & Assert
    await expect(processFiles(options)).rejects.toThrow(
      `Input path does not exist: ${options.input}`,
    );
    expect(mockFs.readFile).not.toHaveBeenCalled();
    expect(mockAxios.post).not.toHaveBeenCalled();
  });

  it('should process a directory', async () => {
    // Arrange
    const dirStats = createMockFileStats(false, true);
    const fileStats = createMockFileStats(true, false);

    // First call is for the directory check
    mockFs.stat.mockResolvedValueOnce(dirStats);

    // Setup for file checks inside the directory
    mockFs.readdir.mockResolvedValue(['file1.txt', 'file2.txt']);

    // Subsequent calls are for individual files
    mockFs.stat.mockImplementation(async (filePath) => {
      if (filePath === '/test/input') {
        return dirStats;
      }

      return fileStats;
    });

    const options = {
      input: '/test/input',
      output: '/test/output',
      api: 'https://api.example.com',
    };

    // Act
    await processFiles(options);

    // Assert
    expect(mockFs.readdir).toHaveBeenCalledWith(options.input);
    expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    expect(mockAxios.post).toHaveBeenCalledTimes(2);
    expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
  });

  it('should handle API errors', async () => {
    // Arrange
    const apiError = new Error('API error');
    mockAxios.post.mockRejectedValue(apiError);

    const options = {
      input: '/test/input.txt',
      output: '/test/output.md',
      api: 'https://api.example.com',
    };

    // Act & Assert
    await expect(processFiles(options)).rejects.toThrow(
      'Failed to process file /test/input.txt: API error',
    );
  });
});
