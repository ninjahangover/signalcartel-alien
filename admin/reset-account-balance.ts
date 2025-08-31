#!/usr/bin/env npx tsx
/**
 * 💰 ACCOUNT BALANCE RESET - FRESH START
 * 
 * Resets the trading account to $10,000 starting balance by:
 * 1. Calculating total realized losses from all historical trades
 * 2. Creating a balance adjustment entry to restore to $10,000
 * 3. Preserving trade history for learning but neutralizing P&L impact
 * 
 * This gives the cleaned AI system a fresh financial start while
 * keeping the learning data intact.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const TARGET_BALANCE = 10000.00;

async function main() {
  console.log('💰 ACCOUNT BALANCE RESET - FRESH START');
  
  try {
    // 1. Calculate current total P&L
    console.log('📊 Calculating current account status...');
    
    const currentStatus = await prisma.managedPosition.aggregate({
      _sum: {
        realizedPnL: true
      },
      _count: {
        id: true
      }
    });

    const totalRealizedPnL = currentStatus._sum.realizedPnL || 0;
    const totalPositions = currentStatus._count.id;
    
    console.log(`📈 Current Status:`);
    console.log(`   Total Positions: ${totalPositions}`);
    console.log(`   Total Realized P&L: $${totalRealizedPnL.toFixed(2)}`);
    console.log(`   Current Account Value: $${(TARGET_BALANCE + totalRealizedPnL).toFixed(2)}`);
    
    // 2. Calculate adjustment needed
    const adjustmentNeeded = TARGET_BALANCE - (TARGET_BALANCE + totalRealizedPnL);
    console.log(`💵 Balance Adjustment Needed: $${adjustmentNeeded.toFixed(2)}`);
    
    if (Math.abs(adjustmentNeeded) < 0.01) {
      console.log('✅ Account is already at target balance!');
      return;
    }
    
    // 3. Create balance adjustment record
    console.log('🔧 Creating balance adjustment...');
    
    const tradeId = `reset-trade-${Date.now()}`;
    const positionId = `balance-reset-${Date.now()}`;
    
    // Create trade record first (required by foreign key)
    await prisma.managedTrade.create({
      data: {
        id: tradeId,
        positionId: positionId,
        side: adjustmentNeeded > 0 ? 'BUY' : 'SELL',
        symbol: 'RESET',
        quantity: Math.abs(adjustmentNeeded),
        price: 1.0,
        value: Math.abs(adjustmentNeeded),
        strategy: 'ACCOUNT_BALANCE_RESET',
        executedAt: new Date(),
        pnl: adjustmentNeeded,
        isEntry: true
      }
    });

    // Create position record that references the trade
    const adjustmentPosition = await prisma.managedPosition.create({
      data: {
        id: positionId,
        strategy: 'ACCOUNT_BALANCE_RESET',
        symbol: 'RESET',
        side: 'ADJUSTMENT',
        entryPrice: 1.0,
        quantity: Math.abs(adjustmentNeeded),
        entryTradeId: tradeId,
        entryTime: new Date(),
        exitPrice: 1.0,
        exitTime: new Date(),
        status: 'closed',
        realizedPnL: adjustmentNeeded, // This brings us back to $10,000
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // 4. Verify new balance
    const newStatus = await prisma.managedPosition.aggregate({
      _sum: {
        realizedPnL: true
      },
      _count: {
        id: true
      }
    });

    const newTotalPnL = newStatus._sum.realizedPnL || 0;
    const newAccountValue = TARGET_BALANCE + newTotalPnL;
    
    console.log('\n🎉 ACCOUNT RESET COMPLETE!');
    console.log(`✅ New Total Realized P&L: $${newTotalPnL.toFixed(2)}`);
    console.log(`✅ New Account Value: $${newAccountValue.toFixed(2)}`);
    console.log(`✅ Target Balance: $${TARGET_BALANCE.toFixed(2)}`);
    console.log(`✅ Difference: $${(newAccountValue - TARGET_BALANCE).toFixed(2)}`);
    
    console.log('\n📋 RESET SUMMARY:');
    console.log(`• Preserved ${totalPositions} historical positions for AI learning`);
    console.log(`• Created balance adjustment of $${adjustmentNeeded.toFixed(2)}`);
    console.log(`• Account restored to $${TARGET_BALANCE} starting balance`);
    console.log(`• AI system can now trade with fresh capital`);
    
    console.log('\n🚀 Your Phase 4 system now has a clean $10,000 account to work with!');

  } catch (error) {
    console.error('❌ Error during account reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n💰 Account balance reset completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Account reset failed:', error);
      process.exit(1);
    });
}

export { main as resetAccountBalance };