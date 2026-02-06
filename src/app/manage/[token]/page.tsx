'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Alert {
  id: string;
  transactionType: 'RENT' | 'BUY';
  city: string;
  neighborhood: string | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  createdAt: string;
}

export default function ManageAlertsPage() {
  const params = useParams();
  const token = params.token as string;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    } catch (err) {
      console.error(err);
      alert('Failed to stop alert. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Link Expired
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/manage"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Request New Link
            </Link>
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
            Your Alerts
          </h1>
          <p className="text-gray-600">Managing alerts for {email}</p>
        </div>

        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">
              You don&apos;t have any alerts yet.
            </p>
            <Link
              href="/apartment-alerts"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Create Your First Alert
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          alert.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {alert.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {alert.transactionType === 'RENT' ? 'Rent' : 'Buy'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {alert.city}
                      {alert.neighborhood && ` - ${alert.neighborhood}`}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1">
                      {alert.maxPrice && (
                        <span>Max: S/ {alert.maxPrice.toLocaleString()}</span>
                      )}
                      {alert.minBedrooms && (
                        <span className="ml-4">
                          {alert.minBedrooms}+ bedrooms
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Created {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStopAlert(alert.id)}
                      disabled={actionLoading === alert.id}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                    >
                      {actionLoading === alert.id ? 'Stopping...' : 'Stop Alert'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/apartment-alerts"
            className="text-blue-600 hover:underline"
          >
            Create a new alert
          </Link>
        </div>
      </div>
    </main>
  );
}
