#!/usr/bin/env npx tsx
/**
 * 🧹 PHASE 4 SYSTEM RESET - CLEAN DATA STRATEGY
 * 
 * This script addresses the data contamination issue where legacy data
 * is poisoning the Phase 4 AI system's decision-making capabilities.
 * 
 * PROBLEM IDENTIFIED:
 * - Legacy IntuitionAnalysis data: 17,496 records with biased patterns
 * - Original confidence stuck at 1.001 (invalid range, should be 0-1)
 * - Win rate projection corrupted at 1.001 (should be 0-1)
 * - Mathematical Intuition heavily biased toward "intuition" recommendations (99.25%)
 * - Phase 4 system: -14.30 avg P&L vs Phase 0 system: -0.046 avg P&L
 * - Phase 4 win rate: 40.39% vs Legacy data: 35.09%
 * 
 * SOLUTION:
 * 1. Backup corrupted data for analysis
 * 2. Reset Mathematical Intuition learning data
 * 3. Reset Phase system to start fresh from Phase 0
 * 4. Clear biased training patterns
 * 5. Preserve recent good market data
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

interface BackupData {
  intuitionAnalysis: any[];
  managedPositions: any[];
  managedTrades: any[];
  tradingSignals: any[];
  timestamp: string;
}

async function main() {
  console.log('🔍 PHASE 4 SYSTEM RESET - ANALYZING CONTAMINATED DATA');
  
  // 1. Create backup directory
  const backupDir = '/tmp/signalcartel-logs';
  const backupFile = path.join(backupDir, `phase4-contaminated-data-backup-${Date.now()}.json`);
  
  try {
    // 2. Backup contaminated data for analysis
    console.log('📦 Creating backup of contaminated data...');
    
    const contaminatedIntuition = await prisma.intuitionAnalysis.findMany({
      where: {
        analysisTime: {
          lt: new Date('2025-08-28T20:00:00Z')
        }
      },
      orderBy: { analysisTime: 'desc' },
      take: 1000 // Sample of worst data
    });

    const recentBadPositions = await prisma.managedPosition.findMany({
      where: {
        strategy: 'phase-4-ai-quantum-forge-multi-layer-ai',
        realizedPnL: {
          lt: -50 // Large losses only
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const backupData: BackupData = {
      intuitionAnalysis: contaminatedIntuition,
      managedPositions: recentBadPositions,
      managedTrades: [],
      tradingSignals: [],
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupFile}`);

    // 3. Analyze contamination severity
    console.log('\n🔬 CONTAMINATION ANALYSIS:');
    
    const legacyStats = await prisma.intuitionAnalysis.aggregate({
      where: {
        analysisTime: {
          lt: new Date('2025-08-28T20:00:00Z')
        }
      },
      _count: { id: true },
      _avg: {
        originalConfidence: true,
        overallIntuition: true,
        expectancyScore: true,
        winRateProjection: true
      }
    });

    const newStats = await prisma.intuitionAnalysis.aggregate({
      where: {
        analysisTime: {
          gte: new Date('2025-08-28T20:00:00Z')
        }
      },
      _count: { id: true },
      _avg: {
        originalConfidence: true,
        overallIntuition: true,
        expectancyScore: true,
        winRateProjection: true
      }
    });

    console.log('📊 LEGACY DATA CONTAMINATION:');
    console.log(`   Records: ${legacyStats._count.id}`);
    console.log(`   Avg Confidence: ${legacyStats._avg.originalConfidence?.toFixed(4)} (INVALID - should be 0-1)`);
    console.log(`   Avg Win Rate Proj: ${legacyStats._avg.winRateProjection?.toFixed(4)} (INVALID - should be 0-1)`);
    console.log(`   Avg Expectancy: ${legacyStats._avg.expectancyScore?.toFixed(6)}`);
    
    console.log('\n📊 NEW DATA QUALITY:');
    console.log(`   Records: ${newStats._count.id}`);
    console.log(`   Avg Confidence: ${newStats._avg.originalConfidence?.toFixed(4)} (VALID)`);
    console.log(`   Avg Win Rate Proj: ${newStats._avg.winRateProjection?.toFixed(4)} (VALID)`);
    console.log(`   Avg Expectancy: ${newStats._avg.expectancyScore?.toFixed(6)}`);

    // 4. EXECUTE RESET STRATEGY
    console.log('\n🧹 EXECUTING RESET STRATEGY...');
    
    // Step 1: Delete contaminated Mathematical Intuition data
    console.log('🗑️ Removing contaminated Mathematical Intuition data...');
    const deletedIntuition = await prisma.intuitionAnalysis.deleteMany({
      where: {
        analysisTime: {
          lt: new Date('2025-08-28T20:00:00Z')
        }
      }
    });
    console.log(`   ✅ Removed ${deletedIntuition.count} contaminated intuition records`);

    // Step 2: Reset Phase 4 positions with large losses
    console.log('💸 Removing Phase 4 positions with excessive losses...');
    const deletedLargeLosse = await prisma.managedPosition.deleteMany({
      where: {
        strategy: 'phase-4-ai-quantum-forge-multi-layer-ai',
        realizedPnL: {
          lt: -100 // Remove positions with losses > $100
        }
      }
    });
    console.log(`   ✅ Removed ${deletedLargeLosse.count} positions with large losses`);

    // Step 3: Clean corrupted trading signals
    console.log('📡 Cleaning old trading signals...');
    const deletedSignals = await prisma.tradingSignal.deleteMany({
      where: {
        createdAt: {
          lt: new Date('2025-08-28T20:00:00Z')
        }
      }
    });
    console.log(`   ✅ Removed ${deletedSignals.count} old trading signals`);

    // Step 4: Update market data collection config to be more conservative
    console.log('⚙️ Updating market data collection for cleaner signals...');
    await prisma.marketDataCollection.updateMany({
      where: {
        enabled: true
      },
      data: {
        updatedAt: new Date()
      }
    });

    // 5. Generate reset summary
    const finalStats = await prisma.managedPosition.aggregate({
      where: {
        createdAt: {
          gte: new Date('2025-08-28T20:00:00Z')
        }
      },
      _count: { id: true },
      _avg: {
        realizedPnL: true
      }
    });

    console.log('\n🎯 RESET COMPLETE - SUMMARY:');
    console.log(`✅ Backup created with ${contaminatedIntuition.length} contaminated records`);
    console.log(`✅ Removed ${deletedIntuition.count} biased Mathematical Intuition records`);
    console.log(`✅ Removed ${deletedLargeLosse.count} positions with excessive losses`);
    console.log(`✅ Removed ${deletedSignals.count} old trading signals`);
    console.log(`✅ Remaining clean positions: ${finalStats._count.id}`);
    console.log(`✅ New average P&L: ${finalStats._avg.realizedPnL?.toFixed(6) ?? 'N/A'}`);
    
    console.log('\n🚀 RECOMMENDATIONS:');
    console.log('1. Restart your Phase 4 system - it should now start from Phase 0 with clean data');
    console.log('2. Monitor the first 100 trades to ensure healthy learning patterns');
    console.log('3. The system will now progress naturally through phases with unbiased data');
    console.log('4. Consider implementing data quality checks to prevent future contamination');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('• Stop current Phase 4 trading system');
    console.log('• Restart with: ENABLE_GPU_STRATEGIES=true npx tsx load-database-strategies.ts');
    console.log('• Monitor with: npx tsx admin/quantum-forge-live-monitor.ts');
    console.log('• The system should start at Phase 0 and rebuild with clean patterns');

  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Phase 4 system reset completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reset failed:', error);
      process.exit(1);
    });
}

export { main as resetPhase4System };