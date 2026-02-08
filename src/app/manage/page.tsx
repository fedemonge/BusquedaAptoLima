'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ManagePage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send magic link');
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
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-10 text-center">
              <div className="w-16 h-16 bg-[rgba(40,207,226,0.1)] rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[#28cfe2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="font-heading text-2xl text-[#1a1d1e] mb-3">
                Check Your Email
              </h1>
              <p className="text-[#636e72] mb-2 leading-relaxed">
                We&apos;ve sent a magic link to <strong className="text-[#2d3436]">{email}</strong>. Click the
                link to manage your alerts.
              </p>
              <p className="text-sm text-[#b3babd] mb-6">
                The link will expire in 24 hours.
              </p>
              <a
                href="https://www.fedemongeconsulting.com"
                className="inline-block text-[#1fb8c9] hover:text-[#28cfe2] transition-colors no-underline font-medium"
              >
                Back to Main Site
              </a>
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
        <div className="max-w-md mx-auto text-center relative z-10">
          <h1 className="font-heading text-3xl text-white mb-3">
            Manage Your <span className="text-[#28cfe2]">Alerts</span>
          </h1>
          <p className="text-[#b3babd]">
            Enter your email to receive a link to manage your alerts
          </p>
        </div>
      </section>

      <div className="max-w-md mx-auto px-4 -mt-6 relative z-10 pb-16">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-6 md:p-8 space-y-6"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
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
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] py-4 px-6 rounded-full font-bold text-base hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
          >
            {isSubmitting ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
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
