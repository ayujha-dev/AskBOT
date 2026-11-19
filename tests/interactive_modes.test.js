import test from 'node:test';
import assert from 'node:assert/strict';

test('Task 6: SearchService extracts clean query and formats search context', async () => {
  const { SearchService } = await import('../js/services/search-service.js');

  const query = SearchService.extractSearchQuery('Can you search the web for the latest SpaceX launch date?');
  assert.ok(query.toLowerCase().includes('spacex'), 'Should extract relevant keywords');
  assert.ok(!query.toLowerCase().includes('can you search the web for'), 'Should strip conversational filler');

  const sources = [
    { title: 'SpaceX Mission', url: 'https://spacex.example.com', snippet: 'Starship flight test 7 scheduled for next month.' },
    { title: 'Space News', url: 'https://news.example.com', snippet: 'FAA gives green light to launch window.' }
  ];

  const formattedContext = SearchService.formatSearchContext(sources);
  assert.ok(formattedContext.includes('[1] SpaceX Mission'));
  assert.ok(formattedContext.includes('https://spacex.example.com'));
  assert.ok(formattedContext.includes('Starship flight test 7'));
});

test('Task 6: PyodideBridge extracts python blocks from markdown text', async () => {
  const { PyodideBridge } = await import('../js/services/pyodide-bridge.js');

  const textWithCode = `
Here is the code to calculate Fibonacci:
\`\`\`python
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)
print(fib(10))
\`\`\`
Let me know if you have questions!
  `;

  const extracted = PyodideBridge.extractPythonCode(textWithCode);
  assert.ok(extracted);
  assert.ok(extracted.includes('def fib(n):'));
  assert.ok(extracted.includes('print(fib(10))'));
});
