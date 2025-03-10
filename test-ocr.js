const { MistralService } = require('./dist/services/mistralService');
const path = require('path');
const fs = require('fs-extra');

async function testOcr() {
  try {
    // Create a test directory if it doesn't exist
    const testDir = path.join(__dirname, 'test-files');
    await fs.ensureDir(testDir);

    // Create a simple test image with text (if it doesn't exist)
    const testImagePath = path.join(testDir, 'test-image.jpg');
    if (!(await fs.pathExists(testImagePath))) {
      console.log('Please place a test image at:', testImagePath);
      console.log('Then run this script again.');
      return;
    }

    console.log('Testing OCR with image:', testImagePath);

    // Initialize the Mistral service
    const mistralService = new MistralService();

    // Check if the file is supported
    const isSupported = mistralService.isFileSupported(testImagePath);
    console.log('Is file supported:', isSupported);

    if (isSupported) {
      // Process the file
      console.log('Processing file...');
      const result = await mistralService.processFile(testImagePath);

      // Save the result to a markdown file
      const outputPath = path.join(testDir, 'test-result.md');
      await fs.writeFile(outputPath, result, 'utf-8');

      console.log('OCR result saved to:', outputPath);
      console.log('First 200 characters of result:');
      console.log(result.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error testing OCR:', error.message);
  }
}

testOcr();
