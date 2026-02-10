import * as cheerio from 'cheerio';
import { execSync } from 'child_process';
import type { AlertParams, NormalizedListing, SourceName } from '@/types';
import { SCRAPER_CONFIG, USER_AGENTS } from '@/lib/config/constants';
import { generateFingerprint } from '@/lib/utils/fingerprint';
import { delay, randomDelay } from '@/lib/utils/delay';

export interface SelectorConfig {
  searchResults: {
    listingCard: string;
    listingUrl: string;
    nextPage?: string;
  };
  listingPage: {
    title: string;
    price: string;
    currency?: string;
    squareMeters?: string;
    bedrooms?: string;
    bathrooms?: string;
    parking?: string;
    neighborhood?: string;
    imageUrl?: string;
  };
}

export abstract class BaseScraper {
  abstract readonly sourceName: SourceName;
  abstract readonly baseUrl: string;
  abstract readonly selectors: SelectorConfig;

  // Track if this domain needs curl (set after first successful curl fallback)
  private useCurlDirect = false;

  protected getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  protected async fetchWithRetry(
    url: string,
    retries = SCRAPER_CONFIG.MAX_RETRIES,
    extraHeaders?: Record<string, string>
  ): Promise<string | null> {
    // If we already know this domain needs curl, skip fetch retries
    if (this.useCurlDirect) {
      const curlHtml = this.fetchWithCurl(url);
      if (curlHtml && !this.isBotChallenge(curlHtml)) {
        return curlHtml;
      }
      return null;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          SCRAPER_CONFIG.TIMEOUT
        );

        const origin = new URL(url).origin;
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Referer': `${origin}/`,
            'Cache-Control': 'max-age=0',
            ...extraHeaders,
          },
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Detect bot protection pages
        if (this.isBotChallenge(html)) {
          console.log(`[${this.sourceName}] BOT_CHALLENGE_DETECTED: ${url}`);
          return null;
        }

        return html;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(`[${this.sourceName}] FETCH_ATTEMPT_${attempt + 1}_FAILED: ${url} - ${errorMsg}`);

        if (attempt < retries) {
          const backoff = SCRAPER_CONFIG.RETRY_BACKOFF_BASE * Math.pow(2, attempt);
          await delay(backoff);
        }
      }
    }

    // If all fetch attempts failed, try curl as fallback (different TLS fingerprint)
    console.log(`[${this.sourceName}] FETCH_FALLBACK: Trying curl for ${url}`);
    const curlHtml = this.fetchWithCurl(url);
    if (curlHtml && !this.isBotChallenge(curlHtml)) {
      this.useCurlDirect = true; // Skip fetch retries for subsequent requests to this domain
      return curlHtml;
    }

    return null;
  }

  /**
   * Fallback fetch using curl (different TLS fingerprint bypasses Cloudflare).
   */
  protected fetchWithCurl(url: string): string | null {
    try {
      const ua = this.getRandomUserAgent();
      const html = execSync(
        `curl -sL --max-time 30 -H "User-Agent: ${ua}" -H "Accept: text/html,application/xhtml+xml" -H "Accept-Language: es-PE,es;q=0.9" "${url}"`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 35000 }
      );
      if (html && html.length > 1000) {
        console.log(`[${this.sourceName}] CURL_SUCCESS: ${url} (${html.length} bytes)`);
        return html;
      }
      return null;
    } catch (error) {
      console.log(`[${this.sourceName}] CURL_FAILED: ${url}`);
      return null;
    }
  }

  // Detect Cloudflare or other bot challenges
  protected isBotChallenge(html: string): boolean {
    const snippet = html.substring(0, 5000).toLowerCase();
    return (
      snippet.includes('just a moment') ||
      snippet.includes('challenge-platform') ||
      snippet.includes('cf-chl-') ||
      (snippet.includes('_bmstate') && html.length < 5000)
    );
  }

  // Build search URL from alert parameters
  abstract buildSearchUrl(params: AlertParams, page?: number): string;

  /**
   * Main scraping method. Extracts all listings for given params.
   * Default: fetch search page URLs, then fetch each listing detail page.
   * Scrapers that can extract data from search page cards should override this.
   */
  async scrapeAll(params: AlertParams): Promise<NormalizedListing[]> {
    const urls = await this.fetchSearchResults(params);
    const listings: NormalizedListing[] = [];

    for (const url of urls) {
      try {
        const listing = await this.fetchListingDetails(url);
        if (listing) {
          listings.push(listing);
        }
        await randomDelay();
      } catch (error) {
        console.log(`[${this.sourceName}] LISTING_ERROR: ${url} - ${error}`);
      }
    }

    return listings;
  }

  // Parse search results page to extract listing URLs
  async fetchSearchResults(params: AlertParams): Promise<string[]> {
    const urls: string[] = [];
    let page = 1;
    const maxPages = 5;

    while (page <= maxPages && urls.length < SCRAPER_CONFIG.MAX_LISTINGS_PER_SOURCE) {
      const searchUrl = this.buildSearchUrl(params, page);
      console.log(`[${this.sourceName}] FETCHING_SEARCH: page ${page} - ${searchUrl}`);

      const html = await this.fetchWithRetry(searchUrl);
      if (!html) {
        console.log(`[${this.sourceName}] SEARCH_FAILED: Could not fetch page ${page}`);
        break;
      }

      const $ = cheerio.load(html);
      const pageUrls = this.parseSearchResults($);

      if (pageUrls.length === 0) {
        console.log(`[${this.sourceName}] NO_MORE_RESULTS: page ${page}`);
        break;
      }

      urls.push(...pageUrls);
      console.log(`[${this.sourceName}] FOUND_LISTINGS: ${pageUrls.length} on page ${page}`);

      if (!this.hasNextPage($)) {
        break;
      }

      page++;
      await randomDelay();
    }

    return urls.slice(0, SCRAPER_CONFIG.MAX_LISTINGS_PER_SOURCE);
  }

  // Parse search results HTML to extract listing URLs
  protected parseSearchResults($: cheerio.CheerioAPI): string[] {
    const urls: string[] = [];
    const { listingCard, listingUrl } = this.selectors.searchResults;

    $(listingCard).each((_, element) => {
      const href = $(element).find(listingUrl).attr('href')
        || $(element).attr('href');

      if (href) {
        const fullUrl = this.normalizeUrl(href);
        if (fullUrl && !urls.includes(fullUrl)) {
          urls.push(fullUrl);
        }
      }
    });

    return urls;
  }

  // Check if there's a next page
  protected hasNextPage($: cheerio.CheerioAPI): boolean {
    if (!this.selectors.searchResults.nextPage) return false;
    return $(this.selectors.searchResults.nextPage).length > 0;
  }

  // Normalize relative URLs to absolute
  protected normalizeUrl(href: string): string {
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    if (href.startsWith('/')) return `${this.baseUrl}${href}`;
    return `${this.baseUrl}/${href}`;
  }

  // Fetch and parse a single listing page
  async fetchListingDetails(url: string): Promise<NormalizedListing | null> {
    console.log(`[${this.sourceName}] FETCHING_LISTING: ${url}`);

    const html = await this.fetchWithRetry(url);
    if (!html) {
      console.log(`[${this.sourceName}] LISTING_FETCH_FAILED: ${url}`);
      return null;
    }

    try {
      const $ = cheerio.load(html);
      const listing = this.parseListing($, url);

      if (!listing) {
        console.log(`[${this.sourceName}] LISTING_PARSE_FAILED: ${url}`);
        return null;
      }

      console.log(`[${this.sourceName}] LISTING_PARSED: ${listing.title}`);
      return listing;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[${this.sourceName}] LISTING_ERROR: ${url} - ${errorMsg}`);
      return null;
    }
  }

  // Parse listing page HTML - to be implemented by each scraper
  protected abstract parseListing(
    $: cheerio.CheerioAPI,
    url: string
  ): NormalizedListing | null;

  // Helper to extract text and clean it
  protected extractText($: cheerio.CheerioAPI, selector: string): string {
    return $(selector).first().text().trim();
  }

  // Helper to extract number from text
  protected extractNumber(text: string): number | undefined {
    const match = text.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : undefined;
  }

  // Helper to extract integer
  protected extractInt(text: string): number | undefined {
    const num = this.extractNumber(text);
    return num !== undefined ? Math.floor(num) : undefined;
  }

  // Create fingerprint hash for deduplication
  protected createFingerprint(
    normalizedAddress: string,
    price: number,
    squareMeters: number | undefined,
    bedrooms: number | undefined
  ): string {
    return generateFingerprint(
      this.sourceName,
      normalizedAddress,
      price,
      squareMeters,
      bedrooms
    );
  }
}
