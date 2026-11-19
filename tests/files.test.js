import test from 'node:test';
import assert from 'node:assert/strict';

test('Task 5: FileReaderUtil classifies image vs text types correctly', async () => {
  const { FileReaderUtil } = await import('../js/utils/file-reader.js');

  assert.equal(FileReaderUtil.getFileCategory('image/png', 'photo.png'), 'image');
  assert.equal(FileReaderUtil.getFileCategory('image/jpeg', 'diagram.jpg'), 'image');
  assert.equal(FileReaderUtil.getFileCategory('image/webp', 'icon.webp'), 'image');

  assert.equal(FileReaderUtil.getFileCategory('video/mp4', 'demo.mp4'), 'video');
  assert.equal(FileReaderUtil.getFileCategory('video/webm', 'screen.webm'), 'video');
  assert.equal(FileReaderUtil.getFileCategory('', 'clip.mov'), 'video');

  assert.equal(FileReaderUtil.getFileCategory('text/plain', 'notes.txt'), 'text');
  assert.equal(FileReaderUtil.getFileCategory('application/json', 'data.json'), 'text');
  assert.equal(FileReaderUtil.getFileCategory('text/javascript', 'app.js'), 'text');
  assert.equal(FileReaderUtil.getFileCategory('', 'script.py'), 'text');
  assert.equal(FileReaderUtil.getFileCategory('', 'styles.css'), 'text');
  assert.equal(FileReaderUtil.getFileCategory('', 'data.csv'), 'text');
});

test('Task 5: FileReaderUtil validates file limits', async () => {
  const { FileReaderUtil } = await import('../js/utils/file-reader.js');

  // Max 20MB for image
  assert.ok(FileReaderUtil.validateSize('image', 10 * 1024 * 1024));
  assert.ok(!FileReaderUtil.validateSize('image', 25 * 1024 * 1024));

  // Max 30MB for video
  assert.ok(FileReaderUtil.validateSize('video', 20 * 1024 * 1024));
  assert.ok(!FileReaderUtil.validateSize('video', 35 * 1024 * 1024));

  // Max 5MB for text
  assert.ok(FileReaderUtil.validateSize('text', 2 * 1024 * 1024));
  assert.ok(!FileReaderUtil.validateSize('text', 6 * 1024 * 1024));
});
