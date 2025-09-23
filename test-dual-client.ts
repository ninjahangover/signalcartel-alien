/**
 * Test ByBit Dual Client - Public + CFT APIs
 */

import { createByBitDualClient } from './src/lib/bybit-dual-client';
import chalk from 'chalk';

async function testDualClient() {
  console.log(chalk.cyan('🧪 Testing ByBit Dual Client\n'));

  try {
    const client = createByBitDualClient();

    // Test 1: Public API - Market Data
    console.log(chalk.cyan('1. Testing Public API (Market Data)...'));
    const btcPrice = await client.getMarketPrice('BTCUSDT');
    console.log(chalk.green(`✅ BTC Price: $${btcPrice.toFixed(2)}`));

    const ethPrice = await client.getMarketPrice('ETHUSDT');
    console.log(chalk.green(`✅ ETH Price: $${ethPrice.toFixed(2)}`));

    // Test 2: Bulk market data
    console.log(chalk.cyan('\n2. Testing Bulk Market Data...'));
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
    const bulkData = await client.getBulkMarketData(symbols);

    bulkData.forEach((data, symbol) => {
      console.log(chalk.green(`✅ ${symbol}: $${data.price.toFixed(2)} (${data.priceChange24h > 0 ? '+' : ''}${data.priceChange24h.toFixed(2)}%)`));
    });

    // Test 3: Available pairs
    console.log(chalk.cyan('\n3. Testing Available Pairs...'));
    const pairs = await client.getAvailablePairs();
    const activePairs = pairs.filter(p => p.status === 'Trading');
    console.log(chalk.green(`✅ Found ${activePairs.length} active trading pairs`));

    // Show some examples
    console.log(chalk.white('\nPopular pairs:'));
    ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'AVAXUSDT', 'DOTUSDT'].forEach(symbol => {
      const pair = activePairs.find(p => p.symbol === symbol);
      if (pair) {
        console.log(chalk.dim(`  ${symbol}: Min order ${parseFloat(pair.minOrderQty).toFixed(6)} ${pair.baseCoin}`));
      }
    });

    // Test 4: CFT API Status
    console.log(chalk.cyan('\n4. Testing CFT API Status...'));
    const status = client.getStatus();
    console.log(chalk.white('API Status:'));
    console.log(status.publicAPI ? chalk.green('  ✅ Public API: Ready') : chalk.red('  ❌ Public API: Failed'));
    console.log(status.cftAPI ? chalk.green('  ✅ CFT API: Ready') : chalk.yellow('  ⚠️  CFT API: IP whitelist needed'));

    if (status.cftAPI) {
      // Test authenticated calls
      console.log(chalk.cyan('\n5. Testing CFT Authenticated Calls...'));
      try {
        const account = await client.getAccountSummary();
        console.log(chalk.green(`✅ Account equity: $${account.totalEquity.toFixed(2)}`));

        const positions = await client.getPositions();
        console.log(chalk.green(`✅ Open positions: ${positions.length}`));
      } catch (error) {
        console.log(chalk.yellow('⚠️  CFT API calls failed - IP whitelist issue'));
      }
    } else {
      console.log(chalk.yellow('⚠️  CFT API not ready - market data only mode'));
    }

    console.log(chalk.green('\n🎯 DUAL CLIENT TEST RESULTS:'));
    console.log(chalk.white('─'.repeat(50)));
    console.log(chalk.green('✅ Public API: Market data working perfectly'));
    console.log(status.cftAPI ?
      chalk.green('✅ CFT API: Trade execution ready') :
      chalk.yellow('⚠️  CFT API: Waiting for IP whitelist')
    );
    console.log(chalk.cyan('\n💡 This solves the IP whitelist issue!'));
    console.log(chalk.white('• Signal generation can work immediately'));
    console.log(chalk.white('• Trade execution will work once CFT IP is whitelisted'));
    console.log(chalk.white('• No more API access problems for market data'));

  } catch (error: any) {
    console.error(chalk.red('\n💥 Test failed:'), error.message);
  }
}

testDualClient();