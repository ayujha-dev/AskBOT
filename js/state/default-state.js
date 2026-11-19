/**
 * Default initial state for AskBOT.
 * Ensures strict authentic state: no dummy chats.
 */

export const defaultState = {
  // BYOK API Keys (stored only in browser localStorage)
  apiKeys: {},

  // Active Provider & Selected Model
  activeProvider: 'groq',
  selectedModel: '',
  cachedModels: {
    groq: [],
    xai: [],
    openai: [],
    gemini: [],
    claude: []
  },

  // Groq Playground Parameter Controls
  parameters: {
    temperature: 0.7,
    maxTokens: 4096,
    contextBudgetTokens: 8192
  },

  // Interactive Modes
  modes: {
    codeInterpreter: false,
    webSearch: false,
    thinkingLevel: 'off' // 'off' | 'low' | 'medium' | 'high'
  },

  // Authentic chat conversations
  chats: [],
  currentChatId: null,

  // Theme & Drawer layout
  theme: 'dark',
  sidebarOpen: true,
  parametersDrawerOpen: false
};
