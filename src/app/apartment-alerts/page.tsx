'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PERU_CITIES, PROPERTY_TYPES } from '@/lib/config/constants';

interface FormData {
  email: string;
  transactionType: 'RENT' | 'BUY';
  city: string;
  neighborhood: string;
  maxPrice: string;
  minSquareMeters: string;
  maxSquareMeters: string;
  minBedrooms: string;
  minParking: string;
  propertyTypes: string[];
  keywordsInclude: string;
  keywordsExclude: string;
  sendNoResults: boolean;
}

export default function ApartmentAlertsPage() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    transactionType: 'RENT',
    city: 'Lima',
    neighborhood: '',
    maxPrice: '',
    minSquareMeters: '',
    maxSquareMeters: '',
    minBedrooms: '',
    minParking: '',
    propertyTypes: [],
    keywordsInclude: '',
    keywordsExclude: '',
    sendNoResults: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePropertyTypeToggle = (propertyType: string) => {
    setFormData((prev) => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(propertyType)
        ? prev.propertyTypes.filter((t) => t !== propertyType)
        : [...prev.propertyTypes, propertyType],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        email: formData.email,
        transactionType: formData.transactionType,
        city: formData.city,
        neighborhood: formData.neighborhood || undefined,
        maxPrice: formData.maxPrice ? parseInt(formData.maxPrice, 10) : undefined,
        minSquareMeters: formData.minSquareMeters
          ? parseInt(formData.minSquareMeters, 10)
          : undefined,
        maxSquareMeters: formData.maxSquareMeters
          ? parseInt(formData.maxSquareMeters, 10)
          : undefined,
        minBedrooms: formData.minBedrooms
          ? parseInt(formData.minBedrooms, 10)
          : undefined,
        minParking: formData.minParking
          ? parseInt(formData.minParking, 10)
          : undefined,
        propertyTypes: formData.propertyTypes.length > 0 ? formData.propertyTypes : undefined,
        keywordsInclude: formData.keywordsInclude
          ? formData.keywordsInclude.split(',').map((k) => k.trim())
          : undefined,
        keywordsExclude: formData.keywordsExclude
          ? formData.keywordsExclude.split(',').map((k) => k.trim())
          : undefined,
        sendNoResults: formData.sendNoResults,
      };

      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create alert');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#f0f3f4]">
        <Header />
        <div className="py-16 px-4">
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-xl shadow-card p-10 text-center">
              <div className="w-16 h-16 bg-[rgba(40,207,226,0.1)] rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[#28cfe2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-heading text-3xl text-[#1a1d1e] mb-3">
                Alert Created!
              </h1>
              <p className="text-[#636e72] mb-8 leading-relaxed">
                Your daily apartment search is now active. You&apos;ll receive email
                notifications when we find new listings matching your criteria.
              </p>
              <div className="space-y-3">
                <Link
                  href="/apartment-alerts"
                  onClick={() => {
                    setSuccess(false);
                    setFormData({
                      email: '',
                      transactionType: 'RENT',
                      city: 'Lima',
                      neighborhood: '',
                      maxPrice: '',
                      minSquareMeters: '',
                      maxSquareMeters: '',
                      minBedrooms: '',
                      minParking: '',
                      propertyTypes: [],
                      keywordsInclude: '',
                      keywordsExclude: '',
                      sendNoResults: true,
                    });
                  }}
                  className="block bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] px-6 py-3.5 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] transition-all no-underline"
                >
                  Create Another Alert
                </Link>
                <a
                  href="https://www.fedemongeconsulting.com"
                  className="block text-[#636e72] hover:text-[#28cfe2] transition-colors no-underline"
                >
                  Back to Main Site
                </a>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0f3f4]">
      <Header />

      {/* Hero banner */}
      <section className="bg-gradient-to-br from-[#1a1d1e] via-[#2d3436] to-[#1a1d1e] relative overflow-hidden py-14 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_70%,rgba(40,207,226,0.08)_0%,transparent_50%)] pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h1 className="font-heading text-3xl md:text-4xl text-white mb-3">
            Create Your <span className="text-[#28cfe2]">Apartment Alert</span>
          </h1>
          <p className="text-[#b3babd] text-lg">
            Set your criteria and receive daily email notifications for new listings
          </p>
        </div>
      </section>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10 pb-16">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-6 md:p-8 space-y-6"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-semibold text-[#2d3436] mb-2">
              I want to... *
            </label>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 cursor-pointer transition-all font-medium text-sm ${
                  formData.transactionType === 'RENT'
                    ? 'border-[#28cfe2] bg-[rgba(40,207,226,0.05)] text-[#1fb8c9]'
                    : 'border-[#d4d9db] text-[#636e72] hover:border-[#b3babd]'
                }`}
              >
                <input
                  type="radio"
                  name="transactionType"
                  value="RENT"
                  checked={formData.transactionType === 'RENT'}
                  onChange={handleChange}
                  className="sr-only"
                />
                Rent
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 cursor-pointer transition-all font-medium text-sm ${
                  formData.transactionType === 'BUY'
                    ? 'border-[#28cfe2] bg-[rgba(40,207,226,0.05)] text-[#1fb8c9]'
                    : 'border-[#d4d9db] text-[#636e72] hover:border-[#b3babd]'
                }`}
              >
                <input
                  type="radio"
                  name="transactionType"
                  value="BUY"
                  checked={formData.transactionType === 'BUY'}
                  onChange={handleChange}
                  className="sr-only"
                />
                Buy
              </label>
            </div>
          </div>

          {/* City and Neighborhood */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                City
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all bg-white"
              >
                {PERU_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="neighborhood" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Neighborhood <span className="text-[#b3babd] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="neighborhood"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                placeholder="e.g., Miraflores, San Isidro"
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label htmlFor="maxPrice" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
              Maximum Price ({formData.transactionType === 'RENT' ? 'Monthly Rent' : 'Sale Price'})
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-[#b3babd] font-medium">S/</span>
              <input
                type="number"
                id="maxPrice"
                name="maxPrice"
                value={formData.maxPrice}
                onChange={handleChange}
                placeholder={formData.transactionType === 'RENT' ? '3000' : '500000'}
                className="w-full pl-11 pr-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Square Meters */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minSquareMeters" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Min Area (m&sup2;)
              </label>
              <input
                type="number"
                id="minSquareMeters"
                name="minSquareMeters"
                value={formData.minSquareMeters}
                onChange={handleChange}
                placeholder="50"
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="maxSquareMeters" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Max Area (m&sup2;)
              </label>
              <input
                type="number"
                id="maxSquareMeters"
                name="maxSquareMeters"
                value={formData.maxSquareMeters}
                onChange={handleChange}
                placeholder="150"
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Bedrooms and Parking */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minBedrooms" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Min Bedrooms
              </label>
              <select
                id="minBedrooms"
                name="minBedrooms"
                value={formData.minBedrooms}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div>
              <label htmlFor="minParking" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Min Parking Spots
              </label>
              <select
                id="minParking"
                name="minParking"
                value={formData.minParking}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
              </select>
            </div>
          </div>

          {/* Property Types - Multi Select */}
          <div>
            <label className="block text-sm font-semibold text-[#2d3436] mb-2">
              Property Type <span className="text-[#b3babd] font-normal">(select one or more)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handlePropertyTypeToggle(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                    formData.propertyTypes.includes(type)
                      ? 'border-[#28cfe2] bg-[rgba(40,207,226,0.1)] text-[#1fb8c9]'
                      : 'border-[#d4d9db] text-[#636e72] hover:border-[#b3babd]'
                  }`}
                >
                  {formData.propertyTypes.includes(type) && (
                    <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {type}
                </button>
              ))}
            </div>
            {formData.propertyTypes.length === 0 && (
              <p className="text-xs text-[#b3babd] mt-1.5">No filter applied - all property types will be included</p>
            )}
          </div>

          {/* Keywords */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="keywordsInclude" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Include Keywords
              </label>
              <input
                type="text"
                id="keywordsInclude"
                name="keywordsInclude"
                value={formData.keywordsInclude}
                onChange={handleChange}
                placeholder="amoblado, terraza"
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-[#b3babd] mt-1">Comma-separated</p>
            </div>
            <div>
              <label htmlFor="keywordsExclude" className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                Exclude Keywords
              </label>
              <input
                type="text"
                id="keywordsExclude"
                name="keywordsExclude"
                value={formData.keywordsExclude}
                onChange={handleChange}
                placeholder="compartido, roommate"
                className="w-full px-4 py-3 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-[#b3babd] mt-1">Comma-separated</p>
            </div>
          </div>

          {/* No Results Email */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="sendNoResults"
                checked={formData.sendNoResults}
                onChange={handleChange}
                className="w-5 h-5 rounded border-[#d4d9db] text-[#28cfe2] focus:ring-[#28cfe2]"
              />
              <span className="text-sm text-[#636e72]">
                Email me even if no new listings are found
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] py-4 px-6 rounded-full font-bold text-base hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
          >
            {isSubmitting ? 'Creating Alert...' : 'Start Daily Search'}
          </button>

          <p className="text-xs text-[#b3babd] text-center">
            By creating an alert, you agree to receive daily email notifications.
            You can stop the search at any time via the link in the email.
          </p>
        </form>

        <div className="mt-6 text-center">
          <Link href="/manage" className="text-[#1fb8c9] hover:text-[#28cfe2] transition-colors no-underline font-medium">
            Already have alerts? Manage them here
          </Link>
        </div>
      </div>

      <Footer />
    </main>
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
          <a
            href="https://www.fedemongeconsulting.com"
            className="text-[#d4d9db] text-sm font-medium hover:text-white transition-colors no-underline hidden sm:inline"
          >
            Main Site
          </a>
          <Link
            href="/manage"
            className="text-[#d4d9db] text-sm font-medium hover:text-white transition-colors no-underline hidden sm:inline"
          >
            Manage Alerts
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
