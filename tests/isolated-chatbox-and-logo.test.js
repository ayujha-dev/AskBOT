import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Logo Light Mode: Dual-theme logo assets exist and index.html wires responsive classes', () => {
  const lightLogoPath = path.join(ROOT, 'assets', 'logo-light.png');
  const darkLogoPath = path.join(ROOT, 'assets', 'logo-dark.png');
  assert.ok(fs.existsSync(lightLogoPath), 'assets/logo-light.png must exist');
  assert.ok(fs.existsSync(darkLogoPath), 'assets/logo-dark.png must exist');

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('assets/logo-light.png'), 'index.html must reference assets/logo-light.png');
  assert.ok(html.includes('assets/logo-dark.png'), 'index.html must reference assets/logo-dark.png');

  // Verify responsive dark/light switching
  assert.ok(html.includes('block dark:hidden'), 'Light mode logo must have block dark:hidden');
  assert.ok(html.includes('hidden dark:block'), 'Dark mode logo must have hidden dark:block');
});

test('Chatbox Isolation & Enhanced Foggy Glass: CSS defines per-output card and transparent runway', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf-8');

  // Chat runway is transparent to avoid double-boxing
  assert.ok(css.includes('background: transparent !important;'), 'chat-fog-panel must be transparent');
  assert.ok(css.includes('border: none !important;'), 'chat-fog-panel must have no outer border');

  // Per-output message card
  assert.ok(css.includes('.message-assistant-card'), 'CSS must define .message-assistant-card');
  assert.ok(css.includes('padding: 1.25rem 1.75rem;'), 'Assistant card must have generous breathing padding');
  assert.ok(css.includes('backdrop-filter: blur(24px) saturate(135%);'), 'Assistant card must have enhanced foggy blur');

  // User bubble enhanced blur
  assert.ok(css.includes('padding: 0.875rem 1.25rem !important;'), 'User bubble must have cushioned padding');
});

test('Output Pill & Status Badges: CSS enforces fixed pill geometry', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf-8');

  // Fixed output pill
  assert.ok(css.includes('.output-pill'), 'CSS must define .output-pill');
  assert.ok(css.includes('white-space: nowrap;'), 'Output pill must prevent line wrapping');

  // Matte source chips as true fixed pills
  assert.ok(css.includes('.matte-source-chip'), 'CSS must define .matte-source-chip');
  assert.ok(css.includes('border-radius: 9999px;'), 'Source chip must use 9999px rounded pill');

  // Searching status pill
  assert.ok(css.includes('.searching-pill'), 'CSS must define .searching-pill');
  assert.ok(css.includes('border-radius: 9999px !important;'), 'Searching pill must use 9999px rounded pill');
});

test('Code Wrapping: CSS enforces pre-wrap and break-words for long code lines', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf-8');

  assert.ok(css.includes('white-space: pre-wrap !important;'), 'Code must wrap long lines');
  assert.ok(css.includes('word-break: break-word !important;'), 'Code must break long words');
  assert.ok(css.includes('overflow-wrap: anywhere !important;'), 'Code must wrap anywhere without horizontal overflow');
});
