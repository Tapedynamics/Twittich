'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalLiveSessions: number;
  activeLiveSessions: number;
}

export default function AdminPage() {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user?.isAdmin) {
      router.push('/');
      return;
    }

    loadData();
  }, [isAuthenticated, user, router]);

  const loadData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const makeAdmin = async (userId: string) => {
    try {
      await axios.put(
        `${API_URL}/admin/users/${userId}/make-admin`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      alert('Utente promosso ad admin!');
      loadData();
    } catch (error) {
      console.error('Error making user admin:', error);
      alert('Errore durante la promozione');
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <div className="text-[var(--gold)] tracking-widest">⚙️ LOADING ADMIN CONSOLE...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold neon-gold mb-2 glitch tracking-wider">
          ⚙️ ADMIN CONTROL CENTER
        </h1>
        <div className="text-[var(--gold)] text-sm tracking-widest">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="retro-card rounded-lg p-6">
            <div className="text-xs text-[var(--cyan-neon)] mb-2 tracking-wider">TOTAL TRADERS</div>
            <div className="text-3xl font-bold neon-green">
              {stats.totalUsers}
            </div>
          </div>
          <div className="retro-card rounded-lg p-6">
            <div className="text-xs text-[var(--cyan-neon)] mb-2 tracking-wider">BROADCASTS</div>
            <div className="text-3xl font-bold neon-gold">
              {stats.totalPosts}
            </div>
          </div>
          <div className="retro-card rounded-lg p-6">
            <div className="text-xs text-[var(--cyan-neon)] mb-2 tracking-wider">LIVE SESSIONS</div>
            <div className="text-3xl font-bold neon-cyan">
              {stats.totalLiveSessions}
            </div>
          </div>
          <div className="retro-card rounded-lg p-6">
            <div className="text-xs text-[var(--cyan-neon)] mb-2 tracking-wider">ACTIVE LIVE</div>
            <div className="text-3xl font-bold neon-red pulse-glow">
              {stats.activeLiveSessions}
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="retro-card rounded-lg overflow-hidden">
        <div className="p-6 border-b-2 border-[var(--bull-green)]/30">
          <h2 className="text-xl font-bold neon-green tracking-wider">👥 USER MANAGEMENT</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--bull-green)]/30">
            <thead className="bg-[var(--darker-bg)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--gold)] uppercase tracking-wider">
                  TRADER
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--gold)] uppercase tracking-wider">
                  EMAIL
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--gold)] uppercase tracking-wider">
                  STATS
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--gold)] uppercase tracking-wider">
                  ROLE
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--gold)] uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bull-green)]/20">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--bull-green)]/10 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-[var(--bull-green)]">
                      {u.username}
                    </div>
                    <div className="text-xs text-[var(--cyan-neon)]">
                      {new Date(u.createdAt).toLocaleDateString('it-IT')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--cyan-neon)]">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--bull-green)]">
                      📝 {u._count.posts} · 👥 {u._count.followers}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {u.isAdmin ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)] tracking-wider">
                        ⚙️ ADMIN
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg bg-[var(--cyan-neon)]/20 text-[var(--cyan-neon)] border border-[var(--cyan-neon)] tracking-wider">
                        USER
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!u.isAdmin && (
                      <button
                        onClick={() => makeAdmin(u.id)}
                        className="text-[var(--gold)] hover:text-[var(--magenta-neon)] font-bold tracking-wider transition-colors"
                      >
                        ↑ PROMOTE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
