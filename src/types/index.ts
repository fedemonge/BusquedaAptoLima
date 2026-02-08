import { z } from 'zod';

// Enums matching Prisma
export type TransactionType = 'RENT' | 'BUY';
export type Currency = 'PEN' | 'USD';
export type SourceName = 'ADONDEVIVIR' | 'URBANIA' | 'PROPERATI' | 'MERCADOLIBRE';
export type AlertStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED';

// Normalized listing from scrapers
export interface NormalizedListing {
  sourceName: SourceName;
  canonicalUrl: string;
  title: string;
  price: number;
  currency: Currency;
  transactionType: TransactionType;
  city: string;
  neighborhood?: string;
  squareMeters?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  imageUrl?: string;
  scrapedAt: Date;
  fingerprintHash: string;
}

// Alert parameters for scraping
export interface AlertParams {
  transactionType: TransactionType;
  city: string;
  neighborhood?: string;
  maxPrice?: number;
  minSquareMeters?: number;
  maxSquareMeters?: number;
  minBedrooms?: number;
  minParking?: number;
  propertyTypes?: string[];
  keywordsInclude?: string[];
  keywordsExclude?: string[];
}

// Zod schemas for validation
export const CreateAlertSchema = z.object({
  email: z.string().email('Invalid email address'),
  transactionType: z.enum(['RENT', 'BUY']),
  city: z.enum(['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Cusco', 'Iquitos', 'Huancayo', 'Tacna', 'Pucallpa']).default('Lima'),
  neighborhood: z.string().max(100).optional(),
  maxPrice: z.number().positive().optional(),
  minSquareMeters: z.number().positive().optional(),
  maxSquareMeters: z.number().positive().optional(),
  minBedrooms: z.number().int().min(0).optional(),
  minParking: z.number().int().min(0).optional(),
  propertyTypes: z.array(z.string().max(50)).max(6).optional(),
  keywordsInclude: z.array(z.string().max(100)).max(20).optional(),
  keywordsExclude: z.array(z.string().max(100)).max(20).optional(),
  sendNoResults: z.boolean().default(true),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;

// Scraper result
export interface ScraperResult {
  source: SourceName;
  success: boolean;
  listings: NormalizedListing[];
  error?: string;
  duration: number;
}

// Google Sheets row
export interface SheetLogRow {
  runDate: string;
  alertId: string;
  userEmail: string;
  source: SourceName;
  canonicalUrl: string;
  price: number;
  currency: Currency;
  city: string;
  neighborhood: string;
  squareMeters: number | null;
  bedrooms: number | null;
  parking: number | null;
  fingerprintHash: string;
  isNewForAlert: boolean;
  emailedThisRun: boolean;
}

// Email digest content
export interface EmailDigest {
  alertId: string;
  email: string;
  date: string;
  newListings: NormalizedListing[];
  totalScraped: number;
  sourcesSearched: SourceName[];
  unsubscribeToken: string;
}
