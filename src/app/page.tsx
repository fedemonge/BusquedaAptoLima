import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-[#1a1d1e] border-b border-white/5">
        <nav className="max-w-[1300px] mx-auto px-6 py-4 flex justify-between items-center">
          <a href="https://www.fedemongeconsulting.com" className="font-heading text-2xl text-white no-underline">
            Federico<span className="text-[#28cfe2]">Monge</span>
          </a>
          <div className="flex items-center gap-6">
            <a
              href="https://www.fedemongeconsulting.com"
              className="text-[#d4d9db] text-sm font-medium hover:text-white transition-colors no-underline hidden sm:inline"
            >
              Main Site
            </a>
            <Link
              href="/run-now"
              className="text-[#d4d9db] text-sm font-medium hover:text-white transition-colors no-underline hidden sm:inline"
            >
              Run Now
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

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1a1d1e] via-[#2d3436] to-[#1a1d1e] relative overflow-hidden py-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(40,207,226,0.08)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(40,207,226,0.05)_0%,transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-[rgba(40,207,226,0.1)] border border-[rgba(40,207,226,0.2)] text-[#28cfe2] px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 bg-[#28cfe2] rounded-full animate-pulse" />
            Real Estate Alerts for Peru
          </span>
          <h1 className="font-heading text-4xl md:text-6xl text-white mb-6">
            Find Your Perfect <span className="text-[#28cfe2]">Apartment</span> in Lima
          </h1>
          <p className="text-[#b3babd] text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Get daily email alerts with new listings from Adondevivir, Urbania, Properati, and Mercado Libre. Never miss a new property again.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/apartment-alerts"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#28cfe2] to-[#1fb8c9] text-[#1a1d1e] px-8 py-4 rounded-full font-semibold text-base hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(40,207,226,0.25)] transition-all no-underline"
            >
              Create Your Alert
            </Link>
            <Link
              href="/manage"
              className="inline-flex items-center gap-2 bg-transparent text-white border-2 border-[#8a9295] px-8 py-4 rounded-full font-semibold text-base hover:border-[#28cfe2] hover:text-[#28cfe2] hover:bg-[rgba(40,207,226,0.05)] transition-all no-underline"
            >
              Manage Alerts
            </Link>
            <Link
              href="/run-now"
              className="inline-flex items-center gap-2 bg-transparent text-white border-2 border-[#8a9295] px-8 py-4 rounded-full font-semibold text-base hover:border-[#28cfe2] hover:text-[#28cfe2] hover:bg-[rgba(40,207,226,0.05)] transition-all no-underline"
            >
              Run Now
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#f0f3f4] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-[rgba(40,207,226,0.1)] text-[#1fb8c9] px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
              How It Works
            </span>
            <h2 className="font-heading text-3xl md:text-4xl text-[#1a1d1e] mb-4">
              Smart Apartment Search
            </h2>
            <p className="text-[#636e72] text-lg">
              Set your criteria once and let us do the daily searching for you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-xl border border-transparent hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.12)] hover:border-[rgba(40,207,226,0.1)] transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1a1d1e] to-[#2d3436] rounded-xl flex items-center justify-center mb-5 text-2xl">
                <svg className="w-7 h-7 text-[#28cfe2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-[#1a1d1e] mb-3">Multi-Source Search</h3>
              <p className="text-[#636e72] leading-relaxed">
                We search Adondevivir, Urbania, Properati, and Mercado Libre every day automatically.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-transparent hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.12)] hover:border-[rgba(40,207,226,0.1)] transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1a1d1e] to-[#2d3436] rounded-xl flex items-center justify-center mb-5 text-2xl">
                <svg className="w-7 h-7 text-[#28cfe2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-[#1a1d1e] mb-3">Daily Email Digest</h3>
              <p className="text-[#636e72] leading-relaxed">
                Receive only new listings in your inbox. No duplicates, no spam, no noise.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-transparent hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.12)] hover:border-[rgba(40,207,226,0.1)] transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1a1d1e] to-[#2d3436] rounded-xl flex items-center justify-center mb-5 text-2xl">
                <svg className="w-7 h-7 text-[#28cfe2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-[#1a1d1e] mb-3">Always Running</h3>
              <p className="text-[#636e72] leading-relaxed">
                Your search runs automatically every day at 8:00 AM Lima time until you stop it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1d1e] text-white py-10 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <a href="https://www.fedemongeconsulting.com" className="font-heading text-xl text-white no-underline">
            Federico<span className="text-[#28cfe2]">Monge</span>
          </a>
          <p className="text-[#8a9295] text-sm">
            &copy; 2025 Federico Monge Consulting. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="https://www.linkedin.com/in/federicomonge"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[#b3babd] hover:bg-gradient-to-r hover:from-[#28cfe2] hover:to-[#1fb8c9] hover:text-[#1a1d1e] hover:-translate-y-0.5 hover:border-transparent transition-all text-sm font-semibold no-underline"
            >
              in
            </a>
            <a
              href="mailto:fede@fedemongeconsulting.com"
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[#b3babd] hover:bg-gradient-to-r hover:from-[#28cfe2] hover:to-[#1fb8c9] hover:text-[#1a1d1e] hover:-translate-y-0.5 hover:border-transparent transition-all no-underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
