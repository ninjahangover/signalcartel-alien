#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEnhancedStatus() {
  console.log('🧪 Testing Enhanced Position Status System...\n');
  
  try {
    // Test 1: Check all active positions (not closed)
    const activePositions = await prisma.managedPosition.findMany({
      where: { 
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      },
      select: {
        id: true,
        symbol: true,
        status: true,
        quantity: true,
        entryPrice: true
      },
      orderBy: [{ symbol: 'asc' }, { status: 'asc' }]
    });
    
    console.log(`📊 Found ${activePositions.length} active positions:\n`);
    
    // Group by status for better visualization
    const statusGroups = activePositions.reduce((groups, pos) => {
      if (!groups[pos.status]) groups[pos.status] = [];
      groups[pos.status].push(pos);
      return groups;
    }, {} as Record<string, typeof activePositions>);
    
    Object.entries(statusGroups).forEach(([status, positions]) => {
      console.log(`🏷️  ${status.toUpperCase()} positions (${positions.length}):`);
      positions.forEach(pos => {
        console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice}`);
      });
      console.log('');
    });
    
    // Test 2: Check LivePosition status as well
    const livePositions = await prisma.livePosition.findMany({
      where: { 
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      },
      select: {
        symbol: true,
        status: true,
        quantity: true,
        entryPrice: true
      },
      orderBy: [{ symbol: 'asc' }, { status: 'asc' }]
    });
    
    console.log(`📱 Dashboard LivePositions (${livePositions.length}):`);
    livePositions.forEach(pos => {
      console.log(`   ${pos.symbol}: ${pos.status} - ${pos.quantity} @ $${pos.entryPrice}`);
    });
    
    console.log('\n✅ Enhanced Position Status System Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEnhancedStatus();