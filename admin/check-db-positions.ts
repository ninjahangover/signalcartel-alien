import { prisma } from '../src/lib/prisma';

async function checkPositions() {
  console.log('\n=== DATABASE POSITIONS CHECK ===\n');
  
  const openPositions = await prisma.managedPosition.findMany({
    where: { status: 'open' },
    orderBy: { openedAt: 'desc' }
  });
  
  console.log(`Found ${openPositions.length} open positions in database:\n`);
  
  let totalValue = 0;
  for (const pos of openPositions) {
    const value = pos.quantity * pos.entryPrice;
    totalValue += value;
    console.log(`  ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice.toFixed(4)} = $${value.toFixed(2)} (opened ${pos.openedAt})`);
  }
  
  console.log(`\nTotal value locked: $${totalValue.toFixed(2)}`);
  
  await prisma.$disconnect();
}

checkPositions().catch(console.error);
