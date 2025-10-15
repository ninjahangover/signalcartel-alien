#!/usr/bin/env tsx
/**
 * Quick position P&L checker
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Checking open positions and P&L...\n');

  const positions = await prisma.managedPosition.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${positions.length} open positions:\n`);

  let totalEntryValue = 0;
  let totalCurrentValue = 0;

  for (const pos of positions) {
    const entryValue = pos.quantity * pos.entryPrice;
    const currentPrice = pos.currentPrice || pos.entryPrice; // fallback if currentPrice is null
    const currentValue = pos.quantity * currentPrice;
    const pnl = currentValue - entryValue;
    const pnlPct = (pnl / entryValue) * 100;

    totalEntryValue += entryValue;
    totalCurrentValue += currentValue;

    console.log(`${pos.symbol}:`);
    console.log(`  Quantity: ${pos.quantity}`);
    console.log(`  Entry: $${pos.entryPrice.toFixed(8)} (total: $${entryValue.toFixed(2)})`);
    console.log(`  Current: $${currentPrice.toFixed(8)} (total: $${currentValue.toFixed(2)})`);
    console.log(`  P&L: $${pnl.toFixed(2)} (${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);
    console.log(`  Opened: ${pos.createdAt.toISOString()}`);
    console.log('');
  }

  const totalPnl = totalCurrentValue - totalEntryValue;
  const totalPnlPct = (totalPnl / totalEntryValue) * 100;

  console.log('═══════════════════════════════════════');
  console.log('TOTALS:');
  console.log(`  Entry Value: $${totalEntryValue.toFixed(2)}`);
  console.log(`  Current Value: $${totalCurrentValue.toFixed(2)}`);
  console.log(`  Total P&L: $${totalPnl.toFixed(2)} (${totalPnlPct > 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%)`);
  console.log('═══════════════════════════════════════');

  await prisma.$disconnect();
}

main().catch(console.error);
