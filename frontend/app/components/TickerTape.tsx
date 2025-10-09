'use client';

import { useEffect, useState } from 'react';
import { getMarketData, MarketSymbol } from '../lib/marketData';

export default function TickerTape() {
  const [marketData, setMarketData] = useState<MarketSymbol[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMarketData() {
      try {
        const data = await getMarketData();
        setMarketData(data);
      } catch (error) {
        console.error('Failed to load market data:', error);
        // Fallback to mock data if API fails
        setMarketData(getMockData());
      } finally {
        setLoading(false);
      }
    }

    loadMarketData();
  }, []);

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

  const displayData = marketData.length > 0 ? marketData : getMockData();

  return (
    <div className="bg-black border-b-2 border-[var(--bull-green)] overflow-hidden py-1">
      <div className="ticker-tape flex space-x-8 text-xs">
        {displayData.map((item, idx) => {
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
        {displayData.map((item, idx) => {
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
