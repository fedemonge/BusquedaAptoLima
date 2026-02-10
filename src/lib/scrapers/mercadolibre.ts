import * as cheerio from 'cheerio';
import { BaseScraper, type SelectorConfig } from './base';
import type { AlertParams, NormalizedListing } from '@/types';
import { parsePrice } from '@/lib/utils/price';
import { normalizeAddress } from '@/lib/utils/fingerprint';
import { randomDelay } from '@/lib/utils/delay';
import { SCRAPER_CONFIG } from '@/lib/config/constants';
import selectors from '@/lib/selectors/mercadolibre.json';

export class MercadoLibreScraper extends BaseScraper {
  readonly sourceName = 'MERCADOLIBRE' as const;
  readonly baseUrl = 'https://listado.mercadolibre.com.pe';
  readonly selectors: SelectorConfig = selectors;

  buildSearchUrl(params: AlertParams, page = 1): string {
    const pathParts: string[] = ['inmuebles'];
    pathParts.push('departamentos');

    if (params.transactionType === 'RENT') {
      pathParts.push('alquiler');
    } else {
      pathParts.push('venta');
    }

    const city = params.city?.toLowerCase() || 'lima';
    pathParts.push(city);

    let url = `${this.baseUrl}/${pathParts.join('/')}/`;

    if (page > 1) {
      const offset = (page - 1) * 48 + 1;
      url = url.replace(/\/$/, `_Desde_${offset}`);
    }

    return url;
  }

  /**
   * Override scrapeAll to handle MercadoLibre's PoW bot challenge.
   * ML serves a proof-of-work JS challenge that plain fetch can't solve.
   * We detect and skip gracefully, logging the failure.
   */
  async scrapeAll(params: AlertParams): Promise<NormalizedListing[]> {
    const searchUrl = this.buildSearchUrl(params, 1);
    console.log(`[${this.sourceName}] FETCHING_SEARCH: ${searchUrl}`);

    const html = await this.fetchWithRetry(searchUrl);
    if (!html) {
      console.log(`[${this.sourceName}] SCRAPE_FAILED: Could not fetch search page`);
      return [];
    }

    // Check if ML served a PoW challenge (tiny HTML with _bmstate)
    if (html.length < 10000 && html.includes('_bmstate')) {
      console.log(`[${this.sourceName}] SCRAPE_BLOCKED: ML served proof-of-work bot challenge. Skipping.`);
      return [];
    }

    // If we got real content, try to parse it
    const $ = cheerio.load(html);
    const listings = this.parseListingsFromSearch($, params);

    if (listings.length > 0) {
      console.log(`[${this.sourceName}] FOUND_LISTINGS: ${listings.length} on page 1`);
    } else {
      console.log(`[${this.sourceName}] NO_RESULTS: Could not parse any listings from ML search page`);
    }

    return listings;
  }

  /**
   * Try to parse listings from ML search results if we get past the challenge.
   * ML uses poly-card, ui-search-result, and similar classes.
   */
  private parseListingsFromSearch(
    $: cheerio.CheerioAPI,
    params: AlertParams
  ): NormalizedListing[] {
    const listings: NormalizedListing[] = [];

    // ML uses several possible card selectors
    const cardSelectors = [
      '.ui-search-layout__item',
      'li.ui-search-layout__item',
      '.ui-search-result',
      '.poly-card',
      '[class*="poly-card"]',
    ];

    let matchedSelector = '';
    for (const sel of cardSelectors) {
      if ($(sel).length > 0) {
        matchedSelector = sel;
        break;
      }
    }

    if (!matchedSelector) return listings;

    $(matchedSelector).each((_, element) => {
      try {
        const $card = $(element);

        // Get listing URL
        const canonicalUrl = $card.find('a.ui-search-link, a.ui-search-result__link, a[href*="/MPE-"]').first().attr('href')
          || $card.find('a').first().attr('href');
        if (!canonicalUrl || !canonicalUrl.startsWith('http')) return;

        // Extract title
        const title = $card.find('.ui-search-item__title, .poly-component__title, h2').first().text().trim();
        if (!title) return;

        // Extract price
        const priceText = $card.find('.andes-money-amount__fraction, .price-tag-fraction, [class*="price"]').first().text().trim();
        const currencySymbol = $card.find('.andes-money-amount__currency-symbol, .price-tag-symbol').first().text().trim();
        const fullPrice = currencySymbol ? `${currencySymbol} ${priceText}` : priceText;
        const priceData = parsePrice(fullPrice);
        if (!priceData) return;

        // Extract attributes
        const attrs = $card.find('.ui-search-card-attributes__attribute, .poly-component__attributes li').map((_, el) => $(el).text().trim()).get();

        let squareMeters: number | undefined;
        let bedrooms: number | undefined;
        let bathrooms: number | undefined;
        let parking: number | undefined;

        for (const attr of attrs) {
          const lower = attr.toLowerCase();
          if (lower.includes('m²') || lower.includes('m2')) {
            squareMeters = this.extractNumber(attr);
          } else if (lower.includes('dorm') || lower.includes('hab') || lower.includes('recámara')) {
            bedrooms = this.extractInt(attr);
          } else if (lower.includes('baño')) {
            bathrooms = this.extractInt(attr);
          } else if (lower.includes('estac') || lower.includes('cochera') || lower.includes('garage')) {
            parking = this.extractInt(attr);
          }
        }

        // Extract location
        const locationText = $card.find('.ui-search-item__location, .poly-component__location, .ui-search-item__group__element').text().trim();
        const neighborhood = locationText || undefined;
        const city = params.city || 'Lima';

        // Extract image
        const imageUrl = $card.find('img.ui-search-result-image__element, img.poly-component__picture, img').first().attr('src')
          || $card.find('img').first().attr('data-src')
          || undefined;

        const transactionType = params.transactionType ||
          (canonicalUrl.includes('alquiler') ? 'RENT' as const : 'BUY' as const);

        const addressParts = [city, neighborhood, title].filter(Boolean);
        const normalizedAddr = normalizeAddress(addressParts.join(' '));
        const fingerprintHash = this.createFingerprint(
          normalizedAddr, priceData.price, squareMeters, bedrooms
        );

        listings.push({
          sourceName: this.sourceName,
          canonicalUrl: canonicalUrl.split('?')[0], // Strip tracking params
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
        // Skip card on error
      }
    });

    return listings;
  }

  // Keep parseListing for detail page fallback
  protected parseListing(
    $: cheerio.CheerioAPI,
    url: string
  ): NormalizedListing | null {
    const { listingPage } = this.selectors;

    const title = this.extractText($, listingPage.title);
    if (!title) {
      console.log(`[${this.sourceName}] MISSING_TITLE: ${url}`);
      return null;
    }

    let priceText = this.extractText($, listingPage.price);
    const currencySymbol = this.extractText($, listingPage.currency || '');
    if (currencySymbol && !priceText.includes(currencySymbol)) {
      priceText = `${currencySymbol} ${priceText}`;
    }

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
      if (urlLower.includes(`/${city}/`) || urlLower.includes(`/${city}-`)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    return 'Lima';
  }
}

export const mercadoLibreScraper = new MercadoLibreScraper();
