'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { usersAPI, postsAPI } from '../lib/api';
import PostCard from '../components/PostCard';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  tradingStyle?: string;
  winRate?: number;
  totalTrades?: number;
  profitLoss?: number;
  createdAt: string;
  _count: {
    followers: number;
    following: number;
    posts: number;
  };
}

interface Post {
  id: string;
  content: string;
  mediaUrls: string | null;
  type: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

export default function ProfilePage() {
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    avatar: '',
    tradingStyle: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [isAuthenticated, router, currentUser]);

  const loadProfile = async () => {
    if (!currentUser?.id) return;

    try {
      const [profileRes, postsRes] = await Promise.all([
        usersAPI.getProfile(currentUser.id),
        postsAPI.getFeed(1, 50),
      ]);

      setProfile(profileRes.data);
      setEditForm({
        username: profileRes.data.username || '',
        bio: profileRes.data.bio || '',
        avatar: profileRes.data.avatar || '',
        tradingStyle: profileRes.data.tradingStyle || '',
      });

      // Filtra solo i post dell'utente corrente
      const userPosts = postsRes.data.filter(
        (post: Post) => post.user.id === currentUser.id
      );
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      if (isFollowing) {
        await usersAPI.unfollow(profile.id);
      } else {
        await usersAPI.follow(profile.id);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error following/unfollowing:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await usersAPI.updateProfile(editForm);
      setProfile(response.data);
      setIsEditing(false);
      alert('Profilo aggiornato con successo!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Errore durante l\'aggiornamento del profilo');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--bull-green)] mx-auto mb-4"></div>
          <div className="text-[var(--bull-green)] tracking-widest">LOADING TRADER PROFILE...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="retro-card rounded-lg p-12 text-center">
          <h1 className="text-2xl font-bold neon-red">⚠️ TRADER NOT FOUND</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="retro-card rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold neon-green mb-4 tracking-wider">⚙️ EDIT TRADER PROFILE</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--bull-green)] mb-2">
                  👤 USERNAME
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--bull-green)] mb-2">
                  📝 BIO
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/30 font-mono"
                  rows={3}
                  placeholder="Tell us about your trading strategy..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--bull-green)] mb-2">
                  📊 TRADING STYLE
                </label>
                <select
                  value={editForm.tradingStyle}
                  onChange={(e) => setEditForm({ ...editForm, tradingStyle: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] font-mono"
                >
                  <option value="">Select...</option>
                  <option value="Day Trading">Day Trading</option>
                  <option value="Swing Trading">Swing Trading</option>
                  <option value="Scalping">Scalping</option>
                  <option value="Position Trading">Position Trading</option>
                  <option value="Algo Trading">Algo Trading</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--bull-green)] mb-2">
                  🖼️ AVATAR (URL)
                </label>
                <input
                  type="text"
                  value={editForm.avatar}
                  onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/30 font-mono"
                  placeholder="https://example.com/avatar.jpg or base64"
                />
                {editForm.avatar && (
                  <img
                    src={editForm.avatar}
                    alt="Preview"
                    className="mt-2 w-20 h-20 rounded-full object-cover border-2 border-[var(--cyan-neon)]"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 btn-bull px-4 py-2 rounded-lg font-bold uppercase tracking-wider"
                >
                  💾 Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 btn-bear px-4 py-2 rounded-lg font-bold uppercase tracking-wider"
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cover Image */}
      <div className="bg-gradient-to-r from-[var(--bull-green)] to-[var(--cyan-neon)] h-48 rounded-t-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--grid-color)] opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl font-bold neon-gold tracking-widest opacity-30">
            TRADING PROFILE
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="retro-card rounded-b-lg p-6 -mt-16 relative">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.username}
              className="w-32 h-32 rounded-full border-4 border-[var(--bull-green)] shadow-lg shadow-[var(--bull-green)]/50 object-cover"
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-[var(--bull-green)] to-[var(--cyan-neon)] rounded-full flex items-center justify-center text-black text-4xl font-bold border-4 border-[var(--gold)] shadow-lg shadow-[var(--gold)]/50">
              {profile.username[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1 pt-16">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold neon-green tracking-wider">
                  {profile.username}
                </h1>
                <p className="text-[var(--cyan-neon)] mt-1">{profile.email}</p>
                {profile.tradingStyle && (
                  <p className="text-[var(--gold)] font-semibold mt-2 tracking-wide">
                    📊 {profile.tradingStyle}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-[var(--bull-green)] mt-3">{profile.bio}</p>
                )}
              </div>

              {currentUser?.id === profile.id ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-[var(--gold)] text-black px-6 py-2 rounded-lg hover:bg-[var(--magenta-neon)] transition-all font-bold uppercase tracking-wider"
                >
                  ⚙️ Edit
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-lg font-bold uppercase tracking-wider transition-all ${
                    isFollowing
                      ? 'btn-bear'
                      : 'btn-bull'
                  }`}
                >
                  {isFollowing ? '✓ Following' : '+ Follow'}
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex space-x-8 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold neon-green">
                  {profile._count.posts}
                </div>
                <div className="text-xs text-[var(--gold)] tracking-wider">BROADCASTS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold neon-cyan">
                  {profile._count.followers}
                </div>
                <div className="text-xs text-[var(--gold)] tracking-wider">FOLLOWERS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold neon-gold">
                  {profile._count.following}
                </div>
                <div className="text-xs text-[var(--gold)] tracking-wider">FOLLOWING</div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Posts */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold neon-green mb-6 tracking-wider">📡 BROADCASTS</h2>
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="retro-card rounded-lg p-12 text-center">
            <p className="text-[var(--cyan-neon)] opacity-70">📊 No broadcasts yet. Share your first strategy!</p>
          </div>
        )}
      </div>
    </div>
  );
}
