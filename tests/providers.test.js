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
