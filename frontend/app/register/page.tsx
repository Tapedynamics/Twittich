'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({ username, email, password });
      const { user, accessToken, refreshToken } = response.data;
      login(user, accessToken, refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-4xl font-bold neon-green mb-2 glitch tracking-wider">
            🔓 NEW TRADER REGISTRATION
          </h2>
          <div className="text-[var(--gold)] text-sm tracking-widest mb-4">
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          </div>
          <p className="text-[var(--cyan-neon)] text-sm">
            Hai già un account?{' '}
            <Link href="/login" className="text-[var(--gold)] hover:text-[var(--magenta-neon)] font-bold transition-colors">
              Accedi →
            </Link>
          </p>
        </div>

        {/* Form Card */}
        <form className="retro-card rounded-lg p-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-[var(--bear-red)]/20 border border-[var(--bear-red)] text-[var(--bear-red)] p-3 rounded-lg text-sm neon-red">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-[var(--bull-green)] mb-2 tracking-wide">
                👤 USERNAME
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-4 py-3 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/30 font-mono transition-all"
                placeholder="wolf_of_wallstreet"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-[var(--bull-green)] mb-2 tracking-wide">
                📧 EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/30 font-mono transition-all"
                placeholder="trader@wallstreet.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-[var(--bull-green)] mb-2 tracking-wide">
                🔐 PASSWORD
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/30 font-mono transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--bull-green)] mb-2 tracking-wide">
                🔒 CONFERMA PASSWORD
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-4 py-3 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/30 font-mono transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-bull py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '⌛ CREATING ACCOUNT...' : '▶ JOIN THE FLOOR'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-[var(--gold)] opacity-50 tracking-widest">
          MINIMUM 6 CHARACTERS • SECURE VAULT
        </div>
      </div>
    </div>
  );
}
