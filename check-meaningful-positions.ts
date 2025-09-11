#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMeaningfulPositions() {
  console.log('🔍 Checking meaningful positions (filtering out dust amounts)...\n');
  
  try {
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
    
    console.log('📊 ALL OPEN POSITIONS (including dust):');
    allOpenPositions.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)} (${pos.status})`);
    });
    
    // Filter meaningful positions (value > $1)
    const meaningfulPositions = allOpenPositions.filter(pos => {
      const value = pos.quantity * pos.entryPrice;
      return value > 1.0; // Only positions worth more than $1
    });
    
    console.log('\n💰 MEANINGFUL POSITIONS (value > $1):');
    meaningfulPositions.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)} (${pos.status})`);
    });
    
    // Filter out dust positions (value < $0.10)
    const dustPositions = allOpenPositions.filter(pos => {
      const value = pos.quantity * pos.entryPrice;
      return value < 0.10; // Dust positions worth less than 10 cents
    });
    
    console.log('\n🪙 DUST POSITIONS (value < $0.10):');
    dustPositions.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(4)} (${pos.status})`);
    });
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total open positions: ${allOpenPositions.length}`);
    console.log(`   Meaningful positions (>$1): ${meaningfulPositions.length}`);
    console.log(`   Dust positions (<$0.10): ${dustPositions.length}`);
    
    console.log('\n🎯 RECOMMENDATION:');
    if (dustPositions.length > 0) {
      console.log('   Consider closing dust positions or filtering them from dashboard display');
      console.log('   Dust positions may be confusing dashboard visibility');
    }
    
    if (meaningfulPositions.length !== allOpenPositions.length) {
      console.log(`   Dashboard should focus on ${meaningfulPositions.length} meaningful positions`);
    }
    
  } catch (error) {
    console.error('❌ Failed to check positions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMeaningfulPositions();