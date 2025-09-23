#!/usr/bin/env npx tsx
/**
 * Test ByBit CFT API Connection
 * Validates API credentials and connectivity before starting main system
 */

import { createByBitDualClient } from './src/lib/bybit-dual-client';
import chalk from 'chalk';

async function testConnection() {
  try {
    console.log(chalk.cyan('🧪 Testing ByBit API Connection...'));

    const client = createByBitDualClient();

    // Test public API (market data)
    console.log(chalk.dim('Testing public API...'));
    const btcPrice = await client.getMarketPrice('BTCUSDT');
    console.log(chalk.green(`✅ Public API: BTC @ $${btcPrice.toFixed(2)}`));

    // Test a few more pairs to ensure stable connection
    const ethPrice = await client.getMarketPrice('ETHUSDT');
    const bnbPrice = await client.getMarketPrice('BNBUSDT');

    console.log(chalk.green(`✅ Market data: ETH @ $${ethPrice.toFixed(2)}, BNB @ $${bnbPrice.toFixed(2)}`));

    console.log(chalk.green('🎉 ByBit API connection successful!'));
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('❌ ByBit API connection failed:'));
    console.error(chalk.red(error.message));

    if (error.message.includes('Unmatched IP')) {
      console.log(chalk.yellow('💡 IP whitelist issue detected'));
      console.log(chalk.yellow('   - Check VPN connection'));
      console.log(chalk.yellow('   - Verify IP whitelist in ByBit API settings'));
    }

    process.exit(1);
  }
}

testConnection();
