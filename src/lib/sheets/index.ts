import { google } from 'googleapis';
import type { NormalizedListing, SheetLogRow, SourceName } from '@/types';

// Initialize Google Sheets API
function getSheets() {
  // Decode base64 credentials
  const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!credentials) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS not set');
  }

  const credentialsJson = JSON.parse(
    Buffer.from(credentials, 'base64').toString('utf-8')
  );

  const auth = new google.auth.GoogleAuth({
    credentials: credentialsJson,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

const SHEET_NAME = 'Listings Log';
const HEADER_ROW = [
  'runDate',
  'alertId',
  'userEmail',
  'source',
  'canonicalUrl',
  'price',
  'currency',
  'city',
  'neighborhood',
  'squareMeters',
  'bedrooms',
  'parking',
  'fingerprintHash',
  'isNewForAlert',
  'emailedThisRun',
];

/**
 * Ensure the sheet exists and has headers.
 */
export async function ensureSheetExists(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID not set');
  }

  try {
    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === SHEET_NAME
    );

    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [HEADER_ROW],
        },
      });

      console.log(`[SHEETS] Created sheet: ${SHEET_NAME}`);
    }
  } catch (error) {
    console.error('[SHEETS] Error ensuring sheet exists:', error);
    throw error;
  }
}

/**
 * Log listings to Google Sheets.
 */
export async function logListingsToSheet(
  alertId: string,
  userEmail: string,
  listings: NormalizedListing[],
  newListingUrls: Set<string>,
  emailedUrls: Set<string>
): Promise<void> {
  if (listings.length === 0) {
    console.log('[SHEETS] No listings to log');
    return;
  }

  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID not set');
  }

  const runDate = new Date().toISOString();

  const rows = listings.map((listing): string[] => {
    const isNew = newListingUrls.has(listing.canonicalUrl);
    const emailed = emailedUrls.has(listing.canonicalUrl);

    return [
      runDate,
      alertId,
      userEmail,
      listing.sourceName,
      listing.canonicalUrl,
      listing.price.toString(),
      listing.currency,
      listing.city,
      listing.neighborhood || '',
      listing.squareMeters?.toString() || '',
      listing.bedrooms?.toString() || '',
      listing.parking?.toString() || '',
      listing.fingerprintHash,
      isNew ? 'TRUE' : 'FALSE',
      emailed ? 'TRUE' : 'FALSE',
    ];
  });

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:O`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });

    console.log(`[SHEETS] Logged ${rows.length} listings for alert ${alertId}`);
  } catch (error) {
    console.error('[SHEETS] Error logging listings:', error);
    throw error;
  }
}

/**
 * Log a scrape run summary.
 */
export async function logScrapeRunSummary(
  alertId: string,
  userEmail: string,
  results: {
    source: SourceName;
    success: boolean;
    listingsFound: number;
    newListings: number;
    error?: string;
  }[]
): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    console.log('[SHEETS] GOOGLE_SHEET_ID not set, skipping summary log');
    return;
  }

  // For now, we log individual listings rather than summaries
  // The summary can be derived from the listing logs
  console.log(`[SHEETS] Run summary for ${alertId}:`, results);
}
