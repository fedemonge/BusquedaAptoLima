import * as cheerio from 'cheerio';
import { BaseScraper, type SelectorConfig } from './base';
import type { AlertParams, NormalizedListing } from '@/types';
import { parsePrice } from '@/lib/utils/price';
import { normalizeAddress } from '@/lib/utils/fingerprint';
import { randomDelay } from '@/lib/utils/delay';
import { SCRAPER_CONFIG } from '@/lib/config/constants';
import selectors from '@/lib/selectors/properati.json';

export class ProperatiScraper extends BaseScraper {
  readonly sourceName = 'PROPERATI' as const;
  readonly baseUrl = 'https://www.properati.com.pe';
  readonly selectors: SelectorConfig = selectors;

  buildSearchUrl(params: AlertParams, page = 1): string {
    const pathParts: string[] = ['s'];

    const city = params.city?.toLowerCase() || 'lima';
    pathParts.push(city);
    pathParts.push('departamento');

    if (params.transactionType === 'RENT') {
      pathParts.push('alquiler');
    } else {
      pathParts.push('venta');
    }

    let url = `${this.baseUrl}/${pathParts.join('/')}`;

    // Properati uses path segments for pagination: /s/lima/departamento/alquiler/2
    if (page > 1) {
      url += `/${page}`;
    }

    // Query parameters for filters
    const queryParams: string[] = [];
    if (params.maxPrice) {
      queryParams.push(`price_to=${params.maxPrice}`);
    }
    if (params.minSquareMeters) {
      queryParams.push(`surface_from=${params.minSquareMeters}`);
    }
    if (params.maxSquareMeters) {
      queryParams.push(`surface_to=${params.maxSquareMeters}`);
    }
    if (params.minBedrooms) {
      queryParams.push(`bedrooms=${params.minBedrooms}`);
    }
    if (params.neighborhood) {
      queryParams.push(`l2=${encodeURIComponent(params.neighborhood)}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    return url;
  }

  /**
   * Override scrapeAll to extract listings directly from search page cards.
   * Properati cards use article.snippet with data-url, data-test attributes.
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

      // Check for next page - Properati uses #pagination-next with data-islast
      const nextBtn = $('#pagination-next');
      if (nextBtn.length === 0 || nextBtn.attr('data-islast') === 'true') {
        break;
      }

      page++;
      await randomDelay();
    }

    return listings.slice(0, SCRAPER_CONFIG.MAX_LISTINGS_PER_SOURCE);
  }

  /**
   * Parse listings from search results page.
   * Each card is <article class="snippet" data-url="..." data-idanuncio="...">
   */
  private parseListingsFromSearch(
    $: cheerio.CheerioAPI,
    params: AlertParams
  ): NormalizedListing[] {
    const listings: NormalizedListing[] = [];

    $('article.snippet').each((_, element) => {
      try {
        const $card = $(element);

        // Get canonical URL from data-url attribute
        const canonicalUrl = $card.attr('data-url');
        if (!canonicalUrl) return;

        // Extract title from the link
        const title = $card.find('a.title, [data-test="snippet__title"]').text().trim();
        if (!title) return;

        // Extract price
        const priceText = $card.find('[data-test="snippet__price"], div.price').text().trim();
        const priceData = parsePrice(priceText);
        if (!priceData) return;

        // Extract features
        const bedroomsText = $card.find('[data-test="bedrooms-value"], span.properties__bedrooms').text().trim();
        const bedrooms = this.extractInt(bedroomsText);

        const bathroomsText = $card.find('[data-test="full-bathrooms-value"], span.properties__bathrooms').text().trim();
        const bathrooms = this.extractInt(bathroomsText);

        const areaText = $card.find('[data-test="area-value"], span.properties__area').text().trim();
        const squareMeters = this.extractNumber(areaText);

        const parkingText = $card.find('[data-test="principal-amenity-value"], span.properties__amenity__car_park').text().trim();
        const parking = parkingText.toLowerCase().includes('cochera') ? 1 : this.extractInt(parkingText);

        // Extract location - "Santiago de Surco, Lima Centro, Lima, Lima"
        const locationText = $card.find('[data-test="snippet__location"], div.location').text().trim();
        const locationParts = locationText.split(',').map(s => s.trim());
        const neighborhood = locationParts[0] || undefined;
        const city = locationParts.length >= 3 ? locationParts[2] : (params.city || 'Lima');

        // Extract image
        const imageUrl = $card.find('.snippet__image img, .swiper-slide img').first().attr('src') || undefined;

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
    const title = this.extractText($, 'h1.title, a.title, [data-test="snippet__title"]');
    if (!title) {
      console.log(`[${this.sourceName}] MISSING_TITLE: ${url}`);
      return null;
    }

    const priceText = this.extractText($, '[data-test="snippet__price"], div.price, .price');
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
      if (urlLower.includes(`/s/${city}/`) || urlLower.includes(`/${city}/`)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    return 'Lima';
  }
}

export const properatiScraper = new ProperatiScraper();
