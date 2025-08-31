/**
 * QUANTUM FORGE™ Kraken Trading Pairs Configuration
 * Real trading pairs available on Kraken exchange for profit predator system
 * Updated: August 31, 2025 - 564 active USD pairs, 131 with leverage support
 */

export interface CryptoPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
  maxLeverage: number;
  isActive: boolean;
  isPredatorTarget: boolean; // High-opportunity pairs for profit hunting
}

// ACTUAL KRAKEN USD TRADING PAIRS (564 total)
export const KRAKEN_USD_PAIRS = [
  "1INCHUSD", "AAVEUSD", "ABUSD", "ACAUSD", "ACHUSD", "ACTUSD", "ACXUSD", "ADAUSD", 
  "ADAUSDC", "ADAUSDT", "ADXUSD", "AEROUSD", "AEVOUSD", "AGLDUSD", "AI16ZUSD", "AI16ZUSDC", 
  "AI16ZUSDT", "AI3USD", "AIOZUSD", "AIRUSD", "AIXBTUSD", "AKEUSD", "AKTUSD", "ALCHUSD", 
  "ALCXUSD", "ALGOUSD", "ALGOUSDC", "ALGOUSDT", "ALICEUSD", "ALKIMIUSD", "ALPHAUSD", "ALTUSD",
  "ANKRUSD", "ANLOGUSD", "ANONUSD", "APENFTUSD", "APEUSD", "APEUSDC", "APEUSDT", "API3USD",
  "APTUSD", "APUUSD", "ARBUSD", "ARCUSD", "ARKMUSD", "ARPAUSD", "ARUSD", "ASRRUSD",
  "ASTRUSD", "ATHUSD", "ATLASUSD", "ATOMUSD", "ATOMUSDC", "ATOMUSDT", "AUCTIONUSD", "AUDIOUSD",
  "AUDUSD", "AUSD", "AVAAIUSD", "AVAXUSD", "AVAXUSDC", "AVAXUSDT", "AXSUSD", "B3USD",
  "BABYUSD", "BADGERUSD", "BALUSD", "BANANAS31USD", "BANDUSD", "BATUSD", "BCHUSD", "BCHUSDC",
  "BCHUSDT", "BDXNUSD", "BEAMUSD", "BERAUSD", "BERAUSDC", "BERAUSDT", "BICOUSD", "BIGTIMEUSD",
  "BIOUSD", "BITUSD", "BLURUSD", "BLZUSD", "BMTUSD", "BNBUSD", "BNBUSDC", "BNBUSDT",
  "BNCUSD", "BNTUSD", "BOBAUSD", "BODENUSD", "BONDUSD", "BONKUSD", "BRICKUSD", "BSXUSD",
  "BTRUSD", "BTTUSD", "C98USD", "CAKEUSD", "CAMPUSD", "CARVUSD", "CATUSD", "CCDUSD",
  "CELOUSD", "CELRUSD", "CFGUSD", "CHEEMSUSD", "CHEXUSD", "CHILLHOUSEUSD", "CHRUSD", "CHZUSD",
  "CLANKERUSD", "CLOUDUSD", "CLVUSD", "CMETHUSD", "COMPUSD", "COOKIEUSD", "COQUSD", "CORNUSD",
  "COTIUSD", "COWUSD", "CPOOLUSD", "CQTUSD", "CROUSD", "CROUSDC", "CROUSDT", "CRVUSD",
  "CSMUSD", "CTSIUSD", "CVCUSD", "CVXUSD", "CXTUSD", "CYBERUSD", "DAIUSD", "DAIUSDT",
  "DASHUSD", "DBRUSD", "DEEPUSD", "DEGENUSD", "DENTUSD", "DMCUSD", "DOGSUSD", "DOGUSD",
  "DOLOUSD", "DOTUSD", "DOTUSDC", "DOTUSDT", "DRIFTUSD", "DRVUSD", "DUCKUSD", "DYDXUSD",
  "DYMUSD", "EDGEUSD", "EGLDUSD", "EIGENUSD", "ELXUSD", "ENAUSD", "ENJUSD", "ENSUSD",
  "EPTUSD", "ESUSD", "ESXUSD", "ETCUSD", "ETHFIUSD", "ETHPYUSD", "ETHUSD", "ETHUSDC",
  "ETHUSDT", "ETHWUSD", "EULUSD", "EUROPUSD", "EUROPUSDC", "EURQUSD", "EURRUSD", "EURRUSDC",
  "EURRUSDT", "EURUSD", "EWTUSD", "FARMUSD", "FARTCOINUSD", "FARTCOINUSDC", "FARTCOINUSDT",
  "FETUSD", "FHEUSD", "FIDAUSD", "FILUSD", "FISUSD", "FLOKIUSD", "FLOWUSD", "FLRUSD",
  "FLUXUSD", "FLYUSD", "FORTHUSD", "FWOGUSD", "FXSUSD", "GAIAUSD", "GALAUSD", "GALUSD",
  "GARIUSD", "GBPUSD", "GFIUSD", "GHIBLIUSD", "GHSTUSD", "GIGAUSD", "GLMRUSD", "GMTUSD",
  "GMXUSD", "GNOUSD", "GOATUSD", "GOMININGUSD", "GRASSUSD", "GRIFFAINUSD", "GRTUSD", "GSTUSD",
  "GTCUSD", "GUNUSD", "GUSD", "HBARUSD", "HDXUSD", "HFTUSD", "HIPPOUSD", "HMSTRUSD",
  "HNTUSD", "HONEYUSD", "HOUSEUSD", "HPOS10IUSD", "HUSD", "ICNTUSD", "ICPUSD", "ICXUSD",
  "IDEXUSD", "IMXUSD", "INITUSD", "INJUSD", "INTRUSD", "IPUSD", "JAILSTOOLUSD", "JASMYUSD",
  "JITOSOLUSD", "JOEUSD", "JSTUSD", "JTOUSD", "JUNOUSD", "JUPUSD", "KAITOUSD", "KARUSD",
  "KASUSD", "KASUSDT", "KAVAUSD", "KERNELUSD", "KETUSD", "KEYUSD", "KINTUSD", "KINUSD",
  "KMNOUSD", "KNCUSD", "KOBANUSD", "KP3RUSD", "KSMUSD", "KTAUSD", "L3USD", "LAYERUSD",
  "LCXUSD", "LDOUSD", "LINKUSD", "LINKUSDC", "LINKUSDT", "LITUSD", "LMWRUSD", "LOBOUSD",
  "LOCKINUSD", "LOFIUSD", "LPTUSD", "LQTYUSD", "LRCUSD", "LSETHUSD", "LSKUSD", "LTCUSD",
  "LTCUSDC", "LTCUSDT", "LUNA2USD", "LUNAUSD", "MANAUSD", "MANAUSDC", "MANAUSDT", "MASKUSD",
  "MATUSD", "MCUSD", "MELANIAUSD", "MELANIAUSDC", "MELANIAUSDT", "MEMEUSD", "MERLUSD", "METHUSD",
  "METISUSD", "MEUSD", "MEWUSD", "MICHIUSD", "MIMUSD", "MINAUSD", "MIRUSD", "MKRUSD",
  "MLNUSD", "MNGOUSD", "MNTUSD", "MOCAUSD", "MOGUSD", "MOODENGUSD", "MOONUSD", "MORPHOUSD",
  "MOVEUSD", "MOVRUSD", "MSOLUSD", "MUBARAKUSD", "MULTIUSD", "MUSD", "MVUSD", "MXCUSD",
  "NANOUSD", "NEARUSD", "NEIROUSD", "NILUSD", "NMRUSD", "NODEUSD", "NODLUSD", "NOSUSD",
  "NOTUSD", "NPCUSD", "NTRNUSD", "NYMUSD", "OCEANUSD", "ODOSUSD", "OGNUSD", "OMGUSD",
  "OMNIUSD", "OMUSD", "ONDOUSD", "OPUSD", "ORCAUSD", "ORDERUSD", "OSMOUSD", "OXTUSD",
  "OXYUSD", "PARTIUSD", "PAXGUSD", "PDAUSD", "PEAQUSD", "PEAQUSDC", "PENDLEUSD", "PENGUUSD",
  "PENGUUSDC", "PENGUUSDT", "PEPEUSD", "PERPUSD", "PHAUSD", "PLUMEUSD", "PNUTUSD", "POLISUSD",
  "POLSUSD", "POLUSD", "PONDUSD", "PONKEUSD", "POPCATUSD", "PORTALUSD", "POWRUSD", "PRCLUSD",
  "PRIMEUSD", "PROMPTUSD", "PROVEUSD", "PSTAKEUSD", "PUFFERUSD", "PUMPUSD", "PUPSUSD", "PYTHUSD",
  "PYUSDUSD", "QIUSD", "QNTUSD", "QTUMUSD", "RADUSD", "RAIINUSD", "RAREUSD", "RARIUSD",
  "RAYUSD", "RBCUSD", "REDUSD", "REKTUSD", "RENDERUSD", "RENUSD", "REPUSD", "REPV2USD",
  "REQUSD", "RETARDIOUSD", "REZUSD", "RIZEUSD", "RLCUSD", "RLUSDUSD", "RLUSDUSDC", "RLUSDUSDT",
  "ROOKUSD", "RPLUSD", "RSRUSD", "RUJIUSD", "RUNEUSD", "SAFEUSD", "SAGAUSD", "SAHARAUSD",
  "SAMOUSD", "SANDUSD", "SAPIENUSD", "SBRUSD", "SCRTUSD", "SCUSD", "SDNUSD", "SEIUSD",
  "SGBUSD", "SHIBUSD", "SHIBUSDC", "SHIBUSDT", "SIGMAUSD", "SKYUSD", "SLAYUSD", "SNEKUSD",
  "SNXUSD", "SOGNIUSD", "SOLUSD", "SOLUSDC", "SOLUSDT", "SONICUSD", "SOSOUSD", "SPELLUSD",
  "SPICEUSD", "SPKUSD", "SPXUSD", "SRMUSD", "SSVUSD", "STEPUSD", "STGUSD", "STORJUSD",
  "STRDUSD", "STRKUSD", "STXUSD", "SUIUSD", "SUNDOGUSD", "SUNUSD", "SUPERUSD", "SUSD",
  "SUSDC", "SUSDT", "SUSHIUSD", "SWARMSUSD", "SWEATUSD", "SWELLUSD", "SXTUSD", "SYNUSD",
  "SYRUPUSD", "TACUSD", "TANSSIUSD", "TAOUSD", "TBTCUSD", "TEERUSD", "TERMUSD", "TIAUSD",
  "TITCOINUSD", "TLMUSD", "TNSRUSD", "TOKENUSD", "TOKEUSD", "TONUSD", "TONUSDC", "TONUSDT",
  "TOSHIUSD", "TRACUSD", "TREEUSD", "TREMPUSD", "TRUMPUSD", "TRUMPUSDC", "TRUMPUSDT", "TRUUSD",
  "TRXUSD", "TURBOUSD", "TUSD", "TUSDUSD", "TVKUSD", "UFDUSD", "UMAUSD", "UNFIUSD",
  "UNITEUSD", "UNIUSD", "USD1USD", "USD1USDC", "USDCUSD", "USDCUSDT", "USDDUSD", "USDGUSD",
  "USDGUSDC", "USDGUSDT", "USDQUSD", "USDQUSDC", "USDQUSDT", "USDRUSD", "USDRUSDC", "USDRUSDT",
  "USDSUSD", "USDTUSD", "USDUCUSD", "USELESSUSD", "USTUSD", "USTUSDC", "USTUSDT", "USUALUSD",
  "VANRYUSD", "VELODROMEUSD", "VINEUSD", "VIRTUALUSD", "VIRTUALUSDC", "VIRTUALUSDT", "VSNUSD",
  "VVVUSD", "WALUSD", "WAXLUSD", "WBTCUSD", "WCTUSD", "WELLUSD", "WENUSD", "WIFUSD",
  "WINUSD", "WLDUSD", "WOOUSD", "WUSD", "XBTPYUSD", "XBTUSD", "XBTUSDC", "XBTUSDT",
  "XCNUSD", "XDGUSD", "XDGUSDC", "XDGUSDT", "XLMUSD", "XMRUSD", "XMRUSDC", "XMRUSDT",
  "XNYUSD", "XRPRLUSD", "XRPUSD", "XRPUSDC", "XRPUSDT", "XRTUSD", "XTERUSD", "XTZUSD",
  "XTZUSDC", "XTZUSDT", "XYOUSD", "YFIUSD", "YGGUSD", "ZECUSD", "ZEREBROUSD", "ZETAUSD",
  "ZEUSUSD", "ZEXUSD", "ZKUSD", "ZORAUSD", "ZROUSD", "ZRXUSD"
];

// HIGH LEVERAGE PAIRS (131 pairs with 2x-10x leverage support)
export const KRAKEN_LEVERAGE_MAP: Record<string, number> = {
  "AAVEUSD": 3, "ADAUSD": 3, "ADAUSDC": 4, "ADAUSDT": 4, "AEROUSD": 3, "ALGOUSD": 2, 
  "APEUSD": 3, "APTUSD": 4, "ARBUSD": 3, "ATOMUSD": 2, "AVAXUSD": 3, "AXSUSD": 3, 
  "BATUSD": 3, "BCHUSD": 3, "BLURUSD": 3, "BONKUSD": 3, "CHZUSD": 3, "COMPUSD": 3, 
  "CRVUSD": 3, "DAIUSD": 4, "DAIUSDT": 3, "DASHUSD": 3, "DOGUSD": 3, "DOTUSD": 3, 
  "DOTUSDC": 3, "DOTUSDT": 3, "DYDXUSD": 3, "EIGENUSD": 3, "ENAUSD": 3, "ENSUSD": 3, 
  "ETCUSD": 2, "ETHUSD": 10, "ETHUSDC": 10, "ETHUSDT": 10, "FARTCOINUSD": 3, "FETUSD": 3, 
  "FILUSD": 2, "FLOKIUSD": 3, "FLOWUSD": 3, "FLRUSD": 3, "GALAUSD": 3, "GOATUSD": 3, 
  "GRTUSD": 2, "ICPUSD": 3, "IMXUSD": 3, "INJUSD": 3, "JASMYUSD": 3, "JUPUSD": 3, 
  "KAITOUSD": 3, "KASUSD": 3, "KAVAUSD": 3, "KNCUSD": 3, "KSMUSD": 4, "LDOUSD": 4, 
  "LINKUSD": 3, "LINKUSDC": 3, "LINKUSDT": 3, "LRCUSD": 3, "LTCUSD": 3, "LTCUSDC": 3, 
  "LTCUSDT": 3, "MANAUSD": 4, "MELANIAUSD": 3, "MEWUSD": 3, "MINAUSD": 4, "MOGUSD": 3, 
  "MOODENGUSD": 3, "MORPHOUSD": 3, "NANOUSD": 3, "NEARUSD": 3, "OMGUSD": 2, "OMUSD": 3, 
  "ONDOUSD": 3, "OPUSD": 2, "PAXGUSD": 3, "PENGUUSD": 3, "PEPEUSD": 3, "POLUSD": 3, 
  "POPCATUSD": 3, "PUMPUSD": 3, "PYTHUSD": 3, "QTUMUSD": 3, "RAYUSD": 3, "RENDERUSD": 3, 
  "RUNEUSD": 3, "SAGAUSD": 3, "SANDUSD": 3, "SCUSD": 3, "SEIUSD": 3, "SHIBUSD": 3, 
  "SNXUSD": 2, "SOLUSD": 10, "SOLUSDC": 10, "SOLUSDT": 10, "SPXUSD": 3, "STRKUSD": 3, 
  "STXUSD": 3, "SUIUSD": 3, "SUSHIUSD": 3, "SYRUPUSD": 3, "TAOUSD": 3, "TIAUSD": 3, 
  "TONUSD": 3, "TRUMPUSD": 3, "TRXUSD": 3, "TURBOUSD": 3, "UNIUSD": 3, "USDCUSD": 3, 
  "USDCUSDT": 5, "USDTUSD": 2, "VIRTUALUSD": 3, "WIFUSD": 3, "WUSD": 3, "XBTUSD": 10, 
  "XBTUSDC": 10, "XBTUSDT": 10, "XCNUSD": 3, "XDGUSD": 10, "XDGUSDC": 10, "XDGUSDT": 10, 
  "XLMUSD": 2, "XMRUSD": 2, "XRPUSD": 10, "XRPUSDC": 10, "XRPUSDT": 10, "XTZUSD": 3, 
  "YFIUSD": 3, "ZECUSD": 2, "ZKUSD": 3, "ZROUSD": 3, "ZRXUSD": 3
};

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

// Generate structured pair data from Kraken pairs
export function generateCryptoPairs(): CryptoPair[] {
  return KRAKEN_USD_PAIRS.map(symbol => {
    const baseAsset = symbol.replace(/(USD|USDC|USDT)$/, '');
    const quoteMatch = symbol.match(/(USD|USDC|USDT)$/);
    const quoteAsset = quoteMatch ? quoteMatch[0] : 'USD';
    
    return {
      symbol,
      baseAsset,
      quoteAsset,
      displayName: `${baseAsset}/${quoteAsset}`,
      maxLeverage: KRAKEN_LEVERAGE_MAP[symbol] || 1,
      isActive: true,
      isPredatorTarget: PREDATOR_TARGET_PAIRS.includes(symbol)
    };
  });
}

// Main export for profit predator system
export const CRYPTO_TRADING_PAIRS = generateCryptoPairs();

// Quick access to high-leverage pairs for profit hunting
export const HIGH_LEVERAGE_PAIRS = CRYPTO_TRADING_PAIRS.filter(pair => pair.maxLeverage >= 3);

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

// Get specific pair data by symbol
export function getPairData(symbol: string): CryptoPair | undefined {
  return CRYPTO_TRADING_PAIRS.find(pair => pair.symbol === symbol);
}

// Get maximum leverage for a symbol
export function getMaxLeverage(symbol: string): number {
  return KRAKEN_LEVERAGE_MAP[symbol] || 1;
}

// Check if pair is a high-priority predator target
export function isPredatorTarget(symbol: string): boolean {
  return PREDATOR_TARGET_PAIRS.includes(symbol);
}

console.log(`🐅 QUANTUM FORGE™ Kraken Configuration Loaded:`);
console.log(`   📊 ${KRAKEN_USD_PAIRS.length} total USD trading pairs`);
console.log(`   💪 ${HIGH_LEVERAGE_PAIRS.length} high-leverage pairs (3x+)`);  
console.log(`   🎯 ${PREDATOR_TARGET_PAIRS.length} prime predator targets`);
console.log(`   ⚡ Ready for multi-pair profit hunting!`);