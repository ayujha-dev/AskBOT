/**
 * SearchService: Client-side web search grounding via DuckDuckGo + Wikipedia + optional Tavily.
 */

export class SearchService {
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
   * Format sources into structured prompt context.
   * @param {Array<{ title: string, url: string, snippet: string }>} sources
   * @returns {string}
   */
  static formatSearchContext(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return '';

    let context = 'Web search results:\n\n';
    sources.forEach((s, idx) => {
      context += `[${idx + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet || ''}\n\n`;
    });
    context += 'Instructions: Answer the user prompt accurately based on the search results above, citing sources using [1], [2], etc.\n';
    return context;
  }

  /**
   * Search Wikipedia API (CORS enabled with origin=*).
   * @param {string} query
   * @returns {Promise<Array<{ title: string, url: string, snippet: string }>>}
   */
  static async searchWikipedia(query) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      const items = data.query?.search || [];

      return items.slice(0, 3).map(item => {
        // Strip HTML tags from snippet
        const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '');
        return {
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
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
   * @returns {Promise<Array<{ title: string, url: string, snippet: string }>>}
   */
  static async searchDuckDuckGo(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      const results = [];

      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: data.AbstractText
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || 'DuckDuckGo Result',
              url: topic.FirstURL,
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
      return (data.results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content
      }));
    } catch (e) {
      console.warn('Tavily search failed:', e);
      return [];
    }
  }

  /**
   * Execute aggregated client-side search.
   * @param {string} prompt
   * @param {Object} options
   * @param {string} [options.tavilyApiKey]
   * @returns {Promise<Array<{ title: string, url: string, snippet: string }>>}
   */
  static async search(prompt, options = {}) {
    const query = this.extractSearchQuery(prompt);
    if (!query) return [];

    if (options.tavilyApiKey) {
      const tavilyResults = await this.searchTavily(query, options.tavilyApiKey);
      if (tavilyResults.length > 0) return tavilyResults;
    }

    const [wikiResults, ddgResults] = await Promise.all([
      this.searchWikipedia(query),
      this.searchDuckDuckGo(query)
    ]);

    const combined = [...ddgResults, ...wikiResults];
    // Deduplicate by URL
    const seen = new Set();
    const deduped = [];
    for (const item of combined) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        deduped.push(item);
      }
    }

    return deduped.slice(0, 5);
  }
}
