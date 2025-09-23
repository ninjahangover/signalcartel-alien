// Breakout Evaluation System Configuration
// Runs parallel to main system on different ports

export const BREAKOUT_CONFIG = {
  // Different ports from main system
  DASHBOARD_PORT: 3005,  // Main uses 3004
  TENSOR_PORT: 5001,     // Main uses 5000
  PROXY_PORT: 3002,      // Main uses 3001

  // Separate database schema
  DATABASE_SCHEMA: 'breakout_eval',  // Main uses 'public'

  // Separate log directory
  LOG_DIR: '/tmp/breakout-logs/',

  // BREAKOUT EVALUATION RULES (1-Step Challenge)
  ACCOUNT_SIZE: 5000,
  PROFIT_TARGET: 500,          // 10% profit target

  // Drawdown Rules (EQUITY-BASED, includes floating P&L)
  DAILY_LOSS_LIMIT: 200,       // 4% of balance at 0030 UTC
  MAX_DRAWDOWN: 300,           // 6% static from starting balance

  // Challenge Requirements
  MIN_TRADING_DAYS: 5,
  MAX_EVALUATION_DAYS: 30,
  RESET_TIME_UTC: '00:30',     // Daily loss resets at 0030 UTC

  // Conservative for evaluation
  MAX_POSITION_SIZE: 100,      // $100 max per position
  MAX_POSITIONS: 3,            // Max 3 concurrent
  MIN_CONVICTION: 0.85,        // Higher threshold

  // Breakout API endpoints (if different credentials)
  USE_SEPARATE_API: false,     // Set true if using different Kraken account

  // System identification
  SYSTEM_ID: 'BREAKOUT-1STEP',
  VERSION: '1.0.0',

  // Account Type
  ACCOUNT_TYPE: '1-STEP',      // vs '2-STEP' which has different rules
  DRAWDOWN_TYPE: 'STATIC'      // 1-Step uses static, 2-Step uses trailing
};

export const RISK_LIMITS = {
  // Daily tracking
  dailyLossLimit: 200,
  currentDayPnL: 0,
  dailyLossBreached: false,

  // Total drawdown tracking
  maxDrawdown: 250,
  peakBalance: 5000,
  currentDrawdown: 0,
  drawdownBreached: false,

  // Auto-stop on limit breach
  autoStopEnabled: true,
  emergencyStop: false
};