import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runAllScrapers } from '@/lib/scrapers';
import { sendDigestEmail, sendNoResultsEmail } from '@/lib/email';
import { logListingsToSheet, ensureSheetExists } from '@/lib/sheets';
import { generateUnsubscribeUrl } from '@/lib/utils/tokens';
import type { AlertParams, NormalizedListing, SourceName } from '@/types';
import { ENABLED_SOURCES } from '@/lib/config/constants';

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET not set, rejecting request');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Support running a specific alert on-demand via query param or body
  const alertId = request.nextUrl.searchParams.get('alertId');
  const sendEmail = request.nextUrl.searchParams.get('sendEmail') !== 'false'; // default true

  console.log(`[CRON] Starting ${alertId ? `on-demand job for alert ${alertId}` : 'daily job'}`);
  const startTime = Date.now();

  try {
    // Ensure Google Sheets is ready
    try {
      await ensureSheetExists();
    } catch (error) {
      console.error('[CRON] Failed to setup Google Sheets:', error);
      // Continue without sheets logging
    }

    // Get alerts - either specific one or all active
    const alerts = alertId
      ? await prisma.alert.findMany({ where: { id: alertId, status: 'ACTIVE' } })
      : await prisma.alert.findMany({ where: { status: 'ACTIVE' } });

    if (alertId && alerts.length === 0) {
      return NextResponse.json(
        { error: `Alert ${alertId} not found or not active` },
        { status: 404 }
      );
    }

    console.log(`[CRON] Processing ${alerts.length} active alerts`);

    const results = {
      alertsProcessed: 0,
      emailsSent: 0,
      errors: [] as string[],
    };

    // Process each alert
    for (const alert of alerts) {
      try {
        await processAlert(alert, sendEmail);
        results.alertsProcessed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CRON] Alert ${alert.id} failed:`, errorMsg);
        results.errors.push(`Alert ${alert.id}: ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CRON] Completed in ${duration}ms`, results);

    return NextResponse.json({
      success: true,
      duration,
      ...results,
    });
  } catch (error) {
    console.error('[CRON] Fatal error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

async function processAlert(alert: {
  id: string;
  email: string;
  transactionType: 'RENT' | 'BUY';
  city: string;
  neighborhood: string | null;
  maxPrice: number | null;
  minSquareMeters: number | null;
  maxSquareMeters: number | null;
  minBedrooms: number | null;
  minParking: number | null;
  propertyTypes: string[];
  keywordsInclude: string[];
  keywordsExclude: string[];
  sendNoResults: boolean;
}, shouldSendEmail = true): Promise<void> {
  console.log(`[CRON] Processing alert ${alert.id}`);

  // Build alert params
  const params: AlertParams = {
    transactionType: alert.transactionType,
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

  // Run scrapers
  const scraperResults = await runAllScrapers(params);

  // Collect all listings
  const allListings: NormalizedListing[] = [];
  const successfulSources: SourceName[] = [];

  for (const result of scraperResults) {
    if (result.success) {
      allListings.push(...result.listings);
      successfulSources.push(result.source);
    }
  }

  console.log(`[CRON] Alert ${alert.id}: Found ${allListings.length} total listings`);

  // Deduplicate and find new listings (with resolved DB IDs for reliable recording)
  const { newListings, allDeduped } = await deduplicateListings(
    alert.id,
    allListings
  );

  console.log(`[CRON] Alert ${alert.id}: ${newListings.length} new listings`);

  // Log to Google Sheets
  try {
    const newUrls = new Set(newListings.map((l) => l.canonicalUrl));
    const emailedUrls = new Set(newListings.map((l) => l.canonicalUrl)); // Will email all new
    await logListingsToSheet(alert.id, alert.email, allDeduped, newUrls, emailedUrls);
    console.log(`[CRON] Alert ${alert.id}: Sheets logging succeeded`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[CRON] Alert ${alert.id}: Sheets logging failed: ${errMsg}`);
    // Check for common issues
    if (errMsg.includes('GOOGLE_SHEETS_CREDENTIALS')) {
      console.error('[CRON] HINT: Set GOOGLE_SHEETS_CREDENTIALS env var on Vercel');
    } else if (errMsg.includes('GOOGLE_SHEET_ID')) {
      console.error('[CRON] HINT: Set GOOGLE_SHEET_ID env var on Vercel');
    }
  }

  // Generate unsubscribe URL
  const unsubscribeUrl = generateUnsubscribeUrl(alert.id);

  // Format date for Peru timezone
  const date = new Date().toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Send email (unless disabled for on-demand runs)
  if (shouldSendEmail) {
    if (newListings.length > 0) {
      await sendDigestEmail({
        to: alert.email,
        date,
        city: alert.city,
        newListings,
        totalScraped: allListings.length,
        sourcesSearched: successfulSources.length > 0 ? successfulSources : ENABLED_SOURCES,
        unsubscribeUrl,
      });

      // Record emailed listings
      await recordEmailedListings(alert.id, newListings);
    } else if (alert.sendNoResults) {
      await sendNoResultsEmail({
        to: alert.email,
        date,
        city: alert.city,
        sourcesSearched: successfulSources.length > 0 ? successfulSources : ENABLED_SOURCES,
        unsubscribeUrl,
      });
    }
  } else {
    console.log(`[CRON] Alert ${alert.id}: Email sending disabled for this run (${newListings.length} new listings found)`);
    // Still record emailed listings to avoid sending them later
    if (newListings.length > 0) {
      await recordEmailedListings(alert.id, newListings);
    }
  }

  // Update last run time
  await prisma.alert.update({
    where: { id: alert.id },
    data: { lastRunAt: new Date() },
  });
}

// Listing with its resolved DB ID (set during deduplication)
interface ResolvedListing extends NormalizedListing {
  resolvedListingId: string;
}

async function deduplicateListings(
  alertId: string,
  listings: NormalizedListing[]
): Promise<{ newListings: ResolvedListing[]; allDeduped: NormalizedListing[] }> {
  const newListings: ResolvedListing[] = [];
  const allDeduped: NormalizedListing[] = [];
  const seenUrls = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const listing of listings) {
    // Skip if we've already seen this URL or fingerprint in this batch
    if (seenUrls.has(listing.canonicalUrl) || seenFingerprints.has(listing.fingerprintHash)) {
      continue;
    }

    seenUrls.add(listing.canonicalUrl);
    seenFingerprints.add(listing.fingerprintHash);
    allDeduped.push(listing);

    // Check if listing exists in DB
    let existingListing = await prisma.listing.findUnique({
      where: { canonicalUrl: listing.canonicalUrl },
    });

    // Also check by fingerprint
    if (!existingListing) {
      existingListing = await prisma.listing.findFirst({
        where: { fingerprintHash: listing.fingerprintHash },
      });
    }

    let listingId: string;

    if (existingListing) {
      listingId = existingListing.id;
    } else {
      // Create new listing
      const created = await prisma.listing.create({
        data: {
          sourceName: listing.sourceName,
          canonicalUrl: listing.canonicalUrl,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
          transactionType: listing.transactionType,
          city: listing.city,
          neighborhood: listing.neighborhood,
          squareMeters: listing.squareMeters,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          parking: listing.parking,
          imageUrl: listing.imageUrl,
          fingerprintHash: listing.fingerprintHash,
        },
      });
      listingId = created.id;
    }

    // Check if this listing was already emailed to this alert
    const alreadyEmailed = await prisma.alertListing.findUnique({
      where: {
        alertId_listingId: {
          alertId,
          listingId,
        },
      },
    });

    if (!alreadyEmailed) {
      newListings.push({ ...listing, resolvedListingId: listingId });
    }
  }

  return { newListings, allDeduped };
}

async function recordEmailedListings(
  alertId: string,
  listings: ResolvedListing[]
): Promise<void> {
  for (const listing of listings) {
    try {
      // Use resolvedListingId from dedup (no re-lookup needed)
      // Use upsert to handle race conditions gracefully
      await prisma.alertListing.upsert({
        where: {
          alertId_listingId: {
            alertId,
            listingId: listing.resolvedListingId,
          },
        },
        create: {
          alertId,
          listingId: listing.resolvedListingId,
        },
        update: {}, // no-op if already exists
      });
    } catch (error) {
      console.error(`[CRON] Failed to record emailed listing ${listing.canonicalUrl}:`, error);
      // Continue with other listings - don't let one failure crash the entire recording
    }
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
