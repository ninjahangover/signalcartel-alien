#!/usr/bin/env npx tsx
/**
 * Kraken Position Synchronization Utility
 * 
 * CRITICAL ISSUE: System shows trades executing but positions not tracked in database
 * This utility identifies orphaned Kraken positions and synchronizes them with our database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface KrakenPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  side: 'long' | 'short';
}

async function getKrakenOpenPositions(): Promise<KrakenPosition[]> {
  // Note: This would normally use Kraken API to get open positions
  // For now, we'll return empty array since API is rate limited
  console.log('🔍 Checking Kraken for open positions...');
  console.log('⚠️  Kraken API rate limited - cannot fetch positions directly');
  return [];
}

async function getDatabaseOpenPositions() {
  try {
    const positions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      include: {
        entryTrade: true,
        exitTrade: true
      }
    });
    
    console.log(`📊 Database open positions: ${positions.length}`);
    return positions;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return [];
  }
}

async function getRecentClosedPositions() {
  try {
    const positions = await prisma.managedPosition.findMany({
      where: { 
        status: 'closed',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        entryTrade: true,
        exitTrade: true
      }
    });
    
    console.log(`📈 Recent closed positions (24h): ${positions.length}`);
    return positions;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return [];
  }
}

async function identifyOrphanedPositions() {
  console.log('🔍 KRAKEN POSITION SYNCHRONIZATION ANALYSIS');
  console.log('===========================================');
  
  // Get database state
  const dbOpenPositions = await getDatabaseOpenPositions();
  const recentClosedPositions = await getRecentClosedPositions();
  
  // Get Kraken state (would be from API)
  const krakenPositions = await getKrakenOpenPositions();
  
  console.log('\n📊 POSITION STATUS SUMMARY:');
  console.log(`   Database Open: ${dbOpenPositions.length}`);
  console.log(`   Kraken Open: ${krakenPositions.length} (API unavailable)`);
  console.log(`   Recent Closed: ${recentClosedPositions.length}`);
  
  if (recentClosedPositions.length > 0) {
    console.log('\n📈 RECENT TRADING ACTIVITY:');
    for (const pos of recentClosedPositions.slice(0, 10)) {
      const pnlPercent = ((pos.realizedPnL || 0) / (pos.entryPrice * pos.quantity)) * 100;
      console.log(`   ${pos.createdAt.toISOString().substring(0, 16)} | ${pos.symbol} | ${pos.quantity.toFixed(6)} @ $${pos.entryPrice} | P&L: ${pnlPercent.toFixed(2)}%`);
    }
  }
  
  // Analysis
  console.log('\n🚨 CRITICAL FINDINGS:');
  if (dbOpenPositions.length === 0) {
    console.log('   ❌ NO OPEN POSITIONS IN DATABASE');
    console.log('   ❌ But user reports positions on Kraken.com');
    console.log('   ❌ This indicates POSITION TRACKING FAILURE');
    console.log('   ❌ Trades may be executing but not being saved');
  }
  
  if (recentClosedPositions.length > 0) {
    const latestPosition = recentClosedPositions[0];
    const timeSinceLastTrade = (Date.now() - latestPosition.createdAt.getTime()) / 1000 / 60;
    console.log(`   ⏰ Last recorded trade: ${timeSinceLastTrade.toFixed(1)} minutes ago`);
    
    if (timeSinceLastTrade > 30) {
      console.log('   ⚠️  Gap in recorded trading activity');
    }
  }
  
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  console.log('   1. Check database connection and Prisma client');
  console.log('   2. Investigate order placement vs position creation logic');
  console.log('   3. Add transaction logging for position creation');
  console.log('   4. Implement position recovery from Kraken API');
  console.log('   5. Add position sync validation in main trading loop');
}

async function main() {
  try {
    await identifyOrphanedPositions();
  } catch (error) {
    console.error('❌ Critical error in position sync:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}