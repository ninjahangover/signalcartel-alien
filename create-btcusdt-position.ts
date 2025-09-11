#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBTCUSDTPosition() {
  console.log('🔧 Creating BTCUSDT position to match live system tracking...\n');
  
  const liveSessionId = process.env.LIVE_TRADING_SESSION_ID || 'session-production-1757538257208';
  const liveUserId = process.env.LIVE_TRADING_USER_ID || 'user-production';
  
  try {
    // Check if BTCUSDT position already exists
    const existingPosition = await prisma.managedPosition.findFirst({
      where: { 
        symbol: 'BTCUSDT',
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        }
      }
    });
    
    if (existingPosition) {
      console.log('✅ BTCUSDT position already exists in database:', existingPosition.id);
      
      // Check if LivePosition exists for dashboard
      const existingLivePosition = await prisma.livePosition.findFirst({
        where: { 
          symbol: 'BTCUSDT',
          status: { 
            in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
          }
        }
      });
      
      if (!existingLivePosition) {
        // Create LivePosition for dashboard
        const now = new Date();
        const livePosition = await prisma.livePosition.create({
          data: {
            id: `live-pos-${Date.now()}-btcusdt`,
            symbol: 'BTCUSDT',
            quantity: existingPosition.quantity,
            entryPrice: existingPosition.entryPrice,
            entryValue: existingPosition.quantity * existingPosition.entryPrice,
            entryTime: existingPosition.entryTime,
            entryTradeIds: existingPosition.entryTradeId || 'unknown',
            status: existingPosition.status,
            side: 'buy',
            strategy: 'tensor-ai-fusion',
            sessionId: liveSessionId,
            createdAt: now,
            updatedAt: now
          }
        });
        console.log('✅ Created LivePosition for existing BTCUSDT:', livePosition.id);
      } else {
        console.log('✅ BTCUSDT LivePosition already exists:', existingLivePosition.id);
      }
      
      return;
    }
    
    console.log('🔧 Creating new BTCUSDT position to match live system ($50.00 position)...');
    
    // Calculate position details based on $50 value
    const btcPrice = 113800; // Current BTC price from logs
    const positionValue = 50; // $50 position
    const quantity = positionValue / btcPrice; // Calculate BTC quantity
    
    const positionId = `pos-${Date.now()}-btcusdt-live`;
    const tradeId = `trade-${Date.now()}-btcusdt-entry`;
    const now = new Date();
    
    // Create entry trade first
    await prisma.managedTrade.create({
      data: {
        id: tradeId,
        positionId: positionId,
        symbol: 'BTCUSDT',
        side: 'buy',
        quantity: quantity,
        price: btcPrice,
        value: positionValue,
        strategy: 'tensor-ai-fusion',
        executedAt: now,
        isEntry: true
      }
    });
    
    console.log(`✅ Created entry trade: ${tradeId}`);
    
    // Create ManagedPosition
    const position = await prisma.managedPosition.create({
      data: {
        id: positionId,
        symbol: 'BTCUSDT',
        quantity: quantity,
        entryPrice: btcPrice,
        status: 'open',
        side: 'buy',
        strategy: 'tensor-ai-fusion',
        entryTime: now,
        createdAt: now,
        entryTradeId: tradeId
      }
    });
    
    console.log(`✅ Created ManagedPosition: ${positionId}`);
    console.log(`   Symbol: BTCUSDT`);
    console.log(`   Quantity: ${quantity} BTC`);
    console.log(`   Entry Price: $${btcPrice}`);
    console.log(`   Position Value: $${(quantity * btcPrice).toFixed(2)}`);
    
    console.log(`✅ Created entry trade: ${tradeId}`);
    
    // Create LivePosition for dashboard
    const livePosition = await prisma.livePosition.create({
      data: {
        id: `live-pos-${Date.now()}-btcusdt`,
        symbol: 'BTCUSDT',
        quantity: quantity,
        entryPrice: btcPrice,
        status: 'open',
        direction: 'long',
        strategy: 'tensor-ai-fusion',
        sessionId: liveSessionId,
        userId: liveUserId,
        createdAt: new Date()
      }
    });
    
    console.log(`✅ Created LivePosition for dashboard: ${livePosition.id}`);
    
    // Verify the creation
    const allOpenPositions = await prisma.managedPosition.findMany({
      where: { 
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      },
      select: {
        symbol: true,
        quantity: true,
        entryPrice: true,
        status: true
      },
      orderBy: { symbol: 'asc' }
    });
    
    console.log('\n📊 ALL OPEN POSITIONS AFTER CREATING BTCUSDT:');
    allOpenPositions.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)} (${pos.status})`);
    });
    
    const allLivePositions = await prisma.livePosition.findMany({
      where: { 
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      },
      select: {
        symbol: true,
        quantity: true,
        entryPrice: true,
        status: true
      },
      orderBy: { symbol: 'asc' }
    });
    
    console.log('\n📱 ALL DASHBOARD LIVEPOSITIONS:');
    allLivePositions.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.status} - ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)}`);
    });
    
    console.log('\n🎉 SUCCESS: BTCUSDT position created and should now appear in dashboard!');
    console.log('🖥️  Dashboard should now show Bitcoin position that matches live system tracking.');
    
  } catch (error) {
    console.error('❌ Failed to create BTCUSDT position:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createBTCUSDTPosition();