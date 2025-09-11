#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBNBQuantity() {
  console.log('🔧 Updating BNB position quantity to correct amount (0.22399 BNB)...\n');
  
  const correctQuantity = 0.22399;
  const bnbPrice = 650; // Keep same price
  const correctValue = correctQuantity * bnbPrice;
  
  try {
    // Update ManagedPosition
    const managedPosition = await prisma.managedPosition.findFirst({
      where: { 
        symbol: 'BNBUSDT',
        status: 'open'
      }
    });
    
    if (!managedPosition) {
      console.log('❌ No open BNBUSDT ManagedPosition found');
      return;
    }
    
    await prisma.managedPosition.update({
      where: { id: managedPosition.id },
      data: {
        quantity: correctQuantity
      }
    });
    
    console.log(`✅ Updated ManagedPosition quantity: ${correctQuantity} BNB`);
    
    // Update corresponding ManagedTrade
    const managedTrade = await prisma.managedTrade.findFirst({
      where: { 
        positionId: managedPosition.id,
        isEntry: true
      }
    });
    
    if (managedTrade) {
      await prisma.managedTrade.update({
        where: { id: managedTrade.id },
        data: {
          quantity: correctQuantity,
          value: correctValue
        }
      });
      console.log(`✅ Updated ManagedTrade quantity: ${correctQuantity} BNB`);
    }
    
    // Update LivePosition
    const livePosition = await prisma.livePosition.findFirst({
      where: { 
        symbol: 'BNBUSDT',
        status: 'open'
      }
    });
    
    if (livePosition) {
      await prisma.livePosition.update({
        where: { id: livePosition.id },
        data: {
          quantity: correctQuantity,
          entryValue: correctValue,
          updatedAt: new Date()
        }
      });
      console.log(`✅ Updated LivePosition quantity: ${correctQuantity} BNB`);
    }
    
    // Verify the updates
    const updatedManagedPosition = await prisma.managedPosition.findFirst({
      where: { 
        symbol: 'BNBUSDT',
        status: 'open'
      }
    });
    
    const updatedLivePosition = await prisma.livePosition.findFirst({
      where: { 
        symbol: 'BNBUSDT',
        status: 'open'
      }
    });
    
    console.log('\n📊 UPDATED BNB POSITION:');
    if (updatedManagedPosition) {
      const value = updatedManagedPosition.quantity * updatedManagedPosition.entryPrice;
      console.log(`   ManagedPosition: ${updatedManagedPosition.quantity} BNB @ $${updatedManagedPosition.entryPrice} = $${value.toFixed(2)}`);
    }
    
    if (updatedLivePosition) {
      const value = updatedLivePosition.quantity * updatedLivePosition.entryPrice;
      console.log(`   LivePosition: ${updatedLivePosition.quantity} BNB @ $${updatedLivePosition.entryPrice} = $${value.toFixed(2)}`);
    }
    
    console.log('\n🎉 SUCCESS: BNB position quantity corrected to match Kraken reality!');
    console.log(`🖥️  Dashboard now shows correct amount: ${correctQuantity} BNB`);
    
  } catch (error) {
    console.error('❌ Failed to update BNB quantity:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixBNBQuantity();