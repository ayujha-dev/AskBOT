import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Gemini Atmospheric Aura Engine: Exports, presets, and lifecycle safety', async () => {
  const {
    mountAurora,
    GeminiAuraEngine,
    DEFAULT_AURORA_OPTIONS,
    AURORA_LIGHT_OPTIONS,
    AURORA_DARK_OPTIONS
  } = await import('../js/aurora.js');

  assert.equal(typeof mountAurora, 'function', 'mountAurora must be a function');
  assert.equal(typeof GeminiAuraEngine, 'function', 'GeminiAuraEngine class must be exported');

  // Verify presets exist on GeminiAuraEngine
  assert.ok(GeminiAuraEngine.PRESETS, 'GeminiAuraEngine must have PRESETS dictionary');
  assert.ok(GeminiAuraEngine.PRESETS.geminiCobalt, 'Must include geminiCobalt preset');
  assert.ok(GeminiAuraEngine.PRESETS.matteSlateBlue, 'Must include matteSlateBlue preset');
  assert.ok(GeminiAuraEngine.PRESETS.nebulaIris, 'Must include nebulaIris preset');
  assert.ok(GeminiAuraEngine.PRESETS.deepHorizon, 'Must include deepHorizon preset');
  assert.ok(GeminiAuraEngine.PRESETS.lightPastel, 'Must include lightPastel preset');

  // Safe SSR / headless mock test
  const fakeContainer = {
    querySelector: () => null,
    appendChild: () => {}
  };
  const instance = mountAurora(fakeContainer);
  assert.ok(instance, 'mountAurora must return an instance object');
  assert.equal(typeof instance.update, 'function');
  assert.equal(typeof instance.destroy, 'function');
  assert.equal(typeof instance.triggerRipple, 'function');
  assert.equal(typeof instance.setFocusBoost, 'function');
  assert.equal(typeof instance.nudgeTypingPulse, 'function');

  // Safe invocation without DOM
  instance.update({ lightMode: true });
  instance.triggerRipple(0.5, 0.5, 1.0);
  instance.setFocusBoost(true, 0.45);
  instance.nudgeTypingPulse(0.2);
  instance.destroy();
});

test('Nested Two-Layer Composer: Markup structure in index.html', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

  // Outer shell
  assert.ok(html.includes('id="chat-composer"'), 'Outer composer container must have id="chat-composer"');
  assert.ok(html.includes('composer-shell'), 'Composer must have composer-shell class');
  assert.ok(html.includes('composer-box'), 'Composer must maintain composer-box for backwards compatibility');

  // Top context strip
  assert.ok(html.includes('composer-context-strip'), 'Top context strip must exist');
  assert.ok(html.includes('id="toggle-web-search"'), 'Context strip must contain web search toggle');
  assert.ok(html.includes('id="toggle-code-interpreter"'), 'Context strip must contain code interpreter toggle');
  assert.ok(html.includes('href="#icon-globe"'), 'Web search toggle must use icon-globe');
  assert.ok(html.includes('href="#icon-terminal"'), 'Code interpreter toggle must use icon-terminal');
  assert.ok(html.includes('id="token-budget-indicator"'), 'Context strip must contain token budget indicator');

  // Inner elevated card
  assert.ok(html.includes('composer-card'), 'Inner elevated card must exist');
  assert.ok(html.includes('id="composer-textarea"'), 'Inner card must contain composer-textarea');
  assert.ok(html.includes('id="file-input"'), 'Inner card must contain hidden file-input');

  // Inner action row
  assert.ok(html.includes('id="btn-attach-file"'), 'Action row must contain btn-attach-file');
  assert.ok(html.includes('href="#icon-plus"'), 'Attach button must use icon-plus');
  assert.ok(html.includes('id="composer-model-pill"'), 'Action row must contain composer-model-pill');
  assert.ok(html.includes('id="composer-model-name"'), 'Action row must contain composer-model-name');
  assert.ok(html.includes('id="btn-thinking-menu"'), 'Action row must contain btn-thinking-menu');
  assert.ok(html.includes('id="thinking-level-label"'), 'Thinking pill must contain thinking-level-label');
  assert.ok(html.includes('id="thinking-dropdown"'), 'Thinking dropdown must exist');
  assert.ok(html.includes('id="btn-voice-input"'), 'Action row must contain btn-voice-input');
  assert.ok(html.includes('href="#icon-mic"'), 'Voice input button must use icon-mic');
  assert.ok(html.includes('id="btn-send-message"'), 'Action row must contain btn-send-message');
  assert.ok(html.includes('btn-primary-circle'), 'Send button must have btn-primary-circle class');
  assert.ok(html.includes('w-[34px] h-[34px]'), 'Send button must be 34px circle');
});

test('Nested Two-Layer Composer: CSS specifications in css/main.css', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf-8');

  // Outer shell styles
  assert.ok(css.includes('.composer-shell'), 'CSS must define .composer-shell');
  assert.ok(css.includes('border-radius: 24px;'), 'Outer shell must have 24px border radius');
  assert.ok(css.includes('padding: 6px;'), 'Outer shell must have 6px padding');

  // Inner card styles
  assert.ok(css.includes('.composer-card'), 'CSS must define .composer-card');
  assert.ok(css.includes('border-radius: 18px;'), 'Inner card must have 18px border radius');
  assert.ok(css.includes('.composer-card:focus-within'), 'Inner card must have focus-within ring');

  // Ghost toggles
  assert.ok(css.includes('.composer-ghost-toggle'), 'CSS must define .composer-ghost-toggle');
  assert.ok(css.includes('#toggle-web-search.mode-active'), 'CSS must define active state for web search');
  assert.ok(css.includes('#toggle-code-interpreter.mode-active'), 'CSS must define active state for code interpreter');

  // Ghost buttons and icon buttons
  assert.ok(css.includes('.btn-composer-ghost'), 'CSS must define .btn-composer-ghost');
  assert.ok(css.includes('.btn-composer-icon'), 'CSS must define .btn-composer-icon');

  // Primary circular button
  assert.ok(css.includes('.btn-primary-circle'), 'CSS must define .btn-primary-circle');
  assert.ok(css.includes('width: 34px;'), 'Primary circle must be 34px wide');
  assert.ok(css.includes('height: 34px;'), 'Primary circle must be 34px tall');
  assert.ok(css.includes('.btn-primary-circle.is-stopping'), 'Primary circle must define is-stopping state');

  // Voice recording pulse animation
  assert.ok(css.includes('#btn-voice-input.is-recording'), 'CSS must define recording state for voice button');
  assert.ok(css.includes('@keyframes voicePulse'), 'CSS must define voicePulse keyframe animation');
});

test('ComposerComponent: Voice dictation wiring and send button morphing', async () => {
  // Mock minimal DOM
  globalThis.document = {
    getElementById: (id) => {
      const mockEl = {
        id,
        value: '',
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          toggle(c) { this.classes.has(c) ? this.classes.delete(c) : this.classes.add(c); },
          contains(c) { return this.classes.has(c); }
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        closest: () => null,
        appendChild: () => {},
        parentElement: { style: {} },
        focus: () => {}
      };
      return mockEl;
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const { ComposerComponent } = await import('../js/ui/components/composer.js');
  const comp = new ComposerComponent();

  assert.ok(comp, 'ComposerComponent must instantiate cleanly');
  assert.equal(typeof comp.toggleVoiceInput, 'function', 'Must implement toggleVoiceInput');
  assert.equal(typeof comp.stopVoiceInput, 'function', 'Must implement stopVoiceInput');

  // Test setStreaming state transitions
  comp.setStreaming(true);
  assert.equal(comp.isStreaming, true);
  assert.ok(comp.btnSend.innerHTML.includes('icon-square'), 'Send button must morph to stop icon when streaming');
  assert.ok(comp.btnSend.classList.contains('is-stopping'), 'Send button must have is-stopping class when streaming');

  comp.setStreaming(false);
  assert.equal(comp.isStreaming, false);
  assert.ok(comp.btnSend.innerHTML.includes('icon-arrow-up'), 'Send button must restore arrow-up icon when stopped');
  assert.ok(!comp.btnSend.classList.contains('is-stopping'), 'Send button must remove is-stopping class when stopped');
});
