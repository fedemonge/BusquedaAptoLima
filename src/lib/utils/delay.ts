import { SCRAPER_CONFIG } from '@/lib/config/constants';

/**
 * Wait for a specified number of milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a random delay between MIN_DELAY and MAX_DELAY.
 * Used between scraping requests to be polite.
 */
export function randomDelay(): Promise<void> {
  const { MIN_DELAY, MAX_DELAY } = SCRAPER_CONFIG;
  const waitTime = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  return delay(waitTime);
}
