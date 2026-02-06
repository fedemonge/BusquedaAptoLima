# Apartment Finder Alerts - Peru

> Production-grade real estate alert system for Peru, hosted on fedemongeconsulting.com

## Project Overview

A web application that allows users to configure daily real-estate searches (rent or buy) for Peru. The system scrapes major real estate portals, extracts structured data, deduplicates results, and emails only NEW listings to users.

### Key Features
- Daily automated scraping of 4 major Peruvian real estate portals
- Intelligent deduplication using canonical URLs and fingerprint hashing
- Professional HTML email digests with new listings only
- Google Sheets logging of all scraping activity
- Self-service alert management via magic links

## Absolute Constraints

### API Usage
- **ALLOWED**: Google Sheets API, Gmail (SMTP or API)
- **FORBIDDEN**: Any paid APIs, real estate APIs, proxy services

### Scraping Rules
- ALL real estate data via HTTP scraping only
- Respect `robots.txt` when present
- 1 request every 5-10 seconds per domain (randomized delays)
- Rotate User-Agent headers
- Fail gracefully if blocked - never crash the job
- NO hidden JSON endpoints - HTML pages only
- Must tolerate layout changes and partial data loss

## Tech Stack

```
Frontend:     Next.js 14+ (App Router) + TypeScript + Tailwind CSS
Backend:      Next.js API Routes
Database:     PostgreSQL with Prisma ORM
Scheduler:    Vercel Cron or internal cron endpoint
Scraping:     fetch/undici + Cheerio (no Playwright unless absolutely required)
Email:        Gmail SMTP or Gmail API
Logging:      Google Sheets API (service account)
```

## Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── apartment-alerts/         # Public alert creation page
│   ├── manage/                   # Alert management via magic link
│   └── api/
│       ├── alerts/               # Alert CRUD operations
│       ├── unsubscribe/          # Signed unsubscribe endpoint
│       ├── magic-link/           # Magic link generation
│       └── cron/                 # Daily job endpoint
├── lib/
│   ├── scrapers/                 # Scraper modules
│   │   ├── base.ts               # Abstract scraper class
│   │   ├── adondevivir.ts
│   │   ├── urbania.ts
│   │   ├── properati.ts
│   │   └── mercadolibre.ts
│   ├── selectors/                # CSS selector configs per site
│   │   ├── adondevivir.json
│   │   ├── urbania.json
│   │   ├── properati.json
│   │   └── mercadolibre.json
│   ├── email/                    # Email templates and sending
│   ├── sheets/                   # Google Sheets integration
│   ├── deduplication/            # Fingerprint hashing and dedup logic
│   └── utils/                    # Shared utilities
├── prisma/
│   └── schema.prisma             # Database schema
├── types/                        # TypeScript type definitions
└── config/                       # Configuration constants
```

## Data Sources (Scraping Only)

### Target Portals (Peru)
| Priority | Source | URL | Notes |
|----------|--------|-----|-------|
| 1 | Adondevivir | adondevivir.com | Primary target, start here |
| 2 | Urbania | urbania.pe | |
| 3 | Properati | properati.com.pe | |
| 4 | Mercado Libre Inmuebles | inmuebles.mercadolibre.com.pe | Scraped only, NO API |

### Per-Source Behavior
- On block/failure: Skip source for that run, log failure, continue others
- Store last successful scrape timestamp per source
- Track failure count for monitoring

## Core Data Models

### Normalized Listing Schema
```typescript
interface NormalizedListing {
  sourceName: string;           // 'adondevivir' | 'urbania' | 'properati' | 'mercadolibre'
  canonicalUrl: string;         // REQUIRED, UNIQUE
  title: string;
  price: number;
  currency: 'PEN' | 'USD';
  transactionType: 'RENT' | 'BUY';
  city: string;
  neighborhood?: string;
  squareMeters?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  imageUrl?: string;
  scrapedAt: Date;
  fingerprintHash: string;      // SHA256(source + normalizedAddress + price + sqm + bedrooms)
}
```

### Deduplication Rules
A listing is the same if:
- `canonicalUrl` matches, OR
- `fingerprintHash` matches

**Critical**: If a listing was emailed for an alert, NEVER email it again for that alert.

## Scraper Architecture

### Abstraction Layer
```typescript
// Every scraper must implement:
interface Scraper {
  fetchSearchResults(alertParams: AlertParams): Promise<string[]>;  // Returns listing URLs
  fetchListingDetails(url: string): Promise<NormalizedListing | null>;
}
```

### Selector Configuration Pattern
Store selectors in JSON for easy updates:
```json
{
  "searchResults": {
    "listingCard": ".listing-card",
    "listingUrl": "a.listing-link"
  },
  "listingPage": {
    "title": "h1.title",
    "price": ".price-value",
    "squareMeters": "[data-sqm]",
    "bedrooms": ".bedrooms-count"
  }
}
```

### Request Configuration
- **Timeout**: 30 seconds per request
- **Retries**: Max 2 with exponential backoff
- **Delay**: 5-10 seconds between requests (randomized)
- **User-Agent rotation**: Pool of 10+ realistic browser UAs

## Email Requirements

### Sender Configuration
- **From**: fedemonge1974@gmail.com
- **Reply-To**: fedemonge1974@gmail.com

### Email Content
- **Subject**: "Daily apartment listings for Lima – <date>"
- **Body**:
  - Summary counts (X new listings from Y sources)
  - Cards for each NEW listing (price, sqm, bedrooms, neighborhood, source link)
  - "Stop daily search" button (signed token)
  - Footer with disclaimer

### No Results Email
When no new listings: Send "No new listings today" (configurable, default ON)

## Google Sheets Logging

### Sheet Structure
One row per listing per run with columns:
```
runDate | alertId | userEmail | source | canonicalUrl | price | currency |
city | neighborhood | squareMeters | bedrooms | parking | fingerprintHash |
isNewForAlert | emailedThisRun
```

### Sheet Ownership
- Owner: fedemonge1974@gmail.com
- Access: Service account with editor permissions

## Security Requirements

- Rate limit magic-link requests (max 3 per email per hour)
- Sign unsubscribe tokens with HMAC or JWT
- Store minimal PII (email only)
- Never expose internal database IDs in URLs
- Log scraping failures per source per run

## Coding Standards

### TypeScript
- Strict mode enabled
- Explicit return types on all functions
- No `any` types except where absolutely necessary
- Use Zod for runtime validation of scraped data

### Error Handling
- Scrapers must NEVER throw unhandled exceptions
- All scraping operations wrapped in try/catch
- Return `null` for failed individual listings
- Log all failures with context

### Logging Pattern
```typescript
console.log(`[${source}] ${action}: ${details}`);
// Example: [adondevivir] SCRAPE_SUCCESS: 15 listings found
// Example: [urbania] SCRAPE_FAILED: 403 Forbidden
```

## Development Workflow

### Adding/Updating Selectors
1. Open browser DevTools on target site
2. Update JSON selector file in `lib/selectors/`
3. Run scraper test against single listing
4. Verify normalized output

### Adding New Source
1. Create scraper in `lib/scrapers/<source>.ts`
2. Create selector config in `lib/selectors/<source>.json`
3. Add source to `ENABLED_SOURCES` constant
4. Update Prisma enum if needed
5. Test with 5-10 listings before enabling

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Google APIs
GOOGLE_SHEETS_CREDENTIALS=<base64 service account JSON>
GOOGLE_SHEET_ID=<spreadsheet ID>

# Email
GMAIL_USER=fedemonge1974@gmail.com
GMAIL_APP_PASSWORD=<app password>
# OR for Gmail API:
GMAIL_OAUTH_CREDENTIALS=<base64 OAuth JSON>

# Security
UNSUBSCRIBE_SECRET=<random 32+ char string>
MAGIC_LINK_SECRET=<random 32+ char string>
CRON_SECRET=<random 32+ char string>

# App
NEXT_PUBLIC_APP_URL=https://www.fedemongeconsulting.com
DEFAULT_TIMEZONE=America/Lima
```

## Testing Strategy

### Unit Tests
- Selector parsing logic
- Fingerprint hash generation
- Price/currency extraction
- Deduplication logic

### Integration Tests
- Mock HTTP responses for each scraper
- Database operations with test DB
- Email template rendering

### Manual Testing Checklist
- [ ] Create alert via UI
- [ ] Trigger manual scrape run
- [ ] Verify email received with correct listings
- [ ] Verify Google Sheets logging
- [ ] Click unsubscribe and verify alert deactivated
- [ ] Request magic link and manage alerts

## Non-Negotiable Behaviors

1. **NEVER** email duplicate listings for the same alert
2. **ALWAYS** run alerts daily until explicitly stopped
3. **ALWAYS** link to original source URLs
4. **NEVER** let one scraper failure stop other scrapers
5. **NEVER** let one alert failure stop other alerts
6. **ALWAYS** log to Google Sheets before sending emails

## Legal Disclaimer

This system performs web scraping for personal use. Users are responsible for:
- Compliance with target website ToS
- Respecting rate limits and robots.txt
- Not reselling or redistributing scraped data

Include disclaimer in all user-facing emails.

## Quick Reference

### Daily Job Flow
```
1. Fetch active alerts
2. For each alert:
   a. Run enabled scrapers (parallel per source)
   b. Normalize results
   c. Deduplicate against DB
   d. Identify NEW listings for this alert
   e. Log to Google Sheets
   f. Send email digest
   g. Update AlertListing join table
3. Log job completion
```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/alerts | Create new alert |
| GET | /api/alerts/[token] | Get alert by magic link |
| POST | /api/unsubscribe/[token] | Deactivate alert |
| POST | /api/magic-link | Request management link |
| POST | /api/cron/daily | Trigger daily job (secured) |
