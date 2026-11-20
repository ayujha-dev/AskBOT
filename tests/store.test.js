import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };
}

test('Task 2: defaultState has expected shape and defaults', async () => {
  const { defaultState } = await import('../js/state/default-state.js');
  assert.ok(defaultState);
  assert.deepEqual(defaultState.apiKeys, {});
  assert.equal(defaultState.activeProvider, 'groq');
  assert.equal(defaultState.parameters.temperature, 0.7);
  assert.equal(defaultState.parameters.maxTokens, 4096);
  assert.equal(defaultState.parameters.contextBudgetTokens, 8192);
  assert.equal(defaultState.modes.codeInterpreter, false);
  assert.equal(defaultState.modes.webSearch, false);
  assert.equal(defaultState.modes.thinkingLevel, 'low');
  assert.deepEqual(defaultState.chats, [], 'Must enforce zero dummy/mock chats');
  assert.equal(defaultState.currentChatId, null);
});

test('Task 2: Store manages state and dispatches subscriptions', async () => {
  const { Store } = await import('../js/state/store.js');
  const store = new Store();

  let listenerFired = false;
  let receivedChangedKeys = [];
  const unsubscribe = store.subscribe((state, keys) => {
    listenerFired = true;
    receivedChangedKeys = keys;
  });

  store.setApiKey('groq', 'gsk_test123');
  assert.equal(store.getState().apiKeys.groq, 'gsk_test123');
  assert.ok(listenerFired);
  assert.ok(receivedChangedKeys.includes('apiKeys'));

  // Test Chat Creation
  const newChat = store.addChat({ title: 'Python Analysis' });
  assert.ok(newChat.id);
  assert.equal(newChat.title, 'Python Analysis');
  assert.equal(store.getState().currentChatId, newChat.id);
  assert.equal(store.getState().chats.length, 1);

  // Test Message Addition
  store.addMessage(newChat.id, {
    role: 'user',
    content: 'Plot a sine wave'
  });

  const chat = store.getChat(newChat.id);
  assert.equal(chat.messages.length, 1);
  assert.equal(chat.messages[0].content, 'Plot a sine wave');

  // Test Chat Update
  store.updateChat(newChat.id, { title: 'Updated Title' });
  assert.equal(store.getChat(newChat.id).title, 'Updated Title');

  // Test Chat Deletion
  store.deleteChat(newChat.id);
  assert.equal(store.getState().chats.length, 0);
  assert.equal(store.getState().currentChatId, null);

  unsubscribe();
});
