#!/usr/bin/env npx tsx
/**
 * Position Cleanup Analysis
 * 
 * Helps determine if manual position cleanup is needed for orphaned positions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePositionCleanupNeeds() {
  console.log('📊 POSITION CLEANUP ANALYSIS');
  console.log('============================');
  
  try {
    // Get all positions
    const allPositions = await prisma.managedPosition.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    const openPositions = allPositions.filter(p => p.status === 'open');
    const recentPositions = allPositions.filter(p => {
      const age = (Date.now() - p.createdAt.getTime()) / 1000 / 60 / 60; // hours
      return age <= 24;
    });
    
    console.log(`\n📈 POSITION SUMMARY:`);
    console.log(`   Total positions (last 50): ${allPositions.length}`);
    console.log(`   Open positions: ${openPositions.length}`);
    console.log(`   Recent positions (24h): ${recentPositions.length}`);
    
    if (openPositions.length > 0) {
      console.log(`\n🚨 OPEN POSITIONS FOUND:`);
      for (const pos of openPositions) {
        const ageHours = ((Date.now() - pos.createdAt.getTime()) / 1000 / 60 / 60).toFixed(1);
        console.log(`   ${pos.symbol}: ${pos.quantity.toFixed(6)} @ $${pos.entryPrice} (${ageHours}h ago)`);
      }
      console.log(`\n⚠️  MANUAL CLEANUP NEEDED: YES`);
      console.log(`   These positions show as 'open' in database but may be orphaned on Kraken`);
    } else {
      console.log(`\n✅ NO OPEN POSITIONS IN DATABASE`);
    }
    
    // Check for recent trading gap
    if (recentPositions.length > 0) {
      const latestPosition = recentPositions[0];
      const gapMinutes = ((Date.now() - latestPosition.createdAt.getTime()) / 1000 / 60).toFixed(1);
      
      console.log(`\n⏰ RECENT TRADING ACTIVITY:`);
      console.log(`   Latest recorded trade: ${gapMinutes} minutes ago`);
      console.log(`   Symbol: ${latestPosition.symbol}`);
      console.log(`   Status: ${latestPosition.status}`);
      
      if (parseFloat(gapMinutes) > 60) {
        console.log(`\n🚨 TRADING GAP DETECTED:`);
        console.log(`   Gap of ${gapMinutes} minutes suggests position tracking failure`);
        console.log(`   Check Kraken.com for untracked positions`);
      }
    }
    
    // Risk assessment
    console.log(`\n🎯 CLEANUP RECOMMENDATIONS:`);
    
    if (openPositions.length === 0) {
      console.log(`   ✅ Database is clean - no open positions to clear`);
      console.log(`   ⚠️  BUT check Kraken.com manually for orphaned positions`);
      console.log(`   🔧 If Kraken has positions: They are NOT tracked in database`);
      console.log(`   💡 Consider manual closure or position recovery tool`);
    } else {
      console.log(`   🚨 Manual cleanup REQUIRED for ${openPositions.length} database positions`);
      console.log(`   🔧 Run: UPDATE "ManagedPosition" SET status='closed' WHERE status='open'`);
      console.log(`   ⚠️  Then check Kraken.com for actual positions`);
    }
    
    console.log(`\n🔧 NEXT STEPS:`);
    console.log(`   1. Check your Kraken.com account for actual open positions`);
    console.log(`   2. If Kraken shows positions but database shows 0: Use recovery tool`);
    console.log(`   3. If both show positions: Close database positions first`);
    console.log(`   4. Consider manual closure of any untrackable positions on Kraken`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\n🔧 FALLBACK RECOMMENDATION:');
    console.log('   Since database is inaccessible, manually check and close Kraken positions');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  analyzePositionCleanupNeeds();
}