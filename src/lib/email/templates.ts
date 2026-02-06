import type { NormalizedListing, SourceName } from '@/types';
import { formatPrice } from '@/lib/utils/price';

const SOURCE_NAMES: Record<SourceName, string> = {
  ADONDEVIVIR: 'Adondevivir',
  URBANIA: 'Urbania',
  PROPERATI: 'Properati',
  MERCADOLIBRE: 'Mercado Libre',
};

interface DigestEmailParams {
  date: string;
  city: string;
  newListings: NormalizedListing[];
  totalScraped: number;
  sourcesSearched: SourceName[];
  unsubscribeUrl: string;
}

/**
 * Generate HTML email for daily digest with new listings.
 */
export function generateDigestEmail(params: DigestEmailParams): string {
  const { date, city, newListings, totalScraped, sourcesSearched, unsubscribeUrl } = params;

  const listingCards = newListings.map((listing) => generateListingCard(listing)).join('');

  const sourcesText = sourcesSearched.map((s) => SOURCE_NAMES[s]).join(', ');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily apartment listings for ${city}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      color: #1e40af;
      font-size: 24px;
      margin: 0 0 8px 0;
    }
    .header .date {
      color: #6b7280;
      font-size: 14px;
    }
    .summary {
      background-color: #eff6ff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    .summary .count {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
    }
    .summary .label {
      color: #4b5563;
      font-size: 14px;
    }
    .listing-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      transition: box-shadow 0.2s;
    }
    .listing-card:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .listing-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
      text-decoration: none;
    }
    .listing-title a {
      color: #2563eb;
      text-decoration: none;
    }
    .listing-title a:hover {
      text-decoration: underline;
    }
    .listing-price {
      font-size: 20px;
      font-weight: bold;
      color: #059669;
      margin-bottom: 8px;
    }
    .listing-details {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .listing-detail {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .listing-source {
      font-size: 12px;
      color: #9ca3af;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .stop-btn {
      display: inline-block;
      background-color: #ef4444;
      color: white !important;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      margin-top: 16px;
    }
    .stop-btn:hover {
      background-color: #dc2626;
    }
    .disclaimer {
      margin-top: 16px;
      font-size: 11px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 Daily Apartment Listings</h1>
      <div class="date">${city} - ${date}</div>
    </div>

    <div class="summary">
      <div class="count">${newListings.length}</div>
      <div class="label">new listings found</div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        Searched ${totalScraped} total from: ${sourcesText}
      </div>
    </div>

    ${listingCards}

    <div class="footer">
      <p>You're receiving this because you set up an apartment alert.</p>
      <a href="${unsubscribeUrl}" class="stop-btn">Stop Daily Search</a>
      <div class="disclaimer">
        <p>This email was generated automatically by scraping publicly available real estate listings.
        Links go directly to the original source. We do not store or sell your data.</p>
        <p>Apartment Finder Alerts - Peru</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate HTML card for a single listing.
 */
function generateListingCard(listing: NormalizedListing): string {
  const details: string[] = [];

  if (listing.squareMeters) {
    details.push(`📐 ${listing.squareMeters} m²`);
  }
  if (listing.bedrooms) {
    details.push(`🛏️ ${listing.bedrooms} dorm.`);
  }
  if (listing.bathrooms) {
    details.push(`🚿 ${listing.bathrooms} baños`);
  }
  if (listing.parking) {
    details.push(`🚗 ${listing.parking} estac.`);
  }
  if (listing.neighborhood) {
    details.push(`📍 ${listing.neighborhood}`);
  }

  return `
    <div class="listing-card">
      <div class="listing-title">
        <a href="${listing.canonicalUrl}" target="_blank">${escapeHtml(listing.title)}</a>
      </div>
      <div class="listing-price">${formatPrice(listing.price, listing.currency)}</div>
      <div class="listing-details">
        ${details.map((d) => `<span class="listing-detail">${d}</span>`).join('')}
      </div>
      <div class="listing-source">via ${SOURCE_NAMES[listing.sourceName]}</div>
    </div>
  `;
}

/**
 * Generate email for when no new listings are found.
 */
export function generateNoResultsEmail(params: {
  date: string;
  city: string;
  sourcesSearched: SourceName[];
  unsubscribeUrl: string;
}): string {
  const { date, city, sourcesSearched, unsubscribeUrl } = params;
  const sourcesText = sourcesSearched.map((s) => SOURCE_NAMES[s]).join(', ');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>No new listings today</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    h1 { color: #1e40af; font-size: 20px; }
    .message { color: #6b7280; margin: 16px 0; }
    .stop-btn {
      display: inline-block;
      background-color: #ef4444;
      color: white !important;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      margin-top: 24px;
    }
    .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏠 No New Listings Today</h1>
    <p class="message">
      We searched ${sourcesText} but didn't find any new apartments in ${city} matching your criteria.
    </p>
    <p style="font-size: 14px; color: #6b7280;">${date}</p>
    <a href="${unsubscribeUrl}" class="stop-btn">Stop Daily Search</a>
    <div class="footer">
      <p>Your search will continue tomorrow.</p>
      <p>Apartment Finder Alerts - Peru</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
