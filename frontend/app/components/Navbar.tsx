'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Scanline Effect */}
      <div className="scanline"></div>

      {/* Ticker Tape */}
      <div className="bg-black border-b-2 border-[var(--bull-green)] overflow-hidden py-1">
        <div className="ticker-tape flex space-x-8 text-xs">
          <span className="neon-green">█ BTCUSD +2.47% </span>
          <span className="neon-red">█ ETHUSD -1.23%</span>
          <span className="neon-gold">█ GOLD +0.89%</span>
          <span className="neon-cyan">█ SPX +1.56%</span>
          <span className="neon-green">█ NASDAQ +2.13%</span>
          <span className="neon-red">█ DJI -0.34%</span>
          <span className="neon-green">█ TSLA +4.21%</span>
          <span className="neon-red">█ META -0.87%</span>
        </div>
      </div>

      <nav className="bg-[#0a0e1a] border-b-2 border-[var(--bull-green)] shadow-lg shadow-[var(--bull-green)]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl sm:text-2xl font-bold neon-green glitch tracking-wider">
                ⚡ READ THE TAPE
              </Link>
              <div className="ml-2 sm:ml-4 text-xs text-[var(--gold)] pulse-glow hidden sm:block">
                EST. 1987
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <Link href="/" className="text-[var(--bull-green)] hover:text-[var(--gold)] px-3 py-2 transition-colors uppercase text-sm tracking-wide">
                    📊 Feed
                  </Link>
                  <Link href="/live" className="text-[var(--bear-red)] hover:text-[var(--gold)] px-3 py-2 transition-colors uppercase text-sm tracking-wide pulse-glow">
                    🔴 Live
                  </Link>
                  <Link href="/education" className="text-[var(--cyan-neon)] hover:text-[var(--gold)] px-3 py-2 transition-colors uppercase text-sm tracking-wide">
                    📚 Education
                  </Link>
                  <Link href="/funding" className="text-[var(--magenta-neon)] hover:text-[var(--gold)] px-3 py-2 transition-colors uppercase text-sm tracking-wide">
                    💼 Funding
                  </Link>
                  <Link href="/profile" className="text-[var(--cyan-neon)] hover:text-[var(--gold)] px-3 py-2 transition-colors uppercase text-sm tracking-wide">
                    👤 Profile
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin" className="text-[var(--gold)] hover:text-[var(--magenta-neon)] px-3 py-2 font-bold uppercase text-sm tracking-wide neon-gold">
                      ⚙️ Admin
                    </Link>
                  )}
                  {/* <div className="ml-2">
                    <NotificationBell />
                  </div> */}
                  <button onClick={handleLogout} className="btn-bear px-4 py-2 rounded uppercase text-sm font-bold ml-2 transition-all">
                    ⏻ Exit
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-[var(--bull-green)] hover:text-[var(--gold)] px-3 py-2 transition-colors uppercase text-sm tracking-wide">
                    Login
                  </Link>
                  <Link href="/register" className="btn-bull px-4 py-2 rounded uppercase text-sm font-bold transition-all">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {isAuthenticated && (
                <NotificationBell />
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-[var(--bull-green)] hover:text-[var(--gold)] p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-[var(--bull-green)]/30 bg-[#0a0e1a]">
            <div className="px-4 py-3 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block text-[var(--bull-green)] hover:text-[var(--gold)] py-2 uppercase text-sm tracking-wide">
                    📊 Feed
                  </Link>
                  <Link href="/live" onClick={() => setMobileMenuOpen(false)} className="block text-[var(--bear-red)] hover:text-[var(--gold)] py-2 uppercase text-sm tracking-wide">
                    🔴 Live
                  </Link>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-[var(--cyan-neon)] hover:text-[var(--gold)] py-2 uppercase text-sm tracking-wide">
                    👤 Profile
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block text-[var(--gold)] hover:text-[var(--magenta-neon)] py-2 font-bold uppercase text-sm tracking-wide">
                      ⚙️ Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full btn-bear px-4 py-2 rounded uppercase text-sm font-bold mt-2">
                    ⏻ Exit
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-[var(--bull-green)] hover:text-[var(--gold)] py-2 uppercase text-sm tracking-wide">
                    Login
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block btn-bull px-4 py-2 rounded uppercase text-sm font-bold text-center">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
