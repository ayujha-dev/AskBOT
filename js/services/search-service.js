/**
 * SearchService: Client-side web search grounding via Brave Search API
 * with automatic fallback to DuckDuckGo & Wikipedia.
 */

export class SearchService {
  /**
   * Returns current web connection status details.
   */
  static getConnectionStatus(apiKeys = {}) {
    if (apiKeys.brave && apiKeys.brave.trim()) {
      return {
        type: 'brave',
        label: 'Brave Search API (Key Active)',
        isFree: false
      };
    }
    if (apiKeys.tavily && apiKeys.tavily.trim()) {
      return {
        type: 'tavily',
        label: 'Tavily Deep Search (Key Active)',
        isFree: false
      };
    }
    return {
      type: 'free',
      label: 'Free Web Grounding (DuckDuckGo + Wikipedia)',
      isFree: true
    };
  }

  /**
   * Cleans user prompt into search keywords by stripping common question fillers.
   * @param {string} prompt
   * @returns {string}
   */
  static extractSearchQuery(prompt) {
    if (!prompt) return '';
    let cleaned = prompt
      .replace(/^(can you|could you|please|search for|look up|search the web for|find info on|what is|who is|tell me about)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();
    return cleaned || prompt;
  }

  /**
   * Format sources into structured prompt context with <web_search_results> tag.
   * @param {Array<{ title: string, url: string, snippet: string, domain?: string, age?: string }>} sources
   * @returns {string}
   */
  static formatSearchContext(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return '';

    let context = '<web_search_results>\n';
    sources.forEach((s, idx) => {
      let domain = s.domain;
      if (!domain && s.url) {
        try { domain = new URL(s.url).hostname.replace(/^www\./, ''); } catch { domain = ''; }
      }
      context += `[${idx + 1}] ${s.title || 'Source'}\n`;
      context += `URL: ${s.url}\n`;
      if (domain) context += `Domain: ${domain}\n`;
      if (s.age) context += `Date/Age: ${s.age}\n`;
      if (s.snippet) context += `${s.snippet}\n`;
      context += '\n';
    });
    context += '</web_search_results>\n';
    context += 'Instructions: Answer the user prompt accurately based on the <web_search_results> above. Prioritize these real-time search results over your internal cut-off knowledge, and cite sources inline as [1], [2], etc.\n';
    return context;
  }

  /**
   * Search Brave Search API via LLM context endpoint (or local CORS proxy).
   * @param {string} query
   * @param {string} apiKey
   * @param {string} [proxyUrl]
   * @returns {Promise<Array<{ title: string, url: string, domain: string, snippet: string, age?: string }>>}
   */
  static async searchBrave(query, apiKey, proxyUrl = null) {
    if (!query) return [];

    const isTemporal = /\b(today|now|latest|recent|yesterday|news|2026|2025)\b/i.test(query);
    const freshnessParam = isTemporal ? '&freshness=pw' : '';

    let endpoint = proxyUrl && proxyUrl.trim()
      ? `${proxyUrl.trim().replace(/\/$/, '')}?q=${encodeURIComponent(query)}&maximum_number_of_tokens=6000&enable_source_metadata=true${freshnessParam}`
      : `https://api.search.brave.com/res/v1/llm/context?q=${encodeURIComponent(query)}&maximum_number_of_tokens=6000&enable_source_metadata=true${freshnessParam}`;

    const headers = {
      'Accept': 'application/json'
    };
    if (apiKey) {
      headers['X-Subscription-Token'] = apiKey;
    }

    try {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        console.warn(`Brave Search LLM context returned HTTP ${res.status}, falling back to web search`);
        return this.searchBraveWeb(query, apiKey, proxyUrl);
      }

      const data = await res.json();
      const results = [];
      const sourcesMap = new Map();

      if (Array.isArray(data.sources)) {
        data.sources.forEach(s => {
          if (s.url) sourcesMap.set(s.url, s);
        });
      }

      const genericList = data.grounding?.generic || [];
      for (const item of genericList) {
        if (!item.url) continue;
        const sourceMeta = sourcesMap.get(item.url) || {};
        let domain = sourceMeta.hostname || '';
        if (!domain) {
          try { domain = new URL(item.url).hostname; } catch {}
        }
        domain = domain.replace(/^www\./, '');
        const snippet = Array.isArray(item.snippets) ? item.snippets.join(' ') : (item.snippets || '');
        results.push({
          title: item.title || domain || 'Web Result',
          url: item.url,
          domain: domain,
          snippet: snippet,
          age: sourceMeta.age || ''
        });
      }

      if (results.length > 0) return results.slice(0, 6);

      // If grounding.generic was empty, try web search fallback
      return this.searchBraveWeb(query, apiKey, proxyUrl);
    } catch (err) {
      console.warn('Brave Search request failed:', err);
      return this.searchBraveWeb(query, apiKey, proxyUrl);
    }
  }

  /**
   * Fallback to Brave standard Web Search endpoint.
   */
  static async searchBraveWeb(query, apiKey, proxyUrl = null) {
    if (!apiKey) return [];
    try {
      let endpoint = proxyUrl && proxyUrl.trim()
        ? `${proxyUrl.trim().replace(/\/brave-search$/, '/brave-web-search')}?q=${encodeURIComponent(query)}&count=5`
        : `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;

      const res = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      });
      if (!res.ok) return [];

      const data = await res.json();
      const webResults = data.web?.results || [];
      return webResults.slice(0, 5).map(r => {
        let domain = '';
        try { domain = new URL(r.url).hostname.replace(/^www\./, ''); } catch {}
        return {
          title: r.title || domain || 'Web Result',
          url: r.url,
          domain,
          snippet: r.description || '',
          age: r.page_age || r.age || ''
        };
      });
    } catch (err) {
      console.warn('Brave Web Search fallback failed:', err);
      return [];
    }
  }

  /**
   * Search Wikipedia API (CORS enabled with origin=*).
   * @param {string} query
   * @returns {Promise<Array<{ title: string, url: string, snippet: string, domain: string }>>}
   */
  static async searchWikipedia(query) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      const items = data.query?.search || [];

      return items.slice(0, 3).map(item => {
        const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '');
        return {
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
          domain: 'wikipedia.org',
          snippet: cleanSnippet
        };
      });
    } catch (e) {
      console.warn('Wikipedia search failed:', e);
      return [];
    }
  }

  /**
   * Search DuckDuckGo Instant Answer API (CORS enabled with origin=*).
   * @param {string} query
   * @returns {Promise<Array<{ title: string, url: string, snippet: string, domain: string }>>}
   */
  static async searchDuckDuckGo(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      const results = [];

      if (data.AbstractText && data.AbstractURL) {
        let domain = '';
        try { domain = new URL(data.AbstractURL).hostname.replace(/^www\./, ''); } catch {}
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          domain,
          snippet: data.AbstractText
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text && topic.FirstURL) {
            let domain = '';
            try { domain = new URL(topic.FirstURL).hostname.replace(/^www\./, ''); } catch {}
            results.push({
              title: topic.Text.split(' - ')[0] || 'DuckDuckGo Result',
              url: topic.FirstURL,
              domain,
              snippet: topic.Text
            });
          }
        }
      }

      return results;
    } catch (e) {
      console.warn('DuckDuckGo search failed:', e);
      return [];
    }
  }

  /**
   * Optional Tavily API search if user configured Tavily key.
   */
  static async searchTavily(query, apiKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          max_results: 4
        })
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map(r => {
        let domain = '';
        try { domain = new URL(r.url).hostname.replace(/^www\./, ''); } catch {}
        return {
          title: r.title,
          url: r.url,
          domain,
          snippet: r.content
        };
      });
    } catch (e) {
      console.warn('Tavily search failed:', e);
      return [];
    }
  }

  /**
   * Execute aggregated client-side search.
   * Prioritizes Brave Search, then Tavily, and falls back to free DuckDuckGo + Wikipedia.
   * @param {string} prompt
   * @param {Object} options
   * @param {string} [options.braveApiKey]
   * @param {string} [options.braveProxyUrl]
   * @param {string} [options.tavilyApiKey]
   * @param {Object} [options.apiKeys]
   * @returns {Promise<Array<{ title: string, url: string, domain: string, snippet: string, age?: string }>>}
   */
  static async search(prompt, options = {}) {
    const query = this.extractSearchQuery(prompt);
    if (!query) return [];

    const braveKey = options.braveApiKey || options.apiKeys?.brave;
    const braveProxy = options.braveProxyUrl || options.apiKeys?.braveProxyUrl;

    if (braveKey || braveProxy) {
      const braveResults = await this.searchBrave(query, braveKey, braveProxy);
      if (braveResults && braveResults.length > 0) {
        return braveResults;
      }
    }

    const tavilyKey = options.tavilyApiKey || options.apiKeys?.tavily;
    if (tavilyKey) {
      const tavilyResults = await this.searchTavily(query, tavilyKey);
      if (tavilyResults.length > 0) return tavilyResults;
    }

    const [wikiResults, ddgResults] = await Promise.all([
      this.searchWikipedia(query),
      this.searchDuckDuckGo(query)
    ]);

    const combined = [...ddgResults, ...wikiResults];
    const seen = new Set();
    const deduped = [];
    for (const item of combined) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        let domain = item.domain || '';
        if (!domain && item.url) {
          try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
        }
        item.domain = domain;
        deduped.push(item);
      }
    }

    return deduped.slice(0, 5);
  }

  /**
   * Execute search and return both structured context and sources list.
   * @param {string} prompt
   * @param {Object|string} [optionsOrTavilyKey]
   * @returns {Promise<{ context: string, sources: Array<{ title: string, url: string, domain: string, snippet: string, age?: string }> }>}
   */
  static async executeSearch(prompt, optionsOrTavilyKey = null) {
    let opts = {};
    if (typeof optionsOrTavilyKey === 'string') {
      opts = { tavilyApiKey: optionsOrTavilyKey };
    } else if (optionsOrTavilyKey && typeof optionsOrTavilyKey === 'object') {
      opts = optionsOrTavilyKey;
    }

    const sources = await this.search(prompt, opts);
    const context = this.formatSearchContext(sources);
    return { context, sources };
  }
}
