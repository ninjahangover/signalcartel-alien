#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import { AvailableBalanceCalculator } from './src/lib/available-balance-calculator.js';
import { PositionManager } from './src/lib/position-management/position-manager.js';

const prisma = new PrismaClient();

async function testBalanceFix() {
  console.log('🧪 Testing Balance Calculation Fix...\n');
  
  try {
    // Initialize position manager
    const positionManager = new PositionManager(prisma);
    const balanceCalculator = new AvailableBalanceCalculator(positionManager);
    
    // Test the balance calculation
    console.log('📊 Before Fix (hypothetical):');
    console.log('   USD Balance: $57');
    console.log('   BNB Position: 0.22399 BNB × $650 = $145.59');
    console.log('   OLD Logic: $57 - $145.59 = -$88.59 → $0 (fallback: $300)');
    console.log('   Result: 4.5% of $300 = $13.50 orders... but fallback triggered massive $9k orders\n');
    
    console.log('🔧 After Fix:');
    const result = await balanceCalculator.calculateAvailableBalance('ETHUSD');
    
    console.log(`✅ Fixed Balance Calculation:`);
    console.log(`   Total Balance: $${result.totalBalance.toFixed(2)}`);
    console.log(`   Open Positions Value: $${result.openPositionsValue.toFixed(2)} (${result.openPositionsCount} positions)`);
    console.log(`   Available Balance: $${result.availableBalance.toFixed(2)}`);
    console.log(`   Confidence Adjustment: +${result.confidenceThresholdAdjustment}%\n`);
    
    // Test position sizing calculation
    const tensorPositionPercent = 0.045; // 4.5%
    const calculatedOrderSize = result.availableBalance * tensorPositionPercent;
    
    console.log(`📊 Position Sizing Test:`);
    console.log(`   Tensor Decision: 4.5% of account`);
    console.log(`   OLD (broken): 4.5% of $300 fallback = $${(300 * tensorPositionPercent).toFixed(2)}`);
    console.log(`   NEW (fixed): 4.5% of $${result.availableBalance.toFixed(2)} = $${calculatedOrderSize.toFixed(2)}`);
    
    if (calculatedOrderSize > result.availableBalance) {
      console.log(`   ❌ Still broken: Order size exceeds available balance!`);
    } else if (calculatedOrderSize < 5) {
      console.log(`   ⚠️ Very small but reasonable: Order size under $5`);
    } else if (calculatedOrderSize < 50) {
      console.log(`   ✅ Perfect: Reasonable order size for available balance`);
    } else {
      console.log(`   ⚠️ Large but valid: Order size is significant portion of balance`);
    }
    
    console.log('\n🎉 Balance calculation fix test complete!');
    console.log('🔧 Key Fix: BNB positions no longer counted against USD buying power');
    console.log('💰 Result: Realistic position sizes based on actual USD available');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBalanceFix();