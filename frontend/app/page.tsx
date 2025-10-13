'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './store/authStore';
import { postsAPI } from './lib/api';
import PostCard from './components/PostCard';
import CreatePost from './components/CreatePost';
import WelcomeHero from './components/WelcomeHero';

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
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

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Wait for auth to be ready
  useEffect(() => {
    const checkAuthReady = () => {
      if (typeof window !== 'undefined') {
        const hasToken = localStorage.getItem('accessToken');
        const hasUser = localStorage.getItem('user');
        if ((!hasToken && !hasUser) || (hasToken && hasUser && isAuthenticated)) {
          setAuthReady(true);
        } else {
          setTimeout(checkAuthReady, 50);
        }
      }
    };
    checkAuthReady();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadPosts();
  }, [authReady, isAuthenticated, router]);

  const loadPosts = async () => {
    try {
      const response = await postsAPI.getFeed();
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has seen welcome (localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user.id}`);
      if (hasSeenWelcome === 'true') {
        setShowWelcome(false);
      }
    }
  }, [user]);

  const handleDismissWelcome = () => {
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem(`welcome_seen_${user.id}`, 'true');
    }
    setShowWelcome(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Show Welcome Hero on first visit */}
      {showWelcome && (
        <WelcomeHero onDismiss={handleDismissWelcome} username={user?.username || 'Trader'} />
      )}

      {/* Trading Floor Header */}
      {!showWelcome && (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold neon-green mb-2 glitch">
              🏦 TRADING FLOOR
            </h1>
            <div className="text-[var(--gold)] text-sm tracking-widest">
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>
          </div>

          <CreatePost onPostCreated={loadPosts} />
        </>
      )}

      {!showWelcome && (
        <>
          {loading ? (
            <div className="text-center py-12">
              <div className="neon-green text-2xl mb-4">⌛</div>
              <div className="text-[var(--bull-green)] tracking-widest">LOADING MARKET DATA...</div>
            </div>
          ) : posts.length === 0 ? (
            <div className="retro-card rounded-lg p-12 text-center mt-8">
              <div className="neon-gold text-4xl mb-4">📊</div>
              <p className="text-[var(--bull-green)] text-lg tracking-wide">
                NO TRADES YET. BE THE FIRST TO SHARE YOUR STRATEGY!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
