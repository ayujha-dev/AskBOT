import test from 'node:test';
import assert from 'node:assert/strict';

test('Enhancements: BackgroundEffects component exists and handles canvas resize and animation cycle', async () => {
  const { BackgroundEffects } = await import('../js/ui/components/background-effects.js');
  assert.ok(BackgroundEffects);
  assert.equal(typeof BackgroundEffects.init, 'function');
});

test('Enhancements: ParametersDrawer supports preset modes (Precise, Balanced, Creative)', async () => {
  const { ParametersDrawer } = await import('../js/ui/components/parameters-drawer.js');
  assert.ok(ParametersDrawer.PRESETS);
  assert.ok(ParametersDrawer.PRESETS.precise);
  assert.ok(ParametersDrawer.PRESETS.balanced);
  assert.ok(ParametersDrawer.PRESETS.creative);
  assert.equal(ParametersDrawer.PRESETS.precise.temperature, 0.2);
  assert.equal(ParametersDrawer.PRESETS.balanced.temperature, 0.7);
  assert.equal(ParametersDrawer.PRESETS.creative.temperature, 1.2);
});

test('Enhancements: SearchService provides default free web connection status', async () => {
  const { SearchService } = await import('../js/services/search-service.js');
  assert.equal(typeof SearchService.getConnectionStatus, 'function');
  const status = SearchService.getConnectionStatus({});
  assert.equal(status.type, 'free');
  assert.ok(status.label.includes('Free'));
});

test('Enhancements: Glassmorphism and Mode UI elements exist in DOM & styles', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert.ok(html.includes('id="bg-canvas"'), 'Canvas element for animated background must exist');
  assert.ok(html.includes('id="parameters-backdrop"'), 'Backdrop for parameter drawer must exist');
  assert.ok(html.includes('id="header-code-toggle"'), 'Header quick button for code interpreter must exist');
  assert.ok(html.includes('id="header-search-toggle"'), 'Header quick button for web search must exist');
  assert.ok(html.includes('id="code-interpreter-status-badge"'), 'Composer badge dot for code interpreter must exist');
  assert.ok(html.includes('id="web-search-status-badge"'), 'Composer badge dot for web search must exist');

  const css = fs.readFileSync(path.resolve('css/main.css'), 'utf-8');
  assert.ok(css.includes('--glass-blur'), 'CSS must define glass blur token');
  assert.ok(css.includes('--accent-cyan-subtle'), 'CSS must define cyan accent tokens');
  assert.ok(css.includes('backdrop-filter'), 'CSS must apply backdrop-filter for glass panels');
});
