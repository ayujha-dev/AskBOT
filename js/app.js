import { store } from './state/store.js';
import { ProviderRegistry } from './providers/provider-registry.js';
import { TokenCounter } from './services/token-counter.js';
import { SearchService } from './services/search-service.js';
import { PyodideBridge } from './services/pyodide-bridge.js';

import { SidebarComponent } from './ui/components/sidebar.js';
import { ComposerComponent } from './ui/components/composer.js';
import { MessagesComponent } from './ui/components/messages.js';
import { SuggestionsComponent } from './ui/components/suggestions.js';
import { ParametersDrawer } from './ui/components/parameters-drawer.js';
import { FileManager } from './ui/components/file-manager.js';
import { OnboardingModal } from './ui/components/onboarding-modal.js';
import { SettingsModal } from './ui/components/settings-modal.js';
import { BackgroundEffects } from './ui/components/background-effects.js';
import { ChatNavRail } from './ui/components/chat-nav-rail.js';

class AppCoordinator {
  constructor() {
    this.activeAbortController = null;
    this.isStreaming = false;

    this.init();
  }

  init() {
    // 1. Initialize UI Subsystems
    BackgroundEffects.init();
    this.parametersDrawer = new ParametersDrawer();
    this.chatNavRail = new ChatNavRail();
    this.fileManager = new FileManager();
    this.messagesComponent = new MessagesComponent();

    this.suggestionsComponent = new SuggestionsComponent((prompt, mode) => {
      this.handleSuggestionSelect(prompt, mode);
    });

    this.settingsModal = new SettingsModal();

    this.onboardingModal = new OnboardingModal((provider, modelId) => {
      this.refreshCurrentChat();
    });

    this.sidebar = new SidebarComponent({
      onSelectChat: (id) => this.selectChat(id),
      onNewChat: () => this.startNewChat(),
      onOpenSettings: () => this.settingsModal.open(),
      onSelectModel: (card) => this.showModelPickerDropdown(card, 'sidebar')
    });

    this.composer = new ComposerComponent({
      fileManager: this.fileManager,
      onSend: (text) => this.handleSendMessage(text),
      onSelectModel: (pill) => this.showModelPickerDropdown(pill, 'top')
    });

    // 2. Wire Header Controls: Model Picker, New Chat, Mode Toggles
    this.wireHeaderModelPicker();
    this.wireHeaderModeButtons();

    const headerNewChatBtn = document.getElementById('header-btn-new-chat');
    if (headerNewChatBtn) {
      headerNewChatBtn.addEventListener('click', () => {
        this.startNewChat();
      });
    }

    // 3. Subscribe to store changes to keep conversation view in sync
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('currentChatId') || changedKeys.includes('chats')) {
        this.refreshCurrentChat();
      }
    });

    // 4. Load active conversation or show empty state
    this.refreshCurrentChat();

    // 5. Auto-check models on startup if key exists and cachedModels is empty
    this.autoLoadModelsIfEmpty();
  }

  async autoLoadModelsIfEmpty() {
    const { activeProvider, apiKeys, cachedModels } = store.getState();
    const currentKey = apiKeys[activeProvider];

    if (currentKey && (!cachedModels[activeProvider] || cachedModels[activeProvider].length === 0)) {
      try {
        const models = await ProviderRegistry.fetchModelsForProvider(activeProvider, currentKey);
        const updatedCached = { ...cachedModels, [activeProvider]: models };
        store.setState({
          cachedModels: updatedCached,
          selectedModel: store.getState().selectedModel || models[0].id
        });
      } catch (err) {
        console.warn('Auto model detection failed on startup, using presets:', err);
        const fallback = ProviderRegistry.getFallbackModels(activeProvider);
        store.setState({
          selectedModel: store.getState().selectedModel || fallback[0]?.id
        });
      }
    } else if (!store.getState().selectedModel) {
      const fallback = ProviderRegistry.getFallbackModels(activeProvider);
      if (fallback.length > 0) {
        store.setState({ selectedModel: fallback[0].id });
      }
    }
  }

  wireHeaderModelPicker() {
    const badge = document.getElementById('header-model-badge');
    if (!badge) return;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showModelPickerDropdown(badge);
    });
  }

  wireHeaderModeButtons() {
    const codeBtn = document.getElementById('header-code-toggle');
    const searchBtn = document.getElementById('header-search-toggle');

    if (codeBtn) {
      codeBtn.addEventListener('click', () => {
        const current = store.getState().modes.codeInterpreter;
        store.setState({
          modes: { ...store.getState().modes, codeInterpreter: !current }
        });
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const current = store.getState().modes.webSearch;
        store.setState({
          modes: { ...store.getState().modes, webSearch: !current }
        });
      });
    }

    const syncHeaderButtons = (modes) => {
      if (codeBtn) {
        if (modes.codeInterpreter) {
          codeBtn.classList.add('border-emerald-500/50', 'bg-emerald-500/10', 'text-emerald-400');
          codeBtn.classList.remove('text-[var(--text-muted)]');
        } else {
          codeBtn.classList.remove('border-emerald-500/50', 'bg-emerald-500/10', 'text-emerald-400');
          codeBtn.classList.add('text-[var(--text-muted)]');
        }
      }
      if (searchBtn) {
        if (modes.webSearch) {
          searchBtn.classList.add('border-sky-500/50', 'bg-sky-500/10', 'text-sky-400');
          searchBtn.classList.remove('text-[var(--text-muted)]');
        } else {
          searchBtn.classList.remove('border-sky-500/50', 'bg-sky-500/10', 'text-sky-400');
          searchBtn.classList.add('text-[var(--text-muted)]');
        }
      }
    };

    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('modes')) {
        syncHeaderButtons(state.modes);
      }
    });

    syncHeaderButtons(store.getState().modes);
  }

  showModelPickerDropdown(anchorEl, placement = 'bottom') {
    let dropdown = document.getElementById('header-model-dropdown');
    if (dropdown) {
      dropdown.remove();
      return;
    }

    const { activeProvider, cachedModels, selectedModel } = store.getState();
    const models = (cachedModels[activeProvider] && cachedModels[activeProvider].length > 0)
      ? cachedModels[activeProvider]
      : ProviderRegistry.getFallbackModels(activeProvider);

    dropdown = document.createElement('div');
    dropdown.id = 'header-model-dropdown';

    let positionClass = 'absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72';
    if (placement === 'top') {
      positionClass = 'absolute bottom-full mb-2 left-0 w-72';
    } else if (placement === 'sidebar') {
      positionClass = 'absolute bottom-full mb-2 left-0 right-0 w-full';
    }

    dropdown.className = `${positionClass} max-h-96 overflow-y-auto rounded-2xl bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-xl z-50 p-2 text-xs`;

    // Provider Tabs
    const providers = ProviderRegistry.getSupportedProviders();
    let providerTabsHtml = '<div class="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-[var(--surface-border)]">';
    for (const p of providers) {
      const isCurrentP = p === activeProvider;
      providerTabsHtml += `<button class="btn-tab-provider px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${
        isCurrentP
          ? 'bg-[var(--accent-blue)] text-white'
          : 'bg-[var(--surface-panel)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }" data-provider="${p}">${p}</button>`;
    }
    providerTabsHtml += '</div>';

    dropdown.innerHTML = `
      ${providerTabsHtml}
      <div class="px-1 py-1 font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between mb-1">
        <span>${activeProvider.toUpperCase()} MODELS</span>
        <span class="text-[10px] font-normal text-[var(--accent-blue)] cursor-pointer hover:underline" id="btn-dropdown-refresh">Refresh</span>
      </div>
      <div id="dropdown-models-list" class="space-y-1"></div>
    `;

    const listEl = dropdown.querySelector('#dropdown-models-list');

    models.forEach(m => {
      const isSelected = m.id === selectedModel;
      const item = document.createElement('button');
      item.className = `w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between text-xs ui-transition ${
        isSelected
          ? 'bg-[var(--accent-subtle)] text-[var(--accent-blue)] font-medium'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-panel)]'
      }`;

      item.innerHTML = `
        <div class="truncate pr-2">
          <div class="truncate font-medium">${m.name || m.id}</div>
          <div class="text-[10px] text-[var(--text-muted)] truncate">${m.id}</div>
        </div>
        ${isSelected ? '<svg class="w-3.5 h-3.5 text-[var(--accent-blue)] flex-shrink-0"><use href="#icon-check"/></svg>' : ''}
      `;

      item.addEventListener('click', () => {
        store.setState({ selectedModel: m.id });
        dropdown.remove();
      });

      listEl.appendChild(item);
    });

    // Provider Tab Click Listener
    dropdown.querySelectorAll('.btn-tab-provider').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextProvider = btn.getAttribute('data-provider');
        const cached = store.getState().cachedModels[nextProvider] || [];
        const fallback = ProviderRegistry.getFallbackModels(nextProvider);
        const nextModel = cached[0]?.id || fallback[0]?.id || '';
        store.setState({
          activeProvider: nextProvider,
          selectedModel: nextModel
        });
        dropdown.remove();
        this.showModelPickerDropdown(anchorEl, placement);
      });
    });

    anchorEl.parentElement.style.position = 'relative';
    anchorEl.parentElement.appendChild(dropdown);

    const closeHandler = (e) => {
      if (!dropdown.contains(e.target) && !anchorEl.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);

    const refreshBtn = dropdown.querySelector('#btn-dropdown-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        refreshBtn.textContent = 'Fetching...';
        const key = store.getState().apiKeys[activeProvider];
        if (key) {
          try {
            const fresh = await ProviderRegistry.fetchModelsForProvider(activeProvider, key);
            store.setState({
              cachedModels: { ...store.getState().cachedModels, [activeProvider]: fresh },
              selectedModel: fresh[0]?.id || selectedModel
            });
            dropdown.remove();
            this.showModelPickerDropdown(anchorEl, placement);
          } catch (err) {
            alert(err.message);
            dropdown.remove();
          }
        } else {
          alert('No API key saved for this provider.');
          dropdown.remove();
        }
      });
    }
  }

  handleSuggestionSelect(prompt, mode) {
    if (mode === 'code') {
      store.setState({
        modes: { ...store.getState().modes, codeInterpreter: true }
      });
    } else if (mode === 'search') {
      store.setState({
        modes: { ...store.getState().modes, webSearch: true }
      });
    }
    this.composer.setText(prompt);
  }

  startNewChat() {
    store.setState({ currentChatId: null });
    this.messagesComponent.render([]);
    if (this.chatNavRail) {
      this.chatNavRail.update([]);
    }
    this.suggestionsComponent.render(true);

    const chatTitleEl = document.getElementById('header-chat-title');
    if (chatTitleEl) {
      chatTitleEl.textContent = 'New conversation';
      chatTitleEl.title = 'New conversation';
    }

    const tokenCountEl = document.getElementById('header-token-count');
    if (tokenCountEl) {
      tokenCountEl.textContent = '0 tokens';
    }
  }

  selectChat(chatId) {
    store.setActiveChat(chatId);
  }

  refreshCurrentChat() {
    const currentChat = store.getCurrentChat();
    const messages = (currentChat && currentChat.messages) ? currentChat.messages : [];
    this.messagesComponent.render(messages);
    if (this.chatNavRail) {
      this.chatNavRail.update(messages);
    }

    const chatTitleEl = document.getElementById('header-chat-title');
    if (chatTitleEl) {
      const title = currentChat?.title || 'New conversation';
      chatTitleEl.textContent = title;
      chatTitleEl.title = title;
    }

    const tokenCountEl = document.getElementById('header-token-count');
    if (tokenCountEl) {
      const estTokens = TokenCounter.estimateMessagesTokens(messages);
      tokenCountEl.textContent = `${estTokens.toLocaleString()} tokens`;
    }
  }

  async handleSendMessage(userPrompt) {
    if (this.isStreaming) return;

    const state = store.getState();
    const { activeProvider, selectedModel, apiKeys, parameters, modes } = state;
    const apiKey = apiKeys[activeProvider];

    if (!apiKey) {
      this.settingsModal.open();
      alert(`Please configure an API key for ${activeProvider.toUpperCase()} in Settings first.`);
      return;
    }

    // 1. Get or create chat
    let chatId = state.currentChatId;
    let isNewChat = false;

    if (!chatId) {
      const newTitle = SidebarComponent.generateTitle(userPrompt);
      const newChat = store.addChat({ title: newTitle });
      chatId = newChat.id;
      isNewChat = true;
    } else {
      const existing = store.getChat(chatId);
      if (existing && existing.messages.length === 0) {
        store.updateChat(chatId, { title: SidebarComponent.generateTitle(userPrompt) });
      }
    }

    // 2. Extract attachments and clear tray
    const attachments = this.fileManager.getAttachments();
    this.fileManager.clear();

    // 3. Save user message to store
    store.addMessage(chatId, {
      role: 'user',
      content: userPrompt,
      attachments
    });

    // 4. Update UI view
    this.refreshCurrentChat();

    // 5. Handle Web Search Grounding for non-Gemini providers (Gemini uses native googleSearch tool)
    let searchSources = [];
    let searchAugmentedPrompt = userPrompt;

    if (modes.webSearch && activeProvider !== 'gemini') {
      try {
        searchSources = await SearchService.search(userPrompt, { tavilyApiKey: apiKeys.tavily });
        if (searchSources.length > 0) {
          const contextSnippet = SearchService.formatSearchContext(searchSources);
          searchAugmentedPrompt = `${contextSnippet}\nUser Query: ${userPrompt}`;
        }
      } catch (err) {
        console.warn('Web search grounding error:', err);
      }
    }

    // 6. Build outgoing message history
    const currentMessages = store.getChat(chatId).messages;
    const outgoingMessages = currentMessages.map((m, index) => {
      // If last user message and search was augmented, swap content for request payload
      if (index === currentMessages.length - 1 && searchAugmentedPrompt !== userPrompt) {
        return { ...m, content: searchAugmentedPrompt };
      }
      return m;
    });

    // If Code Interpreter is on, prepend system instruction for Python code output
    if (modes.codeInterpreter) {
      outgoingMessages.unshift({
        role: 'system',
        content: 'You have a client-side Python Code Interpreter powered by WebAssembly (Pyodide). When solving problems that require calculation, data analysis, or plotting, write clean, self-contained Python code inside ```python ... ``` blocks. Use matplotlib.pyplot for charts and plots.'
      });
    }

    // 7. Apply Context Window Sliding Budget Trimming
    const budget = parameters.contextBudgetTokens || 8192;
    const trimmedPayload = TokenCounter.trimToContextBudget(outgoingMessages, budget);

    // 8. Setup streaming assistant placeholder
    const assistantMsgId = 'msg_' + Date.now();
    const streamingHandle = this.messagesComponent.createStreamingMessage(assistantMsgId);

    if (searchSources.length > 0) {
      streamingHandle.updateSources(searchSources);
    }

    let fullAnswer = '';
    let fullThinking = '';
    this.isStreaming = true;
    this.activeAbortController = new AbortController();

    try {
      const provider = ProviderRegistry.getProvider(activeProvider);

      await provider.streamChat({
        apiKey,
        messages: trimmedPayload,
        model: selectedModel,
        parameters,
        modes,
        onThinking: (delta) => {
          fullThinking += delta;
          streamingHandle.updateThinking(fullThinking);
        },
        onChunk: (delta) => {
          fullAnswer += delta;
          streamingHandle.updateContent(fullAnswer);
        },
        onSources: (sources) => {
          searchSources = sources;
          streamingHandle.updateSources(sources);
        },
        signal: this.activeAbortController.signal
      });

      streamingHandle.finalize();

      // 9. Save assistant message to persistent store
      const finalMsg = store.addMessage(chatId, {
        role: 'assistant',
        content: fullAnswer,
        thoughtProcess: fullThinking,
        searchSources: searchSources.length > 0 ? searchSources : undefined
      });

      // 10. If Code Interpreter Mode is active, check for Python block and auto-execute
      if (modes.codeInterpreter) {
        const pythonCode = PyodideBridge.extractPythonCode(fullAnswer);
        if (pythonCode) {
          const runResult = await PyodideBridge.execute(pythonCode);
          store.updateLastMessage(chatId, { executionOutput: runResult });
          this.refreshCurrentChat();
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
      } else {
        console.error('Chat generation error:', err);
        streamingHandle.updateContent(`**Error calling ${activeProvider.toUpperCase()}:** ${err.message}\n\nPlease verify your API key in Settings.`);
        store.addMessage(chatId, {
          role: 'assistant',
          content: `**Error calling ${activeProvider.toUpperCase()}:** ${err.message}`
        });
      }
    } finally {
      this.isStreaming = false;
      this.activeAbortController = null;
    }
  }
}

// Instantiate on DOM ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppCoordinator();
  });
}
