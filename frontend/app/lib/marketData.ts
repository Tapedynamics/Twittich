// Market Data API using Alpha Vantage
// Fetches daily closing prices for ticker tape

const ALPHA_VANTAGE_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
const CACHE_KEY = 'market_data_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface MarketSymbol {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Symbols to track in the ticker tape
const SYMBOLS = [
  { symbol: 'BTC', name: 'BTCUSD', apiSymbol: 'BTC', market: 'crypto' },
  { symbol: 'ETH', name: 'ETHUSD', apiSymbol: 'ETH', market: 'crypto' },
  { symbol: 'SPY', name: 'SPX', apiSymbol: 'SPY', market: 'stock' },
  { symbol: 'QQQ', name: 'NASDAQ', apiSymbol: 'QQQ', market: 'stock' },
  { symbol: 'DIA', name: 'DJI', apiSymbol: 'DIA', market: 'stock' },
  { symbol: 'TSLA', name: 'TSLA', apiSymbol: 'TSLA', market: 'stock' },
  { symbol: 'META', name: 'META', apiSymbol: 'META', market: 'stock' },
  { symbol: 'GLD', name: 'GOLD', apiSymbol: 'GLD', market: 'commodity' },
];

// Get cached data if still valid
function getCachedData(): MarketSymbol[] | null {
  // Only run in browser
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp < CACHE_DURATION) {
      return data;
    }

    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

// Save data to cache
function setCachedData(data: MarketSymbol[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Fetch quote from Alpha Vantage
async function fetchQuote(symbol: string, market: string): Promise<MarketSymbol | null> {
  // Only run in browser
  if (typeof window === 'undefined') return null;

  // Check if API key is available
  if (!ALPHA_VANTAGE_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  try {
    let url: string;

    if (market === 'crypto') {
      // Crypto endpoint
      url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${ALPHA_VANTAGE_KEY}`;
    } else {
      // Stock/ETF endpoint
      url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (market === 'crypto') {
      const timeSeries = data['Time Series (Digital Currency Daily)'];
      if (!timeSeries) return null;

      const latestDate = Object.keys(timeSeries)[0];
      const latestData = timeSeries[latestDate];

      const close = parseFloat(latestData['4a. close (USD)']);
      const open = parseFloat(latestData['1a. open (USD)']);
      const change = close - open;
      const changePercent = (change / open) * 100;

      return {
        symbol: `${symbol}USD`,
        name: `${symbol}USD`,
        price: close,
        change,
        changePercent,
      };
    } else {
      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) return null;

      return {
        symbol: symbol,
        name: symbol,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      };
    }
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Fetch all market data with delay to respect rate limits
export async function fetchMarketData(): Promise<MarketSymbol[]> {
  // Only run in browser
  if (typeof window === 'undefined') {
    return [];
  }

  // Check cache first
  const cached = getCachedData();
  if (cached) {
    console.log('Using cached market data');
    return cached;
  }

  console.log('Fetching fresh market data...');
  const results: MarketSymbol[] = [];

  // Fetch with delays to avoid rate limiting (5 calls per minute on free tier)
  for (const symbolData of SYMBOLS) {
    const quote = await fetchQuote(symbolData.apiSymbol, symbolData.market);
    if (quote) {
      results.push({
        ...quote,
        name: symbolData.name, // Use friendly name
      });
    }

    // Wait 12 seconds between calls (5 calls/minute = 1 call every 12 seconds)
    if (SYMBOLS.indexOf(symbolData) < SYMBOLS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }

  // Cache the results
  if (results.length > 0) {
    setCachedData(results);
  }

  return results;
}

// Get market data (from cache or fetch)
export async function getMarketData(): Promise<MarketSymbol[]> {
  return await fetchMarketData();
}
