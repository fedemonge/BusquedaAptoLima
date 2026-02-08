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
    } finally {
      setActionLoading(null);
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
                className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6 border border-transparent hover:border-[rgba(40,207,226,0.1)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
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
                    <div className="text-sm text-[#636e72] mt-1">
                      {alert.maxPrice && (
                        <span>Max: S/ {alert.maxPrice.toLocaleString()}</span>
                      )}
                      {alert.minBedrooms && (
                        <span className="ml-4">
                          {alert.minBedrooms}+ bedrooms
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#b3babd] mt-2">
                      Created {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStopAlert(alert.id)}
                      disabled={actionLoading === alert.id}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-all"
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
          &copy; 2025 Federico Monge Consulting. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
