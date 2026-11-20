/**
 * AskBOT Zero-Dependency Local Proxy & Static Server
 * 
 * 1. Serves the AskBOT client application at http://localhost:8787/
 * 2. Proxies /brave-search requests to https://api.search.brave.com/res/v1/llm/context
 *    with your X-Subscription-Token header, providing seamless CORS-free web search.
 * 
 * Usage:
 *   node proxy.mjs
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8787;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Subscription-Token, Authorization');
}

function handleBraveProxy(req, res, targetPath = '/res/v1/llm/context') {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const braveApiKey = req.headers['x-subscription-token'] || reqUrl.searchParams.get('token') || reqUrl.searchParams.get('apiKey');

  if (!braveApiKey) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing X-Subscription-Token header or query parameter' }));
    return;
  }

  // Build target Brave URL
  const braveUrl = new URL(`https://api.search.brave.com${targetPath}`);
  for (const [key, val] of reqUrl.searchParams.entries()) {
    if (key !== 'token' && key !== 'apiKey') {
      braveUrl.searchParams.set(key, val);
    }
  }

  // Ensure default LLM context params if querying llm/context
  if (targetPath.includes('/llm/context')) {
    if (!braveUrl.searchParams.has('maximum_number_of_tokens')) {
      braveUrl.searchParams.set('maximum_number_of_tokens', '6000');
    }
    if (!braveUrl.searchParams.has('enable_source_metadata')) {
      braveUrl.searchParams.set('enable_source_metadata', 'true');
    }
  }

  const options = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': braveApiKey
    }
  };

  const braveReq = https.request(braveUrl, options, (braveRes) => {
    res.writeHead(braveRes.statusCode || 200, {
      'Content-Type': braveRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    braveRes.pipe(res);
  });

  braveReq.on('error', (err) => {
    console.error('Brave search proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: `Brave proxy error: ${err.message}` }));
  });

  braveReq.end();
}

function handleStaticFiles(req, res) {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = reqUrl.pathname;

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(__dirname, pathname));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/brave-search') {
    handleBraveProxy(req, res, '/res/v1/llm/context');
  } else if (pathname === '/brave-web-search') {
    handleBraveProxy(req, res, '/res/v1/web/search');
  } else {
    handleStaticFiles(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`\n AskBOT Server & Brave Proxy running at:`);
  console.log(`   http://localhost:${PORT}/`);
  console.log(`   Brave Search Proxy endpoint: http://localhost:${PORT}/brave-search\n`);
});
