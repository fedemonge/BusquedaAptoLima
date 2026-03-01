'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PERU_CITIES, PROPERTY_TYPES } from '@/lib/config/constants';

interface Alert {
  id: string;
  transactionType: 'RENT' | 'BUY';
  city: string;
  neighborhood: string | null;
  maxPrice: number | null;
  minSquareMeters: number | null;
  maxSquareMeters: number | null;
  minBedrooms: number | null;
  minParking: number | null;
  propertyTypes: string[];
  keywordsInclude: string[];
  keywordsExclude: string[];
  sendNoResults: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  createdAt: string;
}

interface EditFormData {
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

function alertToFormData(alert: Alert): EditFormData {
  return {
    transactionType: alert.transactionType,
    city: alert.city,
    neighborhood: alert.neighborhood || '',
    maxPrice: alert.maxPrice?.toString() || '',
    minSquareMeters: alert.minSquareMeters?.toString() || '',
    maxSquareMeters: alert.maxSquareMeters?.toString() || '',
    minBedrooms: alert.minBedrooms?.toString() || '',
    minParking: alert.minParking?.toString() || '',
    propertyTypes: alert.propertyTypes || [],
    keywordsInclude: (alert.keywordsInclude || []).join(', '),
    keywordsExclude: (alert.keywordsExclude || []).join(', '),
    sendNoResults: alert.sendNoResults ?? true,
  };
}

export default function ManageAlertsPage() {
  const params = useParams();
  const token = params.token as string;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch(`/api/alerts/${token}`);
        if (!response.ok) {
          throw new Error('Invalid or expired link');
        }
        const data = await response.json();
        setAlerts(data.alerts);
        setEmail(data.email);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [token]);

  const handleStopAlert = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop alert');
      }

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, status: 'STOPPED' as const } : a
        )
      );
      // Close edit form if open for this alert
      if (editingId === alertId) {
        setEditingId(null);
        setEditForm(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEdit = (alert: Alert) => {
    setEditingId(alert.id);
    setEditForm(alertToFormData(alert));
    setEditError(null);
    setEditSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editForm) return;
    const { name, value, type } = e.target;
    setEditForm((prev) =>
      prev
        ? {
            ...prev,
            [name]:
              type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : value,
          }
        : prev
    );
  };

  const handleEditPropertyTypeToggle = (propertyType: string) => {
    if (!editForm) return;
    setEditForm((prev) =>
      prev
        ? {
            ...prev,
            propertyTypes: prev.propertyTypes.includes(propertyType)
              ? prev.propertyTypes.filter((t) => t !== propertyType)
              : [...prev.propertyTypes, propertyType],
          }
        : prev
    );
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingId) return;
    setEditSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const payload = {
        alertId: editingId,
        transactionType: editForm.transactionType,
        city: editForm.city,
        neighborhood: editForm.neighborhood || null,
        maxPrice: editForm.maxPrice ? parseInt(editForm.maxPrice, 10) : null,
        minSquareMeters: editForm.minSquareMeters
          ? parseInt(editForm.minSquareMeters, 10)
          : null,
        maxSquareMeters: editForm.maxSquareMeters
          ? parseInt(editForm.maxSquareMeters, 10)
          : null,
        minBedrooms: editForm.minBedrooms
          ? parseInt(editForm.minBedrooms, 10)
          : null,
        minParking: editForm.minParking
          ? parseInt(editForm.minParking, 10)
          : null,
        propertyTypes: editForm.propertyTypes,
        keywordsInclude: editForm.keywordsInclude
          ? editForm.keywordsInclude
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
          : [],
        keywordsExclude: editForm.keywordsExclude
          ? editForm.keywordsExclude
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
          : [],
        sendNoResults: editForm.sendNoResults,
      };

      const response = await fetch(`/api/alerts/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update alert');
      }

      // Update the alert in local state
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? {
                ...a,
                transactionType: payload.transactionType,
                city: payload.city,
                neighborhood: payload.neighborhood,
                maxPrice: payload.maxPrice,
                minSquareMeters: payload.minSquareMeters,
                maxSquareMeters: payload.maxSquareMeters,
                minBedrooms: payload.minBedrooms,
                minParking: payload.minParking,
                propertyTypes: payload.propertyTypes,
                keywordsInclude: payload.keywordsInclude,
                keywordsExclude: payload.keywordsExclude,
                sendNoResults: payload.sendNoResults,
              }
            : a
        )
      );

      setEditSuccess('Alert updated successfully!');
      setTimeout(() => {
        setEditingId(null);
        setEditForm(null);
        setEditSuccess(null);
      }, 1500);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f0f3f4]">
        <Header />
        <div className="py-20 text-center">
          <div className="animate-pulse max-w-2xl mx-auto px-4">
            <div className="h-8 bg-[#d4d9db] rounded w-48 mx-auto mb-4" />
            <div className="h-4 bg-[#d4d9db] rounded w-64 mx-auto" />
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f0f3f4]">
        <Header />
        <div className="py-16 px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-10 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="font-heading text-2xl text-[#1a1d1e] mb-3">Link Expired</h1>
              <p className="text-[#636e72] mb-6">{error}</p>
              <Link
                href="/manage"
                className="inline-block bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] px-6 py-3 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] transition-all no-underline"
              >
                Request New Link
              </Link>
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
          <h1 className="font-heading text-3xl text-white mb-3">
            Your <span className="text-[#28cfe2]">Alerts</span>
          </h1>
          <p className="text-[#b3babd]">Managing alerts for {email}</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10 pb-16">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-10 text-center">
            <p className="text-[#636e72] mb-4">
              You don&apos;t have any alerts yet.
            </p>
            <Link
              href="/apartment-alerts"
              className="inline-block bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] px-6 py-3 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] transition-all no-underline"
            >
              Create Your First Alert
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-transparent hover:border-[rgba(40,207,226,0.1)] transition-all overflow-hidden"
              >
                {/* Alert summary row */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            alert.status === 'ACTIVE'
                              ? 'bg-[rgba(40,207,226,0.1)] text-[#1fb8c9]'
                              : 'bg-[#f0f3f4] text-[#8a9295]'
                          }`}
                        >
                          {alert.status}
                        </span>
                        <span className="text-sm text-[#b3babd]">
                          {alert.transactionType === 'RENT' ? 'Rent' : 'Buy'}
                        </span>
                      </div>
                      <h3 className="font-heading text-xl text-[#1a1d1e]">
                        {alert.city}
                        {alert.neighborhood && ` - ${alert.neighborhood}`}
                      </h3>
                      <div className="text-sm text-[#636e72] mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        {alert.maxPrice && (
                          <span>Max: S/ {alert.maxPrice.toLocaleString()}</span>
                        )}
                        {alert.minBedrooms && (
                          <span>{alert.minBedrooms}+ bedrooms</span>
                        )}
                        {alert.minParking && (
                          <span>{alert.minParking}+ parking</span>
                        )}
                        {alert.minSquareMeters && (
                          <span>{alert.minSquareMeters}+ m²</span>
                        )}
                        {alert.maxSquareMeters && (
                          <span>≤{alert.maxSquareMeters} m²</span>
                        )}
                      </div>
                      {alert.propertyTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {alert.propertyTypes.map((t) => (
                            <span key={t} className="text-xs bg-[#f0f3f4] text-[#636e72] px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-[#b3babd] mt-2">
                        Created {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {alert.status === 'ACTIVE' && (
                      <div className="flex gap-2 ml-4 shrink-0">
                        <button
                          onClick={() =>
                            editingId === alert.id
                              ? handleCancelEdit()
                              : handleStartEdit(alert)
                          }
                          className="bg-[rgba(40,207,226,0.08)] text-[#1fb8c9] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[rgba(40,207,226,0.15)] transition-all"
                        >
                          {editingId === alert.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleStopAlert(alert.id)}
                          disabled={actionLoading === alert.id}
                          className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-all"
                        >
                          {actionLoading === alert.id ? 'Stopping...' : 'Stop'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === alert.id && editForm && (
                  <div className="border-t border-[#d4d9db] bg-[#f8fafb] px-6 py-5 space-y-5">
                    {editError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        {editError}
                      </div>
                    )}
                    {editSuccess && (
                      <div className="bg-[rgba(40,207,226,0.08)] border border-[rgba(40,207,226,0.2)] text-[#1fb8c9] px-4 py-3 rounded-xl text-sm font-medium">
                        {editSuccess}
                      </div>
                    )}

                    {/* Transaction Type */}
                    <div>
                      <label className="block text-sm font-semibold text-[#2d3436] mb-2">
                        I want to...
                      </label>
                      <div className="flex gap-3">
                        {(['RENT', 'BUY'] as const).map((type) => (
                          <label
                            key={type}
                            className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl border-2 cursor-pointer transition-all font-medium text-sm ${
                              editForm.transactionType === type
                                ? 'border-[#28cfe2] bg-[rgba(40,207,226,0.05)] text-[#1fb8c9]'
                                : 'border-[#d4d9db] text-[#636e72] hover:border-[#b3babd]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="transactionType"
                              value={type}
                              checked={editForm.transactionType === type}
                              onChange={handleEditChange}
                              className="sr-only"
                            />
                            {type === 'RENT' ? 'Rent' : 'Buy'}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* City and Neighborhood */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`city-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          City
                        </label>
                        <select
                          id={`city-${alert.id}`}
                          name="city"
                          value={editForm.city}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all bg-white text-sm"
                        >
                          {PERU_CITIES.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`neighborhood-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          Neighborhood
                        </label>
                        <input
                          type="text"
                          id={`neighborhood-${alert.id}`}
                          name="neighborhood"
                          value={editForm.neighborhood}
                          onChange={handleEditChange}
                          placeholder="e.g., Miraflores, San Isidro"
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label htmlFor={`maxPrice-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                        Maximum Price ({editForm.transactionType === 'RENT' ? 'Monthly' : 'Sale'})
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-2.5 text-[#b3babd] font-medium text-sm">S/</span>
                        <input
                          type="number"
                          id={`maxPrice-${alert.id}`}
                          name="maxPrice"
                          value={editForm.maxPrice}
                          onChange={handleEditChange}
                          placeholder={editForm.transactionType === 'RENT' ? '3000' : '500000'}
                          className="w-full pl-11 pr-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    {/* Square Meters */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`minSqm-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          Min Area (m²)
                        </label>
                        <input
                          type="number"
                          id={`minSqm-${alert.id}`}
                          name="minSquareMeters"
                          value={editForm.minSquareMeters}
                          onChange={handleEditChange}
                          placeholder="50"
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor={`maxSqm-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          Max Area (m²)
                        </label>
                        <input
                          type="number"
                          id={`maxSqm-${alert.id}`}
                          name="maxSquareMeters"
                          value={editForm.maxSquareMeters}
                          onChange={handleEditChange}
                          placeholder="150"
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    {/* Bedrooms and Parking */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`bedrooms-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          Min Bedrooms
                        </label>
                        <select
                          id={`bedrooms-${alert.id}`}
                          name="minBedrooms"
                          value={editForm.minBedrooms}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all bg-white text-sm"
                        >
                          <option value="">Any</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`parking-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          Min Parking
                        </label>
                        <select
                          id={`parking-${alert.id}`}
                          name="minParking"
                          value={editForm.minParking}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all bg-white text-sm"
                        >
                          <option value="">Any</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                        </select>
                      </div>
                    </div>

                    {/* Property Types */}
                    <div>
                      <label className="block text-sm font-semibold text-[#2d3436] mb-2">
                        Property Type
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PROPERTY_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleEditPropertyTypeToggle(type)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                              editForm.propertyTypes.includes(type)
                                ? 'border-[#28cfe2] bg-[rgba(40,207,226,0.1)] text-[#1fb8c9]'
                                : 'border-[#d4d9db] text-[#636e72] hover:border-[#b3babd]'
                            }`}
                          >
                            {editForm.propertyTypes.includes(type) && (
                              <svg className="w-3 h-3 inline mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`kwInclude-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          Include Keywords
                        </label>
                        <input
                          type="text"
                          id={`kwInclude-${alert.id}`}
                          name="keywordsInclude"
                          value={editForm.keywordsInclude}
                          onChange={handleEditChange}
                          placeholder="amoblado, terraza"
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all text-sm"
                        />
                        <p className="text-xs text-[#b3babd] mt-1">Comma-separated</p>
                      </div>
                      <div>
                        <label htmlFor={`kwExclude-${alert.id}`} className="block text-sm font-semibold text-[#2d3436] mb-1.5">
                          Exclude Keywords
                        </label>
                        <input
                          type="text"
                          id={`kwExclude-${alert.id}`}
                          name="keywordsExclude"
                          value={editForm.keywordsExclude}
                          onChange={handleEditChange}
                          placeholder="compartido, roommate"
                          className="w-full px-4 py-2.5 border border-[#d4d9db] rounded-xl focus:ring-2 focus:ring-[#28cfe2] focus:border-transparent outline-none transition-all text-sm"
                        />
                        <p className="text-xs text-[#b3babd] mt-1">Comma-separated</p>
                      </div>
                    </div>

                    {/* No Results Email */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sendNoResults"
                        checked={editForm.sendNoResults}
                        onChange={handleEditChange}
                        className="w-4 h-4 rounded border-[#d4d9db] text-[#28cfe2] focus:ring-[#28cfe2]"
                      />
                      <span className="text-sm text-[#636e72]">
                        Email me even if no new listings are found
                      </span>
                    </label>

                    {/* Save / Cancel buttons */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleSaveEdit}
                        disabled={editSaving}
                        className="flex-1 bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] py-3 px-6 rounded-full font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
                      >
                        {editSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-3 rounded-full text-sm font-semibold text-[#636e72] hover:text-[#2d3436] hover:bg-[#f0f3f4] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
          &copy; 2026 Federico Monge Consulting. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
