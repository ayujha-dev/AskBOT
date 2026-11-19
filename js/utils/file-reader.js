/**
 * Utility for reading and preparing file attachments (images for vision, text/code for context).
 */

export class FileReaderUtil {
  static MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
  static MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB (Gemini native multimodal)
  static MAX_TEXT_SIZE = 5 * 1024 * 1024;    // 5MB

  static VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi']);

  static TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'markdown', 'py', 'js', 'ts', 'jsx', 'tsx', 'html',
    'css', 'json', 'csv', 'yaml', 'yml', 'xml', 'sql', 'sh', 'bash',
    'c', 'cpp', 'h', 'java', 'go', 'rs', 'php', 'rb'
  ]);

  static getFileCategory(mimeType, filename = '') {
    if (mimeType && mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType && mimeType.startsWith('video/')) {
      return 'video';
    }

    const ext = filename ? filename.split('.').pop()?.toLowerCase() || '' : '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
      return 'image';
    }

    if (this.VIDEO_EXTENSIONS.has(ext)) {
      return 'video';
    }

    if (
      (mimeType && (mimeType.startsWith('text/') ||
      mimeType.includes('json') ||
      mimeType.includes('javascript') ||
      mimeType.includes('xml'))) ||
      this.TEXT_EXTENSIONS.has(ext)
    ) {
      return 'text';
    }

    return 'unknown';
  }

  static validateSize(category, sizeInBytes) {
    if (category === 'image') {
      return sizeInBytes <= this.MAX_IMAGE_SIZE;
    }
    if (category === 'video') {
      return sizeInBytes <= this.MAX_VIDEO_SIZE;
    }
    if (category === 'text') {
      return sizeInBytes <= this.MAX_TEXT_SIZE;
    }
    return false;
  }

  /**
   * Reads a browser File object.
   * @param {File} file
   * @returns {Promise<{ name: string, type: 'image'|'video'|'text', mimeType: string, data: string, size: number }>}
   */
  static async readFile(file) {
    const category = this.getFileCategory(file.type, file.name);

    if (category === 'unknown') {
      throw new Error(`Unsupported file type: "${file.name}". Supported: images (PNG, JPG, WEBP, GIF), video clips (MP4, WEBM, MOV for Gemini), and text/code files.`);
    }

    if (!this.validateSize(category, file.size)) {
      const maxMb = category === 'image' ? 20 : (category === 'video' ? 30 : 5);
      throw new Error(`File "${file.name}" exceeds maximum allowed size of ${maxMb}MB.`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error(`Failed to read file "${file.name}"`));

      if (category === 'image' || category === 'video') {
        reader.onload = () => {
          resolve({
            name: file.name || (category === 'video' ? 'video.mp4' : 'pasted-image.png'),
            type: category,
            mimeType: file.type || (category === 'video' ? 'video/mp4' : 'image/png'),
            data: reader.result, // base64 DataURL
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          resolve({
            name: file.name,
            type: 'text',
            mimeType: file.type || 'text/plain',
            data: reader.result, // raw text
            size: file.size
          });
        };
        reader.readAsText(file);
      }
    });
  }
}
