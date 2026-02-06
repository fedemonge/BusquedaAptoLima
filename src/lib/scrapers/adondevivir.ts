import * as cheerio from 'cheerio';
import { BaseScraper, type SelectorConfig } from './base';
import type { AlertParams, NormalizedListing, Currency } from '@/types';
import { parsePrice } from '@/lib/utils/price';
import { normalizeAddress } from '@/lib/utils/fingerprint';
import selectors from '@/lib/selectors/adondevivir.json';

export class AdondevivirScraper extends BaseScraper {
  readonly sourceName = 'ADONDEVIVIR' as const;
  readonly baseUrl = 'https://www.adondevivir.com';
  readonly selectors: SelectorConfig = selectors;

  buildSearchUrl(params: AlertParams, page = 1): string {
    const pathParts: string[] = [];

    // Transaction type
    if (params.transactionType === 'RENT') {
      pathParts.push('alquiler');
    } else {
      pathParts.push('venta');
    }

    // Property type (default to departamentos)
    pathParts.push('departamentos');

    // Location
    const city = params.city?.toLowerCase() || 'lima';
    pathParts.push(city);

    if (params.neighborhood) {
      pathParts.push(params.neighborhood.toLowerCase().replace(/\s+/g, '-'));
    }

    // Build URL
    let url = `${this.baseUrl}/${pathParts.join('/')}`;

    // Add query parameters
    const queryParams: string[] = [];

    if (params.maxPrice) {
      queryParams.push(`precio-max=${params.maxPrice}`);
    }
    if (params.minSquareMeters) {
      queryParams.push(`area-min=${params.minSquareMeters}`);
    }
    if (params.maxSquareMeters) {
      queryParams.push(`area-max=${params.maxSquareMeters}`);
    }
    if (params.minBedrooms) {
      queryParams.push(`dormitorios-min=${params.minBedrooms}`);
    }
    if (page > 1) {
      queryParams.push(`pagina=${page}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    return url;
  }

  protected parseListing(
    $: cheerio.CheerioAPI,
    url: string
  ): NormalizedListing | null {
    const { listingPage } = this.selectors;

    // Extract title (required)
    const title = this.extractText($, listingPage.title);
    if (!title) {
      console.log(`[${this.sourceName}] MISSING_TITLE: ${url}`);
      return null;
    }

    // Extract price (required)
    const priceText = this.extractText($, listingPage.price);
    const priceData = parsePrice(priceText);
    if (!priceData) {
      console.log(`[${this.sourceName}] MISSING_PRICE: ${url}`);
      return null;
    }

    // Determine transaction type from URL or page content
    const transactionType = url.includes('alquiler') ||
      $('body').text().toLowerCase().includes('alquiler')
      ? 'RENT' as const
      : 'BUY' as const;

    // Extract optional fields
    const squareMetersText = this.extractText($, listingPage.squareMeters || '');
    const squareMeters = this.extractNumber(squareMetersText);

    const bedroomsText = this.extractText($, listingPage.bedrooms || '');
    const bedrooms = this.extractInt(bedroomsText);

    const bathroomsText = this.extractText($, listingPage.bathrooms || '');
    const bathrooms = this.extractInt(bathroomsText);

    const parkingText = this.extractText($, listingPage.parking || '');
    const parking = this.extractInt(parkingText);

    const neighborhood = this.extractText($, listingPage.neighborhood || '') || undefined;

    const imageUrl = $(listingPage.imageUrl || '').first().attr('src') || undefined;

    // Extract city from URL or content
    const city = this.extractCity(url);

    // Create normalized address for fingerprinting
    const addressParts = [city, neighborhood, title].filter(Boolean);
    const normalizedAddr = normalizeAddress(addressParts.join(' '));

    // Generate fingerprint
    const fingerprintHash = this.createFingerprint(
      normalizedAddr,
      priceData.price,
      squareMeters,
      bedrooms
    );

    return {
      sourceName: this.sourceName,
      canonicalUrl: url,
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
    };
  }

  private extractCity(url: string): string {
    // Try to extract city from URL path
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

    return 'Lima'; // Default
  }
}

// Export singleton instance
export const adondevivirScraper = new AdondevivirScraper();
