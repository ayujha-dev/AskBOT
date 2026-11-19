import test from 'node:test';
import assert from 'node:assert/strict';

test('Task 4: TokenCounter accurately estimates tokens for strings and message arrays', async () => {
  const { TokenCounter } = await import('../js/services/token-counter.js');

  const str = 'Hello world, this is a test prompt.'; // 35 chars -> ~9 tokens + 1
  const tokens = TokenCounter.estimateTokens(str);
  assert.ok(tokens >= 7 && tokens <= 12, `Estimated tokens ${tokens} should be in reasonable range`);

  const messages = [
    { role: 'system', content: 'You are a helpful coding assistant.' },
    { role: 'user', content: 'Explain recursion in Python.' },
    { role: 'assistant', content: 'Recursion is a programming technique where a function calls itself.' }
  ];

  const totalTokens = TokenCounter.estimateMessagesTokens(messages);
  assert.ok(totalTokens > 30 && totalTokens < 70, `Total tokens ${totalTokens} should include framing overhead`);
});

test('Task 4: TokenCounter.trimToContextBudget preserves system prompt and trims oldest messages', async () => {
  const { TokenCounter } = await import('../js/services/token-counter.js');

  const messages = [
    { role: 'system', content: 'System instruction always preserved.' },
    { role: 'user', content: 'Old question 1' },
    { role: 'assistant', content: 'Old answer 1' },
    { role: 'user', content: 'Old question 2' },
    { role: 'assistant', content: 'Old answer 2' },
    { role: 'user', content: 'Latest question' }
  ];

  // Restrict to tiny budget that only fits system + latest question
  const trimmed = TokenCounter.trimToContextBudget(messages, 40);

  assert.equal(trimmed[0].role, 'system', 'System prompt must always be preserved at index 0');
  assert.equal(trimmed[trimmed.length - 1].content, 'Latest question', 'Latest turn must be preserved');
  assert.ok(trimmed.length < messages.length, 'Old messages should be trimmed');
});
