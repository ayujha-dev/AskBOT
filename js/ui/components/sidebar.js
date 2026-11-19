import { store } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';

export class SidebarComponent {
  constructor(options = {}) {
    this.onSelectChat = options.onSelectChat || (() => {});
    this.onNewChat = options.onNewChat || (() => {});
    this.onOpenSettings = options.onOpenSettings || (() => {});
    this.onSelectModel = options.onSelectModel || (() => {});

    this.sidebarEl = document.getElementById('sidebar');
    this.historyListEl = document.getElementById('chat-history-list');
    this.emptyNoticeEl = document.getElementById('history-empty-notice');
    this.btnNewChat = document.getElementById('btn-new-chat');
    this.btnCollapse = document.getElementById('btn-collapse-sidebar');
    this.btnToggle = document.getElementById('btn-toggle-sidebar');

    this.btnSettings = document.getElementById('btn-open-settings');
    this.btnTheme = document.getElementById('btn-theme-toggle');
    this.sunIcon = document.querySelector('.theme-icon-sun');
    this.moonIcon = document.querySelector('.theme-icon-moon');

    this.activeProviderLabel = document.getElementById('active-provider-label');
    this.activeModelLabel = document.getElementById('active-model-label');
    this.headerModelName = document.getElementById('header-model-name');
    this.sidebarProviderCard = document.getElementById('sidebar-provider-card');
    this.searchInput = document.getElementById('sidebar-chat-search');
    this.chatCountEl = document.getElementById('sidebar-chat-count');

    this.searchQuery = '';
    this.init();
  }

  static generateTitle(prompt) {
    if (!prompt) return 'New conversation';
    let cleaned = prompt
      .replace(/^(can you|could you|please|what is|how to|how do i|tell me about|explain)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    if (!cleaned) cleaned = prompt.trim();
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    if (cleaned.length > 38) {
      return cleaned.slice(0, 35).trim() + '...';
    }
    return cleaned;
  }

  init() {
    if (this.btnNewChat) {
      this.btnNewChat.addEventListener('click', () => {
        this.onNewChat();
      });
    }

    if (this.btnCollapse && this.sidebarEl) {
      this.btnCollapse.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    if (this.btnToggle && this.sidebarEl) {
      this.btnToggle.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        this.onOpenSettings();
      });
    }

    if (this.btnTheme) {
      this.btnTheme.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    if (this.sidebarProviderCard) {
      this.sidebarProviderCard.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelectModel(this.sidebarProviderCard);
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target.value || '').trim().toLowerCase();
        this.renderHistory();
      });
    }

    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('chats') || changedKeys.includes('currentChatId')) {
        this.renderHistory();
      }
      if (changedKeys.includes('activeProvider') || changedKeys.includes('selectedModel')) {
        this.renderActiveModel();
      }
      if (changedKeys.includes('theme')) {
        this.applyTheme(state.theme);
      }
    });

    this.applyTheme(store.getState().theme);
    this.renderActiveModel();
    this.renderHistory();
  }

  toggleSidebar() {
    if (!this.sidebarEl) return;
    this.sidebarEl.classList.toggle('-ml-64');
    this.sidebarEl.classList.toggle('md:-ml-72');
  }

  toggleTheme() {
    const current = store.getState().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    store.setState({ theme: next });
  }

  applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      if (this.sunIcon) this.sunIcon.classList.remove('hidden');
      if (this.moonIcon) this.moonIcon.classList.add('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      if (this.sunIcon) this.sunIcon.classList.add('hidden');
      if (this.moonIcon) this.moonIcon.classList.remove('hidden');
    }
  }

  renderActiveModel() {
    const { activeProvider, selectedModel } = store.getState();
    if (this.activeProviderLabel) {
      this.activeProviderLabel.textContent = (activeProvider || 'GROQ').toUpperCase();
    }
    if (this.activeModelLabel) {
      this.activeModelLabel.textContent = selectedModel || 'No model selected';
    }
    if (this.headerModelName) {
      this.headerModelName.textContent = selectedModel || (activeProvider ? `${activeProvider} (Select Model)` : 'Setup Key');
    }
    const headerProviderPill = document.getElementById('header-provider-pill');
    if (headerProviderPill) {
      headerProviderPill.textContent = (activeProvider || 'GROQ').toUpperCase();
    }
  }

  renderHistory() {
    if (!this.historyListEl) return;

    const { chats, currentChatId } = store.getState();
    const chatList = chats || [];

    if (this.chatCountEl) {
      this.chatCountEl.textContent = chatList.length;
    }

    this.historyListEl.innerHTML = '';

    let displayedChats = chatList;
    if (this.searchQuery) {
      displayedChats = displayedChats.filter(chat =>
        (chat.title || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (displayedChats.length === 0) {
      if (this.searchQuery) {
        const searchNotice = document.createElement('div');
        searchNotice.className = 'px-3 py-6 text-center text-xs text-[var(--text-muted)]';
        searchNotice.textContent = `No conversations match "${this.searchQuery}".`;
        this.historyListEl.appendChild(searchNotice);
      } else if (this.emptyNoticeEl) {
        this.historyListEl.appendChild(this.emptyNoticeEl);
      }
      return;
    }

    displayedChats.forEach(chat => {
      const isActive = chat.id === currentChatId;
      const item = document.createElement('div');
      item.className = `chat-history-item group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer ui-transition ${
        isActive
          ? 'bg-[var(--surface-bg)] text-[var(--text-primary)] font-medium border border-[var(--surface-border)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-panel-hover)] hover:text-[var(--text-primary)]'
      }`;

      item.innerHTML = `
        <span class="chat-title truncate flex-1 pr-2">${escapeHtml(chat.title || 'New conversation')}</span>
        <div class="chat-actions hidden group-hover:flex items-center gap-1 flex-shrink-0">
          <button class="btn-rename-chat p-1 rounded hover:bg-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Rename conversation">
            <svg class="w-3 h-3"><use href="#icon-edit"/></svg>
          </button>
          <button class="btn-delete-chat p-1 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500" title="Delete conversation">
            <svg class="w-3 h-3"><use href="#icon-trash"/></svg>
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-actions')) return;
        this.onSelectChat(chat.id);
      });

      // Inline rename button
      const renameBtn = item.querySelector('.btn-rename-chat');
      const titleSpan = item.querySelector('.chat-title');
      if (renameBtn && titleSpan) {
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newTitle = prompt('Rename conversation:', chat.title);
          if (newTitle && newTitle.trim()) {
            store.updateChat(chat.id, { title: newTitle.trim() });
          }
        });
      }

      // Delete button
      const deleteBtn = item.querySelector('.btn-delete-chat');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${chat.title}"?`)) {
            store.deleteChat(chat.id);
          }
        });
      }

      this.historyListEl.appendChild(item);
    });
  }
}
