import { defaultState } from './default-state.js';

const STORAGE_KEYS = {
  API_KEYS: 'askbot_api_keys',
  ACTIVE_PROVIDER: 'askbot_active_provider',
  SELECTED_MODEL: 'askbot_selected_model',
  CACHED_MODELS: 'askbot_cached_models',
  PARAMETERS: 'askbot_parameters',
  MODES: 'askbot_modes',
  CHATS: 'askbot_chats',
  CURRENT_CHAT_ID: 'askbot_current_chat_id',
  THEME: 'askbot_theme'
};

export class Store {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    const state = JSON.parse(JSON.stringify(defaultState));

    try {
      if (typeof localStorage !== 'undefined') {
        const storedKeys = localStorage.getItem(STORAGE_KEYS.API_KEYS);
        if (storedKeys) state.apiKeys = JSON.parse(storedKeys);

        const storedProvider = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER);
        if (storedProvider) state.activeProvider = storedProvider;

        const storedModel = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
        if (storedModel) state.selectedModel = storedModel;

        const storedCachedModels = localStorage.getItem(STORAGE_KEYS.CACHED_MODELS);
        if (storedCachedModels) state.cachedModels = JSON.parse(storedCachedModels);

        const storedParams = localStorage.getItem(STORAGE_KEYS.PARAMETERS);
        if (storedParams) state.parameters = { ...state.parameters, ...JSON.parse(storedParams) };

        const storedModes = localStorage.getItem(STORAGE_KEYS.MODES);
        if (storedModes) state.modes = { ...state.modes, ...JSON.parse(storedModes) };

        // Safely migrate legacy localStorage values (e.g. thinkingLevel: "off" -> "low")
        if (!state.modes.thinkingLevel || state.modes.thinkingLevel === 'off' || !['low', 'medium', 'high'].includes(state.modes.thinkingLevel)) {
          state.modes.thinkingLevel = 'low';
          try {
            localStorage.setItem(STORAGE_KEYS.MODES, JSON.stringify(state.modes));
          } catch {}
        }

        const storedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
        if (storedChats) state.chats = JSON.parse(storedChats);

        const storedCurrentChat = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT_ID);
        if (storedCurrentChat) state.currentChatId = storedCurrentChat;

        const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (storedTheme) {
          state.theme = storedTheme;
        } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          state.theme = 'light';
        }
      }
    } catch (e) {
      console.warn('Failed to load initial state from localStorage:', e);
    }

    return state;
  }

  persist(keys) {
    try {
      if (typeof localStorage === 'undefined') return;

      if (keys.includes('apiKeys')) {
        localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(this.state.apiKeys));
      }
      if (keys.includes('activeProvider')) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, this.state.activeProvider);
      }
      if (keys.includes('selectedModel')) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, this.state.selectedModel);
      }
      if (keys.includes('cachedModels')) {
        localStorage.setItem(STORAGE_KEYS.CACHED_MODELS, JSON.stringify(this.state.cachedModels));
      }
      if (keys.includes('parameters')) {
        localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(this.state.parameters));
      }
      if (keys.includes('modes')) {
        localStorage.setItem(STORAGE_KEYS.MODES, JSON.stringify(this.state.modes));
      }
      if (keys.includes('chats')) {
        localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(this.state.chats));
      }
      if (keys.includes('currentChatId')) {
        if (this.state.currentChatId) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT_ID, this.state.currentChatId);
        } else {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_CHAT_ID);
        }
      }
      if (keys.includes('theme')) {
        localStorage.setItem(STORAGE_KEYS.THEME, this.state.theme);
      }
    } catch (e) {
      console.error('Error persisting state to localStorage:', e);
    }
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    const changedKeys = Object.keys(updates);
    this.state = { ...this.state, ...updates };
    this.persist(changedKeys);
    this.notify(changedKeys);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(changedKeys) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, changedKeys);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }

  // --- API Key Management ---
  setApiKey(provider, key) {
    const updated = { ...this.state.apiKeys };
    if (key && key.trim()) {
      updated[provider] = key.trim();
    } else {
      delete updated[provider];
    }
    this.setState({ apiKeys: updated });
  }

  removeApiKey(provider) {
    const updated = { ...this.state.apiKeys };
    delete updated[provider];
    this.setState({ apiKeys: updated });
  }

  hasAnyKey() {
    return Object.values(this.state.apiKeys).some(k => Boolean(k && k.trim()));
  }

  // --- Chat Conversation Management ---
  getChat(id) {
    return this.state.chats.find(c => c.id === id) || null;
  }

  getCurrentChat() {
    if (!this.state.currentChatId) return null;
    return this.getChat(this.state.currentChatId);
  }

  addChat(options = {}) {
    const id = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const newChat = {
      id,
      title: options.title || 'New conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };

    const chats = [newChat, ...this.state.chats];
    this.setState({
      chats,
      currentChatId: id
    });
    return newChat;
  }

  createChat(titleOrOptions = {}) {
    const options = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : (titleOrOptions || {});
    return this.addChat(options);
  }

  setActiveChat(id) {
    if (this.state.currentChatId !== id) {
      this.setState({ currentChatId: id });
    }
  }

  selectChat(id) {
    this.setActiveChat(id);
  }

  updateChat(id, updates) {
    const chats = this.state.chats.map(chat => {
      if (chat.id === id) {
        return { ...chat, ...updates, updatedAt: Date.now() };
      }
      return chat;
    });
    this.setState({ chats });
  }

  deleteChat(id) {
    const chats = this.state.chats.filter(c => c.id !== id);
    let currentChatId = this.state.currentChatId;
    if (currentChatId === id) {
      currentChatId = chats.length > 0 ? chats[0].id : null;
    }
    this.setState({ chats, currentChatId });
  }

  clearAllChats() {
    this.setState({ chats: [], currentChatId: null });
  }

  clearAllData() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch (e) {
      console.warn(e);
    }
    this.state = JSON.parse(JSON.stringify(defaultState));
    this.notify(Object.keys(this.state));
  }

  // --- Message Appending & Updates ---
  addMessage(chatId, message) {
    const chat = this.getChat(chatId);
    if (!chat) return null;

    const messageWithId = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      ...message
    };

    const updatedMessages = [...chat.messages, messageWithId];
    this.updateChat(chatId, { messages: updatedMessages });
    return messageWithId;
  }

  updateLastMessage(chatId, updates) {
    const chat = this.getChat(chatId);
    if (!chat || chat.messages.length === 0) return;

    const updatedMessages = [...chat.messages];
    const lastIndex = updatedMessages.length - 1;
    updatedMessages[lastIndex] = { ...updatedMessages[lastIndex], ...updates };

    this.updateChat(chatId, { messages: updatedMessages });
  }
}

// Global store singleton instance
export const store = new Store();
