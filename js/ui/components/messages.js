import { MarkdownRenderer } from '../../utils/markdown.js';
import { PyodideBridge } from '../../services/pyodide-bridge.js';

export class MessagesComponent {
  constructor(containerEl, emptyStateEl) {
    this.container = containerEl || document.getElementById('messages-container');
    this.emptyState = emptyStateEl || document.getElementById('empty-state');
    this.canvas = document.getElementById('chat-canvas');

    this.initGlobalListeners();
  }

  initGlobalListeners() {
    if (!this.container) return;

    // Handle delegated copy and run-code clicks
    this.container.addEventListener('click', async (e) => {
      // Copy code button
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
      inner += `<pre class="text-[var(--text-primary)] whitespace-pre-wrap mb-2">${result.stdout}</pre>`;
    }
    if (result.stderr) {
      inner += `<pre class="text-rose-400 whitespace-pre-wrap mb-2">${result.stderr}</pre>`;
    }
    if (result.plotBase64) {
      inner += `<div class="mt-3 p-2 bg-white rounded-lg flex justify-center">
        <img src="data:image/png;base64,${result.plotBase64}" alt="Rendered Plot" class="max-w-full rounded shadow-sm">
      </div>`;
    }
    if (!result.stdout && !result.stderr && !result.plotBase64) {
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
    wrapper.className = `message-entry flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`;

    if (isUser) {
      // User message bubble
      const bubble = document.createElement('div');
      bubble.className = 'max-w-xl px-4 py-3 rounded-2xl bg-[var(--surface-panel)] border border-[var(--surface-border)] text-sm text-[var(--text-primary)] shadow-sm leading-relaxed';

      // Attachments preview
      if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        const attContainer = document.createElement('div');
        attContainer.className = 'flex flex-wrap gap-2 mb-2';

        msg.attachments.forEach(att => {
          if (att.type === 'image') {
            const img = document.createElement('img');
            img.src = att.data;
            img.alt = att.name;
            img.className = 'w-24 h-24 object-cover rounded-xl border border-[var(--surface-border)]';
            attContainer.appendChild(img);
          } else {
            const chip = document.createElement('div');
            chip.className = 'px-2 py-1 rounded-lg bg-[var(--surface-bg)] border border-[var(--surface-border)] text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5';
            chip.innerHTML = `<span class="font-bold text-[var(--accent-blue)]">FILE:</span> <span>${att.name}</span>`;
            attContainer.appendChild(chip);
          }
        });

        bubble.appendChild(attContainer);
      }

      const textNode = document.createElement('div');
      textNode.className = 'whitespace-pre-wrap';
      textNode.textContent = msg.content;
      bubble.appendChild(textNode);

      wrapper.appendChild(bubble);
    } else {
      // Assistant message layout
      const assistantCol = document.createElement('div');
      assistantCol.className = 'w-full max-w-full space-y-3';

      // 1. Search Sources Pill Tray (if any)
      if (Array.isArray(msg.searchSources) && msg.searchSources.length > 0) {
        const sourcesTray = document.createElement('div');
        sourcesTray.className = 'flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)] py-1';
        sourcesTray.innerHTML = `<span class="font-semibold text-[11px] flex items-center gap-1 text-[var(--accent-blue)]">
          <svg class="w-3.5 h-3.5"><use href="#icon-search"/></svg>
          Sources:
        </span>`;

        msg.searchSources.forEach((s, idx) => {
          const pill = document.createElement('a');
          pill.href = s.url;
          pill.target = '_blank';
          pill.rel = 'noopener noreferrer';
          pill.className = 'px-2.5 py-1 rounded-full border border-[var(--surface-border)] bg-[var(--surface-panel)] hover:bg-[var(--surface-panel-hover)] text-[11px] text-[var(--text-primary)] hover:border-[var(--accent-blue)] ui-transition inline-flex items-center gap-1 truncate max-w-xs';
          pill.innerHTML = `<span class="text-[var(--text-muted)]">[${idx + 1}]</span> <span class="truncate">${s.title}</span>`;
          sourcesTray.appendChild(pill);
        });

        assistantCol.appendChild(sourcesTray);
      }

      // 2. Thought Process Accordion (if any)
      if (msg.thoughtProcess && msg.thoughtProcess.trim()) {
        const accordion = this.createThoughtAccordion(msg.thoughtProcess);
        assistantCol.appendChild(accordion);
      }

      // 3. Message Body (Markdown)
      const bodyEl = document.createElement('div');
      bodyEl.className = 'prose text-sm text-[var(--text-primary)] leading-relaxed';
      bodyEl.innerHTML = MarkdownRenderer.render(msg.content);
      assistantCol.appendChild(bodyEl);

      // 4. Standalone Execution Output Card (if any saved with message)
      if (msg.executionOutput) {
        const outputWrapper = document.createElement('div');
        outputWrapper.className = 'py-execution-output my-3 p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-panel)] text-xs font-mono';
        let inner = `<div class="flex items-center justify-between pb-2 mb-2 border-b border-[var(--surface-border)] font-semibold text-[11px] text-[var(--text-muted)]">
          <span>CODE INTERPRETER OUTPUT</span>
          <span class="text-emerald-500">Executed</span>
        </div>`;
        if (msg.executionOutput.stdout) {
          inner += `<pre class="text-[var(--text-primary)] whitespace-pre-wrap mb-2">${msg.executionOutput.stdout}</pre>`;
        }
        if (msg.executionOutput.plotImageBase64) {
          inner += `<div class="mt-3 p-2 bg-white rounded-lg flex justify-center">
            <img src="data:image/png;base64,${msg.executionOutput.plotImageBase64}" alt="Plot" class="max-w-full rounded shadow-sm">
          </div>`;
        }
        outputWrapper.innerHTML = inner;
        assistantCol.appendChild(outputWrapper);
      }

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
        ${thinkingText}
      </div>
    `;

    header.addEventListener('click', () => {
      content.classList.toggle('expanded');
      const chevron = header.querySelector('.chevron-icon');
      if (chevron) {
        chevron.classList.toggle('rotate-180');
      }
    });

    // Default expanded during live thinking, collapsed when done
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

    // Sources placeholder
    const sourcesPlaceholder = document.createElement('div');
    sourcesPlaceholder.id = `streaming-sources-${id}`;
    assistantCol.appendChild(sourcesPlaceholder);

    // Body
    const bodyEl = document.createElement('div');
    bodyEl.id = `streaming-body-${id}`;
    bodyEl.className = 'prose text-sm text-[var(--text-primary)] leading-relaxed';
    bodyEl.innerHTML = '<span class="inline-block w-2 h-4 bg-[var(--accent-blue)] animate-pulse rounded-sm"></span>';
    assistantCol.appendChild(bodyEl);

    wrapper.appendChild(assistantCol);
    this.container.appendChild(wrapper);
    this.scrollToBottom();

    return {
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
        sourcesPlaceholder.innerHTML = `<div class="flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)] py-1">
          <span class="font-semibold text-[11px] flex items-center gap-1 text-[var(--accent-blue)]">
            <svg class="w-3.5 h-3.5"><use href="#icon-search"/></svg>
            Sources:
          </span>
          ${sources.map((s, idx) => `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-full border border-[var(--surface-border)] bg-[var(--surface-panel)] hover:bg-[var(--surface-panel-hover)] text-[11px] text-[var(--text-primary)] hover:border-[var(--accent-blue)] ui-transition inline-flex items-center gap-1 truncate max-w-xs">
              <span class="text-[var(--text-muted)]">[${idx + 1}]</span>
              <span class="truncate">${s.title}</span>
            </a>
          `).join('')}
        </div>`;
      },
      updateContent: (markdown) => {
        bodyEl.innerHTML = MarkdownRenderer.render(markdown);
        this.scrollToBottom();
      },
      finalize: (finalMsg) => {
        // Collapse thinking accordion once stream ends
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
