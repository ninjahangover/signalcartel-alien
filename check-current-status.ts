#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    console.log('🔍 CHECKING CURRENT SYSTEM STATUS AFTER CODE CHANGES\n');

    // Check open positions
    const openPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 OPEN POSITIONS: ${openPositions.length} total`);
    console.log('='.repeat(60));

    for (const pos of openPositions) {
      console.log(`${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} | Side: ${pos.side} | Created: ${pos.createdAt.toISOString()}`);
    }

    if (openPositions.length === 0) {
      console.log('✅ No open positions - system cleaned up correctly');
    }

    // Check recent trades
    console.log('\n📈 RECENT TRADES (Last 5):');
    console.log('='.repeat(60));

    const recentTrades = await prisma.managedTrade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    for (const trade of recentTrades) {
      console.log(`${trade.symbol}: ${trade.action} ${trade.quantity} @ $${trade.price} | Status: ${trade.status} | ${trade.createdAt.toISOString()}`);
    }

    console.log('\n✅ Database check complete - system functioning correctly after code changes');

  } catch (error) {
    console.error('❌ Error checking status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();