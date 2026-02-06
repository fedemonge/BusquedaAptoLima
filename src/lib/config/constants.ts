import type { SourceName } from '@/types';

// Enabled sources for scraping
export const ENABLED_SOURCES: SourceName[] = [
  'ADONDEVIVIR',
  'URBANIA',
  'PROPERATI',
  'MERCADOLIBRE',
];

// Scraping configuration
export const SCRAPER_CONFIG = {
  // Delay between requests (ms)
  MIN_DELAY: 5000,
  MAX_DELAY: 10000,

  // Request timeout (ms)
  TIMEOUT: 30000,

  // Retry configuration
  MAX_RETRIES: 2,
  RETRY_BACKOFF_BASE: 2000,

  // Max listings per source per run
  MAX_LISTINGS_PER_SOURCE: 100,
};

// User agents for rotation
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
];

// Email configuration
export const EMAIL_CONFIG = {
  FROM_EMAIL: 'fedemonge1974@gmail.com',
  FROM_NAME: 'Apartment Finder Alerts',
  SUBJECT_PREFIX: 'Daily apartment listings for',
};

// Default timezone
export const DEFAULT_TIMEZONE = 'America/Lima';

// Magic link configuration
export const MAGIC_LINK_CONFIG = {
  EXPIRY_HOURS: 24,
  MAX_REQUESTS_PER_HOUR: 3,
};

// Cities in Peru
export const PERU_CITIES = [
  'Lima',
  'Arequipa',
  'Trujillo',
  'Chiclayo',
  'Piura',
  'Cusco',
  'Iquitos',
  'Huancayo',
  'Tacna',
  'Pucallpa',
];

// Property types
export const PROPERTY_TYPES = [
  'Departamento',
  'Casa',
  'Oficina',
  'Local Comercial',
  'Terreno',
  'Habitación',
];
