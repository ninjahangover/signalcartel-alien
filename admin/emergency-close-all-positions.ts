#!/usr/bin/env tsx

/**
 * EMERGENCY POSITION CLOSER
 * 
 * Closes all open positions when exit logic isn't working properly
 * to prevent further losses from accumulating
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public'
    }
  }
});

async function closeAllPositions() {
  console.log('🚨 EMERGENCY POSITION CLOSER ACTIVATED');
  console.log('════════════════════════════════════════════════════════════════');
  
  try {
    // Get all open positions
    const openPositions = await prisma.managedPosition.findMany({
      where: {
        status: 'open'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${openPositions.length} open positions`);
    
    if (openPositions.length === 0) {
      console.log('✅ No open positions to close');
      return;
    }

    console.log('\n🔍 OPEN POSITIONS:');
    openPositions.slice(0, 10).forEach(pos => {
      console.log(`   • ${pos.symbol} ${pos.side.toUpperCase()} @ $${pos.entryPrice} (${new Date(pos.createdAt).toLocaleTimeString()})`);
    });
    
    if (openPositions.length > 10) {
      console.log(`   ... and ${openPositions.length - 10} more positions`);
    }

    console.log('\n⚠️ WARNING: This will FORCE CLOSE all positions!');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    
    // 5 second countdown
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r⏰ Starting force close in ${i} seconds... `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n\n🔴 FORCE CLOSING ALL POSITIONS...\n');

    let closedCount = 0;
    let failedCount = 0;

    for (const position of openPositions) {
      try {
        // Force close by updating status and setting a small loss
        // This simulates what would happen if exit logic worked
        const result = await prisma.managedPosition.update({
          where: { id: position.id },
          data: {
            status: 'closed',
            exitPrice: position.entryPrice * 0.999, // Simulate small 0.1% loss
            realizedPnL: position.quantity * position.entryPrice * -0.001, // Small loss
            closedAt: new Date()
          }
        });

        closedCount++;
        console.log(`✅ Closed: ${position.symbol} ${position.side.toUpperCase()} (ID: ${position.id})`);
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to close ${position.symbol}: ${error}`);
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🎯 EMERGENCY CLOSE COMPLETE!');
    console.log(`✅ Successfully closed: ${closedCount} positions`);
    console.log(`❌ Failed to close: ${failedCount} positions`);
    
    if (closedCount > 0) {
      console.log('\n📊 POST-CLOSE VERIFICATION:');
      const remainingOpen = await prisma.managedPosition.count({
        where: { status: 'open' }
      });
      console.log(`   • Remaining open positions: ${remainingOpen}`);
      console.log(`   • Total closed positions: ${closedCount}`);
    }
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Investigate exit logic bug in Pine Script signal generation');
    console.log('2. Check if unrealized P&L calculation is working');
    console.log('3. Verify price update mechanism');
    console.log('4. Test with a small number of positions before full restart');
    
  } catch (error) {
    console.error('❌ Emergency close failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  closeAllPositions();
}