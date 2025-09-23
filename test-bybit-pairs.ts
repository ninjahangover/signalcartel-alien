import { createByBitCFTClient } from './src/lib/bybit-cft-client';
import chalk from 'chalk';

async function testByBitPairs() {
  console.log(chalk.cyan('🔍 Fetching Available ByBit Trading Pairs - READ ONLY\n'));
  console.log(chalk.yellow('⚠️  This does NOT execute trades (evaluation won\'t start)\n'));

  try {
    // Create ByBit client
    const bybitClient = createByBitCFTClient();

    // Get all available pairs
    console.log(chalk.cyan('📊 Fetching available trading pairs...'));
    const pairs = await bybitClient.getAvailablePairs();

    // Filter for active pairs only
    const activePairs = pairs.filter(p => p.status === 'Trading');

    // Group by base coin
    const pairsByBase = new Map<string, typeof pairs>();

    activePairs.forEach(pair => {
      if (!pairsByBase.has(pair.baseCoin)) {
        pairsByBase.set(pair.baseCoin, []);
      }
      pairsByBase.get(pair.baseCoin)!.push(pair);
    });

    // Display summary
    console.log(chalk.green(`\n✅ Found ${activePairs.length} active trading pairs\n`));

    // Show popular coins first
    const popularCoins = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI'];

    console.log(chalk.cyan('🌟 POPULAR TRADING PAIRS:'));
    console.log(chalk.white('─'.repeat(60)));

    popularCoins.forEach(coin => {
      const coinPairs = pairsByBase.get(coin);
      if (coinPairs && coinPairs.length > 0) {
        const usdtPair = coinPairs.find(p => p.symbol === `${coin}USDT`);
        if (usdtPair) {
          console.log(chalk.white(`${usdtPair.symbol.padEnd(12)} - Min Order: ${parseFloat(usdtPair.minOrderQty).toFixed(6)} ${coin}`));
        }
      }
    });

    // Show all available base coins
    console.log(chalk.cyan('\n📈 ALL AVAILABLE BASE COINS:'));
    console.log(chalk.white('─'.repeat(60)));

    const sortedBases = Array.from(pairsByBase.keys()).sort();
    const columns = 5;
    const rows = Math.ceil(sortedBases.length / columns);

    for (let i = 0; i < rows; i++) {
      let row = '';
      for (let j = 0; j < columns; j++) {
        const index = i + j * rows;
        if (index < sortedBases.length) {
          row += sortedBases[index].padEnd(12);
        }
      }
      console.log(chalk.white(row));
    }

    // Count USDT pairs
    const usdtPairs = activePairs.filter(p => p.quoteCoin === 'USDT');
    console.log(chalk.cyan(`\n💰 USDT Trading Pairs: ${usdtPairs.length}`));

    // Show some example pairs with details
    console.log(chalk.cyan('\n🔍 EXAMPLE PAIR DETAILS:'));
    console.log(chalk.white('─'.repeat(60)));

    const examples = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT'];
    examples.forEach(symbol => {
      const pair = activePairs.find(p => p.symbol === symbol);
      if (pair) {
        console.log(chalk.white(`\n${pair.symbol}:`));
        console.log(chalk.dim(`  Min Order: ${parseFloat(pair.minOrderQty).toFixed(6)} ${pair.baseCoin}`));
        console.log(chalk.dim(`  Max Order: ${parseFloat(pair.maxOrderQty).toFixed(2)} ${pair.baseCoin}`));
        console.log(chalk.dim(`  Price Range: $${parseFloat(pair.minPrice).toFixed(2)} - $${parseFloat(pair.maxPrice).toFixed(2)}`));
      }
    });

    // Trading recommendations
    console.log(chalk.green('\n✅ TRADING RECOMMENDATIONS:'));
    console.log(chalk.white('─'.repeat(60)));
    console.log(chalk.white('1. All major cryptocurrencies available (BTC, ETH, SOL, etc.)'));
    console.log(chalk.white('2. USDT pairs recommended for stable pricing'));
    console.log(chalk.white('3. Your 76% win rate system can work with any liquid pair'));
    console.log(chalk.white('4. Focus on high-volume pairs for better execution'));

    console.log(chalk.cyan('\n🎯 Ready for CFT evaluation with these pairs!'));
    console.log(chalk.yellow('Remember: First trade starts the 30-day evaluation timer'));

  } catch (error: any) {
    console.error(chalk.red('\n💥 Failed to fetch pairs:'), error.message);
  }
}

testByBitPairs()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));