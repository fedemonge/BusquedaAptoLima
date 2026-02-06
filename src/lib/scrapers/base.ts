import * as cheerio from 'cheerio';
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

  protected getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  protected async fetchWithRetry(
    url: string,
    retries = SCRAPER_CONFIG.MAX_RETRIES
  ): Promise<string | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          SCRAPER_CONFIG.TIMEOUT
        );

        const response = await fetch(url, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(`[${this.sourceName}] FETCH_ATTEMPT_${attempt + 1}_FAILED: ${url} - ${errorMsg}`);

        if (attempt < retries) {
          const backoff = SCRAPER_CONFIG.RETRY_BACKOFF_BASE * Math.pow(2, attempt);
          await delay(backoff);
        }
      }
    }

    return null;
  }

  // Build search URL from alert parameters
  abstract buildSearchUrl(params: AlertParams, page?: number): string;

  // Parse search results page to extract listing URLs
  async fetchSearchResults(params: AlertParams): Promise<string[]> {
    const urls: string[] = [];
    let page = 1;
    const maxPages = 5; // Limit pages to avoid excessive scraping

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

      // Check for next page
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
