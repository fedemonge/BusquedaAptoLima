'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Alert {
  id: string;
  transactionType: 'RENT' | 'BUY';
  city: string;
  neighborhood: string | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  createdAt: string;
}

interface Listing {
  source: string;
  title: string;
  price: number;
  currency: string;
  city: string;
  neighborhood?: string;
  squareMeters?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  url: string;
  imageUrl?: string;
}

interface RunResult {
  success: boolean;
  duration: number;
  totalListings: number;
  summary: Record<string, { success: boolean; count: number; error?: string; duration: number }>;
  listings: Listing[];
}

type Step = 'email' | 'select' | 'results';

export default function RunNowPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [results, setResults] = useState<RunResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/alerts/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to look up alerts');
      }

      const data = await response.json();

      if (data.alerts.length === 0) {
        setError('No active alerts found for this email. Create one first!');
        return;
      }

      setAlerts(data.alerts);
      setStep('select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRun = async (alert: Alert) => {
    setSelectedAlert(alert);
    setStep('results');
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/alerts/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, alertId: alert.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run scraper');
      }

      const data: RunResult = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scraping failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'results') {
      setStep('select');
      setResults(null);
      setError(null);
    } else if (step === 'select') {
      setStep('email');
      setAlerts([]);
      setError(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f0f3f4]">
      <Header />

      {/* Hero banner */}
      <section className="bg-gradient-to-br from-[#1a1d1e] via-[#2d3436] to-[#1a1d1e] relative overflow-hidden py-14 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_70%,rgba(40,207,226,0.08)_0%,transparent_50%)] pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h1 className="font-heading text-3xl text-white mb-3">
            Run <span className="text-[#28cfe2]">Now</span>
          </h1>
          <p className="text-[#b3babd]">
            Run a scrape immediately for any of your active alerts
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-10 pb-16">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['email', 'select', 'results'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s
                    ? 'bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e]'
                    : i < ['email', 'select', 'results'].indexOf(step)
                    ? 'bg-[#28cfe2] text-[#1a1d1e]'
                    : 'bg-[#d4d9db] text-[#8a9295]'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div className={`w-12 h-0.5 ${
                  i < ['email', 'select', 'results'].indexOf(step) ? 'bg-[#28cfe2]' : 'bg-[#d4d9db]'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Email Entry */}
        {step === 'email' && (
          <form
            onSubmit={handleLookup}
            className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-6 md:p-8 space-y-6 max-w-md mx-auto"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
                {error.includes('Create one') && (
                  <Link href="/apartment-alerts" className="block mt-2 text-[#1fb8c9] font-medium no-underline">
                    Create an alert
                  </Link>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] py-4 px-6 rounded-full font-bold text-base hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
            >
              {isLoading ? 'Looking up...' : 'Find My Alerts'}
            </button>
          </form>
        )}

        {/* Step 2: Alert Selection */}
        {step === 'select' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                className="text-[#636e72] hover:text-[#2d3436] text-sm font-medium transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Change email
              </button>
              <span className="text-sm text-[#b3babd]">{email}</span>
            </div>

            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6 border border-transparent hover:border-[rgba(40,207,226,0.15)] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[rgba(40,207,226,0.1)] text-[#1fb8c9]">
                          ACTIVE
                        </span>
                        <span className="text-sm text-[#b3babd]">
                          {alert.transactionType === 'RENT' ? 'Rent' : 'Buy'}
                        </span>
                      </div>
                      <h3 className="font-heading text-xl text-[#1a1d1e]">
                        {alert.city}
                        {alert.neighborhood && ` - ${alert.neighborhood}`}
                      </h3>
                      <div className="text-sm text-[#636e72] mt-1">
                        {alert.maxPrice && (
                          <span>Max: S/ {alert.maxPrice.toLocaleString()}</span>
                        )}
                        {alert.minBedrooms && (
                          <span className="ml-4">{alert.minBedrooms}+ bedrooms</span>
                        )}
                      </div>
                      <p className="text-xs text-[#b3babd] mt-2">
                        Created {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRun(alert)}
                      className="bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] px-5 py-2.5 rounded-full font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] transition-all whitespace-nowrap"
                    >
                      Run Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="text-[#636e72] hover:text-[#2d3436] text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to alerts
              </button>
              {selectedAlert && (
                <span className="text-sm text-[#b3babd]">
                  {selectedAlert.city}
                  {selectedAlert.neighborhood && ` - ${selectedAlert.neighborhood}`}
                </span>
              )}
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-5 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-[#d4d9db]" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#28cfe2] animate-spin" />
                </div>
                <h2 className="font-heading text-xl text-[#1a1d1e] mb-2">Scraping in progress...</h2>
                <p className="text-[#636e72] text-sm">
                  Searching Properati, Urbania, and more. This may take up to a minute.
                </p>
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-10 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="font-heading text-xl text-[#1a1d1e] mb-2">Scraping Failed</h2>
                <p className="text-[#636e72] mb-6">{error}</p>
                <button
                  onClick={() => selectedAlert && handleRun(selectedAlert)}
                  className="bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] px-6 py-3 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Results */}
            {results && !isLoading && (
              <div className="space-y-6">
                {/* Summary bar */}
                <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-heading text-2xl text-[#1a1d1e]">{results.totalListings}</span>
                      <span className="text-[#636e72] ml-2">listings found</span>
                      <span className="text-xs text-[#b3babd] ml-2">
                        in {(results.duration / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <button
                      onClick={() => selectedAlert && handleRun(selectedAlert)}
                      className="text-[#1fb8c9] hover:text-[#28cfe2] font-medium text-sm transition-colors"
                    >
                      Run Again
                    </button>
                  </div>

                  {/* Source badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(results.summary).map(([source, info]) => (
                      <span
                        key={source}
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          info.success && info.count > 0
                            ? 'bg-[rgba(40,207,226,0.1)] text-[#1fb8c9]'
                            : info.success && info.count === 0
                            ? 'bg-[#f0f3f4] text-[#8a9295]'
                            : 'bg-red-50 text-red-500'
                        }`}
                      >
                        {source}: {info.count}{info.error ? ` (${info.error.substring(0, 20)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Listing cards */}
                {results.listings.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-10 text-center">
                    <p className="text-[#636e72]">
                      No listings found. The sites may be temporarily blocking requests.
                      Try again later.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {results.listings.map((listing, i) => (
                      <ListingCard key={`${listing.url}-${i}`} listing={listing} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/apartment-alerts" className="text-[#1fb8c9] hover:text-[#28cfe2] transition-colors no-underline font-medium">
            Create a new alert
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const priceDisplay = listing.currency === 'USD'
    ? `US$ ${listing.price.toLocaleString()}`
    : `S/ ${listing.price.toLocaleString()}`;

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-5 border border-transparent hover:border-[rgba(40,207,226,0.15)] hover:-translate-y-1 transition-all block no-underline"
    >
      {/* Image */}
      {listing.imageUrl && (
        <div className="w-full h-36 rounded-lg overflow-hidden mb-3 bg-[#f0f3f4]">
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Source badge */}
      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#f0f3f4] text-[#8a9295] uppercase tracking-wider">
        {listing.source}
      </span>

      {/* Title */}
      <h3 className="font-heading text-base text-[#1a1d1e] mt-1.5 mb-1 line-clamp-2">
        {listing.title}
      </h3>

      {/* Price */}
      <p className="font-bold text-lg text-[#1fb8c9] mb-2">
        {priceDisplay}
      </p>

      {/* Location */}
      {(listing.neighborhood || listing.city) && (
        <p className="text-xs text-[#636e72] mb-2">
          {[listing.neighborhood, listing.city].filter(Boolean).join(', ')}
        </p>
      )}

      {/* Features */}
      <div className="flex flex-wrap gap-1.5">
        {listing.bedrooms !== undefined && listing.bedrooms !== null && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0f3f4] text-[#636e72]">
            {listing.bedrooms} dorm.
          </span>
        )}
        {listing.bathrooms !== undefined && listing.bathrooms !== null && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0f3f4] text-[#636e72]">
            {listing.bathrooms} ba&ntilde;os
          </span>
        )}
        {listing.squareMeters !== undefined && listing.squareMeters !== null && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0f3f4] text-[#636e72]">
            {listing.squareMeters} m&sup2;
          </span>
        )}
        {listing.parking !== undefined && listing.parking !== null && listing.parking > 0 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0f3f4] text-[#636e72]">
            {listing.parking} estac.
          </span>
        )}
      </div>
    </a>
  );
}

function Header() {
  return (
    <header className="bg-[#1a1d1e] border-b border-white/5">
      <nav className="max-w-[1300px] mx-auto px-6 py-4 flex justify-between items-center">
        <a href="https://www.fedemongeconsulting.com" className="font-heading text-2xl text-white no-underline">
          Federico<span className="text-[#28cfe2]">Monge</span>
        </a>
        <div className="flex items-center gap-4">
          <Link
            href="/manage"
            className="text-[#d4d9db] text-sm font-medium hover:text-white transition-colors no-underline hidden sm:inline"
          >
            Manage Alerts
          </Link>
          <Link
            href="/apartment-alerts"
            className="bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] px-5 py-2.5 rounded-full font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] transition-all no-underline"
          >
            Create Alert
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[#1a1d1e] text-white py-8 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <a href="https://www.fedemongeconsulting.com" className="font-heading text-xl text-white no-underline">
          Federico<span className="text-[#28cfe2]">Monge</span>
        </a>
        <p className="text-[#8a9295] text-sm">
          &copy; 2025 Federico Monge Consulting. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
