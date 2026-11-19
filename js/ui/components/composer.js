import { store } from '../../state/store.js';

export class ComposerComponent {
  constructor(options = {}) {
    this.onSend = options.onSend || (() => {});
    this.onSelectModel = options.onSelectModel || (() => {});
    this.fileManager = options.fileManager || null;

    this.textarea = document.getElementById('composer-textarea');
    this.btnSend = document.getElementById('btn-send-message');

    this.modelPill = document.getElementById('composer-model-pill');
    this.modelName = document.getElementById('composer-model-name');

    this.toggleCode = document.getElementById('toggle-code-interpreter');
    this.toggleSearch = document.getElementById('toggle-web-search');
    this.codeStatusBadge = document.getElementById('code-interpreter-status-badge');
    this.searchStatusBadge = document.getElementById('web-search-status-badge');

    this.btnThinking = document.getElementById('btn-thinking-menu');
    this.thinkingDropdown = document.getElementById('thinking-dropdown');
    this.thinkingLabel = document.getElementById('thinking-level-label');

    this.init();
  }

  init() {
    if (!this.textarea || !this.btnSend) return;

    // Auto-expanding textarea
    this.textarea.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = Math.min(this.textarea.scrollHeight, 176) + 'px';
      this.updateSendButtonState();
    });

    // Handle direct paste inside composer textarea (screenshots, images, files)
    this.textarea.addEventListener('paste', async (e) => {
      const clipboard = e.clipboardData;
      if (!clipboard) return;

      const files = [];
      if (clipboard.files && clipboard.files.length > 0) {
        for (let i = 0; i < clipboard.files.length; i++) {
          files.push(clipboard.files[i]);
        }
      }
      if (clipboard.items && clipboard.items.length > 0) {
        for (let i = 0; i < clipboard.items.length; i++) {
          const item = clipboard.items[i];
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && !files.some(f => f.name === file.name && f.size === file.size)) {
              files.push(file);
            }
          }
        }
      }

      if (files.length > 0 && this.fileManager) {
        e.preventDefault();
        await this.fileManager.handleFiles(files);
        this.updateSendButtonState();
      }
    });

    if (this.fileManager) {
      this.fileManager.onAttachmentsChange = () => {
        this.updateSendButtonState();
      };
    }

    // Keyboard enter-to-send
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submit();
      }
    });

    // Send button click
    this.btnSend.addEventListener('click', () => {
      this.submit();
    });

    // Code Interpreter toggle
    if (this.toggleCode) {
      this.toggleCode.addEventListener('click', () => {
        const current = store.getState().modes.codeInterpreter;
        store.setState({
          modes: { ...store.getState().modes, codeInterpreter: !current }
        });
      });
    }

    // Web Search toggle
    if (this.toggleSearch) {
      this.toggleSearch.addEventListener('click', () => {
        const current = store.getState().modes.webSearch;
        store.setState({
          modes: { ...store.getState().modes, webSearch: !current }
        });
      });
    }

    // Thinking mode menu
    if (this.btnThinking && this.thinkingDropdown) {
      this.btnThinking.addEventListener('click', (e) => {
        e.stopPropagation();
        this.thinkingDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!this.btnThinking.contains(e.target) && !this.thinkingDropdown.contains(e.target)) {
          this.thinkingDropdown.classList.add('hidden');
        }
      });

      this.thinkingDropdown.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-level]');
        if (btn) {
          const level = btn.getAttribute('data-level');
          store.setState({
            modes: { ...store.getState().modes, thinkingLevel: level }
          });
          this.thinkingDropdown.classList.add('hidden');
        }
      });
    }

    // Model selector pill inside composer toolbar
    if (this.modelPill) {
      this.modelPill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelectModel(this.modelPill);
      });
    }

    // Subscribe to mode and model changes
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('modes')) {
        this.syncModesUI(state.modes);
      }
      if (changedKeys.includes('selectedModel') || changedKeys.includes('activeProvider')) {
        this.syncModelDisplay(state.selectedModel, state.activeProvider);
      }
    });

    this.syncModesUI(store.getState().modes);
    this.syncModelDisplay(store.getState().selectedModel, store.getState().activeProvider);
    this.updateSendButtonState();
  }

  syncModelDisplay(model = store.getState().selectedModel, provider = store.getState().activeProvider) {
    if (this.modelName) {
      if (model) {
        this.modelName.textContent = model;
        this.modelName.title = `${provider ? provider.toUpperCase() : 'AI'}: ${model}`;
      } else {
        this.modelName.textContent = 'Select Model';
      }
    }
  }

  syncModesUI(modes) {
    if (!modes) return;

    // Code Interpreter Pill
    if (this.toggleCode) {
      if (modes.codeInterpreter) {
        this.toggleCode.classList.add('border-emerald-500/50', 'bg-emerald-500/10', 'text-emerald-400');
        this.toggleCode.classList.remove('text-[var(--text-muted)]');
      } else {
        this.toggleCode.classList.remove('border-emerald-500/50', 'bg-emerald-500/10', 'text-emerald-400');
        this.toggleCode.classList.add('text-[var(--text-muted)]');
      }
    }
    if (this.codeStatusBadge) {
      this.codeStatusBadge.className = modes.codeInterpreter
        ? 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse'
        : 'w-1.5 h-1.5 rounded-full bg-zinc-500';
    }

    // Web Search Pill
    if (this.toggleSearch) {
      if (modes.webSearch) {
        this.toggleSearch.classList.add('border-sky-500/50', 'bg-sky-500/10', 'text-sky-400');
        this.toggleSearch.classList.remove('text-[var(--text-muted)]');
      } else {
        this.toggleSearch.classList.remove('border-sky-500/50', 'bg-sky-500/10', 'text-sky-400');
        this.toggleSearch.classList.add('text-[var(--text-muted)]');
      }
    }
    if (this.searchStatusBadge) {
      this.searchStatusBadge.className = modes.webSearch
        ? 'w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse'
        : 'w-1.5 h-1.5 rounded-full bg-zinc-500';
    }

    // Thinking Label
    if (this.thinkingLabel && modes.thinkingLevel) {
      const display = modes.thinkingLevel.charAt(0).toUpperCase() + modes.thinkingLevel.slice(1);
      this.thinkingLabel.textContent = display;

      if (modes.thinkingLevel !== 'off' && this.btnThinking) {
        this.btnThinking.classList.add('border-[var(--accent-blue)]', 'bg-[var(--accent-subtle)]', 'text-[var(--accent-blue)]');
        this.btnThinking.classList.remove('text-[var(--text-muted)]');
      } else if (this.btnThinking) {
        this.btnThinking.classList.remove('border-[var(--accent-blue)]', 'bg-[var(--accent-subtle)]', 'text-[var(--accent-blue)]');
        this.btnThinking.classList.add('text-[var(--text-muted)]');
      }
    }
  }

  updateSendButtonState() {
    const hasText = Boolean(this.textarea.value.trim());
    const hasAttachments = Boolean(this.fileManager && this.fileManager.getAttachments().length > 0);
    this.btnSend.disabled = !hasText && !hasAttachments;
  }

  setText(text) {
    if (this.textarea) {
      this.textarea.value = text;
      this.textarea.style.height = 'auto';
      this.textarea.style.height = Math.min(this.textarea.scrollHeight, 176) + 'px';
      this.updateSendButtonState();
      this.textarea.focus();
    }
  }

  submit() {
    const text = this.textarea.value.trim();
    const hasAttachments = Boolean(this.fileManager && this.fileManager.getAttachments().length > 0);
    if (!text && !hasAttachments) return;

    this.onSend(text);
    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.updateSendButtonState();
  }
}
