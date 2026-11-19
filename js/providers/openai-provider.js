import { BaseProvider } from './base-provider.js';
import { TagStreamBuffer } from '../utils/stream-buffer.js';

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai', 'OpenAI');
    this.baseUrl = 'https://api.openai.com/v1';
  }

  filterChatModels(rawModels) {
    if (!Array.isArray(rawModels)) return [];
    const nonChatSubstrings = [
      'embedding', 'whisper', 'tts', 'dall-e', 'babbage', 'davinci',
      'canary', 'moderation', 'realtime', 'transcription', 'audio'
    ];

    return rawModels
      .filter(m => {
        const id = m.id.toLowerCase();
        return !nonChatSubstrings.some(sub => id.includes(sub));
      })
      .map(m => {
        const id = m.id;
        const isVision = id.includes('4o') || id.includes('vision') || id.includes('o1') || id.includes('o3');
        const isReasoning = id.startsWith('o1') || id.startsWith('o3');
        return {
          id,
          name: id,
          contextWindow: id.includes('4o') || isReasoning ? 128000 : 16384,
          supportsVision: isVision,
          supportsThinking: isReasoning
        };
      })
      .sort((a, b) => {
        // Prioritize modern models
        const score = id => {
          if (id === 'gpt-4o') return 100;
          if (id === 'gpt-4o-mini') return 95;
          if (id.startsWith('o3')) return 90;
          if (id.startsWith('o1')) return 85;
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
      throw new Error(err.error?.message || `Failed to fetch OpenAI models: HTTP ${res.status}`);
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
        } else if (att.type === 'video') {
          contentParts.push({
            type: 'text',
            text: `\n\n--- Attachment: ${att.name} (${att.mimeType || 'video/mp4'}) ---\n[Note: Direct video analysis is exclusively supported by Google Gemini]`
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
      model: model || 'gpt-4o',
      messages: this.formatMessages(messages),
      stream: true
    };

    const isReasoning = model.startsWith('o1') || model.startsWith('o3');

    if (isReasoning) {
      if (modes.thinkingLevel && modes.thinkingLevel !== 'off') {
        payload.reasoning_effort = modes.thinkingLevel;
      }
      if (parameters.maxTokens) {
        payload.max_completion_tokens = parameters.maxTokens;
      }
    } else {
      payload.temperature = Number(parameters.temperature ?? 0.7);
      if (parameters.maxTokens) {
        payload.max_tokens = parameters.maxTokens;
      }
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
      throw new Error(err.error?.message || `OpenAI chat error: HTTP ${res.status}`);
    }

    const tagBuffer = new TagStreamBuffer();

    await this.readSSEStream(res.body, ({ data }) => {
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        if (!delta) return;

        // Native reasoning content (e.g. o1/o3 or compatible proxies)
        if (delta.reasoning_content || delta.reasoning) {
          onThinking(delta.reasoning_content || delta.reasoning);
          return;
        }

        if (delta.content) {
          tagBuffer.processChunk(delta.content, onThinking, onChunk);
        }
      } catch (e) {
        console.warn('Failed to parse OpenAI SSE chunk:', e);
      }
    });

    tagBuffer.flush(onThinking, onChunk);
  }
}
