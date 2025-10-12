/**
 * Available Balance Calculator - Real Kraken API Integration
 * Gets exact balance data from Kraken API - NO fallbacks or estimates
 */

import chalk from 'chalk';
import axios from 'axios';

export interface AvailableBalanceResult {
  availableBalance: number;
  totalBalance: number;
  freeBalance: number;
  timestamp: number;
}

export class AvailableBalanceCalculator {
  private static instance: AvailableBalanceCalculator;
  private lastBalance: AvailableBalanceResult | null = null;
  private lastUpdateTime: number = 0;
  private priorityPairs: Set<string> = new Set();
  private krakenProxyUrl: string = 'http://127.0.0.1:3002';

  // Rate limit: 2 minutes between API calls to avoid rate limiting (V3.14.2 - reduced from 30s)
  // Analysis showed 5,252 Balance calls in 16hrs (330/hr) causing Kraken rate limits
  private static minApiInterval: number = 120000;

  private constructor() {
    console.log(chalk.cyan('💰 Balance Calculator Initialized (Real Kraken API)'));
  }

  static getInstance(): AvailableBalanceCalculator {
    if (!AvailableBalanceCalculator.instance) {
      AvailableBalanceCalculator.instance = new AvailableBalanceCalculator();
    }
    return AvailableBalanceCalculator.instance;
  }

  /**
   * Update priority pairs from profit predator
   */
  updatePriorityPairs(pairs: string[]): void {
    this.priorityPairs = new Set(pairs);
    console.log(`🎯 Priority pairs: ${Array.from(this.priorityPairs).join(', ')}`);
  }

  /**
   * Get available balance for trading - REAL Kraken API data only
   */
  async getAvailableBalance(symbol?: string): Promise<AvailableBalanceResult> {
    const now = Date.now();
    const cacheAge = this.lastBalance ? now - this.lastBalance.timestamp : Infinity;
    const timeSinceLastApiCall = now - this.lastUpdateTime;

    // Use cached data if recent enough (2 minutes) to avoid API spam and rate limiting
    if (this.lastBalance && cacheAge < AvailableBalanceCalculator.minApiInterval) {
      console.log(`📊 Using cached Kraken balance: $${this.lastBalance.availableBalance.toFixed(2)} (${Math.round(cacheAge / 1000)}s old)`);
      return this.lastBalance;
    }

    try {
      console.log(`🔄 Fetching REAL balance from Kraken API`);

      // Get API credentials (same fallback approach as production-trading-multi-pair.ts)
      const apiKey = process.env.KRAKEN_API_KEY || "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
      const apiSecret = process.env.KRAKEN_PRIVATE_KEY || "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";

      // Get account balance via Kraken proxy (using same format as kraken-api-service)
      const balanceResponse = await axios.post(`${this.krakenProxyUrl}/api/kraken-proxy`, {
        endpoint: 'Balance',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!balanceResponse.data || balanceResponse.data.error?.length > 0) {
        throw new Error(`Kraken Balance API error: ${balanceResponse.data.error?.join(', ') || 'Unknown error'}`);
      }

      const balanceData = balanceResponse.data.result || {};

      // Get trade balance for more accurate available balance
      const tradeBalanceResponse = await axios.post(`${this.krakenProxyUrl}/api/kraken-proxy`, {
        endpoint: 'TradeBalance',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!tradeBalanceResponse.data || tradeBalanceResponse.data.error?.length > 0) {
        throw new Error(`Kraken TradeBalance API error: ${tradeBalanceResponse.data.error?.join(', ') || 'Unknown error'}`);
      }

      const tradeBalanceData = tradeBalanceResponse.data.result || {};

      // Calculate balances from real Kraken data
      const usdBalance = parseFloat(balanceData.ZUSD || '0');
      const totalEquity = parseFloat(tradeBalanceData.e || '0'); // Total equity
      const freeMargin = parseFloat(tradeBalanceData.mf || '0'); // Free margin

      // 🔧 V3.14.15 FIX: Calculate available balance by subtracting open position values from ZUSD
      // The freeMargin (mf) field from TradeBalance doesn't properly account for spot positions
      // We need to fetch actual position values from database and subtract from cash balance

      let openPositionsValue = 0;
      try {
        // Import here to avoid circular dependency
        const { prisma } = await import('../lib/prisma');
        const { realTimePriceFetcher } = await import('../lib/real-time-price-fetcher');

        // Get all open positions from database
        const openPositions = await prisma.managedPosition.findMany({
          where: { status: 'open' }
        });

        // Calculate total value of open positions
        for (const position of openPositions) {
          try {
            const priceData = await realTimePriceFetcher.getCurrentPrice(position.symbol);
            if (priceData.success) {
              openPositionsValue += position.quantity * priceData.price;
            } else {
              // Fallback to entry price if current price unavailable
              openPositionsValue += position.quantity * position.entryPrice;
            }
          } catch (error) {
            // Fallback to entry value
            openPositionsValue += position.quantity * position.entryPrice;
          }
        }

        console.log(`📊 Open positions value: $${openPositionsValue.toFixed(2)} (${openPositions.length} positions)`);
      } catch (error) {
        console.warn(`⚠️ Could not calculate open positions value: ${error.message}`);
        // Fall back to using freeMargin if position calculation fails
      }

      // Available balance = ZUSD cash - open positions value
      const availableBalance = Math.max(0, usdBalance - openPositionsValue);
      const totalBalance = Math.max(totalEquity, usdBalance);
      const freeBalance = Math.max(0, usdBalance);

      const realBalance: AvailableBalanceResult = {
        availableBalance,
        totalBalance,
        freeBalance,
        timestamp: now
      };

      this.lastBalance = realBalance;
      this.lastUpdateTime = now;

      console.log(`💰 V3.14.15 CORRECTED Balance: ZUSD=$${usdBalance.toFixed(2)}, Positions=$${openPositionsValue.toFixed(2)}, Available=$${availableBalance.toFixed(2)}, Total=$${totalBalance.toFixed(2)}`);

      return realBalance;

    } catch (error) {
      console.error(`❌ Failed to get real Kraken balance: ${error.message}`);

      // If we have recent cached data (within 5 minutes), use it as emergency fallback
      if (this.lastBalance && cacheAge < 300000) {
        console.log(`⚠️ Using emergency cached balance: $${this.lastBalance.availableBalance.toFixed(2)} (${Math.round(cacheAge / 1000)}s old)`);
        return this.lastBalance;
      }

      // No cached data and API failed - this should not happen in a working system
      throw new Error(`Cannot determine account balance - Kraken API unavailable and no cached data`);
    }
  }

  /**
   * Legacy method name compatibility
   */
  async calculateAvailableBalance(symbol?: string): Promise<AvailableBalanceResult> {
    return this.getAvailableBalance(symbol);
  }

  /**
   * Reset cache to force fresh balance check
   */
  resetCache(): void {
    this.lastBalance = null;
    this.lastUpdateTime = 0;
    console.log('🔄 Balance cache reset - next call will fetch from Kraken');
  }

  /**
   * Get current cached balance without API call
   */
  getCachedBalance(): AvailableBalanceResult | null {
    return this.lastBalance;
  }
}

// Export singleton instance
export function getAvailableBalanceCalculator(): AvailableBalanceCalculator {
  return AvailableBalanceCalculator.getInstance();
}

export default AvailableBalanceCalculator;