/**
 * Pyodide Web Worker: Executes Python code in WebAssembly off the main UI thread.
 */

let pyodide = null;
let isInitializing = false;
let initPromise = null;

async function initPyodide() {
  if (pyodide) return pyodide;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Load Pyodide from official CDN
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
    });

    // Setup stdout / stderr capturing and matplotlib interception
    await pyodide.runPythonAsync(`
import sys
import io
import base64

class OutputCapture:
    def __init__(self):
        self.stdout_buf = io.StringIO()
        self.stderr_buf = io.StringIO()
        self.old_stdout = sys.stdout
        self.old_stderr = sys.stderr

    def start(self):
        self.stdout_buf = io.StringIO()
        self.stderr_buf = io.StringIO()
        sys.stdout = self.stdout_buf
        sys.stderr = self.stderr_buf

    def stop(self):
        sys.stdout = self.old_stdout
        sys.stderr = self.old_stderr
        return self.stdout_buf.getvalue(), self.stderr_buf.getvalue()

_capture = OutputCapture()

# Intercept matplotlib pyplot if imported
def _get_matplotlib_plot():
    if 'matplotlib.pyplot' in sys.modules:
        plt = sys.modules['matplotlib.pyplot']
        if len(plt.get_fignums()) > 0:
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            plt.close('all')
            buf.seek(0)
            return base64.b64encode(buf.read()).decode('utf-8')
    return None
`);
    return pyodide;
  })();

  return initPromise;
}

self.onmessage = async (e) => {
  const { id, type, code } = e.data;

  if (type === 'init') {
    try {
      await initPyodide();
      self.postMessage({ id, success: true });
    } catch (err) {
      self.postMessage({ id, success: false, error: err.message });
    }
    return;
  }

  if (type === 'run') {
    try {
      const py = await initPyodide();

      // Check if code imports packages that need loading (e.g. numpy, matplotlib, pandas)
      await py.loadPackagesFromImports(code);

      // Start output capture
      py.runPython(`_capture.start()`);

      let evalResult = null;
      let execError = null;

      try {
        evalResult = await py.runPythonAsync(code);
      } catch (err) {
        execError = err;
      }

      // Stop capture and retrieve buffers
      const [stdout, stderr] = py.runPython(`_capture.stop()`).toJs();
      const plotBase64 = py.runPython(`_get_matplotlib_plot()`);

      if (execError) {
        self.postMessage({
          id,
          success: false,
          error: execError.message,
          stdout,
          stderr: (stderr ? stderr + '\n' : '') + execError.message,
          plotBase64
        });
      } else {
        self.postMessage({
          id,
          success: true,
          stdout,
          stderr,
          result: evalResult !== undefined ? String(evalResult) : null,
          plotBase64
        });
      }
    } catch (err) {
      self.postMessage({
        id,
        success: false,
        error: err.message,
        stdout: '',
        stderr: err.message
      });
    }
  }
};
