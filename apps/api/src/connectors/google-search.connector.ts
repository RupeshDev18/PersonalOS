import { Injectable, Logger } from '@nestjs/common';
import { ConnectorInfo } from '@personal-os/shared';

export interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  summary: string;
  topUrls: string[];
}

export interface GoogleSearchOutput {
  query: string;
  summary: string;
  results: Array<{
    title: string;
    snippet: string;
    link: string;
  }>;
  relatedSearches: string[];
  timestamp: string;
}

@Injectable()
export class GoogleSearchConnector {
  private readonly logger = new Logger(GoogleSearchConnector.name);
  private searchHistory: SearchHistoryEntry[] = [];

  public getInfo(): ConnectorInfo {
    const hasSerper = Boolean(process.env.SERPER_API_KEY);
    return {
      id: 'connector-google-search',
      name: 'Web Search & Search History',
      type: 'web_search',
      status: hasSerper ? 'connected' : 'fallback_mode',
      isLive: true,
      description: hasSerper
        ? 'Uses the configured Serper search API. Search history is kept in memory for this process.'
        : 'Uses best-effort DuckDuckGo instant answers. Search history is kept in memory; results may be empty.',
      rateLimit: hasSerper ? 'Provider dependent' : 'Best effort',
      lastSync: null,
      details: {
        historyCount: this.searchHistory.length,
        provider: hasSerper ? 'Serper' : 'DuckDuckGo Instant Answer',
        historyPersistence: 'process memory only',
      },
    } satisfies ConnectorInfo;
  }

  /**
   * Performs live Google / web search and automatically logs it to search history.
   */
  public async search(query: string, maxResults = 5): Promise<GoogleSearchOutput> {
    this.logger.log(`[GoogleSearchConnector] Executing search for: "${query}"`);
    const results: Array<{ title: string; snippet: string; link: string }> = [];

    // 1. Check if Serper or Google API key is configured
    const serperKey = process.env.SERPER_API_KEY;
    if (serperKey) {
      try {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: query, num: maxResults }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const organic = data.organic || [];
          for (const item of organic) {
            results.push({
              title: item.title || query,
              snippet: item.snippet || '',
              link: item.link || '',
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Serper Google search failed: ${err.message}`);
      }
    }

    // 2. High-speed open search fallback
    if (results.length === 0) {
      try {
        const encoded = encodeURIComponent(query);
        const searchUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(searchUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json();
          if (data.AbstractText) {
            results.push({
              title: data.Heading || query,
              snippet: data.AbstractText,
              link: data.AbstractURL || `https://www.google.com/search?q=${encoded}`,
            });
          }

          const related = (data.RelatedTopics || []).slice(0, maxResults);
          for (const item of related) {
            if (item.Text && item.FirstURL) {
              results.push({
                title: item.Text.split(' - ')[0] || item.Text,
                snippet: item.Text,
                link: item.FirstURL,
              });
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Live web search error: ${err.message}`);
      }
    }

    const summary = results[0]?.snippet || 'No results returned by the configured search provider.';

    // Record in search history
    const historyEntry: SearchHistoryEntry = {
      id: `sh-${Date.now()}`,
      query,
      timestamp: new Date().toISOString(),
      resultCount: results.length,
      summary,
      topUrls: results.slice(0, 3).map((r) => r.link),
    };
    this.searchHistory.unshift(historyEntry);

    // Keep history bounded to 50 entries
    if (this.searchHistory.length > 50) {
      this.searchHistory.pop();
    }

    return {
      query,
      summary,
      results,
      relatedSearches: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieves recorded search history.
   */
  public getSearchHistory(limit = 15): SearchHistoryEntry[] {
    return this.searchHistory.slice(0, limit);
  }

  /**
   * Clears search history.
   */
  public clearSearchHistory(): { success: boolean; message: string } {
    this.searchHistory = [];
    return { success: true, message: 'Search history cleared successfully.' };
  }
}
