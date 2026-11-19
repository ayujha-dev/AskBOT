import { escapeHtml } from '../../utils/dom.js';

/**
 * ChatNavRail: Sleek, high-craft navigation rail for the chat section.
 * Enables quick jumping between conversation turns and filtering by outputs (Code, Search, Thoughts).
 */
export class ChatNavRail {
  constructor() {
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
    if (!this.railEl || !this.canvasEl) return;

    if (this.btnTop) {
      this.btnTop.addEventListener('click', () => {
        this.canvasEl.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (this.btnBottom) {
      this.btnBottom.addEventListener('click', () => {
        this.canvasEl.scrollTo({ top: this.canvasEl.scrollHeight, behavior: 'smooth' });
      });
    }

    if (this.btnJumpCode) {
      this.btnJumpCode.addEventListener('click', () => {
        this.jumpToNext(this.codeTargets, 'currentCodeIdx');
      });
    }

    if (this.btnJumpSearch) {
      this.btnJumpSearch.addEventListener('click', () => {
        this.jumpToNext(this.searchTargets, 'currentSearchIdx');
      });
    }

    if (this.btnJumpThought) {
      this.btnJumpThought.addEventListener('click', () => {
        this.jumpToNext(this.thoughtTargets, 'currentThoughtIdx');
      });
    }

    // Scroll listener for active turn highlighting
    let isTicking = false;
    this.canvasEl.addEventListener('scroll', () => {
      if (!isTicking) {
        window.requestAnimationFrame(() => {
          this.highlightCurrentTurn();
          isTicking = false;
        });
        isTicking = true;
      }
    }, { passive: true });
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
    if (!this.railEl || !this.turnsTrackEl) return;

    if (!messages || messages.length === 0) {
      this.railEl.dataset.visible = 'false';
      this.turnsTrackEl.innerHTML = '';
      if (this.btnJumpCode) this.btnJumpCode.classList.add('hidden');
      if (this.btnJumpSearch) this.btnJumpSearch.classList.add('hidden');
      if (this.btnJumpThought) this.btnJumpThought.classList.add('hidden');
      return;
    }

    this.railEl.dataset.visible = 'true';

    // Parse turns and output targets
    this.turns = [];
    this.codeTargets = [];
    this.searchTargets = [];
    this.thoughtTargets = [];

    let currentTurn = null;

    messages.forEach((msg, idx) => {
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

    // Update Jump Filter Badges
    this.updateJumpButton(this.btnJumpCode, this.badgeCode, this.codeTargets.length);
    this.updateJumpButton(this.btnJumpSearch, this.badgeSearch, this.searchTargets.length);
    this.updateJumpButton(this.btnJumpThought, this.badgeThought, this.thoughtTargets.length);

    // Render Turn Dots in Track
    this.renderTurnDots();
    this.highlightCurrentTurn();
  }

  updateJumpButton(buttonEl, badgeEl, count) {
    if (!buttonEl) return;
    if (count > 0) {
      buttonEl.classList.remove('hidden');
      if (badgeEl) badgeEl.textContent = String(count);
    } else {
      buttonEl.classList.add('hidden');
    }
  }

  renderTurnDots() {
    this.turnsTrackEl.innerHTML = '';

    this.turns.forEach(turn => {
      const item = document.createElement('div');
      item.className = 'nav-rail-item relative flex items-center justify-center p-1 cursor-pointer';
      item.setAttribute('data-turn-id', turn.userMessageId);

      // Tooltip content
      const excerpt = turn.promptText.slice(0, 60).trim() + (turn.promptText.length > 60 ? '...' : '');
      const badgePills = [
        turn.hasCode ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[9px]">Code</span>' : '',
        turn.hasSearch ? '<span class="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-semibold text-[9px]">Web</span>' : '',
        turn.hasThought ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold text-[9px]">Think</span>' : ''
      ].filter(Boolean).join(' ');

      item.innerHTML = `
        <div class="nav-rail-dot" id="rail-dot-${turn.userMessageId}"></div>
        <div class="nav-tooltip p-2 rounded-xl glass-card text-xs text-[var(--text-primary)] shadow-xl flex flex-col gap-1 border border-[var(--surface-border)]">
          <div class="flex items-center justify-between gap-3 text-[10px] text-[var(--text-muted)] font-semibold">
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

    const dots = this.turnsTrackEl.querySelectorAll('.nav-rail-dot');
    dots.forEach(d => d.classList.remove('active'));

    const activeDot = document.getElementById(`rail-dot-${activeTurnId}`);
    if (activeDot) {
      activeDot.classList.add('active');
    }
  }
}
