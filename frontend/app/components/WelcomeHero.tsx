'use client';

import { useState } from 'react';

interface WelcomeHeroProps {
  onDismiss: () => void;
  username: string;
}

export default function WelcomeHero({ onDismiss, username }: WelcomeHeroProps) {
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    {
      title: "WELCOME TO THE FLOOR",
      icon: "🏦",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-5xl font-bold neon-green mb-4 glitch tracking-wider">
              {username.toUpperCase()}
            </h2>
            <p className="text-2xl text-[var(--gold)] tracking-widest">
              EST. 1987 • WALL STREET
            </p>
          </div>

          <div className="bg-black/60 border-2 border-[var(--bull-green)] rounded-lg p-8 backdrop-blur-sm">
            <p className="text-xl text-[var(--cyan-neon)] leading-relaxed text-center">
              Benvenuto nel <span className="neon-green font-bold">READ THE TAPE</span>,
              l'unico social network dove i trader professionisti condividono strategie,
              analisi di mercato e sessioni live in tempo reale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-gradient-to-br from-[var(--bull-green)]/20 to-transparent border-2 border-[var(--bull-green)] rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="text-lg font-bold neon-green mb-2">CONDIVIDI</h3>
              <p className="text-sm text-[var(--cyan-neon)]">
                Pubblica le tue analisi e strategie di trading
              </p>
            </div>

            <div className="bg-gradient-to-br from-[var(--bear-red)]/20 to-transparent border-2 border-[var(--bear-red)] rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">🔴</div>
              <h3 className="text-lg font-bold neon-red mb-2">STREAMING LIVE</h3>
              <p className="text-sm text-[var(--cyan-neon)]">
                Segui sessioni live di trading in tempo reale
              </p>
            </div>

            <div className="bg-gradient-to-br from-[var(--gold)]/20 to-transparent border-2 border-[var(--gold)] rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-lg font-bold neon-gold mb-2">COMMUNITY</h3>
              <p className="text-sm text-[var(--cyan-neon)]">
                Connettiti con trader di tutto il mondo
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "COSA PUOI FARE",
      icon: "⚡",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="retro-card rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">📊</div>
                <div>
                  <h3 className="text-lg font-bold neon-green mb-2">POST & ANALISI</h3>
                  <p className="text-[var(--cyan-neon)] text-sm leading-relaxed">
                    Condividi setup di trading, grafici, idee di mercato e ottieni feedback dalla community.
                    Usa screenshot o descrizioni testuali delle tue analisi tecniche.
                  </p>
                </div>
              </div>
            </div>

            <div className="retro-card rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">💬</div>
                <div>
                  <h3 className="text-lg font-bold neon-cyan mb-2">DISCUSSIONI</h3>
                  <p className="text-[var(--cyan-neon)] text-sm leading-relaxed">
                    Commenta i post di altri trader, scambia opinioni e costruisci una rete
                    di contatti professionali nel mondo del trading.
                  </p>
                </div>
              </div>
            </div>

            <div className="retro-card rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">🔴</div>
                <div>
                  <h3 className="text-lg font-bold neon-red mb-2">LIVE STREAMING</h3>
                  <p className="text-[var(--cyan-neon)] text-sm leading-relaxed">
                    Segui le sessioni live dove trader esperti analizzano i mercati in tempo reale,
                    con screen sharing e chat interattiva.
                  </p>
                </div>
              </div>
            </div>

            <div className="retro-card rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">📚</div>
                <div>
                  <h3 className="text-lg font-bold neon-gold mb-2">EDUCATION & FUNDING</h3>
                  <p className="text-[var(--cyan-neon)] text-sm leading-relaxed">
                    Accedi a risorse educative e scopri le migliori prop firms per
                    fare trading con capitale fornito da terzi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "REGOLE DEL FLOOR",
      icon: "⚖️",
      content: (
        <div className="space-y-6">
          <div className="bg-[var(--bear-red)]/10 border-2 border-[var(--bear-red)] rounded-lg p-6">
            <h3 className="text-xl font-bold neon-red mb-4 text-center">
              ⚠️ ZERO TOLERANCE POLICY
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-[var(--bear-red)] text-xl">❌</span>
                <p className="text-[var(--cyan-neon)] text-sm">
                  <strong className="neon-red">NESSUN PUMP & DUMP:</strong> È vietato promuovere schemi di manipolazione del mercato o coin pump.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[var(--bear-red)] text-xl">❌</span>
                <p className="text-[var(--cyan-neon)] text-sm">
                  <strong className="neon-red">NO SPAM:</strong> Vietata la pubblicità non richiesta di segnali a pagamento, bot o servizi esterni.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[var(--bear-red)] text-xl">❌</span>
                <p className="text-[var(--cyan-neon)] text-sm">
                  <strong className="neon-red">RISPETTO:</strong> Zero tolleranza per insulti, discriminazione o comportamenti offensivi.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bull-green)]/10 border-2 border-[var(--bull-green)] rounded-lg p-6">
            <h3 className="text-xl font-bold neon-green mb-4 text-center">
              ✅ BEST PRACTICES
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-[var(--bull-green)] text-xl">✓</span>
                <p className="text-[var(--cyan-neon)] text-sm">
                  <strong className="neon-green">CONDIVIDI VALORE:</strong> Post educativi, analisi dettagliate e setup ben spiegati sono benvenuti.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[var(--bull-green)] text-xl">✓</span>
                <p className="text-[var(--cyan-neon)] text-sm">
                  <strong className="neon-green">TRASPARENZA:</strong> Condividi sia i trade vincenti che quelli perdenti per una visione realistica.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[var(--bull-green)] text-xl">✓</span>
                <p className="text-[var(--cyan-neon)] text-sm">
                  <strong className="neon-green">COSTRUISCI:</strong> Contribuisci alla crescita della community con feedback costruttivi.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--gold)]/10 border-2 border-[var(--gold)] rounded-lg p-4 text-center">
            <p className="text-sm text-[var(--gold)]">
              ⚠️ <strong>DISCLAIMER:</strong> Questo non è un servizio di consulenza finanziaria.
              Ogni trader è responsabile delle proprie decisioni di trading.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      onDismiss();
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="w-full max-w-5xl">
        {/* Main Hero Card */}
        <div className="retro-card rounded-lg p-8 md:p-12 relative overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--bull-green)] via-[var(--gold)] to-[var(--bear-red)] opacity-50"></div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-[var(--cyan-neon)] hover:text-[var(--gold)] text-sm uppercase tracking-wider transition-colors"
          >
            SKIP →
          </button>

          {/* Section Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 pulse-glow">{sections[currentSection].icon}</div>
            <h1 className="text-3xl md:text-4xl font-bold neon-cyan tracking-widest">
              {sections[currentSection].title}
            </h1>
            <div className="text-[var(--gold)] text-sm tracking-widest mt-2">
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>
          </div>

          {/* Content */}
          <div className="mb-8">
            {sections[currentSection].content}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12">
            <button
              onClick={handlePrev}
              disabled={currentSection === 0}
              className="btn-bear px-6 py-3 rounded-lg font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← INDIETRO
            </button>

            {/* Progress Dots */}
            <div className="flex space-x-3">
              {sections.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSection(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentSection
                      ? 'bg-[var(--bull-green)] w-8 shadow-lg shadow-[var(--bull-green)]/50'
                      : 'bg-[var(--cyan-neon)]/30 hover:bg-[var(--cyan-neon)]/50'
                  }`}
                  aria-label={`Go to section ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="btn-bull px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all"
            >
              {currentSection === sections.length - 1 ? 'INIZIA →' : 'AVANTI →'}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-[var(--bull-green)]/30">
            <p className="text-xs text-[var(--gold)] tracking-widest">
              POWERED BY TAPE DYNAMICS • EST. 1987
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
