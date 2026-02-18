/**
 * Configuration for search providers
 */
export interface SearchProviderConfig {
  serperApiKey?: string;
  serpApiKey?: string;
  braveApiKey?: string;
  maxRetries?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * Search result structure
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position?: number;
}

/**
 * Provider-specific response
 */
export interface ProviderResponse {
  provider: string;
  results: SearchResult[];
  metadata: {
    query: string;
    timestamp: string;
    responseTime?: number;
    fallback?: boolean;
  };
}

/**
 * Service for managing multiple search providers with fallback support
 * 
 * @class SearchProviderService
 * 
 * @example
 * ```typescript
 * const service = new SearchProviderService({
 *   serperApiKey: 'your-key',
 *   rateLimit: { maxRequests: 10, windowMs: 60000 }
 * });
 * 
 * const results = await service.search('query');
 * ```
 */
export class SearchProviderService {
  private config: SearchProviderConfig;
  private rateLimitState: Map<string, { count: number; resetTime: number }>;
  
  /**
   * Creates an instance of SearchProviderService
   * 
   * @param {SearchProviderConfig} config - Configuration for the service
   */
  constructor(config: SearchProviderConfig) {
    this.config = {
      serperApiKey: config.serperApiKey,
      serpApiKey: config.serpApiKey,
      braveApiKey: config.braveApiKey,
      maxRetries: config.maxRetries ?? 3,
      rateLimit: config.rateLimit ?? {
        maxRequests: 10,
        windowMs: 60000,
      },
    };
    this.rateLimitState = new Map();
  }
  
  /**
   * Performs a search across available providers with automatic fallback
   * 
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @param {number} [options.maxResults=10] - Maximum results to return
   * @param {string} [options.provider] - Specific provider to use
   * @returns {Promise<ProviderResponse>} Search results with metadata
   * 
   * @throws {Error} If all providers fail and no fallback is available
   */
  async search(
    query: string, 
    options: { 
      maxResults?: number; 
      provider?: string 
    } = {}
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    const maxResults = options.maxResults || 10;
    
    // If specific provider requested, try only that one
    if (options.provider) {
      return this.searchWithProvider(query, options.provider, maxResults, startTime);
    }
    
    // Try providers in order of preference
    const providers = this.getAvailableProviders();
    
    for (const provider of providers) {
      try {
        if (await this.checkRateLimit(provider)) {
          return await this.searchWithProvider(query, provider, maxResults, startTime);
        }
      } catch (error) {
        console.warn(`Provider ${provider} failed:`, error);
        continue;
      }
    }
    
    // Final fallback to DuckDuckGo (no API key required)
    return this.searchDuckDuckGo(query, maxResults, startTime);
  }
  
  /**
   * Searches using a specific provider
   * 
   * @private
   * @param {string} query - Search query
   * @param {string} provider - Provider name
   * @param {number} maxResults - Maximum results
   * @param {number} startTime - Request start timestamp
   * @returns {Promise<ProviderResponse>} Search results
   */
  private async searchWithProvider(
    query: string,
    provider: string,
    maxResults: number,
    startTime: number
  ): Promise<ProviderResponse> {
    let results: SearchResult[];
    
    switch (provider) {
      case 'serper':
        results = await this.searchSerper(query, maxResults);
        break;
      case 'serpapi':
        results = await this.searchSerpApi(query, maxResults);
        break;
      case 'brave':
        results = await this.searchBrave(query, maxResults);
        break;
      case 'duckduckgo':
      default:
        results = await this.searchDuckDuckGoAPI(query, maxResults);
        break;
    }
    
    return {
      provider,
      results: results.slice(0, maxResults),
      metadata: {
        query,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }
    };
  }
  
  /**
   * Gets list of available providers based on configured API keys
   * 
   * @private
   * @returns {string[]} Array of available provider names
   */
  private getAvailableProviders(): string[] {
    const providers: string[] = [];
    
    if (this.config.serperApiKey) providers.push('serper');
    if (this.config.serpApiKey) providers.push('serpapi');
    if (this.config.braveApiKey) providers.push('brave');
    
    return providers;
  }
  
  /**
   * Checks if a provider is within rate limits
   * 
   * @private
   * @param {string} provider - Provider name
   * @returns {Promise<boolean>} True if within limits
   */
  private async checkRateLimit(provider: string): Promise<boolean> {
    const now = Date.now();
    const state = this.rateLimitState.get(provider);
    
    if (!state || now > state.resetTime) {
      this.rateLimitState.set(provider, {
        count: 1,
        resetTime: now + this.config.rateLimit!.windowMs
      });
      return true;
    }
    
    if (state.count >= this.config.rateLimit!.maxRequests) {
      return false;
    }
    
    state.count++;
    return true;
  }
  
  /**
   * Search using Serper.dev API
   * 
   * @private
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @returns {Promise<SearchResult[]>} Search results
   */
  private async searchSerper(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.config.serperApiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: maxResults })
    });
    
    if (!response.ok) throw new Error(`Serper API error: ${response.statusText}`);
    
    const data = (await response.json()) as any;
    return (data.organic || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      position: item.position
    }));
  }
  
  /**
   * Search using SerpAPI
   * 
   * @private
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @returns {Promise<SearchResult[]>} Search results
   */
  private async searchSerpApi(query: string, maxResults: number): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      api_key: this.config.serpApiKey!,
      num: maxResults.toString()
    });
    
    const response = await fetch(`https://serpapi.com/search?${params}`);
    if (!response.ok) throw new Error(`SerpAPI error: ${response.statusText}`);
    
    const data = (await response.json()) as any;
    return (data.organic_results || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      position: item.position
    }));
  }
  
  /**
   * Search using Brave Search API
   * 
   * @private
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @returns {Promise<SearchResult[]>} Search results
   */
  private async searchBrave(query: string, maxResults: number): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: maxResults.toString()
    });
    
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        'X-Subscription-Token': this.config.braveApiKey!
      }
    });
    
    if (!response.ok) throw new Error(`Brave API error: ${response.statusText}`);
    
    const data = (await response.json()) as any;
    return (data.web?.results || []).map((item: any, index: number) => ({
      title: item.title,
      url: item.url,
      snippet: item.description,
      position: index + 1
    }));
  }
  
  /**
   * Search using DuckDuckGo (HTML scraping fallback)
   * 
   * @private
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @param {number} startTime - Request start timestamp
   * @returns {Promise<ProviderResponse>} Search results
   */
  private async searchDuckDuckGo(
    query: string, 
    maxResults: number,
    startTime: number
  ): Promise<ProviderResponse> {
    try {
      const results = await this.searchDuckDuckGoAPI(query, maxResults);
      return {
        provider: 'duckduckgo',
        results,
        metadata: {
          query,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          fallback: true
        }
      };
    } catch (error) {
      // Return empty results rather than throwing
      return {
        provider: 'duckduckgo',
        results: [],
        metadata: {
          query,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          fallback: true
        }
      };
    }
  }
  
  /**
   * Search using DuckDuckGo instant answer API
   * 
   * @private
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @returns {Promise<SearchResult[]>} Search results
   */
  private async searchDuckDuckGoAPI(query: string, maxResults: number): Promise<SearchResult[]> {
    // DuckDuckGo instant answer API (limited but free)
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      no_html: '1',
      skip_disambig: '1'
    });
    
    const response = await fetch(`https://api.duckduckgo.com/?${params}`);
    const data = (await response.json()) as any;
    
    const results: SearchResult[] = [];
    
    // Add instant answer if available
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText
      });
    }
    
    // Add related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - 1)) {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text
          });
        }
      }
    }
    
    return results.slice(0, maxResults);
  }
  
  /**
   * Gets recommended search providers with signup information
   * 
   * @static
   * @returns {Array} Array of provider recommendations
   */
  static getRecommendedProviders() {
    return [
      {
        name: 'Serper',
        signupUrl: 'https://serper.dev',
        freeQuota: '2,500 queries/month',
        description: 'Google search results API'
      },
      {
        name: 'SerpAPI',
        signupUrl: 'https://serpapi.com',
        freeQuota: '100 searches/month',
        description: 'Multiple search engines API'
      },
      {
        name: 'Brave Search',
        signupUrl: 'https://brave.com/search-api',
        freeQuota: '2,000 queries/month',
        description: 'Privacy-focused search API'
      },
      {
        name: 'DuckDuckGo',
        signupUrl: 'No signup required',
        freeQuota: 'Unlimited (rate limited)',
        description: 'Privacy-focused, no API key needed'
      }
    ];
  }
}
