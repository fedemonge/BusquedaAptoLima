import * as cheerio from 'cheerio';
import { BaseScraper, type SelectorConfig } from './base';
import type { AlertParams, NormalizedListing } from '@/types';
import { parsePrice } from '@/lib/utils/price';
import { normalizeAddress } from '@/lib/utils/fingerprint';
import selectors from '@/lib/selectors/mercadolibre.json';

export class MercadoLibreScraper extends BaseScraper {
  readonly sourceName = 'MERCADOLIBRE' as const;
  readonly baseUrl = 'https://inmuebles.mercadolibre.com.pe';
  readonly selectors: SelectorConfig = selectors;

  buildSearchUrl(params: AlertParams, page = 1): string {
    // Mercado Libre URL: /departamentos/alquiler/lima/
    const pathParts: string[] = [];

    // Property type
    pathParts.push('departamentos');

    // Transaction type
    if (params.transactionType === 'RENT') {
      pathParts.push('alquiler');
    } else {
      pathParts.push('venta');
    }

    // City
    const city = params.city?.toLowerCase() || 'lima';
    pathParts.push(city);

    let url = `${this.baseUrl}/${pathParts.join('/')}`;

    // Add filters to URL path (ML uses path-based filters)
    const filters: string[] = [];

    if (params.minBedrooms) {
      filters.push(`${params.minBedrooms}-dormitorios`);
    }
    if (params.minSquareMeters) {
      filters.push(`desde-${params.minSquareMeters}-m2`);
    }
    if (params.maxSquareMeters) {
      filters.push(`hasta-${params.maxSquareMeters}-m2`);
    }

    if (filters.length > 0) {
      url += `/${filters.join('_')}`;
    }

    // Query parameters
    const queryParams: string[] = [];

    if (params.maxPrice) {
      queryParams.push(`precio-hasta=${params.maxPrice}`);
    }
    if (params.neighborhood) {
      queryParams.push(`barrio=${encodeURIComponent(params.neighborhood)}`);
    }

    // Pagination - ML uses _Desde_X format
    if (page > 1) {
      const offset = (page - 1) * 48 + 1; // ML shows 48 per page
      url += `_Desde_${offset}`;
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

    // Extract price - ML has a specific structure
    let priceText = this.extractText($, listingPage.price);

    // ML sometimes splits price and currency
    const currencySymbol = this.extractText($, listingPage.currency || '');
    if (currencySymbol && !priceText.includes(currencySymbol)) {
      priceText = `${currencySymbol} ${priceText}`;
    }

    const priceData = parsePrice(priceText);
    if (!priceData) {
      console.log(`[${this.sourceName}] MISSING_PRICE: ${url}`);
      return null;
    }

    // Determine transaction type from URL
    const transactionType = url.includes('alquiler')
      ? 'RENT' as const
      : 'BUY' as const;

    // Extract features from specs table
    const squareMeters = this.extractFeature($, ['superficie', 'área', 'm²', 'metros']);
    const bedrooms = this.extractFeature($, ['dormitorio', 'habitacion', 'recámara']);
    const bathrooms = this.extractFeature($, ['baño']);
    const parking = this.extractFeature($, ['estacionamiento', 'cochera', 'garage']);

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

  // ML stores features in table rows - search by label text
  private extractFeature($: cheerio.CheerioAPI, keywords: string[]): number | undefined {
    for (const keyword of keywords) {
      // Try to find in specs table
      const specRow = $(`tr:contains("${keyword}"), .ui-pdp-specs__table tr:contains("${keyword}")`).first();
      if (specRow.length) {
        const valueText = specRow.find('td').last().text() ||
          specRow.find('.ui-pdp-specs__value').text();
        const num = this.extractInt(valueText);
        if (num !== undefined) return num;
      }

      // Try data attributes
      const dataEl = $(`[class*="${keyword}"]`).first();
      if (dataEl.length) {
        const num = this.extractInt(dataEl.text());
        if (num !== undefined) return num;
      }
    }
    return undefined;
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
