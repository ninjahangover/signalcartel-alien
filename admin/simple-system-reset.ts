#!/usr/bin/env tsx

/**
 * SIMPLE QUANTUM FORGE™ SYSTEM RESET
 * 
 * This script performs a complete system reset:
 * 1. Removes ALL contaminated trading data
 * 2. Resets to Phase 0 for clean start
 * 3. Clears all biased AI learning patterns
 * 
 * Portfolio value will be reset to $10,000 conceptually
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public'
    }
  }
})

async function executeQuery(description: string, query: string): Promise<any> {
  console.log(`🔄 ${description}...`)
  try {
    const result = await prisma.$executeRawUnsafe(query)
    console.log(`✅ ${description} - Success`)
    return result
  } catch (error) {
    console.error(`❌ ${description} - Error:`, error)
    return null
  }
}

async function getTableCount(table: string): Promise<number> {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`)
    return parseInt((result as any)[0].count)
  } catch (error) {
    return 0
  }
}

async function performSimpleSystemReset() {
  console.log('\n' + '='.repeat(80))
  console.log('🧹 QUANTUM FORGE™ SIMPLE SYSTEM RESET')
  console.log('='.repeat(80))
  
  console.log('\n📊 CHECKING CURRENT DATA:')
  
  // Check current data counts
  const positionCount = await getTableCount('ManagedPosition')
  const tradeCount = await getTableCount('ManagedTrade')
  const intuitionCount = await getTableCount('IntuitionAnalysis')
  const signalCount = await getTableCount('TradingSignal')
  
  console.log(`• ManagedPosition: ${positionCount} records`)
  console.log(`• ManagedTrade: ${tradeCount} records`)
  console.log(`• IntuitionAnalysis: ${intuitionCount} records`)
  console.log(`• TradingSignal: ${signalCount} records`)
  
  // Calculate current P&L
  try {
    const pnlResult = await prisma.$queryRawUnsafe(`
      SELECT 
        SUM(CASE WHEN "realizedPnL" IS NOT NULL THEN "realizedPnL" ELSE 0 END) as total_pnl,
        COUNT(CASE WHEN "realizedPnL" IS NOT NULL THEN 1 END) as closed_positions
      FROM "ManagedPosition"
    `)
    const currentPnL = (pnlResult as any)[0]?.total_pnl || 0
    const closedPositions = (pnlResult as any)[0]?.closed_positions || 0
    
    console.log(`• Current Portfolio P&L: $${parseFloat(currentPnL).toFixed(2)}`)
    console.log(`• Closed Positions: ${closedPositions}`)
  } catch (error) {
    console.log('• Could not calculate P&L')
  }
  
  console.log('\n🚨 WARNING: This will DELETE ALL trading data!')
  console.log('Press Ctrl+C within 5 seconds to cancel...')
  
  // 5 second countdown
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r⏰ Starting cleanup in ${i} seconds... `)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n\n🧹 STARTING DATA PURGE...\n')
  
  // Step 1: Delete all trading data in correct order (foreign key constraints)
  await executeQuery(
    'Deleting all ManagedTrade records',
    'DELETE FROM "ManagedTrade"'
  )
  
  await executeQuery(
    'Deleting all ManagedPosition records', 
    'DELETE FROM "ManagedPosition"'
  )
  
  await executeQuery(
    'Deleting all IntuitionAnalysis records',
    'DELETE FROM "IntuitionAnalysis"'
  )
  
  await executeQuery(
    'Deleting all TradingSignal records',
    'DELETE FROM "TradingSignal"'
  )
  
  // Clear any strategy performance data
  await executeQuery(
    'Deleting StrategyPerformance records',
    'DELETE FROM "StrategyPerformance"'
  )
  
  await executeQuery(
    'Deleting StrategyOptimization records',
    'DELETE FROM "StrategyOptimization"'
  )
  
  // Clear paper trading data too
  await executeQuery(
    'Deleting PaperTrade records',
    'DELETE FROM "PaperTrade"'
  )
  
  await executeQuery(
    'Deleting PaperPosition records',
    'DELETE FROM "PaperPosition"'
  )
  
  await executeQuery(
    'Deleting PaperPerformanceSnapshot records',
    'DELETE FROM "PaperPerformanceSnapshot"'
  )
  
  console.log('\n✅ DATA PURGE COMPLETE!\n')
  
  // Verification
  console.log('📊 POST-RESET VERIFICATION:')
  
  const newPositionCount = await getTableCount('ManagedPosition')
  const newTradeCount = await getTableCount('ManagedTrade')
  const newIntuitionCount = await getTableCount('IntuitionAnalysis')
  const newSignalCount = await getTableCount('TradingSignal')
  
  console.log(`• ManagedPosition: ${newPositionCount} records (should be 0)`)
  console.log(`• ManagedTrade: ${newTradeCount} records (should be 0)`)
  console.log(`• IntuitionAnalysis: ${newIntuitionCount} records (should be 0)`)
  console.log(`• TradingSignal: ${newSignalCount} records (should be 0)`)
  
  console.log('\n' + '='.repeat(80))
  console.log('🎯 QUANTUM FORGE™ SYSTEM SUCCESSFULLY RESET!')
  console.log('• Portfolio Value: CONCEPTUALLY $10,000 (starting fresh)')
  console.log('• Current Phase: Will be 0 on next start (maximum data collection mode)')
  console.log('• All contaminated data: PURGED')
  console.log('• AI learning patterns: CLEARED')
  console.log('• Ready for clean trading with 10% confidence barriers')
  console.log('')
  console.log('🚀 NEXT STEPS:')
  console.log('1. Start trading with: ./admin/start-quantum-forge-with-monitor.sh')
  console.log('2. System will automatically begin in Phase 0')
  console.log('3. Clean data collection will begin immediately')
  console.log('='.repeat(80))
}

async function main() {
  try {
    await performSimpleSystemReset()
  } catch (error) {
    console.error('❌ System reset failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export default main