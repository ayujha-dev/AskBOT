/**
 * BaseProvider: Abstract interface and shared streaming parser for all LLM providers.
 */

export class BaseProvider {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  /**
   * Fetch available models for this provider's API key.
   * @param {string} apiKey
   * @returns {Promise<Array<{ id: string, name: string, contextWindow?: number, supportsVision?: boolean, supportsThinking?: boolean }>>}
   */
  async fetchModels(apiKey) {
    throw new Error(`fetchModels() not implemented for provider ${this.id}`);
  }

  /**
   * Stream chat completion.
   * @param {Object} options
   * @param {Array} options.messages
   * @param {string} options.model
   * @param {Object} options.parameters
   * @param {Object} options.modes
   * @param {Function} options.onChunk - (delta: string) => void
   * @param {Function} options.onThinking - (thinkingDelta: string) => void
   * @param {Function} options.onSources - (sources: Array) => void
   * @param {AbortSignal} options.signal
   */
  async streamChat(options) {
    throw new Error(`streamChat() not implemented for provider ${this.id}`);
  }

  /**
   * Robust SSE reader that buffers chunks across TCP/packet boundaries.
   * Dispatches { event, data } to the onEvent callback.
   * @param {ReadableStream} stream
   * @param {Function} onEvent
   */
  async readSSEStream(stream, onEvent) {
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        // Keep the last partial event block in the buffer
        buffer = parts.pop() || '';

        for (const block of parts) {
          if (!block.trim()) continue;

          let eventName = 'message';
          let dataLines = [];

          const lines = block.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              eventName = trimmed.substring(6).trim();
            } else if (trimmed.startsWith('data:')) {
              dataLines.push(line.slice(line.indexOf('data:') + 5).trimStart());
            }
          }

          if (dataLines.length > 0) {
            const dataStr = dataLines.join('\n');
            onEvent({ event: eventName, data: dataStr });
          }
        }
      }

      // Flush any remaining buffer if complete event
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let eventName = 'message';
        let dataLines = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            eventName = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            dataLines.push(line.slice(line.indexOf('data:') + 5).trimStart());
          }
        }
        if (dataLines.length > 0) {
          onEvent({ event: eventName, data: dataLines.join('\n') });
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
