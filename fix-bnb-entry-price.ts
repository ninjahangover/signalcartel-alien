import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBNBEntryPrice() {
  try {
    console.log('🔍 Investigating BNB position entry price...');

    // Get all BNB positions (including closed ones to calculate average)
    const allBNBTrades = await prisma.managedPosition.findMany({
      where: {
        symbol: 'BNBUSD'
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n📊 Found ${allBNBTrades.length} total BNB trades:`);
    let totalQuantity = 0;
    let totalCost = 0;

    allBNBTrades.forEach((trade, index) => {
      const quantity = parseFloat(trade.quantity);
      const entryPrice = parseFloat(trade.entryPrice);
      const cost = quantity * entryPrice;

      console.log(`${index + 1}. ${trade.side} ${quantity} BNB @ $${entryPrice} = $${cost.toFixed(2)} (${trade.status}) - ${trade.createdAt}`);

      if (trade.status === 'open') {
        totalQuantity += quantity;
        totalCost += cost;
      }
    });

    if (totalQuantity > 0) {
      const averageEntryPrice = totalCost / totalQuantity;
      console.log(`\n📈 CALCULATED AVERAGE ENTRY PRICE:`);
      console.log(`   Total Quantity: ${totalQuantity}`);
      console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
      console.log(`   Average Entry: $${averageEntryPrice.toFixed(2)}`);

      // Get current open position
      const currentPosition = await prisma.managedPosition.findFirst({
        where: {
          symbol: 'BNBUSD',
          status: 'open'
        }
      });

      if (currentPosition) {
        const currentEntryPrice = parseFloat(currentPosition.entryPrice);
        console.log(`\n🔧 Current position entry price: $${currentEntryPrice}`);
        console.log(`   Correct average entry price should be: $${averageEntryPrice.toFixed(2)}`);

        if (Math.abs(currentEntryPrice - averageEntryPrice) > 0.01) {
          console.log(`\n⚠️  ENTRY PRICE MISMATCH DETECTED!`);
          console.log(`   Database shows: $${currentEntryPrice}`);
          console.log(`   Calculated average: $${averageEntryPrice.toFixed(2)}`);
          console.log(`   Difference: $${(averageEntryPrice - currentEntryPrice).toFixed(2)}`);

          // Update the entry price to the correct average
          const updated = await prisma.managedPosition.update({
            where: { id: currentPosition.id },
            data: {
              entryPrice: averageEntryPrice.toFixed(2)
            }
          });

          console.log(`\n✅ FIXED! Updated entry price from $${currentEntryPrice} to $${averageEntryPrice.toFixed(2)}`);
        } else {
          console.log(`\n✅ Entry price is already correct!`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBNBEntryPrice();