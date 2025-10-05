'use client';

import { useState } from 'react';
import { postsAPI } from '../lib/api';
import ImageUpload from './ImageUpload';

export default function CreatePost({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await postsAPI.createPost({
        content,
        mediaUrls: imageUrl ? [imageUrl] : undefined,
        type: imageUrl ? 'IMAGE' : 'TEXT'
      });
      setContent('');
      setImageUrl(null);
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Errore nella creazione del post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="retro-card rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <h3 className="text-xl font-bold neon-green tracking-wider">📈 BROADCAST YOUR STRATEGY</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your market analysis... Bulls or Bears? 📊"
          className="w-full p-4 bg-[var(--darker-bg)] border-2 border-[var(--bull-green)]/50 rounded-lg focus:ring-2 focus:ring-[var(--bull-green)] focus:border-[var(--bull-green)] text-[var(--bull-green)] placeholder-[var(--bull-green)]/40 resize-none font-mono transition-all"
          rows={4}
        />

        <ImageUpload onImageUpload={setImageUrl} />

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="btn-bull px-6 py-3 rounded-lg font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '⌛ BROADCASTING...' : '📡 BROADCAST'}
          </button>
        </div>
      </form>
    </div>
  );
}
