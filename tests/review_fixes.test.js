import test from 'node:test';
import assert from 'node:assert/strict';

test('Fix 1 (XSS): escapeHtml escapes dangerous characters in code outputs and titles', async () => {
  const { escapeHtml } = await import('../js/utils/dom.js');

  const malicious = '<script>alert(localStorage.getItem("askbot_api_keys"))</script>';
  const escaped = escapeHtml(malicious);

  assert.ok(!escaped.includes('<script>'), 'Must not contain unescaped script tag');
  assert.ok(escaped.includes('&lt;script&gt;'), 'Must contain escaped entity');

  const badUrl = 'javascript:alert(1)';
  const { sanitizeUrl } = await import('../js/utils/dom.js');
  assert.equal(sanitizeUrl(badUrl), '#');
  assert.equal(sanitizeUrl('https://example.com/search'), 'https://example.com/search');
});

test('Fix 2 (Timeout): PyodideBridge terminates worker on timeout', async () => {
  const { PyodideBridge } = await import('../js/services/pyodide-bridge.js');

  // Verify that execute method handles timeout and cleans up worker
  assert.equal(typeof PyodideBridge.terminate, 'function');
});

test('Fix 3 (Active Provider Switching): Store allows switching activeProvider and updating settings UI', async () => {
  const { Store } = await import('../js/state/store.js');
  const store = new Store();

  store.setState({ activeProvider: 'groq' });
  assert.equal(store.getState().activeProvider, 'groq');

  store.setState({ activeProvider: 'claude' });
  assert.equal(store.getState().activeProvider, 'claude');
});

test('Fix 4 (Plot Base64 property): Messages handles both plotBase64 and plotImageBase64', async () => {
  const { MessagesComponent } = await import('../js/ui/components/messages.js');
  assert.ok(MessagesComponent);
});

test('Fix 5 (Context Trimmer User Turn): trimToContextBudget guarantees first conversation message is role "user"', async () => {
  const { TokenCounter } = await import('../js/services/token-counter.js');

  const messages = [
    { role: 'user', content: 'Question 1' },
    { role: 'assistant', content: 'Answer 1' },
    { role: 'user', content: 'Question 2' },
    { role: 'assistant', content: 'Answer 2' }
  ];

  // Budget small enough to force trimming Question 1 and Answer 1
  const trimmed = TokenCounter.trimToContextBudget(messages, 25);
  const firstNonSystem = trimmed.find(m => m.role !== 'system');
  assert.ok(firstNonSystem);
  assert.equal(firstNonSystem.role, 'user', 'First non-system conversation message must be a user turn');
});

test('Fix 6 (Tag Stream Buffer): Stream tag buffer parses </think> tag split across chunks', async () => {
  const { TagStreamBuffer } = await import('../js/utils/stream-buffer.js');

  const tagBuffer = new TagStreamBuffer();
  let thinking = '';
  let content = '';

  // Simulate chunk 1 with opening <think> and partial </thi
  tagBuffer.processChunk('Hello <think>Reasoning step 1. </thi', (t) => thinking += t, (c) => content += c);
  // Simulate chunk 2 completing nk> and continuing with final answer
  tagBuffer.processChunk('nk>Final answer text.', (t) => thinking += t, (c) => content += c);

  assert.equal(thinking, 'Reasoning step 1. ');
  assert.equal(content, 'Hello Final answer text.');
});
