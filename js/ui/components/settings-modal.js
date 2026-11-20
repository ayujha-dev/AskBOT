import { store } from '../../state/store.js';
import { ProviderRegistry } from '../../providers/provider-registry.js';
import { SearchService } from '../../services/search-service.js';
import { escapeHtml } from '../../utils/dom.js';

export class SettingsModal {
  static PRIVACY_NOTICE = "Your API keys are stored exclusively in your browser's localStorage and are sent directly to each provider's API. No intermediate backend or logging server is used.";

  static PROVIDERS_CONFIG = {
    groq: {
      name: 'Groq',
      placeholder: 'gsk_...',
      docsUrl: 'https://console.groq.com/keys',
      description: 'Ultra-fast inference for Llama 3.3, DeepSeek R1 Distill, and Mixtral.'
    },
    gemini: {
      name: 'Google Gemini',
      placeholder: 'AIzaSy...',
      docsUrl: 'https://aistudio.google.com/apikey',
      description: 'Gemini 2.0 Flash, 1.5 Pro, and native Google Search grounding.'
    },
    openai: {
      name: 'OpenAI',
      placeholder: 'sk-proj-...',
      docsUrl: 'https://platform.openai.com/api-keys',
      description: 'GPT-4o, o1, and o3-mini reasoning models.'
    },
    claude: {
      name: 'Anthropic Claude',
      placeholder: 'sk-ant-...',
      docsUrl: 'https://console.anthropic.com/settings/keys',
      description: 'Claude 3.7 Sonnet (Hybrid Reasoning), 3.5 Sonnet, and Haiku.'
    },
    xai: {
      name: 'xAI (Grok)',
      placeholder: 'xai-...',
      docsUrl: 'https://console.x.ai/',
      description: 'Grok 2, Grok 2 Vision, and Grok Beta models.'
    }
  };

  constructor(options = {}) {
    this.backgroundManager = options.backgroundManager || null;
    this.modalEl = document.getElementById('settings-modal');
    this.providersListEl = document.getElementById('settings-providers-list');
    this.quickPillsEl = document.getElementById('quick-active-provider-pills');

    this.btnClose = document.getElementById('btn-close-settings');
    this.btnSaveClose = document.getElementById('btn-save-close-settings');
    this.btnClearAll = document.getElementById('btn-clear-all-data');

    this.tavilyInput = document.getElementById('key-input-tavily');
    this.btnSaveTavily = document.getElementById('btn-save-tavily');

    this.braveInput = document.getElementById('key-input-brave');
    this.btnSaveBrave = document.getElementById('btn-save-brave');
    this.braveProxyInput = document.getElementById('proxy-input-brave');
    this.btnSaveBraveProxy = document.getElementById('btn-save-brave-proxy');

    this.init();
  }

  init() {
    if (!this.modalEl) return;

    if (this.btnClose) this.btnClose.addEventListener('click', () => this.close());
    if (this.btnSaveClose) this.btnSaveClose.addEventListener('click', () => this.close());

    // Tabs navigation
    const tabButtons = this.modalEl.querySelectorAll('.tab-btn-settings');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Clear all data
    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all API keys and chat history from this browser?')) {
          store.clearAllData();
          window.location.reload();
        }
      });
    }

    // Save Tavily key
    if (this.btnSaveTavily && this.tavilyInput) {
      this.btnSaveTavily.addEventListener('click', () => {
        const val = this.tavilyInput.value.trim();
        store.setApiKey('tavily', val);
        alert('Tavily search key saved.');
      });
    }

    // Save Brave Search key & proxy URL
    if (this.btnSaveBrave && this.braveInput) {
      this.btnSaveBrave.addEventListener('click', () => {
        const val = this.braveInput.value.trim();
        store.setApiKey('brave', val);
        alert('Brave Search API key saved.');
      });
    }

    if (this.btnSaveBraveProxy && this.braveProxyInput) {
      this.btnSaveBraveProxy.addEventListener('click', () => {
        const val = this.braveProxyInput.value.trim();
        store.setApiKey('braveProxyUrl', val);
        alert('Brave Search proxy URL saved.');
      });
    }

    // Background selector options
    const bgButtons = this.modalEl.querySelectorAll('.bg-option-btn');
    bgButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const bg = btn.getAttribute('data-bg');
        if (this.backgroundManager) {
          this.backgroundManager.switchBackground(bg);
        } else if (typeof localStorage !== 'undefined') {
          localStorage.setItem('askbot_background', bg);
        }
        this.updateBackgroundSelectorUI(bg);
      });
    });

    // Test live search tool
    this.wireSearchTestTool();

    // Export chats button
    this.wireExportChats();

    // Typography and text size controls
    this.initTypographyControls();

    this.renderProviders();
    this.updateBackgroundSelectorUI(this.getActiveBackground());

    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('apiKeys') || changedKeys.includes('activeProvider')) {
        this.renderProviders();
        this.renderQuickPills();
        this.updateStorageStats();
      }
    });
  }

  static getSavedFontSize() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('askbot_chat_font_size');
      if (saved) {
        const num = Number(saved);
        if (!isNaN(num) && num >= 13 && num <= 20) return num;
      }
    }
    return 15;
  }

  static applyFontSize(size) {
    const num = Math.min(20, Math.max(13, Number(size) || 15));
    const codeSize = Math.round(num * 0.9 * 10) / 10;
    const lineHeight = 1.65;
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.style.setProperty('--chat-font-size', `${num}px`);
      document.documentElement.style.setProperty('--chat-line-height', `${lineHeight}`);
      document.documentElement.style.setProperty('--chat-code-size', `${codeSize}px`);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('askbot_chat_font_size', String(num));
    }
    return num;
  }

  getActiveBackground() {
    if (this.backgroundManager) {
      return this.backgroundManager.currentMode;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('askbot_background') || 'antigravity';
    }
    return 'antigravity';
  }

  initTypographyControls() {
    if (!this.modalEl) return;
    const slider = this.modalEl.querySelector('#chat-font-size-slider');
    const badge = this.modalEl.querySelector('#font-size-value-badge');
    const presetBtns = this.modalEl.querySelectorAll('.font-size-preset-btn');
    const preview = this.modalEl.querySelector('#typography-live-preview');

    const updateControlsUI = (size) => {
      if (slider) slider.value = String(size);
      if (badge) badge.textContent = `${size}px`;
      if (preview) {
        preview.style.fontSize = `${size}px`;
        const code = preview.querySelector('code');
        if (code) {
          code.style.fontSize = `${Math.round(size * 0.9 * 10) / 10}px`;
        }
      }
      presetBtns.forEach(btn => {
        const btnSize = Number(btn.getAttribute('data-size'));
        if (btnSize === size) {
          btn.classList.add('active');
          btn.classList.add('bg-[var(--accent-blue)]');
          btn.classList.add('text-white');
          btn.classList.add('shadow-sm');
        } else {
          btn.classList.remove('active');
          btn.classList.remove('bg-[var(--accent-blue)]');
          btn.classList.remove('text-white');
          btn.classList.remove('shadow-sm');
        }
      });
    };

    const current = SettingsModal.getSavedFontSize();
    SettingsModal.applyFontSize(current);
    updateControlsUI(current);

    if (slider) {
      slider.addEventListener('input', (e) => {
        const size = Number(e.target.value);
        SettingsModal.applyFontSize(size);
        updateControlsUI(size);
      });
    }

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = Number(btn.getAttribute('data-size'));
        SettingsModal.applyFontSize(size);
        updateControlsUI(size);
      });
    });
  }

  updateBackgroundSelectorUI(activeMode) {
    const mode = activeMode || this.getActiveBackground();
    const bgButtons = this.modalEl?.querySelectorAll('.bg-option-btn');
    if (!bgButtons) return;

    bgButtons.forEach(btn => {
      const isCurrent = btn.getAttribute('data-bg') === mode;
      const statusLabel = btn.querySelector('.bg-status-label');
      const statusDot = btn.querySelector('.bg-status-dot');

      if (isCurrent) {
        btn.classList.add('active');
        if (statusLabel) {
          statusLabel.textContent = 'Active';
          statusLabel.classList.add('text-[var(--accent-blue)]');
          statusLabel.classList.remove('text-[var(--text-muted)]');
        }
        if (statusDot) {
          statusDot.classList.add('bg-[var(--accent-blue)]');
          statusDot.classList.remove('bg-zinc-600');
        }
      } else {
        btn.classList.remove('active');
        if (statusLabel) {
          statusLabel.textContent = 'Select';
          statusLabel.classList.remove('text-[var(--accent-blue)]');
          statusLabel.classList.add('text-[var(--text-muted)]');
        }
        if (statusDot) {
          statusDot.classList.remove('bg-[var(--accent-blue)]');
          statusDot.classList.add('bg-zinc-600');
        }
      }
    });
  }

  switchTab(tabName) {
    const tabButtons = this.modalEl.querySelectorAll('.tab-btn-settings');
    tabButtons.forEach(b => {
      const isCurrent = b.getAttribute('data-tab') === tabName;
      if (isCurrent) {
        b.classList.add('active');
        b.classList.remove('text-[var(--text-muted)]');
      } else {
        b.classList.remove('active');
        b.classList.add('text-[var(--text-muted)]');
      }
    });

    const panels = ['providers', 'grounding', 'background', 'storage'];
    panels.forEach(p => {
      const panelEl = document.getElementById(`tab-panel-${p}`);
      if (panelEl) {
        if (p === tabName) {
          panelEl.classList.remove('hidden');
        } else {
          panelEl.classList.add('hidden');
        }
      }
    });

    if (tabName === 'background') {
      this.updateBackgroundSelectorUI(this.getActiveBackground());
    }
    if (tabName === 'storage') {
      this.updateStorageStats();
    }
  }

  renderQuickPills() {
    if (!this.quickPillsEl) return;
    this.quickPillsEl.innerHTML = '';

    const { activeProvider, apiKeys } = store.getState();
    const providers = Object.keys(SettingsModal.PROVIDERS_CONFIG);

    providers.forEach(pId => {
      const config = SettingsModal.PROVIDERS_CONFIG[pId];
      const hasKey = Boolean(apiKeys[pId]);
      const isActive = activeProvider === pId;

      const pill = document.createElement('button');
      pill.className = `px-3 py-1.5 rounded-xl text-xs font-medium border ui-transition flex items-center gap-1.5 ${
        isActive
          ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white shadow-sm'
          : 'bg-[var(--surface-card)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)]'
      }`;

      pill.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full ${hasKey ? (isActive ? 'bg-white' : 'bg-emerald-400') : 'bg-zinc-500'}"></span>
        <span>${config.name}</span>
      `;

      pill.addEventListener('click', () => {
        const cached = store.getState().cachedModels[pId] || [];
        store.setState({
          activeProvider: pId,
          selectedModel: cached[0]?.id || ProviderRegistry.getFallbackModels(pId)[0]?.id || ''
        });
      });

      this.quickPillsEl.appendChild(pill);
    });
  }

  renderProviders() {
    this.renderQuickPills();

    if (!this.providersListEl) return;
    this.providersListEl.innerHTML = '';

    const currentKeys = store.getState().apiKeys || {};
    const cachedModels = store.getState().cachedModels || {};

    if (this.tavilyInput) {
      this.tavilyInput.value = currentKeys.tavily || '';
    }
    if (this.braveInput) {
      this.braveInput.value = currentKeys.brave || '';
    }
    if (this.braveProxyInput) {
      this.braveProxyInput.value = currentKeys.braveProxyUrl || '';
    }

    for (const [providerId, config] of Object.entries(SettingsModal.PROVIDERS_CONFIG)) {
      const existingKey = currentKeys[providerId] || '';
      const hasKey = Boolean(existingKey);
      const isActive = store.getState().activeProvider === providerId;
      const models = cachedModels[providerId] || [];

      const row = document.createElement('div');
      row.className = `p-3.5 rounded-xl border ${
        isActive
          ? 'border-[var(--accent-blue)] bg-[var(--surface-card)] shadow-sm'
          : 'border-[var(--surface-border)] bg-[var(--surface-panel)]'
      } space-y-2.5 ui-transition`;

      row.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-xs text-[var(--text-primary)]">${config.name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full ${
              hasKey
                ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                : 'bg-zinc-500/10 text-[var(--text-muted)]'
            }">
              ${hasKey ? (models.length > 0 ? `${models.length} models ready` : 'Key Configured') : 'Not configured'}
            </span>
            ${isActive ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-blue)] text-white font-semibold">Active</span>' : ''}
          </div>
          <div class="flex items-center gap-2">
            ${hasKey && !isActive ? `
              <button class="btn-set-active text-[11px] font-medium text-[var(--accent-blue)] hover:underline" data-provider="${providerId}">
                Set Active
              </button>
            ` : ''}
            <a href="${config.docsUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5">
              Get key &rarr;
            </a>
          </div>
        </div>
        <p class="text-[11px] text-[var(--text-muted)] leading-relaxed">${config.description}</p>
        
        <div class="flex gap-2 items-center pt-0.5">
          <div class="relative flex-1">
            <input type="password" id="input-${providerId}" placeholder="${config.placeholder}" value="${existingKey}" class="w-full pl-3 pr-16 py-1.5 text-xs rounded-lg border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] font-mono">
            <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
              <button type="button" class="btn-paste-key text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded" title="Paste from clipboard">Paste</button>
              <button type="button" class="btn-toggle-mask text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded">Show</button>
            </div>
          </div>
          <button class="btn-validate-provider px-3 py-1.5 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface-border)] border border-[var(--surface-border)] font-medium text-xs ui-transition text-[var(--text-primary)] flex-shrink-0" data-provider="${providerId}">
            Validate
          </button>
          ${hasKey ? `
            <button class="btn-remove-provider p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 ui-transition flex-shrink-0" data-provider="${providerId}" title="Remove key">
              <svg class="w-3.5 h-3.5"><use href="#icon-trash"/></svg>
            </button>
          ` : ''}
        </div>
        <div class="provider-status-msg text-[11px] hidden pt-0.5"></div>
      `;

      // Set active button
      const setActiveBtn = row.querySelector('.btn-set-active');
      if (setActiveBtn) {
        setActiveBtn.addEventListener('click', () => {
          const cached = store.getState().cachedModels[providerId] || [];
          store.setState({
            activeProvider: providerId,
            selectedModel: cached[0]?.id || ProviderRegistry.getFallbackModels(providerId)[0]?.id || ''
          });
          this.renderProviders();
        });
      }

      // Password mask toggle
      const input = row.querySelector(`#input-${providerId}`);
      const maskBtn = row.querySelector('.btn-toggle-mask');
      if (input && maskBtn) {
        maskBtn.addEventListener('click', () => {
          if (input.type === 'password') {
            input.type = 'text';
            maskBtn.textContent = 'Hide';
          } else {
            input.type = 'password';
            maskBtn.textContent = 'Show';
          }
        });
      }

      // Paste button
      const pasteBtn = row.querySelector('.btn-paste-key');
      if (input && pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              input.value = text.trim();
              input.focus();
            }
          } catch (err) {
            console.warn('Clipboard read failed:', err);
          }
        });
      }

      // Validate button
      const valBtn = row.querySelector('.btn-validate-provider');
      const statusMsg = row.querySelector('.provider-status-msg');
      if (valBtn && input && statusMsg) {
        valBtn.addEventListener('click', async () => {
          const keyVal = input.value.trim();
          if (!keyVal) {
            statusMsg.className = 'provider-status-msg text-[11px] text-rose-500 pt-0.5';
            statusMsg.textContent = 'Please enter an API key.';
            statusMsg.classList.remove('hidden');
            return;
          }

          valBtn.disabled = true;
          const orig = valBtn.textContent;
          valBtn.textContent = 'Checking...';
          statusMsg.className = 'provider-status-msg text-[11px] text-[var(--text-muted)] pt-0.5';
          statusMsg.textContent = 'Querying provider /models endpoint...';
          statusMsg.classList.remove('hidden');

          try {
            const models = await ProviderRegistry.fetchModelsForProvider(providerId, keyVal);
            store.setApiKey(providerId, keyVal);
            const cached = { ...store.getState().cachedModels, [providerId]: models };
            store.setState({ cachedModels: cached });

            statusMsg.className = 'provider-status-msg text-[11px] text-emerald-500 pt-0.5';
            statusMsg.textContent = `Valid! Loaded ${models.length} compatible models.`;
          } catch (err) {
            statusMsg.className = 'provider-status-msg text-[11px] text-rose-500 pt-0.5';
            statusMsg.textContent = `Error: ${err.message}`;
          } finally {
            valBtn.disabled = false;
            valBtn.textContent = orig;
          }
        });
      }

      // Remove button
      const removeBtn = row.querySelector('.btn-remove-provider');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          store.removeApiKey(providerId);
        });
      }

      this.providersListEl.appendChild(row);
    }
  }

  wireSearchTestTool() {
    const testBtn = document.getElementById('btn-test-search-query');
    const inputEl = document.getElementById('test-search-query-input');
    const resultsEl = document.getElementById('test-search-results');

    if (!testBtn || !inputEl || !resultsEl) return;

    testBtn.addEventListener('click', async () => {
      const q = inputEl.value.trim();
      if (!q) return;

      testBtn.disabled = true;
      testBtn.textContent = 'Searching...';
      resultsEl.classList.remove('hidden');

      const currentApiKeys = store.getState().apiKeys || {};
      const isBraveActive = Boolean(currentApiKeys.brave || currentApiKeys.braveProxyUrl);
      resultsEl.innerHTML = `<div class="text-[var(--text-muted)]">${isBraveActive ? 'Querying Brave Search API...' : 'Querying DuckDuckGo + Wikipedia...'}</div>`;

      try {
        const { context, sources } = await SearchService.executeSearch(q, {
          braveApiKey: currentApiKeys.brave,
          braveProxyUrl: currentApiKeys.braveProxyUrl,
          tavilyApiKey: currentApiKeys.tavily
        });
        if (sources.length > 0) {
          let html = `<div class="font-semibold text-emerald-400">Found ${sources.length} live sources:</div>`;
          sources.slice(0, 4).forEach(s => {
            const domain = s.domain ? `<span class="text-[10px] text-[var(--accent-blue)]">(${escapeHtml(s.domain)})</span> ` : '';
            html += `<div class="truncate"><a href="${s.url}" target="_blank" class="text-[var(--accent-cyan)] hover:underline">${escapeHtml(s.title)}</a> ${domain}: <span class="text-[var(--text-muted)]">${escapeHtml((s.snippet || '').slice(0, 90))}...</span></div>`;
          });
          resultsEl.innerHTML = html;
        } else {
          resultsEl.innerHTML = `<div class="text-[var(--text-muted)]">Search completed with no direct answers.</div>`;
        }
      } catch (err) {
        resultsEl.innerHTML = `<div class="text-rose-400">Search error: ${err.message}</div>`;
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Search';
      }
    });
  }

  updateStorageStats() {
    const state = store.getState();
    const keyCount = Object.keys(state.apiKeys || {}).filter(k => Boolean(state.apiKeys[k])).length;
    const chatCount = (state.chats || []).length;
    let modelCount = 0;
    Object.values(state.cachedModels || {}).forEach(arr => {
      if (Array.isArray(arr)) modelCount += arr.length;
    });

    const elKeys = document.getElementById('stat-saved-keys');
    const elChats = document.getElementById('stat-active-chats');
    const elModels = document.getElementById('stat-cached-models');

    if (elKeys) elKeys.textContent = String(keyCount);
    if (elChats) elChats.textContent = String(chatCount);
    if (elModels) elModels.textContent = String(modelCount);
  }

  wireExportChats() {
    const btn = document.getElementById('btn-export-chats');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const chats = store.getState().chats || [];
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(chats, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `askbot-chats-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  open() {
    if (this.modalEl) {
      this.renderProviders();
      this.updateBackgroundSelectorUI(this.getActiveBackground());
      this.updateStorageStats();
      this.modalEl.classList.remove('hidden');
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }
}
