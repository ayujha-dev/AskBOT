import { escapeHtml } from '../../utils/dom.js';
import { TokenCounter } from '../../services/token-counter.js';
import { store } from '../../state/store.js';

/**
 * ChatNavRail: Minimalist, whisper-quiet tracking rail for the chat section.
 * Features:
 * 1. Conversation Minimap / Hairline Jump Ticks with prompt tooltips.
 * 2. Context Window Meter (thin vertical fill bar; turns amber >80%; opens drawer).
 * 3. Quick Mode Micro-Indicators (Search, Code, Thinking).
 */
export class ChatNavRail {
  constructor(options = {}) {
    this.onOpenParameters = options.onOpenParameters || (() => {
      store.setState({ parametersDrawerOpen: true });
    });

    this.railEl = document.getElementById('chat-nav-rail');
    this.canvasEl = document.getElementById('chat-canvas');
    this.turnsTrackEl = document.getElementById('rail-turns-track');

    this.btnTop = document.getElementById('btn-rail-top');
    this.btnBottom = document.getElementById('btn-rail-bottom');

    this.btnJumpCode = document.getElementById('btn-rail-jump-code');
    this.badgeCode = document.getElementById('rail-badge-code');

    this.btnJumpSearch = document.getElementById('btn-rail-jump-search');
    this.badgeSearch = document.getElementById('rail-badge-search');

    this.btnJumpThought = document.getElementById('btn-rail-jump-thought');
    this.badgeThought = document.getElementById('rail-badge-thought');

    this.contextMeter = document.getElementById('rail-context-meter');
    this.contextMeterFill = document.getElementById('rail-context-meter-fill');

    this.indicatorSearch = document.getElementById('rail-indicator-search');
    this.indicatorCode = document.getElementById('rail-indicator-code');
    this.indicatorThink = document.getElementById('rail-indicator-think');

    this.turns = [];
    this.codeTargets = [];
    this.searchTargets = [];
    this.thoughtTargets = [];

    this.currentCodeIdx = 0;
    this.currentSearchIdx = 0;
    this.currentThoughtIdx = 0;

    this.init();
  }

  init() {
    this.btnTop?.addEventListener('click', () => {
      this.canvasEl?.scrollTo({ top: 0, behavior: 'smooth' });
    });

    this.btnBottom?.addEventListener('click', () => {
      if (this.canvasEl) {
        this.canvasEl.scrollTo({ top: this.canvasEl.scrollHeight, behavior: 'smooth' });
      }
    });

    this.contextMeter?.addEventListener('click', () => {
      this.onOpenParameters();
    });

    this.btnJumpCode?.addEventListener('click', () => {
      this.jumpToNext(this.codeTargets, 'currentCodeIdx');
    });

    this.btnJumpSearch?.addEventListener('click', () => {
      this.jumpToNext(this.searchTargets, 'currentSearchIdx');
    });

    this.btnJumpThought?.addEventListener('click', () => {
      this.jumpToNext(this.thoughtTargets, 'currentThoughtIdx');
    });

    // Scroll listener for active turn highlighting
    let isTicking = false;
    this.canvasEl?.addEventListener('scroll', () => {
      if (!isTicking) {
        window.requestAnimationFrame(() => {
          this.highlightCurrentTurn();
          isTicking = false;
        });
        isTicking = true;
      }
    }, { passive: true });

    // Store subscription for live mode and parameter changes
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('modes')) {
        this.syncModesIndicators(state.modes);
      }
      if (changedKeys.includes('parameters') && this.currentMessages) {
        this.updateContextMeter(this.currentMessages, state.parameters);
      }
    });

    this.syncModesIndicators(store.getState().modes);
  }

  syncModesIndicators(modes = store.getState().modes) {
    if (!modes) return;

    if (this.indicatorSearch) {
      if (modes.webSearch) {
        this.indicatorSearch.className = 'w-1.5 h-1.5 rounded-full bg-sky-400 shadow-sm animate-pulse';
        this.indicatorSearch.title = 'Web Search Mode: Active';
      } else {
        this.indicatorSearch.className = 'w-1.5 h-1.5 rounded-full bg-zinc-600/40';
        this.indicatorSearch.title = 'Web Search Mode: Inactive';
      }
    }

    if (this.indicatorCode) {
      if (modes.codeInterpreter) {
        this.indicatorCode.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm animate-pulse';
        this.indicatorCode.title = 'Code Interpreter: Active';
      } else {
        this.indicatorCode.className = 'w-1.5 h-1.5 rounded-full bg-zinc-600/40';
        this.indicatorCode.title = 'Code Interpreter: Inactive';
      }
    }

    if (this.indicatorThink) {
      const level = modes.thinkingLevel || 'low';
      if (level !== 'off') {
        this.indicatorThink.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm';
        this.indicatorThink.title = `Thinking Mode: ${level.toUpperCase()}`;
      } else {
        this.indicatorThink.className = 'w-1.5 h-1.5 rounded-full bg-zinc-600/40';
        this.indicatorThink.title = 'Thinking Mode: Off';
      }
    }
  }

  jumpToNext(targetList, indexProp) {
    if (!targetList || targetList.length === 0) return;
    const targetId = targetList[this[indexProp] % targetList.length];
    this[indexProp]++;
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  update(messages) {
    this.currentMessages = messages;
    if (!this.railEl || !this.turnsTrackEl) return;

    if (!messages || messages.length === 0) {
      this.railEl.dataset.visible = 'false';
      this.turnsTrackEl.innerHTML = '';
      if (this.contextMeterFill) this.contextMeterFill.style.height = '0%';
      return;
    }

    this.railEl.dataset.visible = 'true';

    // Parse turns and output targets
    this.turns = [];
    this.codeTargets = [];
    this.searchTargets = [];
    this.thoughtTargets = [];

    let currentTurn = null;

    messages.forEach((msg) => {
      if (msg.role === 'user') {
        currentTurn = {
          turnNumber: this.turns.length + 1,
          userMessageId: msg.id,
          promptText: msg.content || '',
          hasCode: false,
          hasSearch: false,
          hasThought: false
        };
        this.turns.push(currentTurn);
      } else if (msg.role === 'assistant') {
        const hasCode = Boolean(msg.executionOutput || (msg.content && msg.content.includes('```')));
        const hasSearch = Boolean(Array.isArray(msg.searchSources) && msg.searchSources.length > 0);
        const hasThought = Boolean(msg.thoughtProcess && msg.thoughtProcess.trim());

        if (hasCode) this.codeTargets.push(msg.id);
        if (hasSearch) this.searchTargets.push(msg.id);
        if (hasThought) this.thoughtTargets.push(msg.id);

        if (currentTurn) {
          if (hasCode) currentTurn.hasCode = true;
          if (hasSearch) currentTurn.hasSearch = true;
          if (hasThought) currentTurn.hasThought = true;
        }
      }
    });

    if (this.badgeCode) this.badgeCode.textContent = String(this.codeTargets.length);
    if (this.badgeSearch) this.badgeSearch.textContent = String(this.searchTargets.length);
    if (this.badgeThought) this.badgeThought.textContent = String(this.thoughtTargets.length);

    this.renderTurnTicks();
    this.updateContextMeter(messages, store.getState().parameters);
    this.syncModesIndicators(store.getState().modes);
    this.highlightCurrentTurn();
  }

  updateContextMeter(messages, parameters = {}) {
    if (!this.contextMeter || !this.contextMeterFill) return;

    const budget = parameters.contextBudgetTokens || 8192;
    const estimatedTokens = TokenCounter.estimateMessagesTokens(messages);
    const pct = Math.min(100, Math.round((estimatedTokens / budget) * 100));

    this.contextMeterFill.style.height = `${pct}%`;

    if (pct >= 80) {
      this.contextMeterFill.classList.add('warning');
    } else {
      this.contextMeterFill.classList.remove('warning');
    }

    const titleText = `Context Budget: ${estimatedTokens.toLocaleString()} / ${budget.toLocaleString()} tokens (${pct}%) • Click to adjust`;
    this.contextMeter.title = titleText;
  }

  renderTurnTicks() {
    this.turnsTrackEl.innerHTML = '';

    this.turns.forEach(turn => {
      const item = document.createElement('div');
      item.className = 'nav-rail-item relative flex items-center justify-center p-1 cursor-pointer';
      item.setAttribute('data-turn-id', turn.userMessageId);

      const excerpt = turn.promptText.slice(0, 70).trim() + (turn.promptText.length > 70 ? '...' : '');
      const badgePills = [
        turn.hasCode ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold text-[9px]">Code</span>' : '',
        turn.hasSearch ? '<span class="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 font-semibold text-[9px]">Web</span>' : '',
        turn.hasThought ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold text-[9px]">Think</span>' : ''
      ].filter(Boolean).join(' ');

      item.innerHTML = `
        <div class="nav-rail-tick" id="rail-tick-${turn.userMessageId}"></div>
        <div class="nav-rail-dot hidden" id="rail-dot-${turn.userMessageId}"></div>
        <div class="nav-tooltip p-2.5 rounded-xl glass-card text-xs text-[var(--text-primary)] shadow-xl flex flex-col gap-1.5 border border-[var(--surface-border)]">
          <div class="flex items-center justify-between gap-4 text-[10px] text-[var(--text-muted)] font-semibold">
            <span>TURN ${turn.turnNumber}</span>
            <div class="flex gap-1">${badgePills}</div>
          </div>
          <p class="text-[11px] text-[var(--text-secondary)] max-w-xs leading-snug line-clamp-2">${escapeHtml(excerpt)}</p>
        </div>
      `;

      item.addEventListener('click', () => {
        const target = document.getElementById(`msg-${turn.userMessageId}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      this.turnsTrackEl.appendChild(item);
    });
  }

  highlightCurrentTurn() {
    if (!this.turns || this.turns.length === 0 || !this.canvasEl) return;

    const scrollTop = this.canvasEl.scrollTop;
    let activeTurnId = this.turns[0].userMessageId;

    for (const turn of this.turns) {
      const msgEl = document.getElementById(`msg-${turn.userMessageId}`);
      if (msgEl) {
        const offset = msgEl.offsetTop - this.canvasEl.offsetTop;
        if (offset <= scrollTop + 160) {
          activeTurnId = turn.userMessageId;
        }
      }
    }

    const items = this.turnsTrackEl.querySelectorAll('.nav-rail-item');
    items.forEach(item => {
      const isTurnActive = item.getAttribute('data-turn-id') === activeTurnId;
      if (isTurnActive) {
        item.classList.add('active');
        item.querySelector('.nav-rail-tick')?.classList.add('active');
        item.querySelector('.nav-rail-dot')?.classList.add('active');
      } else {
        item.classList.remove('active');
        item.querySelector('.nav-rail-tick')?.classList.remove('active');
        item.querySelector('.nav-rail-dot')?.classList.remove('active');
      }
    });
  }
}
