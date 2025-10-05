'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { socketService } from '../lib/socket';
import axios from 'axios';
import ScreenShare from '../components/ScreenShare';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface LiveSession {
  id: string;
  title: string;
  description?: string;
  viewersCount: number;
  broadcaster: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface ChatMessage {
  username: string;
  message: string;
  timestamp: Date;
}

export default function LivePage() {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');

  // Wait for auth to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    console.log('Live page: Initializing with user:', user);
    console.log('Live page: Access token:', accessToken ? 'Present' : 'Missing');

    loadLiveSession();

    const socket = socketService.connect(accessToken || undefined);
    console.log('Live page: Socket connected:', socket?.connected);

    return () => {
      if (liveSession) {
        socketService.leaveLiveSession(liveSession.id);
      }
    };
  }, [authReady, isAuthenticated, router, accessToken]);

  useEffect(() => {
    if (liveSession) {
      console.log('Joining live session:', liveSession.id);
      socketService.joinLiveSession(liveSession.id);

      const handleViewersCount = (count: number) => {
        console.log('Viewers count updated:', count);
        setViewersCount(count);
      };

      const handleChatMessage = (data: ChatMessage) => {
        console.log('Received chat message:', data);
        setChatMessages((prev) => [...prev, data]);
      };

      const handleLiveEnded = () => {
        setLiveSession(null);
        alert('La sessione live è terminata');
      };

      // Remove all previous listeners first
      socketService.offViewersCountUpdate();
      socketService.offLiveChatMessage();
      socketService.offLiveEnded();

      // Then add new listeners
      socketService.onViewersCountUpdate(handleViewersCount);
      socketService.onLiveChatMessage(handleChatMessage);
      socketService.onLiveEnded(handleLiveEnded);

      // Cleanup function to remove listeners
      return () => {
        socketService.offViewersCountUpdate();
        socketService.offLiveChatMessage();
        socketService.offLiveEnded();
        if (liveSession) {
          socketService.leaveLiveSession(liveSession.id);
        }
      };
    }
  }, [liveSession]);

  const loadLiveSession = async () => {
    try {
      const response = await axios.get(`${API_URL}/live/current`);
      setLiveSession(response.data);
    } catch (error) {
      console.error('Error loading live session:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLive = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/live/start`,
        {
          title: 'Trading Live Session',
          description: 'Analisi di mercato in tempo reale',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setLiveSession(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'avvio della live');
    }
  };

  const stopLive = async () => {
    if (!liveSession) return;
    try {
      await axios.post(
        `${API_URL}/live/${liveSession.id}/stop`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setLiveSession(null);
    } catch (error) {
      alert('Errore nell\'interruzione della live');
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('sendMessage called - Input:', messageInput.trim());
    console.log('sendMessage called - LiveSession:', liveSession);
    console.log('sendMessage called - User:', user);

    if (!messageInput.trim()) {
      console.warn('Message is empty');
      return;
    }

    if (!liveSession) {
      console.error('No live session found');
      return;
    }

    if (!user) {
      console.error('User not authenticated');
      return;
    }

    console.log('Sending chat message:', {
      sessionId: liveSession.id,
      message: messageInput,
      userId: user.id,
      username: user.username
    });

    socketService.sendChatMessage(liveSession.id, messageInput, user.id, user.username);
    setMessageInput('');
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--bear-red)] mx-auto mb-4"></div>
          <div className="text-[var(--bear-red)] tracking-widest pulse-glow">🔴 CONNECTING TO LIVE STREAM...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {!liveSession ? (
        <div className="text-center py-20">
          <div className="retro-card rounded-lg p-12">
            <div className="text-6xl mb-6 pulse-glow">📺</div>
            <h1 className="text-3xl font-bold neon-red mb-4 tracking-wider">
              🔴 NO LIVE SESSION ACTIVE
            </h1>
            <p className="text-[var(--cyan-neon)] mb-8">
              The trading floor is currently offline
            </p>

            {user?.isAdmin && (
              <button
                onClick={startLive}
                className="btn-bear px-8 py-3 rounded-lg font-bold text-lg uppercase tracking-widest pulse-glow"
              >
                🔴 START BROADCAST
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Stream Area */}
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute top-4 left-4 bg-[var(--bear-red)] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 z-10 neon-red shadow-lg shadow-[var(--bear-red)]/50">
                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                <span className="tracking-wider">● LIVE</span>
              </div>
              <div className="absolute top-4 right-4 bg-black/70 border-2 border-[var(--cyan-neon)] text-[var(--cyan-neon)] px-4 py-2 rounded-lg z-10 font-bold tracking-wider">
                👁️ {viewersCount} VIEWERS
              </div>
              <ScreenShare
                isAdmin={user?.isAdmin || false}
                sessionId={liveSession.id}
              />
            </div>

            <div className="retro-card rounded-lg p-6 mt-4">
              <h2 className="text-2xl font-bold neon-green tracking-wider">
                {liveSession.title}
              </h2>
              <p className="text-[var(--cyan-neon)] mt-2">{liveSession.description}</p>
              <div className="flex items-center mt-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--bear-red)] to-[var(--magenta-neon)] rounded-full flex items-center justify-center text-white font-bold border-2 border-[var(--gold)]">
                  {liveSession.broadcaster.username[0].toUpperCase()}
                </div>
                <span className="ml-3 font-bold text-[var(--gold)] tracking-wider">
                  📡 {liveSession.broadcaster.username}
                </span>
              </div>

              {user?.isAdmin && liveSession.broadcaster.id === user.id && (
                <button
                  onClick={stopLive}
                  className="mt-4 btn-bear px-6 py-2 rounded-lg font-bold uppercase tracking-wider"
                >
                  ⏹️ END BROADCAST
                </button>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="retro-card rounded-lg flex flex-col h-[600px]">
            <div className="p-4 border-b-2 border-[var(--bull-green)]/30">
              <h3 className="font-bold text-lg neon-cyan tracking-wider">💬 LIVE CHAT</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="border-l-2 border-[var(--cyan-neon)]/50 pl-3">
                  <span className="font-bold text-[var(--gold)]">
                    {msg.username}:
                  </span>{' '}
                  <span className="text-[var(--bull-green)]">{msg.message}</span>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t-2 border-[var(--bull-green)]/30">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/30 font-mono"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="btn-bull px-4 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
