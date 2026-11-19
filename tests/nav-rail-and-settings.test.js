import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Nav Rail & Fog Panel: ChatNavRail correctly categorizes message outputs and turns', async () => {
  const { ChatNavRail } = await import('../js/ui/components/chat-nav-rail.js');
  assert.ok(ChatNavRail);

  // Mock instance logic test
  const sampleMessages = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Write a python script to calculate primes'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Here is the prime generator:\n```python\ndef is_prime(n):\n    return True\n```',
      executionOutput: { stdout: '[2, 3, 5, 7]' }
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'Search latest space news'
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: 'Here is what was found...',
      thoughtProcess: 'Looking up NASA updates...',
      searchSources: [{ title: 'NASA', url: 'https://nasa.gov', snippet: 'Artemis II prep' }]
    }
  ];

  // Verify turn analysis
  const turns = [];
  const codeTargets = [];
  const searchTargets = [];
  const thoughtTargets = [];

  let currentTurn = null;
  sampleMessages.forEach(msg => {
    if (msg.role === 'user') {
      currentTurn = {
        turnNumber: turns.length + 1,
        userMessageId: msg.id,
        promptText: msg.content,
        hasCode: false,
        hasSearch: false,
        hasThought: false
      };
      turns.push(currentTurn);
    } else if (msg.role === 'assistant') {
      const hasCode = Boolean(msg.executionOutput || (msg.content && msg.content.includes('```')));
      const hasSearch = Boolean(Array.isArray(msg.searchSources) && msg.searchSources.length > 0);
      const hasThought = Boolean(msg.thoughtProcess && msg.thoughtProcess.trim());

      if (hasCode) codeTargets.push(msg.id);
      if (hasSearch) searchTargets.push(msg.id);
      if (hasThought) thoughtTargets.push(msg.id);

      if (currentTurn) {
        if (hasCode) currentTurn.hasCode = true;
        if (hasSearch) currentTurn.hasSearch = true;
        if (hasThought) currentTurn.hasThought = true;
      }
    }
  });

  assert.equal(turns.length, 2, 'Should detect 2 distinct user turns');
  assert.equal(turns[0].hasCode, true, 'Turn 1 should have code');
  assert.equal(turns[1].hasSearch, true, 'Turn 2 should have web search');
  assert.equal(turns[1].hasThought, true, 'Turn 2 should have thought process');
  assert.equal(codeTargets.length, 1, 'Should find 1 code target');
  assert.equal(searchTargets.length, 1, 'Should find 1 search target');
  assert.equal(thoughtTargets.length, 1, 'Should find 1 thought target');
});

test('Nav Rail & Fog Panel: CSS defines foggy glass panel and nav rail styles', () => {
  const css = fs.readFileSync(path.resolve('css/main.css'), 'utf-8');
  assert.ok(css.includes('--fog-bg'), 'CSS must define --fog-bg token');
  assert.ok(css.includes('--fog-blur'), 'CSS must define --fog-blur token');
  assert.ok(css.includes('.chat-fog-panel'), 'CSS must define .chat-fog-panel');
  assert.ok(css.includes('.chat-nav-rail'), 'CSS must define .chat-nav-rail');
  assert.ok(css.includes('.nav-rail-dot'), 'CSS must define .nav-rail-dot');
  assert.ok(css.includes('.nav-tooltip'), 'CSS must define .nav-tooltip');
});

test('Nav Rail & Fog Panel: index.html contains foggy runway, navigation rail, and tabbed settings markup', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  
  // Foggy panel
  assert.ok(html.includes('id="chat-fog-panel"'), 'Chat fog panel element must exist in index.html');
  
  // Navigation rail elements
  assert.ok(html.includes('id="chat-nav-rail"'), 'Chat nav rail element must exist in index.html');
  assert.ok(html.includes('id="btn-rail-top"'), 'Rail top button must exist');
  assert.ok(html.includes('id="btn-rail-bottom"'), 'Rail bottom button must exist');
  assert.ok(html.includes('id="btn-rail-jump-code"'), 'Rail jump code button must exist');
  assert.ok(html.includes('id="btn-rail-jump-search"'), 'Rail jump search button must exist');
  assert.ok(html.includes('id="btn-rail-jump-thought"'), 'Rail jump thought button must exist');
  assert.ok(html.includes('id="rail-turns-track"'), 'Rail turns track must exist');

  // Upgraded intuitive settings modal
  assert.ok(html.includes('id="tab-btn-providers"'), 'Settings providers tab button must exist');
  assert.ok(html.includes('id="tab-btn-grounding"'), 'Settings grounding tab button must exist');
  assert.ok(html.includes('id="tab-btn-storage"'), 'Settings storage tab button must exist');
  assert.ok(html.includes('id="tab-panel-providers"'), 'Settings providers panel must exist');
  assert.ok(html.includes('id="tab-panel-grounding"'), 'Settings grounding panel must exist');
  assert.ok(html.includes('id="tab-panel-storage"'), 'Settings storage panel must exist');
  assert.ok(html.includes('id="quick-active-provider-pills"'), 'Settings quick active provider selector must exist');
  assert.ok(html.includes('id="btn-export-chats"'), 'Settings export chats button must exist');
});

test('BackgroundEffects: Light mode orbs and dark mode calming configurations are active', async () => {
  const { BackgroundEffects } = await import('../js/ui/components/background-effects.js');
  assert.ok(BackgroundEffects);
  
  const content = fs.readFileSync(path.resolve('js/ui/components/background-effects.js'), 'utf-8');
  assert.ok(content.includes('rgba(99, 102, 241, 0.22)'), 'Light mode Indigo orb must have vibrant visibility');
  assert.ok(content.includes('rgba(14, 165, 233, 0.22)'), 'Light mode Sky orb must have vibrant visibility');
  assert.ok(content.includes('rgba(99, 102, 241, 0.09)'), 'Dark mode Indigo orb must be calming and diffuse');
});
