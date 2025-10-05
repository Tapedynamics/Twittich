'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function EducationPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const educationResources = [
    {
      category: 'Video Corsi',
      items: [
        {
          title: 'Trading Basics per Principianti',
          description: 'Fondamenti del trading e analisi tecnica',
          url: '#',
          type: 'video',
        },
        {
          title: 'Strategie Avanzate di Price Action',
          description: 'Impara a leggere il tape come un professionista',
          url: '#',
          type: 'video',
        },
        {
          title: 'Risk Management & Psychology',
          description: 'Gestisci il rischio e la psicologia del trading',
          url: '#',
          type: 'video',
        },
      ],
    },
    {
      category: 'E-Books & Guide',
      items: [
        {
          title: 'Manuale Completo di Trading',
          description: 'Guida PDF scaricabile per trader di ogni livello',
          url: '#',
          type: 'pdf',
        },
        {
          title: 'Strategie Intraday',
          description: 'Le migliori strategie per il day trading',
          url: '#',
          type: 'pdf',
        },
      ],
    },
    {
      category: 'Webinar & Live',
      items: [
        {
          title: 'Market Analysis Settimanale',
          description: 'Analisi dei mercati in diretta ogni lunedì',
          url: '#',
          type: 'live',
        },
        {
          title: 'Q&A con Trader Esperti',
          description: 'Sessioni di domande e risposte in tempo reale',
          url: '#',
          type: 'live',
        },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold neon-green mb-2 glitch tracking-wider">
          📚 TRADING EDUCATION
        </h1>
        <div className="text-[var(--gold)] text-sm tracking-widest">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </div>
        <p className="text-[var(--cyan-neon)] mt-4 max-w-2xl mx-auto">
          Accedi a risorse educative, corsi e materiale formativo per migliorare le tue skill di trading
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {educationResources.map((category, idx) => (
          <div key={idx} className="retro-card rounded-lg p-6">
            <h2 className="text-2xl font-bold neon-gold mb-6 tracking-wider">
              {category.category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item, itemIdx) => (
                <a
                  key={itemIdx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="retro-card rounded-lg p-4 hover:border-[var(--gold)] transition-all cursor-pointer group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {item.type === 'video' && '🎥'}
                      {item.type === 'pdf' && '📄'}
                      {item.type === 'live' && '🔴'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[var(--bull-green)] font-bold mb-1 group-hover:text-[var(--gold)] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[var(--cyan-neon)] text-sm opacity-70">
                        {item.description}
                      </p>
                      <div className="mt-2 text-[var(--gold)] text-xs tracking-wider">
                        ACCEDI →
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 retro-card rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold neon-green mb-4">
          🎓 Vuoi Diventare un Trader Professionista?
        </h3>
        <p className="text-[var(--cyan-neon)] mb-6 max-w-2xl mx-auto">
          Accedi al nostro programma completo di formazione con mentorship personalizzata,
          strategie avanzate e supporto della community.
        </p>
        <button className="btn-bull px-8 py-3 rounded-lg text-lg font-bold uppercase tracking-wider">
          SCOPRI IL CORSO COMPLETO
        </button>
      </div>
    </div>
  );
}
