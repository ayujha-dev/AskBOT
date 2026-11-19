import { store } from '../../state/store.js';
import { ProviderRegistry } from '../../providers/provider-registry.js';

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

  constructor() {
    this.modalEl = document.getElementById('settings-modal');
    this.providersListEl = document.getElementById('settings-providers-list');
    this.btnClose = document.getElementById('btn-close-settings');
    this.btnSaveClose = document.getElementById('btn-save-close-settings');
    this.btnClearAll = document.getElementById('btn-clear-all-data');

    this.tavilyInput = document.getElementById('key-input-tavily');
    this.btnSaveTavily = document.getElementById('btn-save-tavily');

    this.init();
  }

  init() {
    if (!this.modalEl) return;

    if (this.btnClose) this.btnClose.addEventListener('click', () => this.close());
    if (this.btnSaveClose) this.btnSaveClose.addEventListener('click', () => this.close());

    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all API keys and chat history from this browser?')) {
          store.clearAllData();
          window.location.reload();
        }
      });
    }

    if (this.btnSaveTavily && this.tavilyInput) {
      this.btnSaveTavily.addEventListener('click', () => {
        const val = this.tavilyInput.value.trim();
        store.setApiKey('tavily', val);
        alert('Tavily search key saved.');
      });
    }

    this.renderProviders();

    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('apiKeys')) {
        this.renderProviders();
      }
    });
  }

  renderProviders() {
    if (!this.providersListEl) return;
    this.providersListEl.innerHTML = '';

    const currentKeys = store.getState().apiKeys || {};

    if (this.tavilyInput) {
      this.tavilyInput.value = currentKeys.tavily || '';
    }

    for (const [providerId, config] of Object.entries(SettingsModal.PROVIDERS_CONFIG)) {
      const existingKey = currentKeys[providerId] || '';
      const hasKey = Boolean(existingKey);
      const isActive = store.getState().activeProvider === providerId;

      const row = document.createElement('div');
      row.className = `p-3 rounded-xl border ${isActive ? 'border-[var(--accent-blue)] bg-[var(--surface-card)]' : 'border-[var(--surface-border)] bg-[var(--surface-panel)]'} space-y-2 ui-transition`;

      row.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-xs text-[var(--text-primary)]">${config.name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full ${hasKey ? 'bg-emerald-500/10 text-emerald-500 font-medium' : 'bg-zinc-500/10 text-[var(--text-muted)]'}">
              ${hasKey ? 'Configured' : 'Not configured'}
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
        
        <div class="flex gap-2 items-center pt-1">
          <div class="relative flex-1">
            <input type="password" id="input-${providerId}" placeholder="${config.placeholder}" value="${existingKey}" class="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] font-mono">
            <button type="button" class="btn-toggle-mask absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1">Show</button>
          </div>
          <button class="btn-validate-provider px-3 py-1.5 rounded-lg bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] border border-[var(--surface-border)] font-medium text-xs ui-transition text-[var(--text-primary)]" data-provider="${providerId}">
            Validate
          </button>
          ${hasKey ? `
            <button class="btn-remove-provider p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 ui-transition" data-provider="${providerId}" title="Remove key">
              <svg class="w-3.5 h-3.5"><use href="#icon-trash"/></svg>
            </button>
          ` : ''}
        </div>
        <div class="provider-status-msg text-[11px] hidden pt-1"></div>
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

      // Validate button
      const valBtn = row.querySelector('.btn-validate-provider');
      const statusMsg = row.querySelector('.provider-status-msg');
      if (valBtn && input && statusMsg) {
        valBtn.addEventListener('click', async () => {
          const keyVal = input.value.trim();
          if (!keyVal) {
            statusMsg.className = 'provider-status-msg text-[11px] text-rose-500 pt-1';
            statusMsg.textContent = 'Please enter an API key.';
            statusMsg.classList.remove('hidden');
            return;
          }

          valBtn.disabled = true;
          const orig = valBtn.textContent;
          valBtn.textContent = 'Checking...';
          statusMsg.className = 'provider-status-msg text-[11px] text-[var(--text-muted)] pt-1';
          statusMsg.textContent = 'Querying provider /models endpoint...';
          statusMsg.classList.remove('hidden');

          try {
            const models = await ProviderRegistry.fetchModelsForProvider(providerId, keyVal);
            store.setApiKey(providerId, keyVal);
            const cached = { ...store.getState().cachedModels, [providerId]: models };
            store.setState({ cachedModels: cached });

            statusMsg.className = 'provider-status-msg text-[11px] text-emerald-500 pt-1';
            statusMsg.textContent = `Valid! Loaded ${models.length} compatible models.`;
          } catch (err) {
            statusMsg.className = 'provider-status-msg text-[11px] text-rose-500 pt-1';
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

  open() {
    if (this.modalEl) {
      this.renderProviders();
      this.modalEl.classList.remove('hidden');
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }
}
