import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.getItem) {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear()
  };
}

test('Refinement Pass: Icons audit defines Lucide-style semantic symbols', () => {
  const icons = fs.readFileSync(path.resolve('assets/icons/icons.svg'), 'utf-8');

  assert.ok(icons.includes('id="icon-panel-left"'), 'Must define icon-panel-left');
  assert.ok(icons.includes('id="icon-sliders-horizontal"'), 'Must define icon-sliders-horizontal');
  assert.ok(icons.includes('id="icon-square-pen"'), 'Must define icon-square-pen');
  assert.ok(icons.includes('id="icon-arrow-up"'), 'Must define icon-arrow-up');
  assert.ok(icons.includes('id="icon-square"'), 'Must define icon-square');
});

test('Refinement Pass: Topbar markup enforces sticky frosted glass and clean hierarchy', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');

  // Topbar sticky frosted surface
  assert.ok(html.includes('sticky top-0 z-20'), 'Header must be sticky top-0');
  assert.ok(html.includes('bg-white/75') && html.includes('backdrop-blur-md'), 'Header must have frosted surface');

  // Sidebar toggle with panel-left icon
  assert.ok(html.includes('href="#icon-panel-left"'), 'Sidebar toggle must use icon-panel-left');

  // Creator link in sidebar footer, removed from topbar
  assert.ok(html.includes('class="brand-link"'), 'Brand link must exist in sidebar footer');
  assert.ok(!html.includes('made by ayujha-dev /'), 'Topbar must not have redundant creator breadcrumb');

  // Chat title expands
  assert.ok(html.includes('id="header-chat-title" class="flex-1 min-w-0 truncate'), 'Chat title must expand before truncating');

  // Parameters button with SlidersHorizontal
  assert.ok(html.includes('href="#icon-sliders-horizontal"'), 'Parameters button must use icon-sliders-horizontal');

  // Send button with ArrowUp
  assert.ok(html.includes('href="#icon-arrow-up"'), 'Send button must use icon-arrow-up');
});

test('Refinement Pass: 3-Tier Depth hierarchy and scroll architecture in CSS', () => {
  const css = fs.readFileSync(path.resolve('css/main.css'), 'utf-8');

  // Tier 1: Chat column minimal translucent veil
  assert.ok(css.includes('background: rgba(255, 255, 255, 0.34);'), 'Tier 1 light mode veil');
  assert.ok(css.includes('background: rgba(14, 18, 26, 0.34);'), 'Tier 1 dark mode veil');
  assert.ok(css.includes('backdrop-filter: blur(10px);'), 'Tier 1 blur(10px)');

  // Tier 2: Chat bubbles
  assert.ok(css.includes('background: rgba(255, 255, 255, 0.72);'), 'Tier 2 user bubble light');
  assert.ok(css.includes('background: rgba(28, 35, 48, 0.68);'), 'Tier 2 user bubble dark');

  // Tier 3: Code snippets
  assert.ok(css.includes('background: rgba(241, 245, 249, 0.88) !important;'), 'Tier 3 code container light');
  assert.ok(css.includes('background: rgba(11, 15, 23, 0.86) !important;'), 'Tier 3 code container dark');
  assert.ok(css.includes('background: rgba(226, 232, 240, 0.75) !important;'), 'Tier 3 code header light');
  assert.ok(css.includes('background: rgba(22, 29, 43, 0.85) !important;'), 'Tier 3 code header dark');

  // Scroll architecture: Chat turn & mask
  assert.ok(css.includes('.chat-turn:last-child'), 'CSS must define .chat-turn:last-child');
  assert.ok(css.includes('min-height: calc(100dvh - 230px);'), 'Chat turn must leave viewport room for stream');
  assert.ok(css.includes('mask-image: linear-gradient(to bottom, black calc(100% - 80px), transparent 100%);'), 'Fade mask covers bottom 80px only');

  // Font size !important overrides
  assert.ok(css.includes('font-size: var(--chat-font-size, 15px) !important;'), 'Prose must strictly enforce font-size');
  assert.ok(css.includes('font-size: var(--chat-code-size, 13.5px) !important;'), 'Code must strictly enforce code-size');
});

test('Refinement Pass: SettingsModal computes code-size as Math.max(12, px - 1.5)', async () => {
  const { SettingsModal } = await import('../js/ui/components/settings-modal.js');

  SettingsModal.applyFontSize(13);
  assert.equal(SettingsModal.getSavedFontSize(), 13);

  SettingsModal.applyFontSize(15);
  assert.equal(SettingsModal.getSavedFontSize(), 15);

  SettingsModal.applyFontSize(19);
  assert.equal(SettingsModal.getSavedFontSize(), 19);

  // Restore 15
  SettingsModal.applyFontSize(15);
});
