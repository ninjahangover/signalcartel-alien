#!/usr/bin/env npx tsx
/**
 * Test Prisma Database Connection
 * Verifies that the database connection issue is fixed
 */

import { PrismaClient } from '@prisma/client';

async function testPrismaConnection() {
  console.log('🔍 TESTING PRISMA DATABASE CONNECTION');
  console.log('====================================');
  
  const prisma = new PrismaClient({
    log: ['error'],
    errorFormat: 'minimal'
  });
  
  try {
    // Test basic connection
    console.log('📊 Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test position count query (similar to what AdaptivePairFilter does)
    console.log('\n📈 Testing position queries...');
    const totalPositions = await prisma.managedPosition.count();
    console.log(`✅ Position count query successful: ${totalPositions} total positions`);
    
    // Test specific query that was failing
    console.log('\n🎯 Testing AdaptivePairFilter-style query...');
    const testSymbol = 'BTCUSD';
    const positions = await prisma.managedPosition.findMany({
      where: {
        symbol: testSymbol,
        status: 'closed',
        realizedPnL: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(`✅ Symbol-specific query successful: ${positions.length} ${testSymbol} positions`);
    
    // Test that prisma object is properly structured
    console.log('\n🔧 Testing Prisma object structure...');
    console.log(`✅ prisma exists: ${!!prisma}`);
    console.log(`✅ prisma.managedPosition exists: ${!!prisma.managedPosition}`);
    console.log(`✅ prisma.$connect exists: ${!!prisma.$connect}`);
    
    console.log('\n🎉 ALL TESTS PASSED - Database connection is working properly!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'Unknown'}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 DIAGNOSIS: Database server not running');
      console.log('   Check if PostgreSQL container is running');
    } else if (error.message.includes('authentication')) {
      console.log('\n🔧 DIAGNOSIS: Authentication issue');
      console.log('   Check DATABASE_URL credentials');
    } else {
      console.log('\n🔧 DIAGNOSIS: Unknown database issue');
      console.log('   Review full error details above');
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testPrismaConnection();
}