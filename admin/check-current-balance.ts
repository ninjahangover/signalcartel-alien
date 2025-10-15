import { KrakenClient } from '../src/lib/kraken-client';

async function checkBalance() {
  const client = new KrakenClient();
  
  console.log('\n=== KRAKEN BALANCE CHECK ===\n');
  
  const balance = await client.getBalance();
  console.log('Raw Balance:', JSON.stringify(balance, null, 2));
  
  const zusd = parseFloat(balance.ZUSD || '0');
  console.log(`\nZUSD Balance: $${zusd.toFixed(2)}`);
  
  console.log('\n=== OPEN POSITIONS ===\n');
  const openPositions = await client.getOpenPositions();
  console.log(`Open Positions Count: ${openPositions.length}`);
  
  let totalLocked = 0;
  for (const pos of openPositions) {
    const cost = parseFloat(pos.cost || '0');
    totalLocked += cost;
    console.log(`  ${pos.pair}: ${pos.type} ${pos.vol} @ $${pos.cost} (P&L: ${pos.net})`);
  }
  
  console.log(`\nTotal Locked in Positions: $${totalLocked.toFixed(2)}`);
  console.log(`Available for Trading: $${(zusd - totalLocked).toFixed(2)}`);
}

checkBalance().catch(console.error);
