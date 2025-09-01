/**
 * FAST POSITION CLOSURE - Uses last entry prices as fallback
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fastCloseAllPositions() {
  console.log('⚡ FAST POSITION CLOSURE');
  console.log('========================');
  
  try {
    // Get all open positions
    const openPositions = await prisma.managedPosition.findMany({
      where: {
        status: 'open'
      }
    });
    
    console.log(`📊 Found ${openPositions.length} open positions`);
    
    if (openPositions.length === 0) {
      console.log('✅ No open positions found');
      return;
    }
    
    // Close each position using entry price (0 P&L)
    let closedCount = 0;
    
    for (const position of openPositions) {
      // Close at entry price to avoid API calls
      await prisma.managedPosition.update({
        where: { id: position.id },
        data: {
          status: 'closed',
          exitPrice: position.entryPrice, // Close at entry price
          exitTime: new Date(),
          realizedPnL: 0 // No profit or loss
        }
      });
      
      closedCount++;
      
      if (closedCount % 100 === 0) {
        console.log(`  ⚡ Closed ${closedCount} positions...`);
      }
    }
    
    console.log('');
    console.log('✅ CLOSURE COMPLETE:');
    console.log(`  Total positions closed: ${closedCount}`);
    console.log(`  All closed at entry price (0 P&L)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run it
fastCloseAllPositions().catch(console.error);