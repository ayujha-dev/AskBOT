import { store } from '../../state/store.js';
import { ProviderRegistry } from '../../providers/provider-registry.js';

export class OnboardingModal {
  constructor(onComplete) {
    this.onComplete = onComplete || (() => {});
    this.modalEl = document.getElementById('onboarding-modal');
    this.providerSelect = document.getElementById('onboard-provider-select');
    this.keyInput = document.getElementById('onboard-api-key');
    this.submitBtn = document.getElementById('btn-onboard-submit');
    this.validationMsg = document.getElementById('onboard-validation-msg');

    this.init();
  }

  init() {
    if (!this.modalEl || !this.submitBtn) return;

    if (!store.hasAnyKey()) {
      this.open();
    }

    this.submitBtn?.addEventListener('click', async () => {
      await this.handleValidation();
    });

    this.keyInput?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await this.handleValidation();
      }
    });
  }

  async handleValidation() {
    const provider = this.providerSelect.value;
    const apiKey = this.keyInput.value.trim();

    if (!apiKey) {
      this.showMessage('Please enter an API key to continue.', 'error');
      return;
    }

    this.submitBtn.disabled = true;
    const originalText = this.submitBtn.innerHTML;
    this.submitBtn.innerHTML = '<span class="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span><span>Validating...</span>';
    this.showMessage('Contacting provider API...', 'info');

    try {
      const models = await ProviderRegistry.fetchModelsForProvider(provider, apiKey);

      if (!models || models.length === 0) {
        throw new Error('No compatible chat models found for this key.');
      }

      // Save key and state
      store.setApiKey(provider, apiKey);
      const cached = { ...store.getState().cachedModels, [provider]: models };
      store.setState({
        activeProvider: provider,
        selectedModel: models[0].id,
        cachedModels: cached
      });

      this.showMessage(`Success! Found ${models.length} available models.`, 'success');

      setTimeout(() => {
        this.close();
        this.onComplete(provider, models[0].id);
      }, 700);

    } catch (err) {
      console.warn('Onboarding validation error:', err);
      // Offer to save anyway if user is behind an institutional firewall or testing offline
      this.showMessage(`Validation failed: ${err.message}. Check your key or try again.`, 'error');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = originalText;
    }
  }

  showMessage(msg, type) {
    if (!this.validationMsg) return;
    this.validationMsg.classList.remove('hidden', 'text-emerald-500', 'text-rose-500', 'text-[var(--text-muted)]');

    if (type === 'success') {
      this.validationMsg.classList.add('text-emerald-500');
    } else if (type === 'error') {
      this.validationMsg.classList.add('text-rose-500');
    } else {
      this.validationMsg.classList.add('text-[var(--text-muted)]');
    }

    this.validationMsg.textContent = msg;
  }

  open() {
    if (this.modalEl) {
      this.modalEl.classList.remove('hidden');
      setTimeout(() => this.keyInput?.focus(), 100);
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }
}
