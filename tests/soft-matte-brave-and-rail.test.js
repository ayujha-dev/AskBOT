import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Soft Matte Palette: CSS variables enforce muted tactile matte design system', () => {
  const css = fs.readFileSync(path.resolve('css/main.css'), 'utf-8');

  // Matte Dark (Default)
  assert.ok(css.includes('--surface-bg: #0F141D') || css.includes('--surface-bg: #16171A'), 'Dark bg must be soft matte #0F141D (no pure black)');
  assert.ok(css.includes('--surface-panel: #151C28') || css.includes('--surface-panel: #1D1F23'), 'Dark elevated panel must be #151C28');
  assert.ok(css.includes('--composer-bg: rgba(28, 37, 53, 0.84)') || css.includes('--surface-card: #23262B'), 'Dark composer must be frosted matte blue');
  assert.ok(css.includes('--surface-border: rgba(255, 255, 255, 0.07)'), 'Dark border must be 7% white hairline');
  assert.ok(css.includes('--text-primary: #E4E5E7'), 'Dark primary text must be soft #E4E5E7 (no glaring pure white)');
  assert.ok(css.includes('--text-muted: #969BA4'), 'Dark muted text must be #969BA4');
  assert.ok(css.includes('--accent-blue: #7C98B6'), 'Dark accent must be dusty slate-blue #7C98B6');
  assert.ok(css.includes('--accent-blue-hover: #8FA9C5'), 'Dark accent hover must be #8FA9C5');

  // Matte Light
  assert.ok(css.includes('--surface-bg: #EDF2F8') || css.includes('--surface-bg: #F4F3EF'), 'Light bg must be tactile #EDF2F8');
  assert.ok(css.includes('--surface-panel: #E2EAF4') || css.includes('--surface-panel: #ECEAE4'), 'Light panel must be #E2EAF4');
  assert.ok(css.includes('--composer-bg: rgba(247, 250, 253, 0.88)') || css.includes('--surface-card: #FAF9F6'), 'Light composer must be frosted light');
  assert.ok(css.includes('--surface-border: rgba(0, 0, 0, 0.08)'), 'Light border must be 8% black hairline');
  assert.ok(css.includes('--text-primary: #222428'), 'Light primary text must be #222428');
  assert.ok(css.includes('--text-muted: #666A73'), 'Light muted text must be #666A73');
  assert.ok(css.includes('--accent-blue: #4A6680'), 'Light accent must be #4A6680');

  // 760px container width
  assert.ok(css.includes('max-width: 760px'), 'Chat fog panel must be constrained to 760px max width');

  // New component classes
  assert.ok(css.includes('.matte-source-chip'), 'CSS must define .matte-source-chip');
  assert.ok(css.includes('.message-actions'), 'CSS must define .message-actions');
  assert.ok(css.includes('.nav-rail-tick'), 'CSS must define .nav-rail-tick');
  assert.ok(css.includes('.context-meter-track'), 'CSS must define .context-meter-track');

  // Gemini-style ambient aurora & reactive halo
  assert.ok(css.includes('#gemini-aurora'), 'CSS must define #gemini-aurora');
  assert.ok(css.includes('filter: blur(80px)'), 'Aurora must have 80px blur');
  assert.ok(css.includes('.composer-box.is-streaming'), 'Composer must define reactive streaming halo');
});

test('Brave Search API: Service extracts sources, formats <web_search_results>, and detects connection status', async () => {
  const { SearchService } = await import('../js/services/search-service.js');

  // Connection status with Brave key
  const statusBrave = SearchService.getConnectionStatus({ brave: 'BSA_test_key_123' });
  assert.equal(statusBrave.type, 'brave');
  assert.ok(statusBrave.label.includes('Brave Search API'));
  assert.equal(statusBrave.isFree, false);

  // Fallback to free
  const statusFree = SearchService.getConnectionStatus({});
  assert.equal(statusFree.type, 'free');
  assert.equal(statusFree.isFree, true);

  // Structured <web_search_results> formatting
  const mockSources = [
    {
      title: 'Global Climate Summit 2026',
      url: 'https://news.un.org/climate-2026',
      domain: 'news.un.org',
      snippet: 'Delegates agreed on new energy standards.',
      age: '3 hours ago'
    },
    {
      title: 'Renewable Power Breakthrough',
      url: 'https://nature.com/articles/renewable-2026',
      domain: 'nature.com',
      snippet: 'Efficiency increased by 35% in recent field tests.',
      age: '1 day ago'
    }
  ];

  const formatted = SearchService.formatSearchContext(mockSources);
  assert.ok(formatted.startsWith('<web_search_results>'), 'Must enclose results in <web_search_results>');
  assert.ok(formatted.includes('</web_search_results>'), 'Must terminate with </web_search_results>');
  assert.ok(formatted.includes('[1] Global Climate Summit 2026'));
  assert.ok(formatted.includes('Domain: news.un.org'));
  assert.ok(formatted.includes('Date/Age: 3 hours ago'));
  assert.ok(formatted.includes('Instructions: Answer the user prompt accurately based on the <web_search_results> above.'));
});

test('Brave Local Proxy: proxy.mjs exists and defines static and Brave forwarding routes', () => {
  const proxyPath = path.resolve('proxy.mjs');
  assert.ok(fs.existsSync(proxyPath), 'proxy.mjs must exist in project root');

  const proxyCode = fs.readFileSync(proxyPath, 'utf-8');
  assert.ok(proxyCode.includes('/brave-search'), 'proxy.mjs must handle /brave-search route');
  assert.ok(proxyCode.includes('api.search.brave.com'), 'proxy.mjs must target api.search.brave.com');
  assert.ok(proxyCode.includes('X-Subscription-Token'), 'proxy.mjs must pass X-Subscription-Token');
  assert.ok(proxyCode.includes('Access-Control-Allow-Origin'), 'proxy.mjs must set CORS headers');
});

test('Clean Top Bar & In-Composer Model Selector: Header is minimalist, composer model pill is present', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');

  // Top Bar is clean without model switcher
  assert.ok(!html.includes('id="header-model-badge"'), 'Header must not contain model selector');
  assert.ok(html.includes('class="brand-link"'), 'Header must retain made by ayujha-dev brand link');
  assert.ok(html.includes('id="header-chat-title"'), 'Header must retain chat title breadcrumb');

  // In-composer model switcher is preserved and styled
  assert.ok(html.includes('id="composer-model-pill"'), 'Composer model pill must exist inside composer toolbar');
  assert.ok(html.includes('id="composer-model-name"'), 'Composer model name label must exist');

  // Settings Web Grounding tab contains Brave Search inputs
  assert.ok(html.includes('id="key-input-brave"'), 'Settings must contain Brave API key input');
  assert.ok(html.includes('id="proxy-input-brave"'), 'Settings must contain Brave local proxy URL input');
  assert.ok(html.includes('api-dashboard.search.brave.com'), 'Settings must link to Brave developer dashboard');
});

test('Thinking Mode Minimum Set to Low: default is low and Off state is removed', async () => {
  const { defaultState } = await import('../js/state/default-state.js');
  assert.equal(defaultState.modes.thinkingLevel, 'low', 'Default thinking level must be low');

  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert.ok(!html.includes('data-level="off"'), 'Thinking dropdown must NOT have an off option');
  assert.ok(html.includes('data-level="low"'), 'Thinking dropdown must include low option');
  assert.ok(html.includes('data-level="medium"'), 'Thinking dropdown must include medium option');
  assert.ok(html.includes('data-level="high"'), 'Thinking dropdown must include high option');
});

test('Tracking Rail: Minimalist rail contains minimap ticks, context meter, and mode dots', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');

  assert.ok(html.includes('id="chat-nav-rail"'), 'Chat nav rail element must exist');
  assert.ok(html.includes('id="rail-turns-track"'), 'Rail turns track must exist');
  assert.ok(html.includes('id="rail-context-meter"'), 'Context window meter track must exist');
  assert.ok(html.includes('id="rail-context-meter-fill"'), 'Context window meter fill element must exist');
  assert.ok(html.includes('id="rail-modes-indicator"'), 'Rail modes micro-indicators must exist');
  assert.ok(html.includes('id="rail-indicator-search"'), 'Search mode micro-indicator must exist');
  assert.ok(html.includes('id="rail-indicator-code"'), 'Code interpreter micro-indicator must exist');
  assert.ok(html.includes('id="rail-indicator-think"'), 'Thinking mode micro-indicator must exist');
});
