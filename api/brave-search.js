/**
 * Vercel Serverless Function: Brave Search API Proxy
 * Securely proxies browser search requests to Brave Search API (LLM Context & Web Search)
 * bypassing client-side browser CORS restrictions.
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Subscription-Token, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
  }

  const token = req.headers['x-subscription-token'] || req.query.token || req.query.apiKey;
  if (!token) {
    return res.status(400).json({ error: 'Missing X-Subscription-Token header or query parameter' });
  }

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  const isWebSearch = req.query.type === 'web';
  const targetPath = isWebSearch ? '/res/v1/web/search' : '/res/v1/llm/context';
  const braveUrl = new URL(`https://api.search.brave.com${targetPath}`);

  // Forward query params
  for (const [key, val] of Object.entries(req.query)) {
    if (key !== 'token' && key !== 'apiKey' && key !== 'type') {
      braveUrl.searchParams.set(key, val);
    }
  }

  // Set default LLM context params if querying llm/context
  if (!isWebSearch) {
    if (!braveUrl.searchParams.has('maximum_number_of_tokens')) {
      braveUrl.searchParams.set('maximum_number_of_tokens', '6000');
    }
    if (!braveUrl.searchParams.has('enable_source_metadata')) {
      braveUrl.searchParams.set('enable_source_metadata', 'true');
    }
  } else if (!braveUrl.searchParams.has('count')) {
    braveUrl.searchParams.set('count', '5');
  }

  try {
    const braveRes = await fetch(braveUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': token
      }
    });

    const data = await braveRes.json().catch(() => ({}));
    return res.status(braveRes.status || 200).json(data);
  } catch (err) {
    console.error('Brave Search proxy error:', err);
    return res.status(502).json({ error: `Brave Search proxy error: ${err.message}` });
  }
}
