import { GroqProvider } from './groq-provider.js';
import { GeminiProvider } from './gemini-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { ClaudeProvider } from './claude-provider.js';
import { XAIProvider } from './xai-provider.js';

export class ProviderRegistry {
  static providers = {
    groq: new GroqProvider(),
    gemini: new GeminiProvider(),
    openai: new OpenAIProvider(),
    claude: new ClaudeProvider(),
    xai: new XAIProvider()
  };

  static getSupportedProviders() {
    return Object.keys(this.providers);
  }

  static getProvider(id) {
    const provider = this.providers[id.toLowerCase()];
    if (!provider) {
      throw new Error(`Unsupported provider: "${id}"`);
    }
    return provider;
  }

  static async fetchModelsForProvider(providerId, apiKey) {
    const provider = this.getProvider(providerId);
    return await provider.fetchModels(apiKey);
  }

  /**
   * Safe fallback model presets in case of API rate limits or network issues.
   */
  static getFallbackModels(providerId) {
    const presets = {
      groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', contextWindow: 131072, supportsVision: false, supportsThinking: false },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', contextWindow: 131072, supportsVision: false, supportsThinking: false },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B', contextWindow: 131072, supportsVision: false, supportsThinking: true },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, supportsVision: false, supportsThinking: false }
      ],
      gemini: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576, supportsVision: true, supportsThinking: false },
        { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking Exp', contextWindow: 1048576, supportsVision: true, supportsThinking: true },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2097152, supportsVision: true, supportsThinking: false },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1048576, supportsVision: true, supportsThinking: false }
      ],
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o (Omni)', contextWindow: 128000, supportsVision: true, supportsThinking: false },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, supportsVision: true, supportsThinking: false },
        { id: 'o1', name: 'o1 Reasoning', contextWindow: 200000, supportsVision: true, supportsThinking: true },
        { id: 'o3-mini', name: 'o3-mini Reasoning', contextWindow: 200000, supportsVision: false, supportsThinking: true }
      ],
      claude: [
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)', contextWindow: 200000, supportsVision: true, supportsThinking: true },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, supportsVision: true, supportsThinking: false },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, supportsVision: true, supportsThinking: false }
      ],
      xai: [
        { id: 'grok-2-latest', name: 'Grok 2 Latest', contextWindow: 131072, supportsVision: false, supportsThinking: false },
        { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', contextWindow: 32768, supportsVision: true, supportsThinking: false },
        { id: 'grok-beta', name: 'Grok Beta', contextWindow: 131072, supportsVision: false, supportsThinking: false }
      ]
    };
    return presets[providerId] || [];
  }
}
