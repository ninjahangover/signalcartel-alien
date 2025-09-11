#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosticPositionReality() {
  console.log('🚨 CRITICAL DIAGNOSTIC: Position Reality Check');
  console.log('===============================================\n');
  
  try {
    // 1. What the dashboard thinks (LivePosition)
    const livePositions = await prisma.livePosition.findMany({
      where: { status: { in: ['open', 'limit_buy', 'limit_sell'] } },
      select: { symbol: true, status: true, quantity: true, entryPrice: true, updatedAt: true }
    });
    
    console.log('📱 DASHBOARD (LivePosition table):');
    if (livePositions.length === 0) {
      console.log('   ❌ NO POSITIONS SHOWN IN DASHBOARD');
    } else {
      livePositions.forEach(pos => {
        const value = pos.quantity * pos.entryPrice;
        console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)} (${pos.status})`);
      });
    }
    console.log(`   Total dashboard positions: ${livePositions.length}\n`);
    
    // 2. What the system thinks (ManagedPosition)  
    const managedPositions = await prisma.managedPosition.findMany({
      where: { status: { in: ['open', 'limit_buy', 'limit_sell'] } },
      select: { symbol: true, status: true, quantity: true, entryPrice: true, updatedAt: true }
    });
    
    console.log('🤖 SYSTEM TRACKING (ManagedPosition table):');
    if (managedPositions.length === 0) {
      console.log('   ❌ NO POSITIONS TRACKED BY SYSTEM');
    } else {
      managedPositions.forEach(pos => {
        const value = pos.quantity * pos.entryPrice;
        console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)} (${pos.status})`);
      });
    }
    console.log(`   Total system positions: ${managedPositions.length}\n`);
    
    // 3. What you see on Kraken.com
    console.log('🌐 KRAKEN.COM REALITY (what you reported):');
    console.log('   BNB: [actual amount unknown]');
    console.log('   BTC: [actual amount unknown]'); 
    console.log('   SOL: [actual amount unknown]');
    console.log('   Total Kraken positions: 3\n');
    
    // 4. Discrepancy analysis
    console.log('🚨 CRITICAL DISCREPANCIES:');
    console.log(`   Dashboard shows: ${livePositions.length} positions`);
    console.log(`   System tracks: ${managedPositions.length} positions`);
    console.log(`   Kraken reality: 3 positions`);
    console.log('\n⚠️  OPERATIONAL RISK: System is not accurately tracking your actual positions!');
    console.log('⚠️  FINANCIAL RISK: Trading decisions based on incorrect position data!');
    console.log('⚠️  COMPLIANCE RISK: No reliable audit trail of actual holdings!\n');
    
    // 5. Recommendations
    console.log('🔧 REQUIRED ACTIONS:');
    console.log('   1. Stop all trading until position sync is fixed');
    console.log('   2. Clear all phantom database entries');
    console.log('   3. Force fresh sync with actual Kraken API data');
    console.log('   4. Verify perfect match between Kraken and dashboard');
    console.log('   5. Implement position reconciliation monitoring');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosticPositionReality();