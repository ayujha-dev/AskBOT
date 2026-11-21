import { store } from '../../state/store.js';
import { TokenCounter } from '../../services/token-counter.js';

export class ParametersDrawer {
  static PRESETS = {
    precise: { temperature: 0.2, maxTokens: 2048 },
    balanced: { temperature: 0.7, maxTokens: 4096 },
    creative: { temperature: 1.2, maxTokens: 8192 }
  };

  constructor() {
    this.drawerEl = document.getElementById('parameters-drawer');
    this.backdropEl = document.getElementById('parameters-backdrop');
    this.btnToggle = document.getElementById('btn-toggle-params');
    this.btnClose = document.getElementById('btn-close-drawer');

    this.tempSlider = document.getElementById('param-temperature');
    this.tempVal = document.getElementById('param-temp-val');

    this.maxTokensSlider = document.getElementById('param-max-tokens');
    this.maxTokensVal = document.getElementById('param-max-tokens-val');

    this.contextBudgetSlider = document.getElementById('param-context-budget');
    this.contextBudgetVal = document.getElementById('param-context-budget-val');

    this.tokenBudgetIndicator = document.getElementById('token-budget-indicator');

    this.init();
  }

  init() {
    // Open/Close drawer handlers
    this.btnToggle?.addEventListener('click', () => this.toggle());
    this.btnClose?.addEventListener('click', () => this.close());
    this.backdropEl?.addEventListener('click', () => this.close());

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.drawerEl.classList.contains('translate-x-full')) {
        this.close();
      }
    });

    // Preset buttons
    const presetButtons = this.drawerEl.querySelectorAll('.btn-param-preset');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        this.applyPreset(presetKey);
      });
    });

    // Slider inputs
    if (this.tempSlider) {
      this.tempSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.tempVal.textContent = val.toFixed(2);
        const params = { ...store.getState().parameters, temperature: val };
        store.setState({ parameters: params });
      });
    }

    if (this.maxTokensSlider) {
      this.maxTokensSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.maxTokensVal.textContent = val.toString();
        const params = { ...store.getState().parameters, maxTokens: val };
        store.setState({ parameters: params });
      });
    }

    if (this.contextBudgetSlider) {
      this.contextBudgetSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.contextBudgetVal.textContent = val.toString();
        const params = { ...store.getState().parameters, contextBudgetTokens: val };
        store.setState({ parameters: params });
        this.updateTokenIndicator();
      });
    }

    // Subscribe to state changes (provider switch, chat switch, etc.)
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('activeProvider')) {
        this.syncProviderConstraints(state.activeProvider);
      }
      if (changedKeys.includes('parameters')) {
        this.syncValuesFromState(state.parameters);
      }
      if (changedKeys.includes('currentChatId') || changedKeys.includes('chats')) {
        this.updateTokenIndicator();
      }
    });

    // Initial sync
    const currentState = store.getState();
    this.syncValuesFromState(currentState.parameters);
    this.syncProviderConstraints(currentState.activeProvider);
    this.updateTokenIndicator();
  }

  applyPreset(presetKey) {
    const preset = ParametersDrawer.PRESETS[presetKey];
    if (!preset) return;

    let temp = preset.temperature;
    if (store.getState().activeProvider === 'claude' && temp > 1.0) {
      temp = 1.0;
    }

    const updated = {
      ...store.getState().parameters,
      temperature: temp,
      maxTokens: preset.maxTokens
    };
    store.setState({ parameters: updated });
  }

  syncValuesFromState(parameters) {
    if (!parameters) return;
    if (this.tempSlider && parameters.temperature !== undefined) {
      this.tempSlider.value = parameters.temperature;
      this.tempVal.textContent = Number(parameters.temperature).toFixed(2);
    }
    if (this.maxTokensSlider && parameters.maxTokens !== undefined) {
      this.maxTokensSlider.value = parameters.maxTokens;
      this.maxTokensVal.textContent = parameters.maxTokens.toString();
    }
    if (this.contextBudgetSlider && parameters.contextBudgetTokens !== undefined) {
      this.contextBudgetSlider.value = parameters.contextBudgetTokens;
      this.contextBudgetVal.textContent = parameters.contextBudgetTokens.toString();
    }
  }

  syncProviderConstraints(provider) {
    if (!this.tempSlider) return;

    if (provider === 'claude') {
      // Claude has 1.0 max temperature
      this.tempSlider.max = '1.0';
      if (parseFloat(this.tempSlider.value) > 1.0) {
        this.tempSlider.value = '1.0';
        this.tempVal.textContent = '1.00';
        store.setState({
          parameters: { ...store.getState().parameters, temperature: 1.0 }
        });
      }
    } else {
      this.tempSlider.max = '2.0';
    }
  }

  updateTokenIndicator() {
    if (!this.tokenBudgetIndicator) return;
    const currentChat = store.getCurrentChat();
    const messages = currentChat ? currentChat.messages : [];
    const used = TokenCounter.estimateMessagesTokens(messages);
    const budget = store.getState().parameters.contextBudgetTokens || 8192;

    this.tokenBudgetIndicator.textContent = `~${used.toLocaleString()} / ${budget.toLocaleString()} tokens`;
    if (used > budget) {
      this.tokenBudgetIndicator.classList.add('text-amber-500');
    } else {
      this.tokenBudgetIndicator.classList.remove('text-amber-500');
    }
  }

  open() {
    if (this.drawerEl) {
      this.drawerEl.classList.remove('translate-x-full');
      if (this.backdropEl) {
        this.backdropEl.classList.remove('hidden');
      }
      this.btnToggle?.setAttribute('data-active', 'true');
    }
  }

  close() {
    if (this.drawerEl) {
      this.drawerEl.classList.add('translate-x-full');
      if (this.backdropEl) {
        this.backdropEl.classList.add('hidden');
      }
      this.btnToggle?.setAttribute('data-active', 'false');
    }
  }

  toggle() {
    if (this.drawerEl) {
      const isClosed = this.drawerEl.classList.contains('translate-x-full');
      if (isClosed) {
        this.open();
      } else {
        this.close();
      }
    }
  }
}
