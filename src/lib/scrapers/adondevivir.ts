import * as cheerio from 'cheerio';
import { BaseScraper, type SelectorConfig } from './base';
import type { AlertParams, NormalizedListing } from '@/types';
import { parsePrice } from '@/lib/utils/price';
import { normalizeAddress } from '@/lib/utils/fingerprint';
import selectors from '@/lib/selectors/adondevivir.json';

export class AdondevivirScraper extends BaseScraper {
  readonly sourceName = 'ADONDEVIVIR' as const;
  readonly baseUrl = 'https://www.adondevivir.com';
  readonly selectors: SelectorConfig = selectors;

  buildSearchUrl(params: AlertParams, page = 1): string {
    const transaction = params.transactionType === 'RENT' ? 'alquiler' : 'venta';
    const city = params.city?.toLowerCase() || 'lima';
    const location = params.neighborhood
      ? params.neighborhood.toLowerCase().replace(/\s+/g, '-')
      : city;

    let slug = `departamentos-en-${transaction}-en-${location}`;

    const filters: string[] = [];
    if (params.maxPrice) {
      filters.push(`hasta-${params.maxPrice}-soles`);
    }
    if (params.minBedrooms) {
      filters.push(`con-${params.minBedrooms}-dormitorios`);
    }

    if (filters.length > 0) {
      slug += `-${filters.join('-')}`;
    }

    let url = `${this.baseUrl}/${slug}.html`;

    if (page > 1) {
      url = `${this.baseUrl}/${slug}-pagina-${page}.html`;
    }

    return url;
  }

  /**
   * Override scrapeAll to detect Cloudflare protection.
   * Adondevivir is behind Cloudflare managed challenge which
   * cannot be solved with plain HTTP fetch + Cheerio.
   */
  async scrapeAll(params: AlertParams): Promise<NormalizedListing[]> {
    const searchUrl = this.buildSearchUrl(params, 1);
    console.log(`[${this.sourceName}] FETCHING_SEARCH: ${searchUrl}`);

    const html = await this.fetchWithRetry(searchUrl, 1); // Only 1 retry for blocked sites
    if (!html) {
      console.log(`[${this.sourceName}] SCRAPE_BLOCKED: Cloudflare protection detected. Skipping this source.`);
      return [];
    }

    // If we somehow got through, try to parse
    const $ = cheerio.load(html);
    const listings = this.parseListingsFromSearch($, params);

    if (listings.length > 0) {
      console.log(`[${this.sourceName}] FOUND_LISTINGS: ${listings.length}`);
    } else {
      console.log(`[${this.sourceName}] NO_RESULTS: Could not parse listings from search page`);
    }

    return listings;
  }

  /**
   * Try to parse listings from search results if Cloudflare passes through.
   */
  private parseListingsFromSearch(
    $: cheerio.CheerioAPI,
    params: AlertParams
  ): NormalizedListing[] {
    const listings: NormalizedListing[] = [];

    // Try several possible card selectors (site structure unknown due to Cloudflare)
    const cardSelectors = [
      '.listing-card', '.property-card', '.result-item', 'article.listing',
      '[class*="postingCard"]', '[class*="card-container"]', '[data-qa^="posting"]',
      '.avisos-item', '.aviso', '[class*="aviso"]',
    ];

    let matchedSelector = '';
    for (const sel of cardSelectors) {
      if ($(sel).length > 0) {
        matchedSelector = sel;
        console.log(`[${this.sourceName}] DISCOVERED_SELECTOR: ${sel} (${$(sel).length} cards)`);
        break;
      }
    }

    if (!matchedSelector) return listings;

    $(matchedSelector).each((_, element) => {
      try {
        const $card = $(element);

        const canonicalUrl = $card.find('a').first().attr('href');
        if (!canonicalUrl) return;
        const fullUrl = this.normalizeUrl(canonicalUrl.split('?')[0]);

        const title = $card.find('h2, h3, .title, [class*="title"]').first().text().trim();
        if (!title) return;

        const priceText = $card.find('[class*="price"], .precio').first().text().trim();
        const priceData = parsePrice(priceText);
        if (!priceData) return;

        const transactionType = params.transactionType ||
          (fullUrl.includes('alquiler') ? 'RENT' as const : 'BUY' as const);

        const city = params.city || 'Lima';
        const addressParts = [city, title].filter(Boolean);
        const normalizedAddr = normalizeAddress(addressParts.join(' '));
        const fingerprintHash = this.createFingerprint(normalizedAddr, priceData.price, undefined, undefined);

        listings.push({
          sourceName: this.sourceName,
          canonicalUrl: fullUrl,
          title,
          price: priceData.price,
          currency: priceData.currency,
          transactionType,
          city,
          scrapedAt: new Date(),
          fingerprintHash,
        });
      } catch (error) {
        // Skip card on error
      }
    });

    return listings;
  }

  protected parseListing(
    $: cheerio.CheerioAPI,
    url: string
  ): NormalizedListing | null {
    const title = this.extractText($, 'h1');
    if (!title) {
      console.log(`[${this.sourceName}] MISSING_TITLE: ${url}`);
      return null;
    }

    const priceText = this.extractText($, '[class*="price"], .precio');
    const priceData = parsePrice(priceText);
    if (!priceData) {
      console.log(`[${this.sourceName}] MISSING_PRICE: ${url}`);
      return null;
    }

    const transactionType = url.includes('alquiler') ? 'RENT' as const : 'BUY' as const;
    const city = this.extractCity(url);
    const addressParts = [city, title].filter(Boolean);
    const normalizedAddr = normalizeAddress(addressParts.join(' '));
    const fingerprintHash = this.createFingerprint(normalizedAddr, priceData.price, undefined, undefined);

    return {
      sourceName: this.sourceName,
      canonicalUrl: url,
      title,
      price: priceData.price,
      currency: priceData.currency,
      transactionType,
      city,
      scrapedAt: new Date(),
      fingerprintHash,
    };
  }

  private extractCity(url: string): string {
    const cityPatterns = [
      'lima', 'arequipa', 'trujillo', 'chiclayo', 'piura',
      'cusco', 'iquitos', 'huancayo', 'tacna', 'pucallpa'
    ];

    const urlLower = url.toLowerCase();
    for (const city of cityPatterns) {
      if (urlLower.includes(`/${city}/`) || urlLower.includes(`/${city}?`)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    return 'Lima';
  }
}

export const adondevivirScraper = new AdondevivirScraper();
