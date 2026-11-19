import test from 'node:test';
import assert from 'node:assert/strict';

test('Task 7: SuggestionsComponent generates time-appropriate greetings and randomized prompt chips', async () => {
  const { SuggestionsComponent } = await import('../js/ui/components/suggestions.js');

  assert.equal(SuggestionsComponent.getGreeting(8), 'Good morning');
  assert.equal(SuggestionsComponent.getGreeting(13), 'Good afternoon');
  assert.equal(SuggestionsComponent.getGreeting(20), 'Good evening');
  assert.equal(SuggestionsComponent.getGreeting(2), 'Good evening');

  const chips = SuggestionsComponent.getRandomSuggestions(4);
  assert.equal(chips.length, 4);
  const titles = chips.map(c => c.title);
  const uniqueTitles = new Set(titles);
  assert.equal(uniqueTitles.size, 4, 'All 4 randomized chips must be unique');
});

test('Task 7: MarkdownRenderer formats code blocks with language and copy action', async () => {
  const { MarkdownRenderer } = await import('../js/utils/markdown.js');

  const md = 'Here is code:\n```javascript\nconsole.log("hello");\n```';
  const html = MarkdownRenderer.render(md);

  assert.ok(html.includes('<pre>'), 'Should output pre tag');
  assert.ok(html.includes('copy-code-btn') || html.includes('data-copy'), 'Should include copy action');
  assert.ok(html.includes('console.log'), 'Should include code content');
});
