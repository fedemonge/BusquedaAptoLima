import type { AlertParams, NormalizedListing, ScraperResult, SourceName } from '@/types';
import { ENABLED_SOURCES } from '@/lib/config/constants';
import { randomDelay } from '@/lib/utils/delay';
import { adondevivirScraper } from './adondevivir';
import { urbaniaScraper } from './urbania';
import { properatiScraper } from './properati';
import { mercadoLibreScraper } from './mercadolibre';
import type { BaseScraper } from './base';

// Registry of all scrapers
const scraperRegistry: Record<SourceName, BaseScraper> = {
  ADONDEVIVIR: adondevivirScraper,
  URBANIA: urbaniaScraper,
  PROPERATI: properatiScraper,
  MERCADOLIBRE: mercadoLibreScraper,
};

/**
 * Get a specific scraper by source name.
 */
export function getScraper(source: SourceName): BaseScraper {
  return scraperRegistry[source];
}

/**
 * Get all enabled scrapers.
 */
export function getEnabledScrapers(): BaseScraper[] {
  return ENABLED_SOURCES.map((source) => scraperRegistry[source]);
}

/**
 * Run a single scraper and return results.
 */
export async function runScraper(
  source: SourceName,
  params: AlertParams
): Promise<ScraperResult> {
  const scraper = getScraper(source);
  const startTime = Date.now();
  const listings: NormalizedListing[] = [];

  try {
    console.log(`[${source}] STARTING_SCRAPE`);

    // Fetch search results (listing URLs)
    const urls = await scraper.fetchSearchResults(params);
    console.log(`[${source}] FOUND_URLS: ${urls.length}`);

    // Fetch details for each listing
    for (const url of urls) {
      try {
        const listing = await scraper.fetchListingDetails(url);
        if (listing) {
          // Apply keyword filters
          if (matchesKeywords(listing, params)) {
            listings.push(listing);
          }
        }
        await randomDelay();
      } catch (error) {
        console.log(`[${source}] LISTING_ERROR: ${url} - ${error}`);
        // Continue with other listings
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[${source}] COMPLETED: ${listings.length} listings in ${duration}ms`);

    return {
      source,
      success: true,
      listings,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    console.log(`[${source}] FAILED: ${errorMsg}`);

    return {
      source,
      success: false,
      listings: [],
      error: errorMsg,
      duration,
    };
  }
}

/**
 * Run all enabled scrapers for given params.
 * Scrapers run sequentially to respect rate limits.
 */
export async function runAllScrapers(
  params: AlertParams
): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];

  for (const source of ENABLED_SOURCES) {
    const result = await runScraper(source, params);
    results.push(result);

    // Delay between sources
    if (ENABLED_SOURCES.indexOf(source) < ENABLED_SOURCES.length - 1) {
      await randomDelay();
    }
  }

  return results;
}

/**
 * Check if a listing matches keyword filters.
 */
function matchesKeywords(
  listing: NormalizedListing,
  params: AlertParams
): boolean {
  const searchText = [
    listing.title,
    listing.neighborhood,
    listing.city,
  ].filter(Boolean).join(' ').toLowerCase();

  // Check include keywords (at least one must match if specified)
  if (params.keywordsInclude && params.keywordsInclude.length > 0) {
    const hasInclude = params.keywordsInclude.some(
      (keyword) => searchText.includes(keyword.toLowerCase())
    );
    if (!hasInclude) return false;
  }

  // Check exclude keywords (none must match)
  if (params.keywordsExclude && params.keywordsExclude.length > 0) {
    const hasExclude = params.keywordsExclude.some(
      (keyword) => searchText.includes(keyword.toLowerCase())
    );
    if (hasExclude) return false;
  }

  // Check price filter
  if (params.maxPrice && listing.price > params.maxPrice) {
    return false;
  }

  // Check square meters
  if (params.minSquareMeters && listing.squareMeters) {
    if (listing.squareMeters < params.minSquareMeters) return false;
  }
  if (params.maxSquareMeters && listing.squareMeters) {
    if (listing.squareMeters > params.maxSquareMeters) return false;
  }

  // Check bedrooms
  if (params.minBedrooms && listing.bedrooms) {
    if (listing.bedrooms < params.minBedrooms) return false;
  }

  // Check parking
  if (params.minParking && listing.parking) {
    if (listing.parking < params.minParking) return false;
  }

  return true;
}

export { adondevivirScraper, urbaniaScraper, properatiScraper, mercadoLibreScraper };
