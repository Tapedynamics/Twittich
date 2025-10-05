'use client';

import { useState } from 'react';
import { postsAPI } from '../lib/api';

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

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post._count.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    try {
      if (liked) {
        await postsAPI.unlikePost(post.id);
        setLikesCount((prev) => prev - 1);
      } else {
        await postsAPI.likePost(post.id);
        setLikesCount((prev) => prev + 1);
      }
      setLiked(!liked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const response = await postsAPI.getComments(post.id);
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    try {
      const response = await postsAPI.addComment(post.id, commentInput);
      setComments([...comments, response.data]);
      setCommentInput('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Errore nell\'aggiunta del commento');
    }
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  return (
    <div className="retro-card rounded-lg p-6 mb-4">
      {/* Header */}
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--bull-green)] to-[var(--cyan-neon)] rounded-full flex items-center justify-center text-black font-bold">
          {post.user.username[0].toUpperCase()}
        </div>
        <div className="ml-3">
          <p className="font-semibold text-[var(--bull-green)]">{post.user.username}</p>
          <p className="text-sm text-[var(--cyan-neon)] opacity-70">{formatDate(post.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      <p className="text-[var(--bull-green)] mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>

      {/* Media */}
      {post.mediaUrls && (
        <div className="mb-4">
          <img
            src={post.mediaUrls}
            alt="Post media"
            className="rounded-lg w-full max-h-[500px] object-contain"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-6 pt-4 border-t border-[var(--bull-green)]/30">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 ${
            liked ? 'text-[var(--bear-red)] neon-red' : 'text-[var(--bull-green)]'
          } hover:text-[var(--gold)] transition-all font-bold`}
        >
          <svg
            className="w-5 h-5"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>{likesCount}</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center space-x-2 text-[var(--cyan-neon)] hover:text-[var(--gold)] transition-all font-bold"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{post._count.comments}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-[var(--bull-green)]/30">
          {/* Comments List */}
          {loadingComments ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--bull-green)] mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[var(--cyan-neon)] to-[var(--magenta-neon)] rounded-full flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
                      {comment.user.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-[var(--dark-bg)] border border-[var(--cyan-neon)]/30 rounded-lg p-3">
                        <p className="font-semibold text-sm text-[var(--cyan-neon)]">
                          {comment.user.username}
                        </p>
                        <p className="text-[var(--bull-green)] text-sm mt-1">{comment.content}</p>
                      </div>
                      <p className="text-xs text-[var(--gold)] opacity-70 mt-1">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[var(--cyan-neon)] opacity-70 text-sm text-center py-4">
                  Nessun commento ancora
                </p>
              )}
            </div>
          )}

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="flex space-x-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Scrivi un commento..."
              className="flex-1 px-3 py-2 bg-[var(--darker-bg)] border border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-sm text-[var(--bull-green)] placeholder-[var(--bull-green)]/50"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="btn-bull px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
            >
              Invia
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
