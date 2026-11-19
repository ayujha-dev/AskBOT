/**
 * TagStreamBuffer: Buffers streaming chunks to detect and split <think> and </think> tags
 * even when tag delimiters are split across chunk boundaries (e.g. '</thi' in chunk 1 and 'nk>' in chunk 2).
 */

export class TagStreamBuffer {
  constructor() {
    this.insideThink = false;
    this.buffer = '';
  }

  processChunk(chunk, onThinking, onChunk) {
    if (!chunk) return;
    this.buffer += chunk;

    while (this.buffer.length > 0) {
      if (!this.insideThink) {
        const thinkIdx = this.buffer.indexOf('<think>');
        if (thinkIdx !== -1) {
          if (thinkIdx > 0) {
            onChunk(this.buffer.slice(0, thinkIdx));
          }
          this.insideThink = true;
          this.buffer = this.buffer.slice(thinkIdx + 7);
        } else {
          // Check if buffer ends with a partial prefix of '<think>'
          let matchedPrefixLen = 0;
          for (let i = 1; i < 7 && i <= this.buffer.length; i++) {
            if ('<think>'.startsWith(this.buffer.slice(-i))) {
              matchedPrefixLen = i;
            }
          }
          const safeLen = this.buffer.length - matchedPrefixLen;
          if (safeLen > 0) {
            onChunk(this.buffer.slice(0, safeLen));
            this.buffer = this.buffer.slice(safeLen);
          }
          break;
        }
      } else {
        const endThinkIdx = this.buffer.indexOf('</think>');
        if (endThinkIdx !== -1) {
          if (endThinkIdx > 0) {
            onThinking(this.buffer.slice(0, endThinkIdx));
          }
          this.insideThink = false;
          this.buffer = this.buffer.slice(endThinkIdx + 8);
        } else {
          // Check if buffer ends with a partial prefix of '</think>'
          let matchedPrefixLen = 0;
          for (let i = 1; i < 8 && i <= this.buffer.length; i++) {
            if ('</think>'.startsWith(this.buffer.slice(-i))) {
              matchedPrefixLen = i;
            }
          }
          const safeLen = this.buffer.length - matchedPrefixLen;
          if (safeLen > 0) {
            onThinking(this.buffer.slice(0, safeLen));
            this.buffer = this.buffer.slice(safeLen);
          }
          break;
        }
      }
    }
  }

  flush(onThinking, onChunk) {
    if (this.buffer.length > 0) {
      if (this.insideThink) {
        onThinking(this.buffer);
      } else {
        onChunk(this.buffer);
      }
      this.buffer = '';
    }
  }
}
