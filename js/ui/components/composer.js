import { store } from '../../state/store.js';

export class ComposerComponent {
  constructor(options = {}) {
    this.onSend = options.onSend || (() => {});
    this.fileManager = options.fileManager || null;

    this.textarea = document.getElementById('composer-textarea');
    this.btnSend = document.getElementById('btn-send-message');

    this.toggleCode = document.getElementById('toggle-code-interpreter');
    this.toggleSearch = document.getElementById('toggle-web-search');

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

    // Subscribe to mode changes
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('modes')) {
        this.syncModesUI(state.modes);
      }
    });

    this.syncModesUI(store.getState().modes);
    this.updateSendButtonState();
  }

  syncModesUI(modes) {
    if (!modes) return;

    // Code Interpreter Pill
    if (this.toggleCode) {
      if (modes.codeInterpreter) {
        this.toggleCode.classList.add('border-[var(--accent-blue)]', 'bg-[var(--accent-subtle)]', 'text-[var(--accent-blue)]');
        this.toggleCode.classList.remove('text-[var(--text-muted)]');
      } else {
        this.toggleCode.classList.remove('border-[var(--accent-blue)]', 'bg-[var(--accent-subtle)]', 'text-[var(--accent-blue)]');
        this.toggleCode.classList.add('text-[var(--text-muted)]');
      }
    }

    // Web Search Pill
    if (this.toggleSearch) {
      if (modes.webSearch) {
        this.toggleSearch.classList.add('border-[var(--accent-blue)]', 'bg-[var(--accent-subtle)]', 'text-[var(--accent-blue)]');
        this.toggleSearch.classList.remove('text-[var(--text-muted)]');
      } else {
        this.toggleSearch.classList.remove('border-[var(--accent-blue)]', 'bg-[var(--accent-subtle)]', 'text-[var(--accent-blue)]');
        this.toggleSearch.classList.add('text-[var(--text-muted)]');
      }
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
