import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Fix Verification: SearchService.executeSearch is defined and callable', async () => {
  const { SearchService } = await import('../js/services/search-service.js');
  assert.equal(typeof SearchService.executeSearch, 'function', 'executeSearch must be a static function');

  // Test with sample inputs (mocking Wikipedia/DDG fetch or empty query)
  const result = await SearchService.executeSearch('');
  assert.deepEqual(result, { context: '', sources: [] });
});

test('Multimodal: FileReaderUtil and TokenCounter support video files for Gemini', async () => {
  const { FileReaderUtil } = await import('../js/utils/file-reader.js');
  const { TokenCounter } = await import('../js/services/token-counter.js');

  // Video categorization
  assert.equal(FileReaderUtil.getFileCategory('video/mp4', 'recording.mp4'), 'video');
  assert.equal(FileReaderUtil.getFileCategory('video/webm', 'capture.webm'), 'video');
  assert.equal(FileReaderUtil.getFileCategory('video/quicktime', 'clip.mov'), 'video');

  // Size limit (30MB)
  assert.ok(FileReaderUtil.validateSize('video', 25 * 1024 * 1024));
  assert.ok(!FileReaderUtil.validateSize('video', 35 * 1024 * 1024));

  // TokenCounter estimation for video
  const msgWithVideo = {
    role: 'user',
    content: 'Analyze this clip',
    attachments: [
      { name: 'clip.mp4', type: 'video', size: 1024 }
    ]
  };
  const tokens = TokenCounter.estimateMessageTokens(msgWithVideo);
  assert.ok(tokens > 1500, 'Video attachments should have substantial token budget allocation');
});

test('UI: index.html accepts video inputs and composer handles paste', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert.ok(html.includes('accept="image/*,video/*'), 'File input must accept video files');

  const composerCode = fs.readFileSync(path.resolve('js/ui/components/composer.js'), 'utf-8');
  assert.ok(composerCode.includes("'paste'"), 'Composer must attach paste listener for clipboard files');

  const fileManagerCode = fs.readFileSync(path.resolve('js/ui/components/file-manager.js'), 'utf-8');
  assert.ok(fileManagerCode.includes("'paste'"), 'FileManager must attach paste listener');
});
