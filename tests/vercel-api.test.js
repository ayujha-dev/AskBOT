import test from 'node:test';
import assert from 'node:assert/strict';

test('Vercel API: api/brave-search.js proxies Brave search requests with CORS headers', async () => {
  const { default: handler } = await import('../api/brave-search.js');
  assert.equal(typeof handler, 'function', 'handler must be exported function');

  // Test OPTIONS preflight
  let headersSet = {};
  let statusSet = 200;
  let ended = false;
  let jsonSent = null;

  const mockRes = {
    setHeader: (k, v) => { headersSet[k.toLowerCase()] = v; },
    status: (code) => {
      statusSet = code;
      return {
        json: (data) => { jsonSent = data; },
        end: () => { ended = true; }
      };
    }
  };

  await handler({ method: 'OPTIONS', headers: {}, query: {} }, mockRes);
  assert.equal(headersSet['access-control-allow-origin'], '*');
  assert.equal(statusSet, 204);
  assert.equal(ended, true);

  // Test Missing Token
  statusSet = 200;
  jsonSent = null;
  await handler({ method: 'GET', headers: {}, query: { q: 'AI news' } }, mockRes);
  assert.equal(statusSet, 400);
  assert.ok(jsonSent?.error?.includes('Missing X-Subscription-Token'));

  // Test Missing Query
  statusSet = 200;
  jsonSent = null;
  await handler({ method: 'GET', headers: { 'x-subscription-token': 'test-token' }, query: {} }, mockRes);
  assert.equal(statusSet, 400);
  assert.ok(jsonSent?.error?.includes('Missing query'));
});
