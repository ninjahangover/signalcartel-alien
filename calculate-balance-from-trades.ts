#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function calculateBalanceFromTrades(): Promise<number> {
  try {
    // Get total realized P&L from all completed trades
    const query = `
      SELECT COALESCE(SUM("realizedPnL"), 0) as total_pnl
      FROM "ManagedPosition" 
      WHERE "realizedPnL" IS NOT NULL AND status = 'closed';
    `;
    
    const command = `PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -t -c "${query}"`;
    
    const { stdout } = await execAsync(command);
    const totalPnL = parseFloat(stdout.trim()) || 0;
    
    // Estimate starting balance (conservative estimate based on position sizes we've seen)
    const estimatedStartingBalance = 350; // Based on position sizes and trading history
    
    const currentBalance = estimatedStartingBalance + totalPnL;
    
    console.log(`📊 Trading Performance Summary:`);
    console.log(`💰 Estimated Starting Balance: $${estimatedStartingBalance.toFixed(2)}`);
    console.log(`📈 Total Realized P&L: $${totalPnL.toFixed(2)}`);
    console.log(`💰 Calculated Current Balance: $${currentBalance.toFixed(2)}`);
    
    return Math.max(currentBalance, 0); // Don't return negative balance
    
  } catch (error) {
    console.error('❌ Error calculating balance:', error);
    return 300; // Fallback
  }
}

if (require.main === module) {
  calculateBalanceFromTrades().then(balance => {
    console.log(`\n💰 Final Balance: $${balance.toFixed(2)}`);
  });
}

export { calculateBalanceFromTrades };