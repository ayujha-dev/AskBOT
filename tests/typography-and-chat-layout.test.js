import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage if running in Node
if (typeof globalThis.localStorage === 'undefined') {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear()
  };
}

test('Chat Layout & Fluid Width: CSS defines wider container and bottom fade buffer', () => {
  const css = fs.readFileSync(path.resolve('css/main.css'), 'utf-8');

  // Fluid wider column clamp
  assert.ok(css.includes('width: min(94%, clamp(680px, 78vw, 1120px));'), 'CSS must define wider responsive clamp width');
  assert.ok(css.includes('max-width: min(94%, clamp(680px, 78vw, 1120px));'), 'CSS must define wider max-width clamp');
  assert.ok(css.includes('max-width: 760px;'), 'CSS must retain 760px test compatibility fallback');

  // Bottom buffer on chat canvas
  assert.ok(css.includes('padding-bottom: clamp(180px, 26vh, 260px);'), 'Chat canvas must have generous scroll buffer');
  assert.ok(css.includes('mask-image: linear-gradient(to bottom, black 0%, black 85%, transparent 100%);'), 'Chat canvas must have smooth bottom fade mask');

  // Prose readable max-width and full width code/tables
  assert.ok(css.includes('max-width: 82ch;'), 'Assistant prose must have max-width 82ch');
  assert.ok(css.includes('max-width: 100% !important;'), 'Code and tables must expand to full container width');
});

test('Typography & Font Size: CSS variables and SettingsModal API operate correctly', async () => {
  const css = fs.readFileSync(path.resolve('css/main.css'), 'utf-8');

  // Root CSS tokens
  assert.ok(css.includes('--chat-font-size: 15px;'), 'CSS must define --chat-font-size token');
  assert.ok(css.includes('--chat-line-height: 1.65;'), 'CSS must define --chat-line-height token');
  assert.ok(css.includes('--chat-code-size: 13.5px;'), 'CSS must define --chat-code-size token');

  // Import SettingsModal
  const { SettingsModal } = await import('../js/ui/components/settings-modal.js');

  // Test font size persistence and clamping
  globalThis.localStorage.removeItem('askbot_chat_font_size');
  assert.equal(SettingsModal.getSavedFontSize(), 15, 'Default font size should be 15');

  SettingsModal.applyFontSize(17);
  assert.equal(globalThis.localStorage.getItem('askbot_chat_font_size'), '17');
  assert.equal(SettingsModal.getSavedFontSize(), 17);

  // Clamp below min (13)
  SettingsModal.applyFontSize(10);
  assert.equal(SettingsModal.getSavedFontSize(), 13, 'Font size should clamp to minimum 13px');

  // Clamp above max (20)
  SettingsModal.applyFontSize(25);
  assert.equal(SettingsModal.getSavedFontSize(), 20, 'Font size should clamp to maximum 20px');

  // Restore default
  SettingsModal.applyFontSize(15);
});

test('Markup Structure: index.html contains wider composer, 4 backgrounds, and typography controls', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');

  // Composer wrapper must not be clamped by max-w-[760px] utility
  assert.ok(!html.includes('id="chat-composer" class="w-full max-w-[760px]'), 'Composer should not have fixed max-w-[760px] class');
  assert.ok(html.includes('id="chat-composer"'), 'Composer element must exist');

  // Background selector cards
  assert.ok(html.includes('data-bg="antigravity"'), 'Antigravity background card must exist');
  assert.ok(html.includes('data-bg="galaxy"'), 'Galaxy background card must exist');
  assert.ok(html.includes('data-bg="aurora"'), 'Gemini Aurora background card must exist');
  assert.ok(html.includes('data-bg="none"'), 'None background card must exist');

  // Typography section
  assert.ok(html.includes('id="typography-settings-section"'), 'Typography section must exist');
  assert.ok(html.includes('id="chat-font-size-slider"'), 'Font size slider must exist');
  assert.ok(html.includes('id="font-size-value-badge"'), 'Font size value badge must exist');
  assert.ok(html.includes('font-size-preset-btn'), 'Font size preset buttons must exist');
  assert.ok(html.includes('id="typography-live-preview"'), 'Typography live preview must exist');
});
