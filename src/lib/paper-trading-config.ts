/**
 * SignalCartel Paper Trading Configuration
 * 
 * Centralized configuration for our custom paper trading platform
 * ENHANCED: Dual-currency support for USD + USDT trading
 */

export const PAPER_TRADING_CONFIG = {
  // Dual-Currency Account Settings
  STARTING_BALANCE_USD: 5000, // $5K USD balance
  STARTING_BALANCE_USDT: 5000, // $5K USDT balance  
  TOTAL_STARTING_BALANCE: 10000, // Combined $10K total
  
  MAX_POSITION_SIZE: 0.1, // 10% max position size per currency
  MAX_DAILY_TRADES: 50,
  
  // Trading Parameters - Enhanced for multi-pair support
  DEFAULT_USD_SYMBOLS: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'LINKUSD', 'ADAUSD'],
  DEFAULT_USDT_SYMBOLS: ['XBTUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'XDGUSDT'], // USDT preferred for liquidity
  ALL_PREDATOR_PAIRS: [], // Will be populated from crypto-trading-pairs.ts
  
  MIN_TRADE_SIZE: 10, // $10 minimum trade
  MAX_TRADE_SIZE: 500, // $500 maximum trade (reduced for dual currency)
  
  // Risk Management
  STOP_LOSS_PERCENTAGE: 5, // 5% stop loss
  TAKE_PROFIT_PERCENTAGE: 10, // 10% take profit
  MAX_DRAWDOWN: 20, // 20% max account drawdown
  
  // Strategy Settings
  CONFIDENCE_THRESHOLD: 0.7, // 70% minimum confidence for trades
  COOLDOWN_PERIOD: 60000, // 1 minute between trades per symbol
  
  // Display Settings
  CURRENCY_SYMBOL: '$',
  DECIMAL_PLACES: 2,
  
  // Alert Settings
  ALERT_ON_LARGE_TRADES: true,
  LARGE_TRADE_THRESHOLD: 500, // $500+
  ALERT_ON_LOSSES: true,
  LOSS_ALERT_THRESHOLD: 100, // $100+ loss
};

// Helper functions
export function formatCurrency(amount: number): string {
  return `${PAPER_TRADING_CONFIG.CURRENCY_SYMBOL}${amount.toFixed(PAPER_TRADING_CONFIG.DECIMAL_PLACES)}`;
}

// Dual-currency account management
export interface DualCurrencyBalance {
  usd: number;
  usdt: number;
  total: number;
}

export function getInitialBalance(): DualCurrencyBalance {
  return {
    usd: PAPER_TRADING_CONFIG.STARTING_BALANCE_USD,
    usdt: PAPER_TRADING_CONFIG.STARTING_BALANCE_USDT,
    total: PAPER_TRADING_CONFIG.TOTAL_STARTING_BALANCE
  };
}

export function calculateDualCurrencyPositionSize(balance: DualCurrencyBalance, pair: string, riskPercentage: number = 5): number {
  const isUSDTPair = pair.includes('USDT');
  const relevantBalance = isUSDTPair ? balance.usdt : balance.usd;
  
  return Math.min(
    relevantBalance * (riskPercentage / 100),
    relevantBalance * PAPER_TRADING_CONFIG.MAX_POSITION_SIZE
  );
}

export function isDualCurrencyTradeAllowed(tradeSize: number, balance: DualCurrencyBalance, pair: string): boolean {
  const isUSDTPair = pair.includes('USDT');
  const relevantBalance = isUSDTPair ? balance.usdt : balance.usd;
  
  return tradeSize >= PAPER_TRADING_CONFIG.MIN_TRADE_SIZE && 
         tradeSize <= PAPER_TRADING_CONFIG.MAX_TRADE_SIZE &&
         tradeSize <= relevantBalance * PAPER_TRADING_CONFIG.MAX_POSITION_SIZE;
}

export function calculatePositionSize(accountBalance: number, riskPercentage: number = 5): number {
  return Math.min(
    accountBalance * (riskPercentage / 100),
    accountBalance * PAPER_TRADING_CONFIG.MAX_POSITION_SIZE
  );
}

export function isTradeAllowed(tradeSize: number, accountBalance: number): boolean {
  return tradeSize >= PAPER_TRADING_CONFIG.MIN_TRADE_SIZE && 
         tradeSize <= PAPER_TRADING_CONFIG.MAX_TRADE_SIZE &&
         tradeSize <= accountBalance * PAPER_TRADING_CONFIG.MAX_POSITION_SIZE;
}

export default PAPER_TRADING_CONFIG;