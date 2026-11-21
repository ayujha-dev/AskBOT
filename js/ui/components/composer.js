import { store } from '../../state/store.js';

export class ComposerComponent {
  constructor(options = {}) {
    this.options = options;
    this.onSend = options.onSend || (() => {});
    this.onSelectModel = options.onSelectModel || (() => {});
    this.onTypingPulse = options.onTypingPulse || null;
    this.fileManager = options.fileManager || null;

    this.textarea = document.getElementById('composer-textarea');
    this.btnSend = document.getElementById('btn-send-message');
    this.btnVoice = document.getElementById('btn-voice-input');

    this.modelPill = document.getElementById('composer-model-pill');
    this.modelName = document.getElementById('composer-model-name');

    this.toggleCode = document.getElementById('toggle-code-interpreter');
    this.toggleSearch = document.getElementById('toggle-web-search');
    this.codeStatusBadge = document.getElementById('code-interpreter-status-badge');
    this.searchStatusBadge = document.getElementById('web-search-status-badge');

    this.btnThinking = document.getElementById('btn-thinking-menu');
    this.thinkingDropdown = document.getElementById('thinking-dropdown');
    this.thinkingLabel = document.getElementById('thinking-level-label');

    this.isStreaming = false;
    this.onStop = null;
    this.isRecording = false;
    this.recognition = null;

    this.init();
  }

  init() {
    // Auto-expanding textarea up to 220px max-height without layout jumps
    this.textarea?.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = Math.min(this.textarea.scrollHeight, 220) + 'px';
      this.updateSendButtonState();
      this.options.backgroundManager?.activeInstance?.nudgeTypingPulse?.(0.18);
      if (typeof this.onTypingPulse === 'function') this.onTypingPulse();
    });

    // Reactive aura focus boost on textarea focus/blur
    this.textarea?.addEventListener('focus', () => {
      this.options.backgroundManager?.activeInstance?.setFocusBoost?.(true, 0.45);
    });

    this.textarea?.addEventListener('blur', () => {
      this.options.backgroundManager?.activeInstance?.setFocusBoost?.(false);
    });

    // Handle direct paste inside composer textarea (screenshots, images, files)
    this.textarea?.addEventListener('paste', async (e) => {
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
        e.stopImmediatePropagation();
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
    this.textarea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submit();
      }
    });

    // Send / Stop button click
    this.btnSend?.addEventListener('click', () => {
      if (this.isStreaming) {
        if (typeof this.onStop === 'function') this.onStop();
      } else {
        this.submit();
      }
    });

    // Voice dictation button click
    this.btnVoice?.addEventListener('click', () => {
      this.toggleVoiceInput();
    });

    // Code Interpreter toggle
    this.toggleCode?.addEventListener('click', () => {
      const current = store.getState().modes.codeInterpreter;
      store.setState({
        modes: { ...store.getState().modes, codeInterpreter: !current }
      });
    });

    // Web Search toggle
    this.toggleSearch?.addEventListener('click', () => {
      const current = store.getState().modes.webSearch;
      store.setState({
        modes: { ...store.getState().modes, webSearch: !current }
      });
    });

    // Thinking mode menu
    if (this.btnThinking && this.thinkingDropdown) {
      this.btnThinking.addEventListener('click', (e) => {
        e.stopPropagation();
        this.thinkingDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!this.btnThinking?.contains(e.target) && !this.thinkingDropdown?.contains(e.target)) {
          this.thinkingDropdown?.classList.add('hidden');
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
    this.modelPill?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSelectModel(this.modelPill);
    });

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

  toggleVoiceInput() {
    if (this.isRecording) {
      this.stopVoiceInput();
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      alert('Voice dictation is not supported by your browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.btnVoice?.classList.add('is-recording');
        this.btnVoice?.setAttribute('title', 'Listening... Click to stop');
      };

      this.recognition.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map(r => r[0].transcript)
          .join('');
        if (this.textarea) {
          this.textarea.value = transcript;
          this.textarea.style.height = 'auto';
          this.textarea.style.height = Math.min(this.textarea.scrollHeight, 220) + 'px';
          this.updateSendButtonState();
        }
      };

      this.recognition.onerror = () => {
        this.stopVoiceInput();
      };

      this.recognition.onend = () => {
        this.stopVoiceInput();
      };

      this.recognition.start();
    } catch (err) {
      console.warn('[Composer] Voice input failed to start:', err);
      this.stopVoiceInput();
    }
  }

  stopVoiceInput() {
    this.isRecording = false;
    this.btnVoice?.classList.remove('is-recording');
    this.btnVoice?.setAttribute('title', 'Dictate message with voice');
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
      this.recognition = null;
    }
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
        this.toggleCode.classList.add('mode-active', 'border-emerald-500/50', 'bg-emerald-500/10', 'text-emerald-400');
        this.toggleCode.classList.remove('text-[var(--text-muted)]');
      } else {
        this.toggleCode.classList.remove('mode-active', 'border-emerald-500/50', 'bg-emerald-500/10', 'text-emerald-400');
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
        this.toggleSearch.classList.add('mode-active', 'border-sky-500/50', 'bg-sky-500/10', 'text-sky-400');
        this.toggleSearch.classList.remove('text-[var(--text-muted)]');
      } else {
        this.toggleSearch.classList.remove('mode-active', 'border-sky-500/50', 'bg-sky-500/10', 'text-sky-400');
        this.toggleSearch.classList.add('text-[var(--text-muted)]');
      }
    }
    if (this.searchStatusBadge) {
      this.searchStatusBadge.className = modes.webSearch
        ? 'w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse'
        : 'w-1.5 h-1.5 rounded-full bg-zinc-500';
    }

    // Thinking Label (Minimum: Low, No Off State)
    if (this.thinkingLabel) {
      const level = modes.thinkingLevel || 'low';
      const display = level.charAt(0).toUpperCase() + level.slice(1);
      this.thinkingLabel.textContent = display;

      if (this.btnThinking) {
        this.btnThinking.classList.add('border-[var(--accent-blue)]', 'bg-[var(--accent-subtle)]', 'text-[var(--accent-blue)]');
        this.btnThinking.classList.remove('text-[var(--text-muted)]');
      }
    }
  }

  setStreaming(isStreaming, onStop = null) {
    this.isStreaming = Boolean(isStreaming);
    this.onStop = onStop;
    if (!this.btnSend) return;

    if (this.isStreaming) {
      this.btnSend.innerHTML = '<svg class="w-4 h-4 text-white"><use href="#icon-square"/></svg>';
      this.btnSend.title = 'Stop generating';
      this.btnSend.disabled = false;
      this.btnSend.classList.add('is-stopping', 'bg-rose-500', 'hover:bg-rose-600');
      this.btnSend.classList.remove('bg-[var(--accent-blue)]');
    } else {
      this.btnSend.innerHTML = '<svg class="w-4 h-4"><use href="#icon-arrow-up"/></svg>';
      this.btnSend.title = 'Send message';
      this.btnSend.classList.remove('is-stopping', 'bg-rose-500', 'hover:bg-rose-600');
      this.btnSend.classList.add('bg-[var(--accent-blue)]');
      this.updateSendButtonState();
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
