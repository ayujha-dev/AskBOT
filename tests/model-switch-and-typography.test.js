import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('UI Enhancement: HTML contains fast model switchers and header overhauls', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');

  // Composer fast model switcher
  assert.ok(html.includes('id="composer-model-pill"'), 'Composer model pill button must exist');
  assert.ok(html.includes('id="composer-model-name"'), 'Composer model name display must exist');

  // Sidebar chat search and count
  assert.ok(html.includes('id="sidebar-chat-search"'), 'Sidebar chat search input must exist');
  assert.ok(html.includes('id="sidebar-chat-count"'), 'Sidebar chat counter badge must exist');
  assert.ok(html.includes('id="sidebar-provider-card"'), 'Sidebar provider card must exist');

  // Header breadcrumb and token indicator
  assert.ok(html.includes('id="header-chat-title"'), 'Header conversation title breadcrumb must exist');
  assert.ok(html.includes('id="header-token-indicator"'), 'Header token indicator must exist');
  assert.ok(html.includes('id="header-btn-new-chat"'), 'Header quick new chat button must exist');

  // Greeting typography
  assert.ok(html.includes('class="greeting-editorial'), 'Greeting heading must use greeting-editorial class');
});

test('UI Enhancement: CSS defines editorial typography, typing cursor, and spring transitions', () => {
  const css = fs.readFileSync(path.resolve('css/main.css'), 'utf-8');

  assert.ok(css.includes('Newsreader'), 'CSS must import Newsreader serif typography');
  assert.ok(css.includes('.greeting-editorial'), 'CSS must define .greeting-editorial style');
  assert.ok(css.includes('.greeting-cursor'), 'CSS must define .greeting-cursor');
  assert.ok(css.includes('@keyframes blinkCursor'), 'CSS must define cursor blink animation');
  assert.ok(css.includes('.suggestion-card-enter'), 'CSS must define staggered suggestion entrance');
  assert.ok(css.includes('@keyframes cardStaggerUp'), 'CSS must define card entrance animation');
  assert.ok(css.includes('.chat-history-item'), 'CSS must define chat history item micro-animations');
  assert.ok(css.includes('.ui-spring'), 'CSS must define fluid spring micro-interactions');
});

test('UI Enhancement: ComposerComponent and SidebarComponent wire model switcher callbacks', async () => {
  const { ComposerComponent } = await import('../js/ui/components/composer.js');
  const { SidebarComponent } = await import('../js/ui/components/sidebar.js');
  const { SuggestionsComponent } = await import('../js/ui/components/suggestions.js');

  assert.ok(ComposerComponent.prototype.syncModelDisplay, 'ComposerComponent must have syncModelDisplay');
  assert.ok(SidebarComponent.prototype.renderHistory, 'SidebarComponent must have renderHistory');
  assert.ok(SuggestionsComponent.prototype.render, 'SuggestionsComponent must have render');
});
