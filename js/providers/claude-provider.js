import { BaseProvider } from './base-provider.js';
import { TagStreamBuffer } from '../utils/stream-buffer.js';

export class ClaudeProvider extends BaseProvider {
  constructor() {
    super('claude', 'Anthropic Claude');
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  getHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }

  filterChatModels(rawModels) {
    if (!Array.isArray(rawModels)) return [];
    return rawModels
      .map(m => {
        const id = m.id;
        const isSonnet = id.includes('sonnet');
        const isThinking = id.includes('3-7') || id.includes('sonnet-3-7') || id.includes('3.7');
        return {
          id,
          name: m.display_name || id,
          contextWindow: 200000,
          supportsVision: true,
          supportsThinking: isThinking
        };
      })
      .sort((a, b) => {
        const score = id => {
          if (id.includes('3-7-sonnet')) return 100;
          if (id.includes('3-5-sonnet')) return 90;
          if (id.includes('3-5-haiku')) return 80;
          if (id.includes('opus')) return 70;
          return 0;
        };
        return score(b.id) - score(a.id) || a.id.localeCompare(b.id);
      });
  }

  async fetchModels(apiKey) {
    const res = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: this.getHeaders(apiKey)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch Claude models: HTTP ${res.status}`);
    }

    const data = await res.json();
    return this.filterChatModels(data.data || []);
  }

  formatMessages(messages) {
    let system = '';
    const formatted = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system += (system ? '\n\n' : '') + msg.content;
        continue;
      }

      const content = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.type === 'image') {
            const base64Data = att.data.includes(';base64,')
              ? att.data.split(';base64,')[1]
              : att.data;
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: att.mimeType || 'image/png',
                data: base64Data
              }
            });
          } else if (att.type === 'text') {
            content.push({
              type: 'text',
              text: `\n\n--- Attachment: ${att.name} ---\n${att.data}`
            });
          }
        }
      }

      formatted.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content
      });
    }

    // Ensure first message is user
    if (formatted.length === 0 || formatted[0].role !== 'user') {
      formatted.unshift({ role: 'user', content: 'Hello' });
    }

    return { system, messages: formatted };
  }

  async streamChat({ apiKey, messages, model, parameters, modes, onChunk, onThinking, signal }) {
    const modelId = model || 'claude-3-7-sonnet-20250219';
    const { system, messages: formattedMessages } = this.formatMessages(messages);

    const isThinkingSupported = modelId.includes('3-7') || modelId.includes('3.7');
    const isThinkingEnabled = isThinkingSupported && modes.thinkingLevel && modes.thinkingLevel !== 'off';

    const payload = {
      model: modelId,
      messages: formattedMessages,
      max_tokens: parameters.maxTokens || 4096,
      stream: true
    };

    if (system) {
      payload.system = system;
    }

    if (isThinkingEnabled) {
      const budgetMap = { low: 1024, medium: 2048, high: 4096 };
      const budget = budgetMap[modes.thinkingLevel] || 2048;
      // In Claude, max_tokens must be greater than thinking budget
      if (payload.max_tokens <= budget) {
        payload.max_tokens = budget + 2048;
      }
      payload.thinking = {
        type: 'enabled',
        budget_tokens: budget
      };
      // Anthropic strictly mandates temperature = 1.0 when thinking is enabled
      payload.temperature = 1.0;
    } else {
      // Clamped to 1.0 max for Claude
      payload.temperature = Math.min(1.0, Math.max(0.0, Number(parameters.temperature ?? 0.7)));
    }

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude chat error: HTTP ${res.status}`);
    }

    const tagBuffer = new TagStreamBuffer();

    await this.readSSEStream(res.body, ({ event, data }) => {
      try {
        const json = JSON.parse(data);

        // Claude content_block_delta event
        if (event === 'content_block_delta' && json.delta) {
          if (json.delta.type === 'thinking_delta' && json.delta.thinking) {
            onThinking(json.delta.thinking);
            return;
          }

          if (json.delta.type === 'text_delta' && json.delta.text) {
            tagBuffer.processChunk(json.delta.text, onThinking, onChunk);
          }
        }
      } catch (e) {
        // Ignore ping or partial lines
      }
    });

    tagBuffer.flush(onThinking, onChunk);
  }
}
