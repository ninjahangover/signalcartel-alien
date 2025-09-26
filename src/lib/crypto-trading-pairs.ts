/**
 * QUANTUM FORGE™ Kraken Trading Pairs Configuration
 * Dynamic trading pairs fetched from Kraken exchange for profit predator system
 * Updated: September 26, 2025 - Dynamic validation with AssetPairs API
 */

import { krakenPairValidator } from './kraken-pair-validator';

export interface CryptoPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
  maxLeverage: number;
  isActive: boolean;
  isPredatorTarget: boolean; // High-opportunity pairs for profit hunting
}

// Dynamic USD trading pairs - now fetched from Kraken API
export async function getKrakenUsdPairs(): Promise<string[]> {
  return await krakenPairValidator.getValidUsdPairs();
}

// Dynamic leverage pairs - now fetched from Kraken API
export async function getKrakenLeveragePairs(): Promise<Map<string, number>> {
  return await krakenPairValidator.getLeveragedPairs();
}

// HIGH-OPPORTUNITY PREDATOR TARGETS (Top leverage + liquidity pairs)
// PRIORITIZING USDT PAIRS: Better liquidity, global trading, institutional preference
export const PREDATOR_TARGET_PAIRS = [
  // 10x leverage majors (USDT preferred for liquidity)
  "XBTUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "XDGUSDT", 
  "XBTUSD", "ETHUSD", "SOLUSD", "XRPUSD", "XDGUSD",     
  // 4-5x leverage (USDT advantages)
  "ADAUSDT", "ADAUSDC", "USDCUSDT", "MANAUSDT", "MINAUSDT",    
  "APTUSD", "KSMUSD", "LDOUSD", "MANAUSD", "MINAUSD",
  // USDC pairs (secondary)
  "XBTUSDC", "ETHUSDC", "SOLUSDC", "XRPUSDC", "XDGUSDC"
];

// Generate structured pair data from Kraken pairs (dynamic)
export async function generateCryptoPairs(): Promise<CryptoPair[]> {
  const validPairs = await getKrakenUsdPairs();
  const leveragePairs = await getKrakenLeveragePairs();

  return validPairs.map(symbol => {
    const baseAsset = symbol.replace(/(USD|USDC|USDT)$/, '');
    const quoteMatch = symbol.match(/(USD|USDC|USDT)$/);
    const quoteAsset = quoteMatch ? quoteMatch[0] : 'USD';

    return {
      symbol,
      baseAsset,
      quoteAsset,
      displayName: `${baseAsset}/${quoteAsset}`,
      maxLeverage: leveragePairs.get(symbol) || 1,
      isActive: true, // All pairs from validPairs are active
      isPredatorTarget: PREDATOR_TARGET_PAIRS.includes(symbol)
    };
  });
}

// Main export for profit predator system (async)
export async function getCryptoPairs(): Promise<CryptoPair[]> {
  return await generateCryptoPairs();
}

// Quick access to high-leverage pairs for profit hunting (async)
export async function getHighLeveragePairs(): Promise<CryptoPair[]> {
  const pairs = await getCryptoPairs();
  return pairs.filter(pair => pair.maxLeverage >= 3);
}

// Popular major cryptocurrency pairs for priority hunting
export const MAJOR_CRYPTO_PAIRS = [
  'XBTUSD', 'ETHUSD', 'SOLUSD', 'ADAUSD', 'XRPUSD', 'DOTUSD', 'LINKUSD', 
  'AVAXUSD', 'ATOMUSD', 'NEARUSD', 'LTCUSD', 'BCHUSD', 'TRXUSD'
];

// Meme coin pairs with high volatility opportunities  
export const MEME_COIN_PAIRS = [
  'XDGUSD', 'SHIBUSD', 'PEPEUSD', 'BONKUSD', 'WIFUSD', 'FLOKIUSD', 'MEWUSD'
];

// AI & Technology tokens with momentum potential
export const AI_TECH_PAIRS = [
  'RENDERUSD', 'FETCHUSD', 'TAOUSD', 'INJUSD', 'AIXBTUSD', 'AI16ZUSD', 'VIRTUALUSD'
];

// Get specific pair data by symbol (async)
export async function getPairData(symbol: string): Promise<CryptoPair | undefined> {
  const pairs = await getCryptoPairs();
  return pairs.find(pair => pair.symbol === symbol);
}

// Get maximum leverage for a symbol (async)
export async function getMaxLeverage(symbol: string): Promise<number> {
  const leveragePairs = await getKrakenLeveragePairs();
  return leveragePairs.get(symbol) || 1;
}

// Check if pair is a high-priority predator target
export function isPredatorTarget(symbol: string): boolean {
  return PREDATOR_TARGET_PAIRS.includes(symbol);
}

// Dynamic loading message - counts will be shown after async initialization
console.log(`🐅 QUANTUM FORGE™ Kraken Configuration Loading...`);
console.log(`   📊 Dynamic pair loading from Kraken API`);
console.log(`   💪 Leverage data fetched in real-time`);
console.log(`   🎯 ${PREDATOR_TARGET_PAIRS.length} prime predator targets`);
console.log(`   ⚡ Ready for multi-pair profit hunting!`);