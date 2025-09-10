#!/usr/bin/env tsx
/**
 * Test database connection and basic operations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection and operations...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Test 2: Count existing records
    console.log('2️⃣ Checking existing data...');
    const positionCount = await prisma.managedPosition.count();
    const tradeCount = await prisma.managedTrade.count();
    
    // Check if BayesianAnalysis table exists
    let bayesianCount = 0;
    try {
      bayesianCount = await prisma.bayesianAnalysis?.count() || 0;
    } catch (e) {
      console.log('⚠️ BayesianAnalysis table not found or accessible');
    }
    
    console.log(`✅ Existing records:`);
    console.log(`   - ManagedPosition: ${positionCount}`);
    console.log(`   - ManagedTrade: ${tradeCount}`);
    console.log(`   - BayesianAnalysis: ${bayesianCount}\n`);

    // Test 3: Test problematic Bayesian creation
    console.log('3️⃣ Testing Bayesian analysis creation...');
    try {
      const testBayesian = await prisma.bayesianAnalysis.create({
        data: {
          symbol: 'BTCUSD',
          sessionId: 'test-session',
          priorProbability: 0.5,
          posteriorProbability: 0.6,
          likelihood: 0.8,
          evidence: 0.75,
          confidence: 0.7,
          marketRegime: 'BULLISH',
          mostLikelyRegime: 'BULLISH',
          originalConfidence: 0.7,
          expectancyScore: 0.6,
          winRateProjection: 0.65,
          riskRewardRatio: 1.5,
          recommendation: 'BUY',
          performanceGap: 0.0,
          confidenceGap: 0.0,
          learningWeight: 1.0
        }
      });
      console.log(`✅ Bayesian analysis created: ${testBayesian.id}`);
      
      // Clean up
      await prisma.bayesianAnalysis.delete({ where: { id: testBayesian.id } });
      console.log('✅ Test cleanup successful\n');
    } catch (error) {
      console.log(`❌ Bayesian creation failed: ${error.message}\n`);
    }

    // Test 4: Test circular dependency issue
    console.log('4️⃣ Testing position/trade circular dependency...');
    try {
      // This should fail due to circular dependency
      const testPosition = await prisma.managedPosition.create({
        data: {
          strategy: 'test',
          symbol: 'BTCUSD',
          side: 'buy',
          entryPrice: 50000,
          quantity: 0.01,
          entryTime: new Date(),
          status: 'open'
          // Note: No entryTradeId provided - should this work?
        }
      });
      console.log(`✅ Position created without trade: ${testPosition.id}`);
      
      // Clean up
      await prisma.managedPosition.delete({ where: { id: testPosition.id } });
      console.log('✅ Test cleanup successful\n');
    } catch (error) {
      console.log(`❌ Position creation failed: ${error.message}\n`);
    }

    // Test 5: Check recent positions
    console.log('5️⃣ Checking recent positions...');
    const recentPositions = await prisma.managedPosition.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        entryTrade: true,
        exitTrade: true
      }
    });
    
    console.log(`✅ Found ${recentPositions.length} recent positions:`);
    recentPositions.forEach(pos => {
      console.log(`   - ${pos.symbol} ${pos.side} (${pos.status}) - Created: ${pos.createdAt.toISOString()}`);
      console.log(`     Entry Trade: ${pos.entryTrade ? pos.entryTrade.id : 'MISSING'}`);
      console.log(`     Exit Trade: ${pos.exitTrade ? pos.exitTrade.id : 'NONE'}`);
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔐 Database connection closed');
  }
}

testDatabaseConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});