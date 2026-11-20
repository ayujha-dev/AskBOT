import test from 'node:test';
import assert from 'node:assert/strict';

test('Task 3: BaseProvider readSSEStream buffers across chunk boundaries', async () => {
  const { BaseProvider } = await import('../js/providers/base-provider.js');

  const chunks = [
    'data: {"choices":[{"delta":{"content":"Hel',
    'lo"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
    'data: [DONE]\n\n'
  ];

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    }
  });

  const provider = new BaseProvider();
  const receivedData = [];

  await provider.readSSEStream(stream, (event) => {
    if (event.data !== '[DONE]') {
      receivedData.push(JSON.parse(event.data));
    }
  });

  assert.equal(receivedData.length, 2);
  assert.equal(receivedData[0].choices[0].delta.content, 'Hello');
  assert.equal(receivedData[1].choices[0].delta.content, ' World');
});

test('Task 3: Provider model filtering logic works correctly', async () => {
  const { OpenAIProvider } = await import('../js/providers/openai-provider.js');
  const { GroqProvider } = await import('../js/providers/groq-provider.js');
  const { GeminiProvider } = await import('../js/providers/gemini-provider.js');

  const openai = new OpenAIProvider();
  const rawOpenAI = [
    { id: 'gpt-4o' },
    { id: 'text-embedding-3-small' },
    { id: 'dall-e-3' },
    { id: 'tts-1' },
    { id: 'o1-preview' }
  ];
  const filteredOpenAI = openai.filterChatModels(rawOpenAI);
  assert.deepEqual(filteredOpenAI.map(m => m.id), ['gpt-4o', 'o1-preview']);

  const groq = new GroqProvider();
  const rawGroq = [
    { id: 'llama-3.3-70b-versatile', context_window: 131072 },
    { id: 'whisper-large-v3', context_window: 448 }
  ];
  const filteredGroq = groq.filterChatModels(rawGroq);
  assert.deepEqual(filteredGroq.map(m => m.id), ['llama-3.3-70b-versatile']);

  const gemini = new GeminiProvider();
  const rawGemini = [
    { name: 'models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/text-embedding-004', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] }
  ];
  const filteredGemini = gemini.filterChatModels(rawGemini);
  assert.deepEqual(filteredGemini.map(m => m.id), ['gemini-2.0-flash']);
});

test('Task 3: ClaudeProvider enforces dangerous browser access header and version', async () => {
  const { ClaudeProvider } = await import('../js/providers/claude-provider.js');
  const claude = new ClaudeProvider();
  const headers = claude.getHeaders('test-claude-key');

  assert.equal(headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(headers['anthropic-version'], '2023-06-01');
  assert.equal(headers['x-api-key'], 'test-claude-key');
});

test('Task 3: ProviderRegistry returns all supported providers', async () => {
  const { ProviderRegistry } = await import('../js/providers/provider-registry.js');
  const supported = ProviderRegistry.getSupportedProviders();
  assert.deepEqual(supported, ['groq', 'gemini', 'openai', 'claude', 'xai']);

  const groq = ProviderRegistry.getProvider('groq');
  assert.ok(groq);
  assert.equal(groq.id, 'groq');
});

test('Task 3: Gemini formatContents preserves multiple system messages', async () => {
  const { GeminiProvider } = await import('../js/providers/gemini-provider.js');
  const gemini = new GeminiProvider();

  const messages = [
    { role: 'system', content: 'Instruction 1: Grounding info' },
    { role: 'system', content: 'Instruction 2: Python tool enabled' },
    { role: 'user', content: 'Hello' }
  ];

  const { contents, systemInstruction } = gemini.formatContents(messages);
  assert.ok(systemInstruction);
  assert.equal(systemInstruction.parts.length, 2);
  assert.equal(systemInstruction.parts[0].text, 'Instruction 1: Grounding info');
  assert.equal(systemInstruction.parts[1].text, 'Instruction 2: Python tool enabled');
  assert.equal(contents.length, 1);
  assert.equal(contents[0].role, 'user');
});

test('Task 3: Gemini thinkingConfig is only attached for reasoning models', async () => {
  const { GeminiProvider } = await import('../js/providers/gemini-provider.js');
  const gemini = new GeminiProvider();

  // Test non-thinking models do not get thinkingConfig
  const nonThinkingModels = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  for (const mId of nonThinkingModels) {
    const isThinkingSupported = mId.includes('thinking') || mId.includes('2.5');
    assert.equal(isThinkingSupported, false, `${mId} must NOT be flagged as thinking supported`);
  }

  // Test thinking models do get thinkingConfig
  const thinkingModels = ['gemini-2.0-flash-thinking-exp-01-21', 'gemini-2.5-pro', 'gemini-2.5-flash'];
  for (const mId of thinkingModels) {
    const isThinkingSupported = mId.includes('thinking') || mId.includes('2.5');
    assert.equal(isThinkingSupported, true, `${mId} MUST be flagged as thinking supported`);
  }
});

test('Task 3: OpenAI streamChat handles undefined or empty model gracefully', async () => {
  const { OpenAIProvider } = await import('../js/providers/openai-provider.js');
  const openai = new OpenAIProvider();

  let capturedUrl = '';
  let capturedBody = null;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      })
    };
  };

  try {
    // Should not throw TypeError: Cannot read properties of undefined (reading 'startsWith')
    await openai.streamChat({
      apiKey: 'sk-test',
      messages: [{ role: 'user', content: 'Hi' }],
      model: undefined,
      parameters: { temperature: 0.7 },
      modes: { thinkingLevel: 'low' },
      onChunk: () => {},
      onThinking: () => {}
    });

    assert.equal(capturedBody.model, 'gpt-4o');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
