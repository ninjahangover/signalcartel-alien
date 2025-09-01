import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Simple working system reset - only targets existing critical tables
 */
async function simpleWorkingReset() {
  console.log('================================================================================');
  console.log('🧹 QUANTUM FORGE™ SIMPLE WORKING RESET');
  console.log('================================================================================');

  try {
    // Step 1: Check current data
    console.log('\n📊 CHECKING CURRENT DATA:');
    
    const currentPositions = await prisma.managedPosition.count();
    const currentTrades = await prisma.managedTrade.count();
    const currentIntuition = await prisma.intuitionAnalysis.count();
    const currentSignals = await prisma.tradingSignal.count();
    
    // Calculate current P&L
    const pnlResult = await prisma.managedPosition.aggregate({
      _sum: {
        realizedPnL: true
      }
    });
    
    const closedPositions = await prisma.managedPosition.count({
      where: {
        realizedPnL: {
          not: null
        }
      }
    });

    console.log(`• ManagedPosition: ${currentPositions} records`);
    console.log(`• ManagedTrade: ${currentTrades} records`);
    console.log(`• IntuitionAnalysis: ${currentIntuition} records`);
    console.log(`• TradingSignal: ${currentSignals} records`);
    console.log(`• Current Portfolio P&L: $${(pnlResult._sum.realizedPnL || 0).toFixed(2)}`);
    console.log(`• Closed Positions: ${closedPositions}`);

    console.log('\n🚨 WARNING: This will DELETE ALL trading data!');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    
    // Countdown
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`⏰ Starting cleanup in ${i} seconds... `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('');

    console.log('\n🧹 STARTING DATA PURGE...');

    // Step 2: Delete in proper order to respect foreign key constraints
    console.log('\n🔄 Deleting all positions first (handles foreign keys)...');
    const deletedPositions = await prisma.managedPosition.deleteMany({});
    console.log(`✅ Deleted ${deletedPositions.count} positions`);
    
    console.log('\n🔄 Deleting all remaining trades...');
    const deletedTrades = await prisma.managedTrade.deleteMany({});
    console.log(`✅ Deleted ${deletedTrades.count} trades`);
    
    console.log('\n🔄 Deleting all intuition analysis records...');
    const deletedIntuition = await prisma.intuitionAnalysis.deleteMany({});
    console.log(`✅ Deleted ${deletedIntuition.count} intuition records`);
    
    console.log('\n🔄 Deleting all trading signals...');
    const deletedSignals = await prisma.tradingSignal.deleteMany({});
    console.log(`✅ Deleted ${deletedSignals.count} signals`);
    
    console.log('\n🔄 Deleting all strategy performance records...');
    const deletedPerformance = await prisma.strategyPerformance.deleteMany({});
    console.log(`✅ Deleted ${deletedPerformance.count} performance records`);
    
    console.log('\n🔄 Deleting all strategy optimization records...');
    const deletedOptimization = await prisma.strategyOptimization.deleteMany({});
    console.log(`✅ Deleted ${deletedOptimization.count} optimization records`);
    
    console.log('\n🔄 Deleting all paper trading records...');
    const deletedPaperTrades = await prisma.paperTrade.deleteMany({});
    const deletedPaperPositions = await prisma.paperPosition.deleteMany({});
    const deletedPaperSnapshots = await prisma.paperPerformanceSnapshot.deleteMany({});
    
    console.log(`✅ Deleted ${deletedPaperTrades.count} paper trades`);
    console.log(`✅ Deleted ${deletedPaperPositions.count} paper positions`);
    console.log(`✅ Deleted ${deletedPaperSnapshots.count} paper snapshots`);

    console.log('\n✅ DATA PURGE COMPLETE!');

    // Step 3: Verify cleanup
    console.log('\n📊 POST-RESET VERIFICATION:');
    
    const finalPositions = await prisma.managedPosition.count();
    const finalTrades = await prisma.managedTrade.count();
    const finalIntuition = await prisma.intuitionAnalysis.count();
    const finalSignals = await prisma.tradingSignal.count();
    
    console.log(`• ManagedPosition: ${finalPositions} records (should be 0)`);
    console.log(`• ManagedTrade: ${finalTrades} records (should be 0)`);
    console.log(`• IntuitionAnalysis: ${finalIntuition} records (should be 0)`);
    console.log(`• TradingSignal: ${finalSignals} records (should be 0)`);

    if (finalPositions === 0 && finalTrades === 0 && finalIntuition === 0 && finalSignals === 0) {
      console.log('\n✅ RESET SUCCESSFUL!');
    } else {
      console.log('\n⚠️ RESET PARTIALLY SUCCESSFUL - Some records remain');
    }

    console.log('\n================================================================================');
    console.log('🎯 QUANTUM FORGE™ SYSTEM RESET COMPLETE!');
    console.log('• Portfolio Value: CONCEPTUALLY $10,000 (starting fresh)');
    console.log('• Current Phase: Will be 0 on next start (maximum data collection mode)');
    console.log('• All contaminated data: PURGED');
    console.log('• AI learning patterns: CLEARED');
    console.log('• Ready for clean trading with 10% confidence barriers');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('1. Restart trading systems with ./admin/reset-to-phase0-and-restart.sh');
    console.log('2. System will automatically begin in Phase 0');
    console.log('3. Clean data collection will begin immediately');
    console.log('================================================================================');

  } catch (error) {
    console.error('❌ Error during system reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
simpleWorkingReset()
  .then(() => {
    console.log('🎉 System reset finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 System reset failed:', error);
    process.exit(1);
  });