import * as cheerio from 'cheerio';
import { BaseScraper, type SelectorConfig } from './base';
import type { AlertParams, NormalizedListing } from '@/types';
import { parsePrice } from '@/lib/utils/price';
import { normalizeAddress } from '@/lib/utils/fingerprint';
import { randomDelay } from '@/lib/utils/delay';
import { SCRAPER_CONFIG } from '@/lib/config/constants';
import selectors from '@/lib/selectors/urbania.json';

export class UrbaniaScraper extends BaseScraper {
  readonly sourceName = 'URBANIA' as const;
  readonly baseUrl = 'https://urbania.pe';
  readonly selectors: SelectorConfig = selectors;

  buildSearchUrl(params: AlertParams, page = 1): string {
    const transaction = params.transactionType === 'RENT' ? 'alquiler' : 'venta';
    const city = params.city?.toLowerCase() || 'lima';

    let slug = `${transaction}-de-departamentos-en-${city}`;

    if (params.neighborhood) {
      const neighborhood = params.neighborhood.toLowerCase().replace(/\s+/g, '-');
      slug += `--${neighborhood}`;
    }

    let url = `${this.baseUrl}/buscar/${slug}`;

    // Urbania filter query params cause redirects and potential Cloudflare blocks.
    // Price/sqm/bedroom filters are applied client-side by matchesKeywords.
    if (page > 1) {
      url += `?pagina=${page}`;
    }

    return url;
  }

  /**
   * Override scrapeAll to extract listings directly from search page cards.
   * Urbania cards contain all needed data (price, features, location, images).
   */
  async scrapeAll(params: AlertParams): Promise<NormalizedListing[]> {
    const listings: NormalizedListing[] = [];
    let page = 1;
    const maxPages = 5;

    while (page <= maxPages && listings.length < SCRAPER_CONFIG.MAX_LISTINGS_PER_SOURCE) {
      const searchUrl = this.buildSearchUrl(params, page);
      console.log(`[${this.sourceName}] FETCHING_SEARCH: page ${page} - ${searchUrl}`);

      const html = await this.fetchWithRetry(searchUrl);
      if (!html) {
        console.log(`[${this.sourceName}] SEARCH_FAILED: Could not fetch page ${page}`);
        break;
      }

      const $ = cheerio.load(html);
      const pageListings = this.parseListingsFromSearch($, params);

      if (pageListings.length === 0) {
        console.log(`[${this.sourceName}] NO_MORE_RESULTS: page ${page}`);
        break;
      }

      listings.push(...pageListings);
      console.log(`[${this.sourceName}] FOUND_LISTINGS: ${pageListings.length} on page ${page}`);

      // Check for next page
      if ($('[data-qa="PAGING_NEXT"]').length === 0) {
        break;
      }

      page++;
      await randomDelay();
    }

    return listings.slice(0, SCRAPER_CONFIG.MAX_LISTINGS_PER_SOURCE);
  }

  /**
   * Parse all listings from a search results page.
   * Each card div has data-qa="posting PROPERTY" or "posting DEVELOPMENT"
   * with data-to-posting attribute for the URL.
   */
  private parseListingsFromSearch(
    $: cheerio.CheerioAPI,
    params: AlertParams
  ): NormalizedListing[] {
    const listings: NormalizedListing[] = [];

    $('[data-qa^="posting"]').each((_, element) => {
      try {
        const $card = $(element);

        // Get URL from data-to-posting attribute
        const relativeUrl = $card.attr('data-to-posting');
        if (!relativeUrl) return;

        // Strip tracking query params to get canonical URL
        const canonicalUrl = `${this.baseUrl}${relativeUrl.split('?')[0]}`;

        // Extract title from description link
        const title = $card.find('[data-qa="POSTING_CARD_DESCRIPTION"] a').text().trim()
          || $card.find('[data-qa="POSTING_CARD_DESCRIPTION"]').text().trim();
        if (!title) return;

        // Extract price - Urbania shows "S/ 4,509 · USD 1,350" format
        const priceText = $card.find('[data-qa="POSTING_CARD_PRICE"]').text().trim();
        // Take the first price segment (usually PEN)
        const firstPrice = priceText.split('·')[0].trim();
        const priceData = parsePrice(firstPrice);
        if (!priceData) return;

        // Extract features from feature spans
        let squareMeters: number | undefined;
        let bedrooms: number | undefined;
        let bathrooms: number | undefined;
        let parking: number | undefined;

        $card.find('[data-qa="POSTING_CARD_FEATURES"] span').each((_, feat) => {
          const text = $(feat).text().trim().toLowerCase();
          if (text.includes('m²') || text.includes('m2')) {
            squareMeters = this.extractNumber(text);
          } else if (text.includes('dorm')) {
            bedrooms = this.extractInt(text);
          } else if (text.includes('baño')) {
            bathrooms = this.extractInt(text);
          } else if (text.includes('estac') || text.includes('cochera')) {
            parking = this.extractInt(text);
          }
        });

        // Extract location - "Miraflores, Lima"
        const locationText = $card.find('[data-qa="POSTING_CARD_LOCATION"]').text().trim();
        const locationParts = locationText.split(',').map(s => s.trim());
        const neighborhood = locationParts[0] || undefined;
        const city = locationParts[1] || params.city || 'Lima';

        // Extract image
        const imageUrl = $card.find('[data-qa="POSTING_CARD_GALLERY"] img').first().attr('src') || undefined;

        // Transaction type from params or URL
        const transactionType = params.transactionType ||
          (canonicalUrl.includes('alquiler') ? 'RENT' as const : 'BUY' as const);

        // Create fingerprint
        const addressParts = [city, neighborhood, title].filter(Boolean);
        const normalizedAddr = normalizeAddress(addressParts.join(' '));
        const fingerprintHash = this.createFingerprint(
          normalizedAddr, priceData.price, squareMeters, bedrooms
        );

        listings.push({
          sourceName: this.sourceName,
          canonicalUrl,
          title,
          price: priceData.price,
          currency: priceData.currency,
          transactionType,
          city,
          neighborhood,
          squareMeters,
          bedrooms,
          bathrooms,
          parking,
          imageUrl,
          scrapedAt: new Date(),
          fingerprintHash,
        });
      } catch (error) {
        // Skip this card on error, continue with others
      }
    });

    return listings;
  }

  // Keep parseListing for detail page fallback (not used by scrapeAll)
  protected parseListing(
    $: cheerio.CheerioAPI,
    url: string
  ): NormalizedListing | null {
    const title = this.extractText($, 'h1');
    if (!title) {
      console.log(`[${this.sourceName}] MISSING_TITLE: ${url}`);
      return null;
    }

    const priceText = this.extractText($, '[data-qa="POSTING_CARD_PRICE"], .price');
    const firstPrice = priceText.split('·')[0].trim();
    const priceData = parsePrice(firstPrice);
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
      if (urlLower.includes(`-${city}`) || urlLower.includes(`en-${city}`)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    return 'Lima';
  }
}

export const urbaniaScraper = new UrbaniaScraper();
