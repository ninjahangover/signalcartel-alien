#!/usr/bin/env tsx

/**
 * COMPLETE QUANTUM FORGE™ SYSTEM RESET
 * 
 * This script performs a complete system reset:
 * 1. Removes ALL contaminated trading data
 * 2. Resets portfolio value to $10,000
 * 3. Resets Phase system to Phase 0
 * 4. Clears all biased AI learning patterns
 * 
 * WARNING: This removes ALL trading history for a completely clean start
 */

import { PrismaClient } from '@prisma/client'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

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
    throw error
  }
}

async function getRowCount(table: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`)
  return parseInt((result as any)[0].count)
}

async function performCompleteSystemReset() {
  console.log('\n' + '='.repeat(80))
  console.log('🧹 QUANTUM FORGE™ COMPLETE SYSTEM RESET')
  console.log('='.repeat(80))
  
  console.log('\n📊 CURRENT SYSTEM STATUS:')
  
  // Check current data counts
  const positionCount = await getRowCount('ManagedPosition')
  const tradeCount = await getRowCount('ManagedTrade')
  const intuitionCount = await getRowCount('IntuitionAnalysis')
  const signalCount = await getRowCount('TradingSignal')
  const strategyCount = await getRowCount('TradingStrategy')
  const phaseCount = await getRowCount('PhaseTransition')
  
  console.log(`• ManagedPosition: ${positionCount} records`)
  console.log(`• ManagedTrade: ${tradeCount} records`)
  console.log(`• IntuitionAnalysis: ${intuitionCount} records`)
  console.log(`• TradingSignal: ${signalCount} records`)
  console.log(`• TradingStrategy: ${strategyCount} records`)
  console.log(`• PhaseTransition: ${phaseCount} records`)
  
  // Calculate current P&L
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
  
  console.log('\n🚨 WARNING: This will DELETE ALL trading data and reset to Phase 0!')
  console.log('Press Ctrl+C within 10 seconds to cancel...')
  
  // 10 second countdown
  for (let i = 10; i > 0; i--) {
    process.stdout.write(`\r⏰ Starting cleanup in ${i} seconds... `)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n\n🧹 STARTING COMPLETE DATA PURGE...\n')
  
  // Step 1: Delete all trading data (order matters due to foreign keys)
  await executeQuery(
    'Deleting all ManagedPosition records (this will handle foreign key constraints)',
    'DELETE FROM "ManagedPosition"'
  )
  
  await executeQuery(
    'Deleting all remaining ManagedTrade records',
    'DELETE FROM "ManagedTrade"'
  )
  
  await executeQuery(
    'Deleting all IntuitionAnalysis records',
    'DELETE FROM "IntuitionAnalysis"'
  )
  
  await executeQuery(
    'Deleting all TradingSignal records',
    'DELETE FROM "TradingSignal"'
  )
  
  await executeQuery(
    'Deleting all PhaseTransition records',
    'DELETE FROM "PhaseTransition"'
  )
  
  await executeQuery(
    'Deleting all TradingStrategy records',
    'DELETE FROM "TradingStrategy"'
  )
  
  // Step 2: Reset sequences to start from 1
  console.log('\n🔄 RESETTING DATABASE SEQUENCES...')
  
  const sequences = [
    'ManagedPosition_id_seq',
    'ManagedTrade_id_seq',
    'IntuitionAnalysis_id_seq',
    'TradingSignal_id_seq',
    'PhaseTransition_id_seq',
    'TradingStrategy_id_seq'
  ]
  
  for (const seq of sequences) {
    try {
      await executeQuery(
        `Resetting sequence ${seq}`,
        `ALTER SEQUENCE "${seq}" RESTART WITH 1`
      )
    } catch (error) {
      console.log(`⚠️ Sequence ${seq} may not exist - continuing...`)
    }
  }
  
  // Step 3: Create Phase 0 transition record
  console.log('\n🚀 INITIALIZING PHASE 0 SYSTEM...')
  
  await executeQuery(
    'Creating Phase 0 initialization record',
    `INSERT INTO "PhaseTransition" (
      "fromPhase", "toPhase", "reason", "timestamp", "tradeCount", 
      "winRate", "avgPnL", "metadata"
    ) VALUES (
      -1, 0, 'COMPLETE_SYSTEM_RESET', NOW(), 0, 0.0, 0.0,
      '{"reset_type": "complete_purge", "reset_date": "${new Date().toISOString()}", "reason": "data_contamination_cleanup"}'
    )`
  )
  
  // Step 4: Create initial portfolio configuration
  console.log('\n💰 SETTING PORTFOLIO TO $10,000...')
  
  // Create a configuration record to track starting portfolio value
  await executeQuery(
    'Creating portfolio configuration record',
    `INSERT INTO "TradingStrategy" (
      "name", "description", "config", "isActive", "createdAt"
    ) VALUES (
      'PORTFOLIO_CONFIG', 
      'Portfolio reset to $10,000 starting value', 
      '{"starting_balance": 10000, "reset_date": "${new Date().toISOString()}", "target_balance": 10000}',
      true, 
      NOW()
    )`
  )
  
  console.log('\n✅ SYSTEM RESET COMPLETE!\n')
  
  // Verification
  console.log('📊 POST-RESET VERIFICATION:')
  
  const newPositionCount = await getRowCount('ManagedPosition')
  const newTradeCount = await getRowCount('ManagedTrade')
  const newIntuitionCount = await getRowCount('IntuitionAnalysis')
  const newSignalCount = await getRowCount('TradingSignal')
  const newStrategyCount = await getRowCount('TradingStrategy')
  const newPhaseCount = await getRowCount('PhaseTransition')
  
  console.log(`• ManagedPosition: ${newPositionCount} records (should be 0)`)
  console.log(`• ManagedTrade: ${newTradeCount} records (should be 0)`)
  console.log(`• IntuitionAnalysis: ${newIntuitionCount} records (should be 0)`)
  console.log(`• TradingSignal: ${newSignalCount} records (should be 0)`)
  console.log(`• TradingStrategy: ${newStrategyCount} records (should be 1 - portfolio config)`)
  console.log(`• PhaseTransition: ${newPhaseCount} records (should be 1 - Phase 0 init)`)
  
  // Check current phase
  const currentPhase = await prisma.$queryRawUnsafe(`
    SELECT "toPhase" as current_phase 
    FROM "PhaseTransition" 
    ORDER BY "timestamp" DESC 
    LIMIT 1
  `)
  
  const phase = (currentPhase as any)[0]?.current_phase
  console.log(`• Current Phase: ${phase} (should be 0)`)
  
  console.log('\n' + '='.repeat(80))
  console.log('🎯 QUANTUM FORGE™ SYSTEM SUCCESSFULLY RESET!')
  console.log('• Portfolio Value: $10,000 (starting fresh)')
  console.log('• Current Phase: 0 (maximum data collection mode)')
  console.log('• All contaminated data: PURGED')
  console.log('• AI learning patterns: CLEARED')
  console.log('• Ready for clean trading with 10% confidence barriers')
  console.log('='.repeat(80))
}

async function main() {
  try {
    await performCompleteSystemReset()
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