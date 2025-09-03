import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { symbol, side, quantity, orderType = 'market', limitPrice, strategy = 'manual' } = await request.json();

    // Validate required fields
    if (!symbol || !side || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, side, quantity' },
        { status: 400 }
      );
    }

    // NO MOCK TRADES - This endpoint needs real trade execution
    console.error('❌ Manual trading API called but no real execution backend configured');
    
    return NextResponse.json(
      { 
        error: 'Trading backend not configured',
        message: 'Manual trading requires real trade execution - mock trades not allowed'
      },
      { status: 501 } // Not Implemented
    );

  } catch (error) {
    console.error('Error executing manual trade:', error);
    return NextResponse.json(
      { error: 'Failed to execute trade', details: error.message },
      { status: 500 }
    );
  }
}