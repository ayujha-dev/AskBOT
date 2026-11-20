import { MarkdownRenderer } from '../../utils/markdown.js';
import { PyodideBridge } from '../../services/pyodide-bridge.js';
import { escapeHtml, sanitizeUrl } from '../../utils/dom.js';

export class MessagesComponent {
  constructor(containerEl, emptyStateEl, options = {}) {
    // Support either constructor(containerEl, emptyStateEl, options) or constructor(options)
    if (containerEl && typeof containerEl === 'object' && !containerEl.nodeType && !emptyStateEl) {
      options = containerEl;
      containerEl = null;
    }

    this.container = containerEl || document.getElementById('messages-container');
    this.emptyState = emptyStateEl || document.getElementById('empty-state');
    this.canvas = document.getElementById('chat-canvas');

    this.onRegenerate = options.onRegenerate || (() => {});
    this.onEditPrompt = options.onEditPrompt || (() => {});

    this.initGlobalListeners();
  }

  initGlobalListeners() {
    // Handle delegated copy and run-code clicks
    this.container?.addEventListener('click', async (e) => {
      // Copy code button inside syntax highlighted block
      const copyBtn = e.target.closest('.copy-code-btn');
      if (copyBtn) {
        const text = decodeURIComponent(copyBtn.getAttribute('data-copy') || '');
        if (text) {
          await navigator.clipboard.writeText(text);
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = '<svg class="w-3 h-3 text-emerald-500"><use href="#icon-check"/></svg><span>Copied!</span>';
          setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
        }
        return;
      }

      // Copy whole message action
      const msgCopyBtn = e.target.closest('.btn-copy-msg');
      if (msgCopyBtn) {
        const text = decodeURIComponent(msgCopyBtn.getAttribute('data-copy-text') || '');
        if (text) {
          await navigator.clipboard.writeText(text);
          const originalHTML = msgCopyBtn.innerHTML;
          msgCopyBtn.innerHTML = '<svg class="w-3 h-3 text-emerald-400"><use href="#icon-check"/></svg><span>Copied</span>';
          setTimeout(() => { msgCopyBtn.innerHTML = originalHTML; }, 1800);
        }
        return;
      }

      // Edit & Resend user prompt action
      const editBtn = e.target.closest('.btn-edit-prompt');
      if (editBtn) {
        const text = decodeURIComponent(editBtn.getAttribute('data-prompt-text') || '');
        if (text) {
          this.onEditPrompt(text);
        }
        return;
      }

      // Regenerate assistant turn action
      const regenBtn = e.target.closest('.btn-regen-msg');
      if (regenBtn) {
        const msgId = regenBtn.getAttribute('data-msg-id');
        if (msgId) {
          this.onRegenerate(msgId);
        }
        return;
      }

      // Run Python code button
      const runBtn = e.target.closest('.btn-run-code');
      if (runBtn) {
        const code = decodeURIComponent(runBtn.getAttribute('data-code') || '');
        if (code) {
          runBtn.disabled = true;
          const origHTML = runBtn.innerHTML;
          runBtn.innerHTML = '<span class="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full"></span><span>Running...</span>';

          const card = runBtn.closest('.code-block-container');
          const result = await PyodideBridge.execute(code);

          runBtn.disabled = false;
          runBtn.innerHTML = origHTML;

          this.renderExecutionOutputUnderCard(card, result);
        }
      }
    });
  }

  renderExecutionOutputUnderCard(codeCard, result) {
    if (!codeCard) return;

    let outputEl = codeCard.nextElementSibling;
    if (!outputEl || !outputEl.classList.contains('py-execution-output')) {
      outputEl = document.createElement('div');
      outputEl.className = 'py-execution-output my-3 p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-panel)] text-xs font-mono';
      codeCard.parentNode.insertBefore(outputEl, codeCard.nextSibling);
    }

    let inner = `<div class="flex items-center justify-between pb-2 mb-2 border-b border-[var(--surface-border)] font-semibold text-[11px] text-[var(--text-muted)]">
      <span>PYTHON OUTPUT</span>
      <span class="${result.success ? 'text-emerald-500' : 'text-rose-500'}">${result.success ? 'Success' : 'Error'}</span>
    </div>`;

    if (result.stdout) {
      inner += `<pre class="text-[var(--text-primary)] whitespace-pre-wrap mb-2">${escapeHtml(result.stdout)}</pre>`;
    }
    if (result.stderr) {
      inner += `<pre class="text-rose-400 whitespace-pre-wrap mb-2">${escapeHtml(result.stderr)}</pre>`;
    }
    const plotData = result.plotBase64 || result.plotImageBase64;
    if (plotData) {
      inner += `<div class="mt-3 p-2 bg-white rounded-lg flex justify-center">
        <img src="data:image/png;base64,${plotData}" alt="Rendered Plot" class="max-w-full rounded shadow-sm">
      </div>`;
    }
    if (!result.stdout && !result.stderr && !plotData) {
      inner += `<div class="text-[var(--text-muted)] italic">Code executed with no output.</div>`;
    }

    outputEl.innerHTML = inner;
    this.scrollToBottom();
  }

  render(messages) {
    if (!this.container || !this.emptyState) return;

    if (!messages || messages.length === 0) {
      this.container.classList.add('hidden');
      this.emptyState.classList.remove('hidden');
      this.container.innerHTML = '';
      return;
    }

    this.emptyState.classList.add('hidden');
    this.container.classList.remove('hidden');
    this.container.innerHTML = '';

    messages.forEach(msg => {
      this.appendMessageElement(msg);
    });

    this.scrollToBottom();
  }

  appendMessageElement(msg) {
    const isUser = msg.role === 'user';
    const wrapper = document.createElement('div');
    wrapper.id = `msg-${msg.id}`;
    wrapper.className = `message-entry group flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`;

    if (isUser) {
      // User message column
      const userCol = document.createElement('div');
      userCol.className = 'flex flex-col items-end max-w-xl';

      // User bubble
      const bubble = document.createElement('div');
      bubble.className = 'w-full px-4 py-3 rounded-2xl bg-[var(--surface-panel)] border border-[var(--surface-border)] text-sm text-[var(--text-primary)] shadow-sm leading-relaxed';

      // Attachments preview
      if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        const attContainer = document.createElement('div');
        attContainer.className = 'flex flex-wrap gap-2 mb-2';

        msg.attachments.forEach(att => {
          if (att.type === 'image') {
            const img = document.createElement('img');
            img.src = att.data;
            img.alt = escapeHtml(att.name);
            img.className = 'w-24 h-24 object-cover rounded-xl border border-[var(--surface-border)]';
            attContainer.appendChild(img);
          } else {
            const chip = document.createElement('div');
            chip.className = 'px-2 py-1 rounded-lg bg-[var(--surface-bg)] border border-[var(--surface-border)] text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5';
            chip.innerHTML = `<span class="font-bold text-[var(--accent-blue)]">FILE:</span> <span>${escapeHtml(att.name)}</span>`;
            attContainer.appendChild(chip);
          }
        });

        bubble.appendChild(attContainer);
      }

      const textNode = document.createElement('div');
      textNode.className = 'whitespace-pre-wrap';
      textNode.textContent = msg.content;
      bubble.appendChild(textNode);
      userCol.appendChild(bubble);

      // User hover message actions
      const actionsEl = document.createElement('div');
      actionsEl.className = 'message-actions flex items-center gap-1.5 mt-1 mr-1 text-[11px]';
      actionsEl.innerHTML = `
        <button class="msg-action-btn btn-copy-msg" data-copy-text="${encodeURIComponent(msg.content)}" title="Copy message text">
          <svg class="w-3 h-3"><use href="#icon-copy"/></svg>
          <span>Copy</span>
        </button>
        <button class="msg-action-btn btn-edit-prompt" data-prompt-text="${encodeURIComponent(msg.content)}" title="Edit and resend message">
          <svg class="w-3 h-3"><use href="#icon-edit"/></svg>
          <span>Edit</span>
        </button>
      `;
      userCol.appendChild(actionsEl);

      wrapper.appendChild(userCol);
    } else {
      // Assistant message layout
      const assistantCol = document.createElement('div');
      assistantCol.className = 'w-full max-w-full space-y-3';

      // 1. Thought Process Accordion (if any)
      if (msg.thoughtProcess && msg.thoughtProcess.trim()) {
        const accordion = this.createThoughtAccordion(msg.thoughtProcess);
        assistantCol.appendChild(accordion);
      }

      // 2. Message Body (Markdown)
      const bodyEl = document.createElement('div');
      bodyEl.className = 'prose text-sm text-[var(--text-primary)] leading-relaxed';
      bodyEl.innerHTML = MarkdownRenderer.render(msg.content);
      assistantCol.appendChild(bodyEl);

      // 3. Search Sources Pill Tray (Rendered cleanly below assistant response)
      if (Array.isArray(msg.searchSources) && msg.searchSources.length > 0) {
        const sourcesTray = document.createElement('div');
        sourcesTray.className = 'sources-tray pt-2 border-t border-[var(--surface-border)] flex items-center gap-2 flex-wrap text-xs';
        sourcesTray.innerHTML = `<span class="font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1 text-[var(--text-muted)]">
          <svg class="w-3.5 h-3.5 text-[var(--accent-blue)]"><use href="#icon-search"/></svg>
          Sources:
        </span>`;

        msg.searchSources.forEach((s, idx) => {
          let domain = s.domain;
          if (!domain && s.url) {
            try { domain = new URL(s.url).hostname.replace(/^www\./, ''); } catch { domain = ''; }
          }

          const pill = document.createElement('a');
          pill.href = sanitizeUrl(s.url);
          pill.target = '_blank';
          pill.rel = 'noopener noreferrer';
          pill.className = 'matte-source-chip';
          pill.title = s.title || s.url;
          pill.innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] flex-shrink-0"></span>
            ${domain ? `<span class="font-semibold text-[10px] text-[var(--text-muted)]">${escapeHtml(domain)}</span>` : ''}
            <span class="truncate">${escapeHtml(s.title || 'Source')}</span>
            ${s.age ? `<span class="text-[10px] text-[var(--text-muted)] flex-shrink-0">(${escapeHtml(s.age)})</span>` : ''}
          `;
          sourcesTray.appendChild(pill);
        });

        assistantCol.appendChild(sourcesTray);
      }

      // 4. Standalone Execution Output Card (if any saved with message)
      if (msg.executionOutput) {
        const outputWrapper = document.createElement('div');
        outputWrapper.className = 'py-execution-output my-3 p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-panel)] text-xs font-mono';
        let inner = `<div class="flex items-center justify-between pb-2 mb-2 border-b border-[var(--surface-border)] font-semibold text-[11px] text-[var(--text-muted)]">
          <span>CODE INTERPRETER OUTPUT</span>
          <span class="text-emerald-500">Executed</span>
        </div>`;
        if (msg.executionOutput.stdout) {
          inner += `<pre class="text-[var(--text-primary)] whitespace-pre-wrap mb-2">${escapeHtml(msg.executionOutput.stdout)}</pre>`;
        }
        if (msg.executionOutput.stderr) {
          inner += `<pre class="text-rose-400 whitespace-pre-wrap mb-2">${escapeHtml(msg.executionOutput.stderr)}</pre>`;
        }
        const plotData = msg.executionOutput.plotBase64 || msg.executionOutput.plotImageBase64;
        if (plotData) {
          inner += `<div class="mt-3 p-2 bg-white rounded-lg flex justify-center">
            <img src="data:image/png;base64,${plotData}" alt="Plot" class="max-w-full rounded shadow-sm">
          </div>`;
        }
        outputWrapper.innerHTML = inner;
        assistantCol.appendChild(outputWrapper);
      }

      // 5. Assistant hover actions
      const actionsEl = document.createElement('div');
      actionsEl.className = 'message-actions flex items-center gap-1.5 pt-1 text-[11px]';
      actionsEl.innerHTML = `
        <button class="msg-action-btn btn-copy-msg" data-copy-text="${encodeURIComponent(msg.content)}" title="Copy response markdown">
          <svg class="w-3 h-3"><use href="#icon-copy"/></svg>
          <span>Copy</span>
        </button>
        <button class="msg-action-btn btn-regen-msg" data-msg-id="${msg.id}" title="Regenerate this response">
          <svg class="w-3 h-3"><use href="#icon-refresh"/></svg>
          <span>Regenerate</span>
        </button>
      `;
      assistantCol.appendChild(actionsEl);

      wrapper.appendChild(assistantCol);
    }

    this.container.appendChild(wrapper);
  }

  createThoughtAccordion(thinkingText, isLive = false) {
    const container = document.createElement('div');
    container.className = 'thought-accordion my-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-panel)] text-xs overflow-hidden';

    const header = document.createElement('button');
    header.className = 'w-full px-3.5 py-2 flex items-center justify-between text-left font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] ui-transition';
    const words = thinkingText.trim().split(/\s+/).length;

    header.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-3.5 h-3.5 text-[var(--accent-blue)] ${isLive ? 'animate-pulse' : ''}"><use href="#icon-brain"/></svg>
        <span>Thought process <span class="text-[10px] text-[var(--text-muted)] font-normal">(${words} words)</span></span>
      </div>
      <svg class="chevron-icon w-3.5 h-3.5 transform transition-transform duration-200"><use href="#icon-chevron-down"/></svg>
    `;

    const content = document.createElement('div');
    content.className = 'thought-accordion-content border-t border-[var(--surface-border)]';
    content.innerHTML = `
      <div class="thought-inner p-3.5 text-[11px] text-[var(--text-secondary)] font-mono whitespace-pre-wrap bg-[var(--surface-card)] max-h-72 overflow-y-auto leading-relaxed">
        ${escapeHtml(thinkingText)}
      </div>
    `;

    header.addEventListener('click', () => {
      content.classList.toggle('expanded');
      const chevron = header.querySelector('.chevron-icon');
      if (chevron) {
        chevron.classList.toggle('rotate-180');
      }
    });

    if (isLive) {
      content.classList.add('expanded');
      header.querySelector('.chevron-icon')?.classList.add('rotate-180');
    }

    container.appendChild(header);
    container.appendChild(content);
    return container;
  }

  // --- Live Streaming Helpers ---
  createStreamingMessage(id) {
    this.emptyState.classList.add('hidden');
    this.container.classList.remove('hidden');

    const wrapper = document.createElement('div');
    wrapper.id = `msg-${id}`;
    wrapper.className = 'message-entry flex gap-3 justify-start';

    const assistantCol = document.createElement('div');
    assistantCol.className = 'w-full max-w-full space-y-3';

    // Thinking container placeholder
    const thinkingPlaceholder = document.createElement('div');
    thinkingPlaceholder.id = `streaming-thinking-${id}`;
    assistantCol.appendChild(thinkingPlaceholder);

    // Searching status indicator
    const searchingStatus = document.createElement('div');
    searchingStatus.id = `streaming-status-${id}`;
    searchingStatus.className = 'hidden';
    assistantCol.appendChild(searchingStatus);

    // Body
    const bodyEl = document.createElement('div');
    bodyEl.id = `streaming-body-${id}`;
    bodyEl.className = 'prose text-sm text-[var(--text-primary)] leading-relaxed';
    bodyEl.innerHTML = '<span class="inline-block w-2 h-4 bg-[var(--accent-blue)] animate-pulse rounded-sm"></span>';
    assistantCol.appendChild(bodyEl);

    // Sources placeholder below body
    const sourcesPlaceholder = document.createElement('div');
    sourcesPlaceholder.id = `streaming-sources-${id}`;
    assistantCol.appendChild(sourcesPlaceholder);

    wrapper.appendChild(assistantCol);
    this.container.appendChild(wrapper);
    this.scrollToBottom();

    return {
      showSearchingStatus: (engineName = 'Brave') => {
        searchingStatus.className = 'flex items-center gap-2 py-1';
        searchingStatus.innerHTML = `
          <div class="searching-pill">
            <svg class="w-3.5 h-3.5 animate-spin"><use href="#icon-search"/></svg>
            <span>Searching ${escapeHtml(engineName)}...</span>
          </div>
        `;
        this.scrollToBottom();
      },
      hideSearchingStatus: () => {
        searchingStatus.innerHTML = '';
        searchingStatus.className = 'hidden';
      },
      updateThinking: (fullThought) => {
        let acc = thinkingPlaceholder.querySelector('.thought-accordion');
        if (!acc) {
          acc = this.createThoughtAccordion(fullThought, true);
          thinkingPlaceholder.appendChild(acc);
        } else {
          const inner = acc.querySelector('.thought-inner');
          if (inner) inner.textContent = fullThought;
          const words = fullThought.trim().split(/\s+/).length;
          const headerText = acc.querySelector('button span');
          if (headerText) {
            headerText.innerHTML = `Thought process <span class="text-[10px] text-[var(--text-muted)] font-normal">(${words} words)</span>`;
          }
        }
        this.scrollToBottom();
      },
      updateSources: (sources) => {
        if (!Array.isArray(sources) || sources.length === 0) return;
        sourcesPlaceholder.innerHTML = `<div class="sources-tray pt-2 border-t border-[var(--surface-border)] flex items-center gap-2 flex-wrap text-xs">
          <span class="font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1 text-[var(--text-muted)]">
            <svg class="w-3.5 h-3.5 text-[var(--accent-blue)]"><use href="#icon-search"/></svg>
            Sources:
          </span>
          ${sources.map((s, idx) => {
            let domain = s.domain;
            if (!domain && s.url) {
              try { domain = new URL(s.url).hostname.replace(/^www\./, ''); } catch { domain = ''; }
            }
            return `
              <a href="${sanitizeUrl(s.url)}" target="_blank" rel="noopener noreferrer" class="matte-source-chip" title="${escapeHtml(s.title || '')}">
                <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] flex-shrink-0"></span>
                ${domain ? `<span class="font-semibold text-[10px] text-[var(--text-muted)]">${escapeHtml(domain)}</span>` : ''}
                <span class="truncate">${escapeHtml(s.title || 'Source')}</span>
                ${s.age ? `<span class="text-[10px] text-[var(--text-muted)] flex-shrink-0">(${escapeHtml(s.age)})</span>` : ''}
              </a>
            `;
          }).join('')}
        </div>`;
        this.scrollToBottom();
      },
      updateContent: (markdown) => {
        bodyEl.innerHTML = MarkdownRenderer.render(markdown);
        this.scrollToBottom();
      },
      finalize: (finalMsg) => {
        searchingStatus.innerHTML = '';
        searchingStatus.className = 'hidden';

        const acc = thinkingPlaceholder.querySelector('.thought-accordion-content');
        if (acc) {
          acc.classList.remove('expanded');
          const chevron = thinkingPlaceholder.querySelector('.chevron-icon');
          if (chevron) chevron.classList.remove('rotate-180');
        }
      }
    };
  }

  scrollToBottom() {
    if (this.canvas) {
      this.canvas.scrollTop = this.canvas.scrollHeight;
    }
  }
}
