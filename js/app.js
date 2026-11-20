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
import { mountAntigravity } from './antigravity.js';

class AppCoordinator {
  constructor() {
    this.activeAbortController = null;
    this.isStreaming = false;
    this.antigravity = null;

    this.init();
  }

  init() {
    // 1. Initialize Antigravity WebGL2 Particle System
    const antigravityContainer = document.getElementById('antigravity-bg');
    if (antigravityContainer) {
      const isLight = store.getState().theme === 'light';
      this.antigravity = mountAntigravity(antigravityContainer, {
        colors: ['#fdbdbd', '#87e0fe', '#ffaa84'],
        count: 1500,
        magnetRadius: 9,
        ringRadius: 7,
        particleSize: 0.9,
        autoAnimate: true,
        ambient: 0.18,
        lightMode: isLight,
        opacity: isLight ? 0.35 : 0.42
      });
    }

    // 2. Initialize UI Subsystems
    BackgroundEffects.init();
    this.parametersDrawer = new ParametersDrawer();
    this.chatNavRail = new ChatNavRail({
      onOpenParameters: () => store.setState({ parametersDrawerOpen: true })
    });
    this.fileManager = new FileManager();
    
    this.messagesComponent = new MessagesComponent({
      onRegenerate: (msgId) => this.handleRegenerateMessage(msgId),
      onEditPrompt: (text) => this.handleEditPrompt(text)
    });

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

    // 2. Wire New Chat Button in Header
    const headerNewChatBtn = document.getElementById('header-btn-new-chat');
    if (headerNewChatBtn) {
      headerNewChatBtn.addEventListener('click', () => {
        this.startNewChat();
      });
    }

    // 3. Subscribe to store changes to keep conversation view in sync & theme synchronized
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('currentChatId') || changedKeys.includes('chats')) {
        this.refreshCurrentChat();
      }
      if (changedKeys.includes('theme')) {
        const isLight = state.theme === 'light';
        this.antigravity?.update({
          lightMode: isLight,
          opacity: isLight ? 0.35 : 0.42
        });
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

  showModelPickerDropdown(anchorEl, placement = 'top') {
    let dropdown = document.getElementById('composer-model-dropdown');
    if (dropdown) {
      dropdown.remove();
      return;
    }

    const { activeProvider, cachedModels, selectedModel, apiKeys } = store.getState();
    const allModels = (cachedModels[activeProvider] && cachedModels[activeProvider].length > 0)
      ? cachedModels[activeProvider]
      : ProviderRegistry.getFallbackModels(activeProvider);

    dropdown = document.createElement('div');
    dropdown.id = 'composer-model-dropdown';

    let positionClass = 'absolute bottom-full mb-2 left-0 w-80';
    if (placement === 'sidebar') {
      positionClass = 'absolute bottom-full mb-2 left-0 right-0 w-full';
    }

    dropdown.className = `${positionClass} max-h-96 overflow-hidden flex flex-col rounded-2xl bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-2xl z-50 p-3 text-xs`;

    // Provider Tabs
    const providers = ProviderRegistry.getSupportedProviders();
    let providerTabsHtml = '<div class="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-[var(--surface-border)]">';
    for (const p of providers) {
      const isCurrentP = p === activeProvider;
      const hasKey = Boolean(apiKeys[p]);
      providerTabsHtml += `<button class="btn-tab-provider px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ui-transition ${
        isCurrentP
          ? 'bg-[var(--accent-blue)] text-white shadow-sm'
          : 'bg-[var(--surface-panel)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }" data-provider="${p}">
        <span class="w-1.5 h-1.5 rounded-full ${hasKey ? (isCurrentP ? 'bg-white' : 'bg-emerald-400') : 'bg-zinc-500/40'}"></span>
        <span>${p}</span>
      </button>`;
    }
    providerTabsHtml += '</div>';

    dropdown.innerHTML = `
      ${providerTabsHtml}
      
      <!-- Quick Model Search Filter -->
      <div class="mb-2">
        <input type="text" id="model-search-filter" placeholder="Filter ${activeProvider.toUpperCase()} models..." class="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[var(--surface-border)] bg-[var(--surface-panel)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]">
      </div>

      <div class="px-1 py-1 font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between mb-1">
        <span>${activeProvider.toUpperCase()} MODELS</span>
        <span class="text-[10px] font-normal text-[var(--accent-blue)] cursor-pointer hover:underline" id="btn-dropdown-refresh">Refresh</span>
      </div>

      <div id="dropdown-models-list" class="space-y-1 overflow-y-auto max-h-56 pr-1"></div>
    `;

    const listEl = dropdown.querySelector('#dropdown-models-list');
    const filterInput = dropdown.querySelector('#model-search-filter');

    const renderModelItems = (filteredList) => {
      listEl.innerHTML = '';
      if (filteredList.length === 0) {
        listEl.innerHTML = '<div class="p-3 text-center text-[var(--text-muted)] text-[11px]">No matching models found.</div>';
        return;
      }

      filteredList.forEach(m => {
        const isSelected = m.id === selectedModel;
        const item = document.createElement('button');
        item.className = `w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between text-xs ui-transition ${
          isSelected
            ? 'bg-[var(--accent-subtle)] text-[var(--accent-blue)] font-medium border border-[var(--accent-blue)]/30'
            : 'text-[var(--text-primary)] hover:bg-[var(--surface-panel)] border border-transparent'
        }`;

        const idLower = m.id.toLowerCase();
        const isVision = idLower.includes('vision') || idLower.includes('4o') || idLower.includes('flash') || idLower.includes('pro') || idLower.includes('claude-3-5') || idLower.includes('claude-3-7');
        const isReasoning = idLower.includes('r1') || idLower.includes('o1') || idLower.includes('o3') || idLower.includes('thinking') || idLower.includes('reasoning') || idLower.includes('3.7-sonnet');

        const badges = [
          isVision ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">Vision</span>' : '',
          isReasoning ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Reasoning</span>' : ''
        ].filter(Boolean).join(' ');

        item.innerHTML = `
          <div class="truncate pr-2 flex-1">
            <div class="flex items-center gap-1.5 truncate">
              <span class="truncate font-medium">${m.name || m.id}</span>
              ${badges}
            </div>
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
    };

    renderModelItems(allModels);

    filterInput.addEventListener('input', () => {
      const q = filterInput.value.toLowerCase().trim();
      const filtered = allModels.filter(m => (m.name || '').toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
      renderModelItems(filtered);
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
    filterInput.focus();

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

  handleEditPrompt(text) {
    if (this.composer) {
      this.composer.setText(text);
    }
  }

  handleRegenerateMessage(assistantMsgId) {
    if (this.isStreaming) return;
    const { currentChatId, chats } = store.getState();
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || !chat.messages) return;

    const targetIdx = chat.messages.findIndex(m => m.id === assistantMsgId);
    if (targetIdx <= 0) return;

    const userMsg = chat.messages[targetIdx - 1];
    if (userMsg.role !== 'user') return;

    const trimmed = chat.messages.slice(0, targetIdx - 1);
    store.updateChat(currentChatId, { messages: trimmed });

    this.handleSendMessage(userMsg.content);
  }

  startNewChat() {
    const newChat = store.createChat();
    store.selectChat(newChat.id);
  }

  selectChat(chatId) {
    store.selectChat(chatId);
  }

  refreshCurrentChat() {
    const { currentChatId, chats } = store.getState();
    const currentChat = chats.find(c => c.id === currentChatId);

    // Update Header conversation breadcrumb title
    const headerTitle = document.getElementById('header-chat-title');
    if (headerTitle) {
      headerTitle.textContent = currentChat && currentChat.title ? currentChat.title : 'New conversation';
      headerTitle.title = headerTitle.textContent;
    }

    if (!currentChat || !currentChat.messages || currentChat.messages.length === 0) {
      this.messagesComponent.render([]);
      this.chatNavRail.update([]);
      this.updateTokenIndicator([]);
      return;
    }

    this.messagesComponent.render(currentChat.messages);
    this.chatNavRail.update(currentChat.messages);
    this.updateTokenIndicator(currentChat.messages);
  }

  updateTokenIndicator(messages) {
    const count = TokenCounter.estimateMessagesTokens(messages);
    const indicatorEl = document.getElementById('header-token-count');
    const composerIndicator = document.getElementById('token-budget-indicator');
    const text = `${count.toLocaleString()} tokens`;
    if (indicatorEl) indicatorEl.textContent = text;
    if (composerIndicator) composerIndicator.textContent = text;
  }

  async handleSendMessage(userPrompt) {
    if (this.isStreaming) return;

    try {
      const state = store.getState();
      const { activeProvider, selectedModel, apiKeys, parameters, modes } = state;
      const apiKey = apiKeys[activeProvider];

      // Ensure user has configured the active provider's API key
      if (!apiKey) {
        this.onboardingModal.open(activeProvider);
        return;
      }

      // Resolve valid model identifier with fallback
      const activeModel = selectedModel || (state.cachedModels[activeProvider]?.[0]?.id) || ProviderRegistry.getFallbackModels(activeProvider)[0]?.id || '';

      // 1. Ensure active chat exists
      let chatId = state.currentChatId;
      if (!chatId) {
        const newChat = store.createChat(SidebarComponent.generateTitle(userPrompt));
        chatId = newChat.id;
        store.selectChat(chatId);
      } else {
        const currentChat = store.getChat(chatId);
        if (currentChat && (!currentChat.messages || currentChat.messages.length === 0)) {
          store.updateChat(chatId, { title: SidebarComponent.generateTitle(userPrompt) });
        }
      }

      // 2. Extract attachments and clear tray
      const attachments = this.fileManager.getAttachments();
      const hasVideo = attachments.some(a => a.type === 'video');
      if (hasVideo && activeProvider !== 'gemini') {
        alert(`Video analysis is currently supported natively by Google Gemini (Gemini 2.0 Flash / 1.5 Pro). Please switch your provider to Gemini in the composer model selector to analyze video clips.`);
        return;
      }

      this.fileManager.clear();

      // 3. Save user message to store
      store.addMessage(chatId, {
        role: 'user',
        content: userPrompt,
        attachments
      });

      // 4. Update UI view
      this.refreshCurrentChat();

      // 5. Setup streaming assistant placeholder
      const assistantMsgId = 'msg_' + Date.now();
      const streamingHandle = this.messagesComponent.createStreamingMessage(assistantMsgId);

      // 6. Handle Web Search Grounding for non-Gemini providers (Gemini uses native googleSearch tool)
      let searchSources = [];
      let searchAugmentedPrompt = userPrompt;

      if (modes.webSearch && activeProvider !== 'gemini') {
        const isBrave = Boolean(apiKeys.brave || apiKeys.braveProxyUrl);
        streamingHandle.showSearchingStatus(isBrave ? 'Brave' : 'Web');
        try {
          searchSources = await SearchService.search(userPrompt, {
            braveApiKey: apiKeys.brave,
            braveProxyUrl: apiKeys.braveProxyUrl,
            tavilyApiKey: apiKeys.tavily
          });
          if (searchSources.length > 0) {
            const contextSnippet = SearchService.formatSearchContext(searchSources);
            searchAugmentedPrompt = `${contextSnippet}\nUser Query: ${userPrompt}`;
          }
        } catch (err) {
          console.warn('Web search grounding error:', err);
        } finally {
          streamingHandle.hideSearchingStatus();
        }
      }

      // 7. Build outgoing message history
      const currentMessages = store.getChat(chatId).messages;
      const outgoingMessages = currentMessages.map((m, index) => {
        if (index === currentMessages.length - 1 && searchAugmentedPrompt !== userPrompt) {
          return { ...m, content: searchAugmentedPrompt };
        }
        return m;
      });

      // If Search Mode is on, inject exact current date and grounding instructions
      if (modes.webSearch) {
        const todayDateStr = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        outgoingMessages.unshift({
          role: 'system',
          content: `Today is ${todayDateStr}. Real-time web search results are provided in <web_search_results>. Prioritize the <web_search_results> over internal cut-off knowledge, and cite sources using [1], [2], etc.`
        });
      }

      // If Code Interpreter is on, prepend system instruction for Python code output
      if (modes.codeInterpreter) {
        outgoingMessages.unshift({
          role: 'system',
          content: 'You have a client-side Python Code Interpreter powered by WebAssembly (Pyodide). When solving problems that require calculation, data analysis, or plotting, write clean, self-contained Python code inside ```python ... ``` blocks. Use matplotlib.pyplot for charts and plots.'
        });
      }

      // 8. Apply Context Window Sliding Budget Trimming
      const budget = parameters.contextBudgetTokens || 8192;
      const trimmedPayload = TokenCounter.trimToContextBudget(outgoingMessages, budget);

      if (searchSources.length > 0) {
        streamingHandle.updateSources(searchSources);
      }

      let fullAnswer = '';
      let fullThinking = '';
      this.isStreaming = true;
      this.activeAbortController = new AbortController();

      const composerBox = document.getElementById('chat-composer');
      composerBox?.classList.add('is-streaming');

      try {
        const provider = ProviderRegistry.getProvider(activeProvider);

        await provider.streamChat({
          apiKey,
          messages: trimmedPayload,
          model: activeModel,
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
          const errorMsg = `**Error calling ${activeProvider.toUpperCase()}:** ${err.message || 'Request failed'}\n\nPlease verify your API key or model selection in Settings.`;
          streamingHandle.updateContent(errorMsg);
          streamingHandle.finalize();
          store.addMessage(chatId, {
            role: 'assistant',
            content: errorMsg
          });
        }
      } finally {
        this.isStreaming = false;
        this.activeAbortController = null;
        composerBox?.classList.remove('is-streaming');
      }
    } catch (outerErr) {
      console.error('Fatal message preparation error:', outerErr);
      alert(`Error sending message: ${outerErr.message}`);
    }
  }
}

// Instantiate on DOM ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppCoordinator();
  });
}
