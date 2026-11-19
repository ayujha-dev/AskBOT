/**
 * MarkdownRenderer: Marked.js + Highlight.js integration with custom code block actions.
 */

export class MarkdownRenderer {
  static isConfigured = false;

  static configure() {
    if (this.isConfigured) return;

    if (typeof window !== 'undefined' && window.marked) {
      const renderer = new window.marked.Renderer();

      renderer.code = function({ text, lang }) {
        const language = (lang || '').toLowerCase().trim();
        let highlighted = text;

        if (window.hljs && language && window.hljs.getLanguage(language)) {
          try {
            highlighted = window.hljs.highlight(text, { language, ignoreIllegals: true }).value;
          } catch (e) {
            highlighted = text;
          }
        } else if (window.hljs) {
          try {
            highlighted = window.hljs.highlightAuto(text).value;
          } catch (e) {
            highlighted = text;
          }
        }

        const isPython = language === 'python' || language === 'py';
        const runButton = isPython
          ? `<button class="btn-run-code px-2 py-1 rounded text-[11px] font-medium bg-[var(--surface-border)] hover:bg-[var(--accent-blue)] hover:text-white ui-transition flex items-center gap-1" data-code="${encodeURIComponent(text)}">
               <svg class="w-3 h-3"><use href="#icon-play"/></svg>
               <span>Run</span>
             </button>`
          : '';

        return `
<div class="code-block-container my-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
  <div class="code-header flex items-center justify-between px-3.5 py-1.5 border-b border-[var(--surface-border)] bg-[var(--surface-panel)] text-[11px] font-mono text-[var(--text-muted)]">
    <span class="uppercase tracking-wider font-semibold">${language || 'text'}</span>
    <div class="flex items-center gap-2">
      ${runButton}
      <button class="copy-code-btn px-2 py-1 rounded text-[11px] font-medium hover:bg-[var(--surface-border)] hover:text-[var(--text-primary)] ui-transition flex items-center gap-1" data-copy="${encodeURIComponent(text)}">
        <svg class="w-3 h-3"><use href="#icon-copy"/></svg>
        <span>Copy</span>
      </button>
    </div>
  </div>
  <pre class="m-0 p-3.5 overflow-x-auto text-xs leading-relaxed"><code class="hljs ${language}">${highlighted}</code></pre>
</div>`;
      };

      window.marked.setOptions({
        renderer,
        gfm: true,
        breaks: true
      });

      this.isConfigured = true;
    }
  }

  static render(markdown) {
    if (!markdown) return '';
    this.configure();

    if (typeof window !== 'undefined' && window.marked) {
      return window.marked.parse(markdown);
    }

    // Node test fallback: basic regex markdown parser
    return markdown
      .replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="${lang}">${code}</code></pre><button class="copy-code-btn" data-copy="${encodeURIComponent(code)}">Copy</button>`;
      })
      .replace(/\n\n/g, '<p></p>')
      .replace(/\n/g, '<br>');
  }
}
