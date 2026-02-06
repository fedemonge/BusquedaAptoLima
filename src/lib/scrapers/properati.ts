import * as cheerio from 'cheerio';
import { BaseScraper, type SelectorConfig } from './base';
import type { AlertParams, NormalizedListing } from '@/types';
import { parsePrice } from '@/lib/utils/price';
import { normalizeAddress } from '@/lib/utils/fingerprint';
import selectors from '@/lib/selectors/properati.json';

export class ProperatiScraper extends BaseScraper {
  readonly sourceName = 'PROPERATI' as const;
  readonly baseUrl = 'https://www.properati.com.pe';
  readonly selectors: SelectorConfig = selectors;

  buildSearchUrl(params: AlertParams, page = 1): string {
    // Properati URL structure: /s/lima/departamento/alquiler
    const pathParts: string[] = ['s'];

    // City
    const city = params.city?.toLowerCase() || 'lima';
    pathParts.push(city);

    // Property type
    pathParts.push('departamento');

    // Transaction type
    if (params.transactionType === 'RENT') {
      pathParts.push('alquiler');
    } else {
      pathParts.push('venta');
    }

    let url = `${this.baseUrl}/${pathParts.join('/')}`;

    // Query parameters
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
    if (page > 1) {
      queryParams.push(`page=${page}`);
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

    // Extract title
    const title = this.extractText($, listingPage.title);
    if (!title) {
      console.log(`[${this.sourceName}] MISSING_TITLE: ${url}`);
      return null;
    }

    // Extract price
    const priceText = this.extractText($, listingPage.price);
    const priceData = parsePrice(priceText);
    if (!priceData) {
      console.log(`[${this.sourceName}] MISSING_PRICE: ${url}`);
      return null;
    }

    // Determine transaction type
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

    const city = this.extractCity(url);

    // Create fingerprint
    const addressParts = [city, neighborhood, title].filter(Boolean);
    const normalizedAddr = normalizeAddress(addressParts.join(' '));

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
