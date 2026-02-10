import { NextRequest, NextResponse } from 'next/server';
import { runAllScrapers, runSelectedScrapers } from '@/lib/scrapers';
import type { AlertParams, SourceName, NormalizedListing, ScraperResult } from '@/types';

/**
 * On-demand scraping endpoint.
 * Runs scrapers with given parameters and returns results directly (no DB, no email).
 * Useful for testing, debugging, and ad-hoc searches.
 *
 * POST /api/scrape
 * Authorization: Bearer {CRON_SECRET}
 * Body: {
 *   transactionType: "RENT" | "BUY",
 *   city: "Lima",
 *   neighborhood?: string,
 *   maxPrice?: number,
 *   minBedrooms?: number,
 *   sources?: ["URBANIA", "PROPERATI", ...],  // optional, defaults to all enabled
 * }
 *
 * GET /api/scrape?transactionType=RENT&city=Lima&sources=URBANIA,PROPERATI
 */

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const body = await request.json();

    const params: AlertParams = {
      transactionType: body.transactionType || 'RENT',
      city: body.city || 'Lima',
      neighborhood: body.neighborhood,
      maxPrice: body.maxPrice,
      minSquareMeters: body.minSquareMeters,
      maxSquareMeters: body.maxSquareMeters,
      minBedrooms: body.minBedrooms,
      minParking: body.minParking,
      keywordsInclude: body.keywordsInclude,
      keywordsExclude: body.keywordsExclude,
    };

    let results: ScraperResult[];

    if (body.sources && Array.isArray(body.sources) && body.sources.length > 0) {
      results = await runSelectedScrapers(body.sources as SourceName[], params);
    } else {
      results = await runAllScrapers(params);
    }

    const duration = Date.now() - startTime;
    return formatResponse(results, params, duration);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;

  try {
    const params: AlertParams = {
      transactionType: (searchParams.get('transactionType') as 'RENT' | 'BUY') || 'RENT',
      city: searchParams.get('city') || 'Lima',
      neighborhood: searchParams.get('neighborhood') || undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
      minBedrooms: searchParams.get('minBedrooms') ? parseInt(searchParams.get('minBedrooms')!) : undefined,
    };

    const sourcesParam = searchParams.get('sources');
    let results: ScraperResult[];

    if (sourcesParam) {
      const sources = sourcesParam.split(',').map(s => s.trim().toUpperCase()) as SourceName[];
      results = await runSelectedScrapers(sources, params);
    } else {
      results = await runAllScrapers(params);
    }

    const duration = Date.now() - startTime;
    return formatResponse(results, params, duration);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape' },
      { status: 500 }
    );
  }
}

function formatResponse(
  results: ScraperResult[],
  params: AlertParams,
  duration: number
): NextResponse {
  const allListings: NormalizedListing[] = [];
  const summary: Record<string, { success: boolean; count: number; error?: string; duration: number }> = {};

  for (const result of results) {
    summary[result.source] = {
      success: result.success,
      count: result.listings.length,
      error: result.error,
      duration: result.duration,
    };
    allListings.push(...result.listings);
  }

  return NextResponse.json({
    success: true,
    params,
    duration,
    totalListings: allListings.length,
    summary,
    listings: allListings.map(l => ({
      source: l.sourceName,
      title: l.title,
      price: l.price,
      currency: l.currency,
      city: l.city,
      neighborhood: l.neighborhood,
      squareMeters: l.squareMeters,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      parking: l.parking,
      url: l.canonicalUrl,
      imageUrl: l.imageUrl,
    })),
  });
}
