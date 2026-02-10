import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { runAllScrapers } from '@/lib/scrapers';
import type { AlertParams, NormalizedListing, SourceName } from '@/types';

const RunSchema = z.object({
  email: z.string().email(),
  alertId: z.string().min(1),
});

/**
 * Run scrapers on demand for a specific alert.
 * POST /api/alerts/run
 * Body: { email: string, alertId: string }
 *
 * Returns scraper results without writing to DB or sending email.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const result = RunSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { email, alertId } = result.data;

    // Verify alert belongs to the email
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, email, status: 'ACTIVE' },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found or not active' },
        { status: 404 }
      );
    }

    const params: AlertParams = {
      transactionType: alert.transactionType as 'RENT' | 'BUY',
      city: alert.city,
      neighborhood: alert.neighborhood || undefined,
      maxPrice: alert.maxPrice || undefined,
      minSquareMeters: alert.minSquareMeters || undefined,
      maxSquareMeters: alert.maxSquareMeters || undefined,
      minBedrooms: alert.minBedrooms || undefined,
      minParking: alert.minParking || undefined,
      propertyTypes: alert.propertyTypes.length > 0 ? alert.propertyTypes : undefined,
      keywordsInclude: alert.keywordsInclude,
      keywordsExclude: alert.keywordsExclude,
    };

    console.log(`[RUN] Starting on-demand scrape for alert ${alertId}`);
    const startTime = Date.now();

    const scraperResults = await runAllScrapers(params);

    const duration = Date.now() - startTime;
    const allListings: NormalizedListing[] = [];
    const summary: Record<string, { success: boolean; count: number; error?: string; duration: number }> = {};

    for (const r of scraperResults) {
      summary[r.source] = {
        success: r.success,
        count: r.listings.length,
        error: r.error,
        duration: r.duration,
      };
      allListings.push(...r.listings);
    }

    console.log(`[RUN] Completed: ${allListings.length} listings in ${duration}ms`);

    return NextResponse.json({
      success: true,
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
  } catch (error) {
    console.error('[RUN] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run scraper' },
      { status: 500 }
    );
  }
}
