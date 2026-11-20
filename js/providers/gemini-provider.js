import { BaseProvider } from './base-provider.js';
import { TagStreamBuffer } from '../utils/stream-buffer.js';

export class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini', 'Google Gemini');
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  filterChatModels(rawModels) {
    if (!Array.isArray(rawModels)) return [];
    return rawModels
      .filter(m => {
        const methods = m.supportedGenerationMethods || [];
        return methods.includes('generateContent');
      })
      .map(m => {
        const id = m.name.replace(/^models\//, '');
        const isThinking = id.includes('thinking') || id.includes('2.5');
        return {
          id,
          name: m.displayName || id,
          contextWindow: m.inputTokenLimit || 1048576,
          supportsVision: true, // All modern Gemini models support multimodal vision
          supportsThinking: isThinking
        };
      })
      .sort((a, b) => {
        const score = id => {
          if (id.includes('2.0-flash')) return 100;
          if (id.includes('2.5')) return 95;
          if (id.includes('1.5-pro')) return 90;
          if (id.includes('1.5-flash')) return 85;
          return 0;
        };
        return score(b.id) - score(a.id) || a.id.localeCompare(b.id);
      });
  }

  async fetchModels(apiKey) {
    const res = await fetch(`${this.baseUrl}/models?key=${apiKey}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch Gemini models: HTTP ${res.status}`);
    }

    const data = await res.json();
    return this.filterChatModels(data.models || []);
  }

  formatContents(messages) {
    const contents = [];
    let systemInstruction = null;

    for (const msg of messages) {
      if (msg.role === 'system') {
        if (!systemInstruction) {
          systemInstruction = { parts: [] };
        }
        systemInstruction.parts.push({ text: msg.content });
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.type === 'image' || att.type === 'video') {
            // Strip data:image/...;base64, or data:video/...;base64, header to leave pure base64
            const base64Data = att.data.includes(';base64,')
              ? att.data.split(';base64,')[1]
              : att.data;
            parts.push({
              inlineData: {
                mimeType: att.mimeType || (att.type === 'video' ? 'video/mp4' : 'image/png'),
                data: base64Data
              }
            });
          } else if (att.type === 'text') {
            parts.push({
              text: `\n\n--- Attachment: ${att.name} ---\n${att.data}`
            });
          }
        }
      }

      contents.push({ role, parts });
    }

    // Defensive check: Gemini API strictly requires that the first content turn has role 'user'
    while (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }

    return { contents, systemInstruction };
  }

  async streamChat({ apiKey, messages, model, parameters, modes, onChunk, onThinking, onSources, signal }) {
    const modelId = model || 'gemini-2.0-flash';
    const { contents, systemInstruction } = this.formatContents(messages);

    const payload = {
      contents,
      generationConfig: {
        temperature: Number(parameters.temperature ?? 0.7)
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    if (parameters.maxTokens) {
      payload.generationConfig.maxOutputTokens = parameters.maxTokens;
    }

    // Google Search Grounding mode
    if (modes.webSearch) {
      payload.tools = [{ googleSearch: {} }];
    }

    // Native thinkingConfig for Gemini models supporting reasoning (e.g. gemini-2.0-flash-thinking-exp or 2.5)
    const isThinkingSupported = modelId.includes('thinking') || modelId.includes('2.5');
    if (isThinkingSupported && modes.thinkingLevel && modes.thinkingLevel !== 'off') {
      const budgetMap = { low: 1024, medium: 4096, high: 8192 };
      payload.generationConfig.thinkingConfig = {
        thinkingBudget: budgetMap[modes.thinkingLevel] || 2048
      };
    }

    const url = `${this.baseUrl}/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini chat error: HTTP ${res.status}`);
    }

    const tagBuffer = new TagStreamBuffer();

    await this.readSSEStream(res.body, ({ data }) => {
      try {
        const json = JSON.parse(data);
        const candidate = json.candidates?.[0];
        if (!candidate) return;

        // Grounding / Citation Sources
        const grounding = candidate.groundingMetadata;
        if (grounding && onSources) {
          const sources = [];
          if (Array.isArray(grounding.groundingChunks)) {
            for (const chunk of grounding.groundingChunks) {
              if (chunk.web) {
                sources.push({
                  title: chunk.web.title || 'Web Result',
                  url: chunk.web.uri,
                  snippet: chunk.web.snippet || ''
                });
              }
            }
          }
          if (sources.length > 0) {
            onSources(sources);
          }
        }

        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.thought) {
            onThinking(part.text || '');
            continue;
          }

          if (part.text) {
            tagBuffer.processChunk(part.text, onThinking, onChunk);
          }
        }
      } catch (e) {
        console.warn('Failed to parse Gemini SSE chunk:', e);
      }
    });

    tagBuffer.flush(onThinking, onChunk);
  }
}
