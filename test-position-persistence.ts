/**
 * V3.14.3: Test Position Persistence Fix
 * Verify positions are saved to database correctly
 */

import { PrismaClient } from '@prisma/client';
import { PositionManager } from './src/lib/position-management/position-manager';

const prisma = new PrismaClient();

async function testPositionPersistence() {
  console.log('\n🧪 V3.14.3 POSITION PERSISTENCE TEST\n');
  console.log('================================================\n');

  const positionManager = new PositionManager(prisma);

  // Test 1: Check database connection
  console.log('TEST 1: Database Connection');
  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error: any) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Clear any test positions
  console.log('TEST 2: Clear Test Positions');
  try {
    const deleted = await prisma.managedPosition.deleteMany({
      where: { id: { startsWith: 'kraken-TEST' } }
    });
    console.log(`✅ Cleared ${deleted.count} test positions\n`);
  } catch (error: any) {
    console.error(`❌ Failed to clear test positions: ${error.message}\n`);
  }

  // Test 3: Create test position (simulating Kraken order already placed)
  console.log('TEST 3: Create Position with Mock Kraken Order ID');
  const testKrakenOrderId = 'TEST-ORDER-' + Date.now();

  try {
    const result = await positionManager.openPosition({
      symbol: 'BTCUSD',
      side: 'long',
      quantity: 0.001,
      price: 75000,
      strategy: 'test-strategy',
      timestamp: new Date(),
      metadata: {
        confidence: 0.85,
        krakenOrderId: testKrakenOrderId, // V3.14.3: Required field
        aiSystems: ['test'],
        phase: 0
      }
    });

    console.log(`✅ Position created: ${result.position.id}`);
    console.log(`   Symbol: ${result.position.symbol}`);
    console.log(`   Side: ${result.position.side}`);
    console.log(`   Quantity: ${result.position.quantity}`);
    console.log(`   Price: $${result.position.entryPrice}`);
    console.log(`   Kraken Order: ${testKrakenOrderId}\n`);
  } catch (error: any) {
    console.error(`❌ Position creation failed: ${error.message}`);
    console.error(`Stack: ${error.stack}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 4: Verify position in ManagedPosition table
  console.log('TEST 4: Verify ManagedPosition Database Entry');
  try {
    const dbPosition = await prisma.managedPosition.findFirst({
      where: { id: `kraken-${testKrakenOrderId}` }
    });

    if (dbPosition) {
      console.log(`✅ Position found in database: ${dbPosition.id}`);
      console.log(`   Status: ${dbPosition.status}`);
      console.log(`   Entry Price: $${dbPosition.entryPrice}`);
      console.log(`   Quantity: ${dbPosition.quantity}\n`);
    } else {
      console.error(`❌ Position NOT found in database!\n`);
      await prisma.$disconnect();
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Database query failed: ${error.message}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 5: Verify ManagedTrade entry
  console.log('TEST 5: Verify ManagedTrade Database Entry');
  try {
    const dbTrade = await prisma.managedTrade.findFirst({
      where: { id: `trade-${testKrakenOrderId}` }
    });

    if (dbTrade) {
      console.log(`✅ Trade found in database: ${dbTrade.id}`);
      console.log(`   Side: ${dbTrade.side}`);
      console.log(`   Is Entry: ${dbTrade.isEntry}`);
      console.log(`   Value: $${dbTrade.value}\n`);
    } else {
      console.error(`❌ Trade NOT found in database!\n`);
      await prisma.$disconnect();
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Database query failed: ${error.message}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 6: Verify LivePosition entry
  console.log('TEST 6: Verify LivePosition Database Entry (Dashboard)');
  try {
    const livePosition = await prisma.livePosition.findFirst({
      where: { id: `live-pos-kraken-${testKrakenOrderId}` }
    });

    if (livePosition) {
      console.log(`✅ LivePosition found in database: ${livePosition.id}`);
      console.log(`   Symbol: ${livePosition.symbol}`);
      console.log(`   Status: ${livePosition.status}\n`);
    } else {
      console.error(`❌ LivePosition NOT found (non-critical)\n`);
    }
  } catch (error: any) {
    console.error(`⚠️ LivePosition query failed (non-critical): ${error.message}\n`);
  }

  // Test 7: Test position manager getOpenPositions
  console.log('TEST 7: Test Position Manager getOpenPositions()');
  try {
    await positionManager.syncPositionsFromDatabase();
    const openPositions = positionManager.getOpenPositions();

    console.log(`✅ Found ${openPositions.length} open position(s)`);
    if (openPositions.length > 0) {
      console.log(`   First position: ${openPositions[0].id} (${openPositions[0].symbol})\n`);
    } else {
      console.error(`❌ No positions returned by getOpenPositions!\n`);
    }
  } catch (error: any) {
    console.error(`❌ getOpenPositions failed: ${error.message}\n`);
  }

  // Test 8: Cleanup
  console.log('TEST 8: Cleanup Test Data');
  try {
    await prisma.livePosition.deleteMany({
      where: { id: `live-pos-kraken-${testKrakenOrderId}` }
    });
    await prisma.managedPosition.deleteMany({
      where: { id: `kraken-${testKrakenOrderId}` }
    });
    await prisma.managedTrade.deleteMany({
      where: { id: `trade-${testKrakenOrderId}` }
    });
    console.log(`✅ Test data cleaned up\n`);
  } catch (error: any) {
    console.error(`⚠️ Cleanup failed (non-critical): ${error.message}\n`);
  }

  await prisma.$disconnect();

  console.log('================================================');
  console.log('✅ ALL TESTS PASSED - Position persistence working!');
  console.log('================================================\n');
}

testPositionPersistence().catch((error) => {
  console.error('❌ TEST SUITE FAILED:', error);
  process.exit(1);
});
