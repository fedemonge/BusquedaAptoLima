# Apartment Finder Alerts - Peru

A production-grade web application for daily real estate alerts in Peru. Users configure searches for apartments (rent or buy), and the system scrapes major portals daily, deduplicates results, and emails only NEW listings.

## Features

- **Multi-source scraping**: Adondevivir, Urbania, Properati, Mercado Libre
- **Smart deduplication**: Fingerprint-based + URL-based matching
- **Daily email digests**: Professional HTML emails with only new listings
- **Google Sheets logging**: Complete audit trail of all scraping activity
- **Self-service management**: Magic link authentication for alert management

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Scraping**: Cheerio + fetch
- **Email**: Gmail SMTP via Nodemailer
- **Logging**: Google Sheets API

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Gmail account with App Password
- Google Cloud service account (for Sheets)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/apartment_alerts

# Google Sheets (base64 encoded service account JSON)
GOOGLE_SHEETS_CREDENTIALS=<base64>
GOOGLE_SHEET_ID=<spreadsheet-id>

# Gmail
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=<app-password>

# Security (generate random 32+ char strings)
UNSUBSCRIBE_SECRET=<random-string>
MAGIC_LINK_SECRET=<random-string>
CRON_SECRET=<random-string>

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Scraping Architecture

### Strategy

1. **Search Results Scraping**: Fetch paginated search results to collect listing URLs
2. **Individual Listing Scraping**: Visit each listing page to extract structured data
3. **Defensive Patterns**: Timeouts, retries, User-Agent rotation, graceful failures

### Selector Configuration

Each scraper uses a JSON configuration file for CSS selectors:

```
src/lib/selectors/
├── adondevivir.json
├── urbania.json
├── properati.json
└── mercadolibre.json
```

To update selectors when site layouts change:

1. Open the target site in browser DevTools
2. Identify new CSS selectors for each field
3. Update the corresponding JSON file
4. Test with a single listing before deploying

### Adding/Updating Selectors

Example selector config structure:

```json
{
  "searchResults": {
    "listingCard": ".listing-card",
    "listingUrl": "a.listing-link",
    "nextPage": ".pagination-next"
  },
  "listingPage": {
    "title": "h1.title",
    "price": ".price",
    "squareMeters": ".area",
    "bedrooms": ".bedrooms"
  }
}
```

### Request Configuration

- **Delay**: 5-10 seconds between requests (randomized)
- **Timeout**: 30 seconds per request
- **Retries**: Max 2 with exponential backoff
- **User-Agent**: Rotates through 10+ browser agents

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/alerts | Create new alert |
| GET | /api/alerts/[token] | Get alerts by magic link |
| POST | /api/alerts/[id]/stop | Stop alert |
| POST | /api/magic-link | Request management link |
| GET | /api/unsubscribe/[token] | Unsubscribe from alert |
| POST | /api/cron/daily | Trigger daily job |

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

The daily cron job is configured in `vercel.json` to run at 08:00 AM Lima time (13:00 UTC).

### Manual Cron

To trigger the daily job manually:

```bash
curl -X POST https://your-domain.com/api/cron/daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Legal / Compliance Disclaimer

This application scrapes publicly available real estate listings for personal use. Users are responsible for:

- Compliance with target website Terms of Service
- Respecting `robots.txt` when present
- Not reselling or redistributing scraped data
- Compliance with local data protection regulations

The application includes safeguards:

- Rate limiting (5-10 seconds between requests)
- User-Agent rotation
- Graceful failure handling
- robots.txt respect (when implemented)

**This tool is provided for educational and personal use only.**

## Project Structure

```
src/
├── app/
│   ├── apartment-alerts/    # Alert creation page
│   ├── manage/              # Alert management pages
│   └── api/
│       ├── alerts/          # Alert CRUD
│       ├── magic-link/      # Magic link generation
│       ├── unsubscribe/     # Unsubscribe handler
│       └── cron/            # Daily job
├── lib/
│   ├── scrapers/            # Scraper implementations
│   ├── selectors/           # CSS selector configs
│   ├── email/               # Email templates & sending
│   ├── sheets/              # Google Sheets integration
│   ├── db/                  # Prisma client
│   ├── config/              # Constants
│   └── utils/               # Utilities
├── types/                   # TypeScript definitions
└── prisma/
    └── schema.prisma        # Database schema
```

## Development

```bash
# Run development server
npm run dev

# Run database migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Lint
npm run lint

# Build
npm run build
```

## License

MIT
"# BusquedaAptoLima" 
