/**
 * Known ByBit Trading Pairs for CFT Evaluation
 * Based on CFT documentation and standard ByBit perpetual contracts
 */

import chalk from 'chalk';

// Standard ByBit USDT Perpetual Pairs commonly available
const BYBIT_CFT_PAIRS = [
  // Major Cryptocurrencies
  'BTCUSDT',    // Bitcoin
  'ETHUSDT',    // Ethereum
  'BNBUSDT',    // Binance Coin
  'SOLUSDT',    // Solana
  'XRPUSDT',    // Ripple
  'ADAUSDT',    // Cardano
  'DOGEUSDT',   // Dogecoin
  'AVAXUSDT',   // Avalanche
  'DOTUSDT',    // Polkadot
  'MATICUSDT',  // Polygon

  // DeFi Tokens
  'LINKUSDT',   // Chainlink
  'UNIUSDT',    // Uniswap
  'AAVEUSDT',   // Aave
  'SUSHIUSDT',  // SushiSwap
  'COMPUSDT',   // Compound
  'MKRUSDT',    // Maker
  'SNXUSDT',    // Synthetix
  'CRVUSDT',    // Curve

  // Layer 1/2 Protocols
  'ATOMUSDT',   // Cosmos
  'NEARUSDT',   // NEAR Protocol
  'ALGOUSDT',   // Algorand
  'FTMUSDT',    // Fantom
  'APTUSDT',    // Aptos
  'ARBUSDT',    // Arbitrum
  'OPUSDT',     // Optimism

  // Exchange Tokens
  'FTTUSDT',    // FTX Token (if still available)
  'KCSUSDT',    // KuCoin Token
  'OKBUSDT',    // OKB

  // Metaverse/Gaming
  'SANDUSDT',   // The Sandbox
  'MANAUSDT',   // Decentraland
  'AXSUSDT',    // Axie Infinity
  'GALAUSDT',   // Gala
  'ENJUSDT',    // Enjin

  // Storage/Computing
  'FILUSDT',    // Filecoin
  'ICPUSDT',    // Internet Computer
  'ARUSDT',     // Arweave

  // Privacy Coins
  'XMRUSDT',    // Monero
  'ZECUSDT',    // Zcash

  // Stablecoins (usually not for perps but sometimes available)
  // 'USDCUSDT',   // USD Coin
  // 'DAIUSDT',    // DAI

  // Other Popular Alts
  'LTCUSDT',    // Litecoin
  'ETCUSDT',    // Ethereum Classic
  'XLMUSDT',    // Stellar
  'VETUSDT',    // VeChain
  'TRXUSDT',    // TRON
  'EOSUSDT',    // EOS
  'XTZUSDT',    // Tezos
  'HBARUSDT',   // Hedera
  'QNTUSDT',    // Quant
  'CHZUSDT',    // Chiliz
  'GRTUSDT',    // The Graph
  'ROSEUSDT',   // Oasis
  'BATUSDT',    // Basic Attention Token
  'ZRXUSDT',    // 0x Protocol
  'LRCUSDT',    // Loopring
  '1INCHUSDT',  // 1inch
  'YFIUSDT',    // Yearn Finance
];

export function displayAvailablePairs() {
  console.log(chalk.cyan('📊 BYBIT CFT TRADING PAIRS'));
  console.log(chalk.yellow('Based on standard ByBit USDT perpetual contracts\n'));

  console.log(chalk.green('✅ Major Cryptocurrencies (High Liquidity):'));
  console.log(chalk.white('─'.repeat(60)));
  const majors = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT'];
  majors.forEach(pair => {
    console.log(chalk.white(`  • ${pair}`));
  });

  console.log(chalk.cyan('\n🔷 DeFi Tokens:'));
  console.log(chalk.white('─'.repeat(60)));
  const defi = ['LINKUSDT', 'UNIUSDT', 'AAVEUSDT', 'SUSHIUSDT', 'COMPUSDT'];
  defi.forEach(pair => {
    console.log(chalk.white(`  • ${pair}`));
  });

  console.log(chalk.cyan('\n🌐 Layer 1/2 Protocols:'));
  console.log(chalk.white('─'.repeat(60)));
  const layers = ['ATOMUSDT', 'NEARUSDT', 'ALGOUSDT', 'FTMUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT'];
  layers.forEach(pair => {
    console.log(chalk.white(`  • ${pair}`));
  });

  console.log(chalk.yellow(`\n📝 Total Available: ${BYBIT_CFT_PAIRS.length} pairs`));

  console.log(chalk.green('\n💡 RECOMMENDATIONS FOR YOUR SYSTEM:'));
  console.log(chalk.white('─'.repeat(60)));
  console.log(chalk.white('1. Focus on HIGH LIQUIDITY pairs (BTC, ETH, BNB, SOL)'));
  console.log(chalk.white('2. Your proven pairs may be available:'));
  console.log(chalk.white('   • TESTUSD → Not available (use BTCUSDT instead)'));
  console.log(chalk.white('   • BNBUSD → Use BNBUSDT'));
  console.log(chalk.white('   • AVAXUSD → Use AVAXUSDT'));
  console.log(chalk.white('   • DOTUSD → Use DOTUSDT'));
  console.log(chalk.white('3. All pairs are USDT-based (stable quote currency)'));
  console.log(chalk.white('4. Perpetual contracts allow LONG and SHORT positions'));

  console.log(chalk.cyan('\n🎯 CFT EVALUATION NOTES:'));
  console.log(chalk.white('─'.repeat(60)));
  console.log(chalk.white('• $10,000 evaluation account'));
  console.log(chalk.white('• Max $10,000 daily profit allowed'));
  console.log(chalk.white('• 90/10 profit split on funded account'));
  console.log(chalk.white('• Your 76% win rate should excel here'));

  console.log(chalk.yellow('\n⚠️  IMPORTANT: First trade starts 30-day evaluation timer!'));

  return BYBIT_CFT_PAIRS;
}

// Run if called directly
if (require.main === module) {
  displayAvailablePairs();
}