/**
 * PyodideBridge: PostMessage RPC interface communicating with pyodide.worker.js.
 */

export class PyodideBridge {
  static worker = null;
  static pendingRequests = new Map();
  static isReady = false;

  static initWorker() {
    if (this.worker) return this.worker;

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }

    try {
      this.worker = new Worker(new URL('../workers/pyodide.worker.js', import.meta.url));

      this.worker.onmessage = (e) => {
        const { id, ...response } = e.data;
        if (id && this.pendingRequests.has(id)) {
          const { resolve, timer } = this.pendingRequests.get(id);
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          resolve(response);
        }
      };

      this.worker.onerror = (err) => {
        console.error('Pyodide Worker error:', err);
      };
    } catch (e) {
      console.warn('Failed to initialize Pyodide worker:', e);
    }

    return this.worker;
  }

  /**
   * Extract executable Python code from markdown text.
   * @param {string} markdown
   * @returns {string|null}
   */
  static extractPythonCode(markdown) {
    if (!markdown || typeof markdown !== 'string') return null;
    const match = markdown.match(/```(?:python|py)\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }

  /**
   * Execute Python code in the WebAssembly worker.
   * @param {string} code
   * @param {number} timeoutMs
   * @returns {Promise<{ success: boolean, stdout: string, stderr: string, result?: string, plotBase64?: string }>}
   */
  static async execute(code, timeoutMs = 60000) {
    const worker = this.initWorker();
    if (!worker) {
      return {
        success: false,
        stdout: '',
        stderr: 'Web Workers / Pyodide are not available in this environment.'
      };
    }

    const id = 'py_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({
            success: false,
            stdout: '',
            stderr: 'Execution timed out after ' + (timeoutMs / 1000) + 's.'
          });
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, timer });
      worker.postMessage({ id, type: 'run', code });
    });
  }
}
