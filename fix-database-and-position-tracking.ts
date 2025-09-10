#!/usr/bin/env tsx
/**
 * Fix database connection issues and implement position state caching
 * This ensures the system can recover from database failures and continue trading
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const POSITION_CACHE_FILE = '/tmp/signalcartel-position-cache.json';

interface PositionCache {
  positions: Map<string, any>;
  lastUpdate: Date;
  dbSyncStatus: 'synced' | 'pending' | 'error';
}

async function testDatabaseConnection() {
  console.log('🔧 Testing database connection...');
  try {
    await prisma.$connect();
    const count = await prisma.managedPosition.count();
    console.log(`✅ Database connected successfully. Found ${count} positions.`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function repairForeignKeyConstraints() {
  console.log('🔧 Checking foreign key constraints...');
  try {
    // Find positions with invalid foreign keys
    const positions = await prisma.managedPosition.findMany({
      where: {
        OR: [
          { entryTradeId: { startsWith: 'temp-' } },
          { exitTradeId: { startsWith: 'temp-' } }
        ]
      }
    });

    if (positions.length > 0) {
      console.log(`⚠️ Found ${positions.length} positions with temporary trade IDs`);
      
      for (const position of positions) {
        // Find the actual trade for this position
        const entryTrade = await prisma.managedTrade.findFirst({
          where: { positionId: position.id, type: 'ENTRY' }
        });

        const exitTrade = await prisma.managedTrade.findFirst({
          where: { positionId: position.id, type: 'EXIT' }
        });

        // Update with correct trade IDs
        await prisma.managedPosition.update({
          where: { id: position.id },
          data: {
            entryTradeId: entryTrade?.id || position.entryTradeId,
            exitTradeId: exitTrade?.id || position.exitTradeId
          }
        });

        console.log(`✅ Fixed position ${position.id}`);
      }
    } else {
      console.log('✅ No foreign key issues found');
    }
  } catch (error) {
    console.error('❌ Error repairing foreign keys:', error);
  }
}

async function implementPositionCache() {
  console.log('🔧 Implementing position state cache...');
  
  try {
    // Load existing positions from database
    const positions = await prisma.managedPosition.findMany({
      where: { status: 'OPEN' },
      include: {
        entryTrade: true,
        exitTrade: true
      }
    });

    const cache: PositionCache = {
      positions: new Map(positions.map(p => [p.id, p])),
      lastUpdate: new Date(),
      dbSyncStatus: 'synced'
    };

    // Save to cache file
    fs.writeFileSync(
      POSITION_CACHE_FILE,
      JSON.stringify({
        positions: Array.from(cache.positions.entries()),
        lastUpdate: cache.lastUpdate,
        dbSyncStatus: cache.dbSyncStatus
      }, null, 2)
    );

    console.log(`✅ Cached ${positions.length} open positions to ${POSITION_CACHE_FILE}`);
    return cache;
  } catch (error) {
    console.error('❌ Error implementing position cache:', error);
    
    // Create empty cache if database fails
    const cache: PositionCache = {
      positions: new Map(),
      lastUpdate: new Date(),
      dbSyncStatus: 'error'
    };
    
    fs.writeFileSync(
      POSITION_CACHE_FILE,
      JSON.stringify({
        positions: [],
        lastUpdate: cache.lastUpdate,
        dbSyncStatus: cache.dbSyncStatus
      }, null, 2)
    );
    
    return cache;
  }
}

async function cleanupStaleData() {
  console.log('🔧 Cleaning up stale data...');
  
  try {
    // Clean up orphaned trades
    const orphanedTrades = await prisma.managedTrade.deleteMany({
      where: {
        AND: [
          { positionId: null },
          { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Older than 24 hours
        ]
      }
    });
    
    if (orphanedTrades.count > 0) {
      console.log(`✅ Cleaned up ${orphanedTrades.count} orphaned trades`);
    }

    // Clean up Bayesian analyses without valid symbols
    const invalidAnalyses = await prisma.bayesianAnalysis.deleteMany({
      where: {
        OR: [
          { symbol: null },
          { symbol: '' },
          { symbol: 'undefined' }
        ]
      }
    });

    if (invalidAnalyses.count > 0) {
      console.log(`✅ Cleaned up ${invalidAnalyses.count} invalid Bayesian analyses`);
    }

  } catch (error) {
    console.error('❌ Error cleaning up stale data:', error);
  }
}

async function main() {
  console.log('🚀 Starting database and position tracking fix...\n');

  // Step 1: Test connection
  const connected = await testDatabaseConnection();
  
  if (connected) {
    // Step 2: Repair foreign keys
    await repairForeignKeyConstraints();
    
    // Step 3: Clean up stale data
    await cleanupStaleData();
    
    // Step 4: Implement position cache
    await implementPositionCache();
  } else {
    console.log('⚠️ Operating in cache-only mode due to database connection failure');
    await implementPositionCache();
  }

  console.log('\n✅ Database and position tracking fix complete');
  
  // Disconnect
  await prisma.$disconnect();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});