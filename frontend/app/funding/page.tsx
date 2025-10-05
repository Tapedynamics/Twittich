'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function FundingPage() {
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

  const propFirms = [
    {
      name: 'FTMO',
      description: 'Leader mondiale nel prop trading con challenge accessibili',
      features: [
        'Account fino a $400,000',
        'Profit split fino al 90%',
        'Scaling plan disponibile',
        'Challenge da $10k a $200k',
      ],
      logo: '💰',
      affiliateUrl: '#',
      badge: 'Consigliato',
    },
    {
      name: 'MyForexFunds',
      description: 'Prop firm con regole flessibili e payout veloci',
      features: [
        'Account fino a $300,000',
        'Profit split 85%',
        'Payout bi-settimanali',
        'Diverse opzioni di challenge',
      ],
      logo: '💵',
      affiliateUrl: '#',
      badge: 'Popolare',
    },
    {
      name: 'The5ers',
      description: 'Programma di funding con approccio graduale',
      features: [
        'Growth program unico',
        'No time limit',
        'Profit split fino 100%',
        'Scaling automatico',
      ],
      logo: '💸',
      affiliateUrl: '#',
      badge: null,
    },
    {
      name: 'TopStep',
      description: 'Specializzati in futures trading',
      features: [
        'Focus su futures',
        'Capitale fino $150k',
        'Profit split 90%',
        'Piattaforme professionali',
      ],
      logo: '📈',
      affiliateUrl: '#',
      badge: 'Futures',
    },
    {
      name: 'Earn2Trade',
      description: 'Challenge e gauntlet programs per trader seri',
      features: [
        'Account da $25k a $200k',
        'Profit split 80%',
        'Programmi educational',
        'Community attiva',
      ],
      logo: '🎯',
      affiliateUrl: '#',
      badge: null,
    },
    {
      name: 'Funded Next',
      description: 'Nuova generazione di prop trading firms',
      features: [
        'Challenge veloci (1-step)',
        'Account fino a $300k',
        'Profit split 90%',
        'Regole trader-friendly',
      ],
      logo: '🚀',
      affiliateUrl: '#',
      badge: 'Novità',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold neon-green mb-2 glitch tracking-wider">
          💼 PROP FIRM FUNDING
        </h1>
        <div className="text-[var(--gold)] text-sm tracking-widest">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </div>
        <p className="text-[var(--cyan-neon)] mt-4 max-w-2xl mx-auto">
          Ottieni capitale di trading attraverso le migliori prop firms.
          Usa i nostri link di affiliazione per supportare la community!
        </p>
      </div>

      {/* Info Banner */}
      <div className="retro-card rounded-lg p-6 mb-8 border-[var(--gold)]">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">ℹ️</div>
          <div>
            <h3 className="text-[var(--gold)] font-bold mb-2 text-lg">
              Perché le Prop Firms?
            </h3>
            <p className="text-[var(--cyan-neon)] text-sm">
              Le prop firms ti permettono di tradare con il loro capitale mantenendo una percentuale
              dei profitti (70-90%). Nessun rischio del tuo capitale personale, solo il costo della challenge.
              Usando i nostri link affiliati aiuti a mantenere la piattaforma gratuita!
            </p>
          </div>
        </div>
      </div>

      {/* Prop Firms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {propFirms.map((firm, idx) => (
          <div key={idx} className="retro-card rounded-lg p-6 hover:border-[var(--gold)] transition-all group">
            {/* Badge */}
            {firm.badge && (
              <div className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]">
                {firm.badge}
              </div>
            )}

            {/* Logo & Name */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-4xl">{firm.logo}</div>
              <h3 className="text-2xl font-bold neon-green group-hover:neon-gold transition-all">
                {firm.name}
              </h3>
            </div>

            {/* Description */}
            <p className="text-[var(--cyan-neon)] text-sm mb-4 opacity-80">
              {firm.description}
            </p>

            {/* Features */}
            <ul className="space-y-2 mb-6">
              {firm.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start space-x-2 text-sm">
                  <span className="text-[var(--bull-green)]">✓</span>
                  <span className="text-[var(--bull-green)]">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <a
              href={firm.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block btn-bull px-4 py-3 rounded-lg text-center font-bold uppercase tracking-wider transition-all"
            >
              Ottieni Fondi →
            </a>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 retro-card rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold neon-red mb-4">
          ⚠️ Disclaimer Importante
        </h3>
        <p className="text-[var(--cyan-neon)] max-w-3xl mx-auto text-sm">
          Le prop firms richiedono abilità di trading comprovate. Assicurati di avere una strategia
          solida e un buon money management prima di affrontare una challenge.
          Il trading comporta rischi significativi. Studia, fai pratica in demo, e investi solo ciò che puoi permetterti di perdere.
        </p>
      </div>
    </div>
  );
}
