#!/usr/bin/env node

/**
 * Setup LiveTradingSession for dashboard visibility
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

async function setupDashboardSession() {
  console.log('🔧 Setting up LiveTradingSession for dashboard visibility...');
  
  try {
    // Step 1: Create or get user for trading session
    let user = await prisma.user.findFirst({
      where: {
        email: 'production@signalcartel.local'
      }
    });
    
    if (!user) {
      console.log('👤 Creating production user...');
      user = await prisma.user.create({
        data: {
          id: `user-production-${Date.now()}`,
          email: 'production@signalcartel.local',
          name: 'Production Trading System',
          role: 'admin',
          apiKeysVerified: true
        }
      });
      console.log(`✅ Created user: ${user.id}`);
    } else {
      console.log(`✅ Using existing user: ${user.id}`);
    }
    
    // Step 2: Create or get active trading session
    let session = await prisma.liveTradingSession.findFirst({
      where: {
        userId: user.id,
        status: 'active'
      }
    });
    
    if (!session) {
      console.log('📊 Creating new trading session...');
      session = await prisma.liveTradingSession.create({
        data: {
          id: `session-production-${Date.now()}`,
          userId: user.id,
          sessionName: 'Tensor AI Fusion V2.7 Production Trading',
          strategy: 'tensor-ai-fusion',
          exchange: 'kraken',
          mode: 'live',
          status: 'active',
          startedAt: new Date(),
          initialCapital: 300.0,
          currentCapital: 300.0,
          maxDailyLoss: 50.0,
          maxPositionSize: 50.0,
          sessionNotes: 'Automated tensor AI fusion trading with mathematical conviction system',
          riskParameters: JSON.stringify({
            maxPositionSize: 50,
            maxDailyLoss: 50,
            stopLoss: 2.0,
            takeProfit: 3.0
          }),
          updatedAt: new Date()
        }
      });
      console.log(`✅ Created session: ${session.id}`);
    } else {
      console.log(`✅ Using existing session: ${session.id}`);
    }
    
    // Step 3: Save session info for production system to use
    const sessionInfo = {
      userId: user.id,
      sessionId: session.id,
      sessionName: session.sessionName
    };
    
    console.log('📋 Session Details:');
    console.log(`   User ID: ${sessionInfo.userId}`);
    console.log(`   Session ID: ${sessionInfo.sessionId}`);
    console.log(`   Session Name: ${sessionInfo.sessionName}`);
    
    // Export session ID to environment variable file
    const fs = require('fs');
    const envContent = `# Dashboard Session Configuration
LIVE_TRADING_SESSION_ID=${sessionInfo.sessionId}
LIVE_TRADING_USER_ID=${sessionInfo.userId}
`;
    
    fs.writeFileSync('.env.dashboard', envContent);
    console.log('✅ Session configuration saved to .env.dashboard');
    
    return sessionInfo;
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupDashboardSession();