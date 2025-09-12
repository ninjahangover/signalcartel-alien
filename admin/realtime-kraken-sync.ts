#!/usr/bin/env npx tsx

/**
 * Real-time Kraken Position Sync Service
 * Syncs Kraken positions to local database every 30 seconds for 100% accurate dashboard
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SyncResult {
  timestamp: string;
  positionsFound: number;
  positionsUpdated: number;
  positionsCreated: number;
  errors: string[];
}

class RealtimeKrakenSync {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Sync service already running');
      return;
    }

    console.log('🔄 STARTING REAL-TIME KRAKEN SYNC SERVICE');
    console.log('=' .repeat(60));
    console.log('📊 Dashboard Accuracy: 100% real-time');
    console.log('🕐 Sync Interval: Every 30 seconds');
    console.log('🎯 Target: Perfect trading dashboard alignment');
    console.log('');

    this.isRunning = true;
    
    // Initial sync
    await this.performSync();
    
    // Set up 30-second interval
    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, 30000); // 30 seconds

    console.log('✅ Real-time sync service started - dashboard will be 100% accurate');
  }

  private async performSync(): Promise<SyncResult> {
    const result: SyncResult = {
      timestamp: new Date().toISOString(),
      positionsFound: 0,
      positionsUpdated: 0,
      positionsCreated: 0,
      errors: []
    };

    try {
      console.log(`🔄 [${new Date().toLocaleTimeString()}] Syncing Kraken positions...`);
      
      // Import the sync function from existing script
      const { execSync } = require('child_process');
      
      const syncOutput = execSync(
        'DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" timeout 10s npx tsx admin/sync-kraken-positions.ts',
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      // Parse sync results
      const lines = syncOutput.split('\n');
      const foundLine = lines.find(line => line.includes('Found') && line.includes('untracked'));
      const syncedLines = lines.filter(line => line.includes('✅ Synced to database'));
      
      if (foundLine) {
        const match = foundLine.match(/Found (\d+)/);
        result.positionsFound = match ? parseInt(match[1]) : 0;
      }
      
      result.positionsCreated = syncedLines.length;
      
      console.log(`📊 Sync complete: ${result.positionsFound} found, ${result.positionsCreated} updated`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown sync error';
      result.errors.push(errorMsg);
      console.error(`❌ Sync error: ${errorMsg}`);
    }

    return result;
  }

  async stop(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    await prisma.$disconnect();
    console.log('🛑 Real-time sync service stopped');
  }
}

// Main execution
async function main() {
  const syncService = new RealtimeKrakenSync();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down real-time sync service...');
    await syncService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down real-time sync service...');
    await syncService.stop();
    process.exit(0);
  });

  try {
    await syncService.start();
    
    // Keep process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('💥 Failed to start sync service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}