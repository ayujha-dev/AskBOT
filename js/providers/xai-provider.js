import { BaseProvider } from './base-provider.js';
import { TagStreamBuffer } from '../utils/stream-buffer.js';

export class XAIProvider extends BaseProvider {
  constructor() {
    super('xai', 'xAI (Grok)');
    this.baseUrl = 'https://api.x.ai/v1';
  }

  filterChatModels(rawModels) {
    if (!Array.isArray(rawModels)) return [];
    return rawModels
      .filter(m => {
        const id = m.id.toLowerCase();
        return id.includes('grok');
      })
      .map(m => {
        const id = m.id;
        return {
          id,
          name: id,
          contextWindow: id.includes('vision') ? 32768 : 131072,
          supportsVision: id.includes('vision'),
          supportsThinking: id.includes('reasoning') || id.includes('think')
        };
      })
      .sort((a, b) => {
        const score = id => {
          if (id === 'grok-2' || id === 'grok-2-latest') return 100;
          if (id.includes('grok-2-vision')) return 90;
          if (id.includes('grok-beta')) return 80;
          return 0;
        };
        return score(b.id) - score(a.id) || a.id.localeCompare(b.id);
      });
  }

  async fetchModels(apiKey) {
    const res = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch xAI models: HTTP ${res.status}`);
    }

    const data = await res.json();
    return this.filterChatModels(data.data || []);
  }

  formatMessages(messages) {
    return messages.map(msg => {
      if (!msg.attachments || msg.attachments.length === 0) {
        return { role: msg.role, content: msg.content };
      }

      const contentParts = [];
      if (msg.content) {
        contentParts.push({ type: 'text', text: msg.content });
      }

      for (const att of msg.attachments) {
        if (att.type === 'image') {
          contentParts.push({
            type: 'image_url',
            image_url: { url: att.data }
          });
        } else if (att.type === 'text') {
          contentParts.push({
            type: 'text',
            text: `\n\n--- Attachment: ${att.name} ---\n${att.data}`
          });
        }
      }

      return { role: msg.role, content: contentParts };
    });
  }

  async streamChat({ apiKey, messages, model, parameters, modes, onChunk, onThinking, signal }) {
    const payload = {
      model: model || 'grok-2-latest',
      messages: this.formatMessages(messages),
      temperature: Number(parameters.temperature ?? 0.7),
      stream: true
    };

    if (parameters.maxTokens) {
      payload.max_tokens = parameters.maxTokens;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `xAI chat error: HTTP ${res.status}`);
    }

    const tagBuffer = new TagStreamBuffer();

    await this.readSSEStream(res.body, ({ data }) => {
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        if (!delta) return;

        if (delta.reasoning_content || delta.reasoning) {
          onThinking(delta.reasoning_content || delta.reasoning);
          return;
        }

        if (delta.content) {
          tagBuffer.processChunk(delta.content, onThinking, onChunk);
        }
      } catch (e) {
        console.warn('Failed to parse xAI SSE chunk:', e);
      }
    });

    tagBuffer.flush(onThinking, onChunk);
  }
}
