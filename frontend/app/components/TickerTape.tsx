'use client';

import { useEffect, useState } from 'react';
import { getMarketData, MarketSymbol } from '../lib/marketData';

// Mock data as fallback
function getMockData(): MarketSymbol[] {
  return [
    { symbol: 'BTCUSD', name: 'BTCUSD', price: 0, change: 0, changePercent: 2.47 },
    { symbol: 'ETHUSD', name: 'ETHUSD', price: 0, change: 0, changePercent: -1.23 },
    { symbol: 'GOLD', name: 'GOLD', price: 0, change: 0, changePercent: 0.89 },
    { symbol: 'SPX', name: 'SPX', price: 0, change: 0, changePercent: 1.56 },
    { symbol: 'NASDAQ', name: 'NASDAQ', price: 0, change: 0, changePercent: 2.13 },
    { symbol: 'DJI', name: 'DJI', price: 0, change: 0, changePercent: -0.34 },
    { symbol: 'TSLA', name: 'TSLA', price: 0, change: 0, changePercent: 4.21 },
    { symbol: 'META', name: 'META', price: 0, change: 0, changePercent: -0.87 },
  ];
}

export default function TickerTape() {
  const [marketData, setMarketData] = useState<MarketSymbol[]>(getMockData());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function loadMarketData() {
      try {
        const data = await getMarketData();
        if (data && data.length > 0) {
          setMarketData(data);
        }
      } catch (error) {
        console.error('Failed to load market data:', error);
        // Keep mock data on error
      }
    }

    loadMarketData();
  }, [mounted]);

  // Don't render during SSR
  if (!mounted) {
    return (
      <div className="bg-black border-b-2 border-[var(--bull-green)] overflow-hidden py-1">
        <div className="ticker-tape flex space-x-8 text-xs">
          <span className="neon-green">Loading market data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border-b-2 border-[var(--bull-green)] overflow-hidden py-1">
      <div className="ticker-tape flex space-x-8 text-xs">
        {marketData.map((item, idx) => {
          const isPositive = item.changePercent >= 0;
          const colorClass = isPositive ? 'neon-green' : 'neon-red';
          const sign = isPositive ? '+' : '';

          return (
            <span key={idx} className={colorClass}>
              █ {item.name} {sign}{item.changePercent.toFixed(2)}%
            </span>
          );
        })}
        {/* Duplicate for seamless loop */}
        {marketData.map((item, idx) => {
          const isPositive = item.changePercent >= 0;
          const colorClass = isPositive ? 'neon-green' : 'neon-red';
          const sign = isPositive ? '+' : '';

          return (
            <span key={`dup-${idx}`} className={colorClass}>
              █ {item.name} {sign}{item.changePercent.toFixed(2)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
