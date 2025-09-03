import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol;
    
    // Connect to your actual market data service
    if (symbol === 'BTCUSD') {
      try {
        // Use the same Kraken API that your trading system uses
        const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD', {
          next: { revalidate: 30 } // Cache for 30 seconds
        });
        
        if (response.ok) {
          const data = await response.json();
          const ticker = data.result?.XXBTZUSD;
          
          if (ticker) {
            const currentPrice = parseFloat(ticker.c[0]);
            const previousPrice = parseFloat(ticker.o);
            const change24h = ((currentPrice - previousPrice) / previousPrice) * 100;
            
            return NextResponse.json({
              symbol: 'BTCUSD',
              price: currentPrice,
              change24h: change24h,
              high24h: parseFloat(ticker.h[0]),
              low24h: parseFloat(ticker.l[0]),
              volume24h: parseFloat(ticker.v[0]),
              timestamp: new Date().toISOString(),
              source: 'kraken'
            });
          }
        }
      } catch (krakenError) {
        console.error('Kraken API error:', krakenError);
      }
    }
    
    // NO MOCK DATA - Return error if API fails
    console.error(`❌ No real market data available for ${symbol}`);
    return NextResponse.json(
      { 
        error: 'Market data unavailable',
        message: `No real data available for ${symbol} - mock data not allowed`
      },
      { status: 503 }
    );
    
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch market data',
        message: error.message 
      },
      { status: 500 }
    );
  }
}