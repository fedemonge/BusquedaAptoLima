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
  propertyType: string;
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
    propertyType: '',
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
        propertyType: formData.propertyType || undefined,
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
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Alert Created!
            </h1>
            <p className="text-gray-600 mb-6">
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
                    propertyType: '',
                    keywordsInclude: '',
                    keywordsExclude: '',
                    sendNoResults: true,
                  });
                }}
                className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Create Another Alert
              </Link>
              <Link
                href="/"
                className="block text-gray-600 hover:text-gray-900"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Apartment Alert
          </h1>
          <p className="text-gray-600">
            Get daily email notifications for new listings in Lima
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-6 space-y-6"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to... *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="transactionType"
                  value="RENT"
                  checked={formData.transactionType === 'RENT'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Rent
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="transactionType"
                  value="BUY"
                  checked={formData.transactionType === 'BUY'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Buy
              </label>
            </div>
          </div>

          {/* City and Neighborhood */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                City
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PERU_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="neighborhood"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Neighborhood (optional)
              </label>
              <input
                type="text"
                id="neighborhood"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                placeholder="e.g., Miraflores, San Isidro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="maxPrice"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Maximum Price ({formData.transactionType === 'RENT' ? 'Monthly Rent' : 'Sale Price'})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">S/</span>
              <input
                type="number"
                id="maxPrice"
                name="maxPrice"
                value={formData.maxPrice}
                onChange={handleChange}
                placeholder={formData.transactionType === 'RENT' ? '3000' : '500000'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Square Meters */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="minSquareMeters"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Min Area (m²)
              </label>
              <input
                type="number"
                id="minSquareMeters"
                name="minSquareMeters"
                value={formData.minSquareMeters}
                onChange={handleChange}
                placeholder="50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="maxSquareMeters"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Max Area (m²)
              </label>
              <input
                type="number"
                id="maxSquareMeters"
                name="maxSquareMeters"
                value={formData.maxSquareMeters}
                onChange={handleChange}
                placeholder="150"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Bedrooms and Parking */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="minBedrooms"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Min Bedrooms
              </label>
              <select
                id="minBedrooms"
                name="minBedrooms"
                value={formData.minBedrooms}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="minParking"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Min Parking Spots
              </label>
              <select
                id="minParking"
                name="minParking"
                value={formData.minParking}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
              </select>
            </div>
          </div>

          {/* Property Type */}
          <div>
            <label
              htmlFor="propertyType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Property Type
            </label>
            <select
              id="propertyType"
              name="propertyType"
              value={formData.propertyType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Any</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Keywords */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="keywordsInclude"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Include Keywords
              </label>
              <input
                type="text"
                id="keywordsInclude"
                name="keywordsInclude"
                value={formData.keywordsInclude}
                onChange={handleChange}
                placeholder="amoblado, terraza"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
            </div>
            <div>
              <label
                htmlFor="keywordsExclude"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Exclude Keywords
              </label>
              <input
                type="text"
                id="keywordsExclude"
                name="keywordsExclude"
                value={formData.keywordsExclude}
                onChange={handleChange}
                placeholder="compartido, roommate"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
            </div>
          </div>

          {/* No Results Email */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="sendNoResults"
                checked={formData.sendNoResults}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Email me even if no new listings are found
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {isSubmitting ? 'Creating Alert...' : 'Start Daily Search'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By creating an alert, you agree to receive daily email notifications.
            You can stop the search at any time via the link in the email.
          </p>
        </form>

        <div className="mt-6 text-center">
          <Link href="/manage" className="text-blue-600 hover:underline">
            Already have alerts? Manage them here
          </Link>
        </div>
      </div>
    </main>
  );
}
