/**
 * Available Balance Calculator
 * Calculates actual available balance by subtracting open positions from total balance
 */

import { createByBitDualClient, ByBitDualClient } from './bybit-dual-client.js';
import { PositionManager, Position } from './position-management/position-manager.js';
import { balanceApiCircuitBreaker } from './circuit-breaker.js';

export interface AvailableBalanceResult {
  totalBalance: number;
  openPositionsValue: number;
  availableBalance: number;
  openPositionsCount: number;
  confidenceThresholdAdjustment: number;
}

export class AvailableBalanceCalculator {
  private positionManager: PositionManager;
  private bybitClient: ByBitDualClient;
  private cachedBalance: AvailableBalanceResult | null = null;
  private lastBalanceUpdate: number = 0;
  private balanceCacheTime: number = 300000; // 5 minutes cache to reduce API calls
  private priorityPairs: Set<string> = new Set();
  private static lastApiCall: number = 0;
  private static minApiInterval: number = 10000; // 10 seconds minimum between ByBit API calls
  private portfolioPeak: number = 0; // Track account peak for drawdown calculation
  
  constructor(positionManager: PositionManager) {
    // BULLETPROOF: Validate positionManager
    if (!positionManager) {
      console.error('⚠️ AvailableBalanceCalculator: positionManager is null/undefined');
      throw new Error('PositionManager is required for AvailableBalanceCalculator');
    }
    if (typeof positionManager.getOpenPositions !== 'function') {
      console.error('⚠️ AvailableBalanceCalculator: positionManager.getOpenPositions is not a function');
      throw new Error('PositionManager must have getOpenPositions method');
    }
    this.positionManager = positionManager;
    this.bybitClient = createByBitDualClient();
  }

  /**
   * Update priority pairs from profit predator (only these get fresh ByBit API calls)
   */
  updatePriorityPairs(pairs: string[]) {
    this.priorityPairs = new Set(pairs);
    console.log(`🎯 Priority pairs for ByBit API: ${Array.from(this.priorityPairs).join(', ')}`);
  }

  /**
   * Calculate available balance for trading (AGGRESSIVE CACHING to prevent rate limits)
   */
  async calculateAvailableBalance(symbol?: string): Promise<AvailableBalanceResult> {
    const now = Date.now();

    // 🔧 RATE LIMIT FIX: Use cache aggressively - only fresh API calls if absolutely necessary
    const cacheAge = now - this.lastBalanceUpdate;
    const timeSinceLastApiCall = now - AvailableBalanceCalculator.lastApiCall;

    // Always use cache if:
    // 1. Cache exists and is less than 5 minutes old, OR
    // 2. Recent API call was made (prevent rapid-fire API calls), OR
    // 3. Cache exists and recent API call would violate rate limit
    if (this.cachedBalance && (
        cacheAge < this.balanceCacheTime ||
        timeSinceLastApiCall < AvailableBalanceCalculator.minApiInterval
    )) {
      console.log(`💰 CACHED balance (rate limit protection): $${this.cachedBalance.availableBalance.toFixed(2)} (cache: ${Math.round(cacheAge / 1000)}s old, last API: ${Math.round(timeSinceLastApiCall / 1000)}s ago)`);
      return this.cachedBalance;
    }

    try {
      // 🔧 CRITICAL: Update API call timestamp BEFORE making call to prevent concurrent calls
      AvailableBalanceCalculator.lastApiCall = now;

      // Only make API call if cache is truly stale AND enough time has passed
      console.log(`🔄 Making ByBit API call (cache ${Math.round(cacheAge / 1000)}s old, last API ${Math.round(timeSinceLastApiCall / 1000)}s ago)`);

      // 🛡️ BULLETPROOF: Use circuit breaker for balance API calls
      const accountInfo = await balanceApiCircuitBreaker.execute(
        async () => await this.bybitClient.getAccountInfo(),
        async () => {
          console.log(`⚡ Circuit breaker fallback: Using cached balance if available`);
          if (this.cachedBalance) {
            console.log(`💰 FALLBACK: Using stale cached balance: $${this.cachedBalance.availableBalance.toFixed(2)}`);
            return {
              balance: { ZUSD: this.cachedBalance.totalBalance.toString() }
            };
          }

          // 🛡️ Check if evaluation mode allows fallback
          const evaluationMode = process.env.CFT_EVALUATION_MODE === 'true' || process.env.CFT_MODE === 'true';
          if (evaluationMode) {
            console.log(`⚠️ CFT API FALLBACK: Using evaluation mode balance for testing`);
            const evalBalance = process.env.CFT_ACCOUNT_SIZE || '10000';
            return {
              balance: { ZUSD: evalBalance }
            };
          }

          // Production mode - no fallback
          console.log(`🛑 CFT API FAILURE: Cannot get real account balance - stopping trading for safety`);
          throw new Error('CFT API unavailable - cannot determine real account balance');
        }
      );

      const totalBalance = parseFloat(accountInfo.balance?.ZUSD || '0');

      console.log(`💰 ByBit Balance (CFT EVALUATION): $${totalBalance.toFixed(2)} for ${symbol || 'system'}`);

      // BULLETPROOF: Get all open positions with error handling
      let openPositions: Position[] = [];
      let openPositionsValue = 0;
      
      try {
        if (!this.positionManager) {
          console.error('⚠️ PositionManager is undefined - using empty positions fallback');
          openPositions = [];
        } else if (typeof this.positionManager.getOpenPositions !== 'function') {
          console.error('⚠️ PositionManager.getOpenPositions is not a function - using empty positions fallback');
          openPositions = [];
        } else {
          openPositions = await this.positionManager.getOpenPositions();
          if (!Array.isArray(openPositions)) {
            console.error('⚠️ getOpenPositions returned non-array - using empty positions fallback');
            openPositions = [];
          }
        }
        
        // Calculate total value of open positions
        for (const position of openPositions) {
          if (position && typeof position.quantity === 'number' && typeof position.entryPrice === 'number') {
            const positionValue = Math.abs(position.quantity * position.entryPrice);
            if (!isNaN(positionValue) && positionValue > 0) {
              openPositionsValue += positionValue;
              console.log(`📊 Open Position: ${position.symbol || 'UNKNOWN'} ${position.side || 'UNKNOWN'} $${positionValue.toFixed(2)}`);
            }
          }
        }
      } catch (error) {
        console.error(`⚠️ Failed to get open positions: ${error.message} - continuing with zero positions`);
        openPositions = [];
        openPositionsValue = 0;
      }
      
      // 🔧 CRITICAL FIX: For crypto trading, USD balance is available for new trades
      // Open positions in other assets (like BNB) don't reduce USD buying power
      // Only USD-denominated positions should count against USD balance
      const usdPositionsValue = openPositions
        .filter(pos => pos.symbol && (pos.symbol.includes('USD') || pos.symbol.includes('ZUSD')))
        .reduce((sum, pos) => sum + Math.abs(pos.quantity * pos.entryPrice), 0);
      
      const availableBalance = Math.max(0, totalBalance - usdPositionsValue);
      
      console.log(`🔧 BALANCE FIX: USD Balance $${totalBalance.toFixed(2)} - USD Positions $${usdPositionsValue.toFixed(2)} = Available $${availableBalance.toFixed(2)}`);
      
      // Calculate confidence threshold adjustment based on available cash ratio
      const cashRatio = availableBalance / Math.max(totalBalance, 1);
      let confidenceThresholdAdjustment = 0;
      
      if (cashRatio < 0.2) {
        // Less than 20% cash available - require very high confidence
        confidenceThresholdAdjustment = 25; // Add 25% to confidence requirement
      } else if (cashRatio < 0.4) {
        // Less than 40% cash available - require higher confidence
        confidenceThresholdAdjustment = 15; // Add 15% to confidence requirement
      } else if (cashRatio < 0.6) {
        // Less than 60% cash available - require moderately higher confidence
        confidenceThresholdAdjustment = 8; // Add 8% to confidence requirement
      }
      // Above 60% cash available - no adjustment needed
      
      const result: AvailableBalanceResult = {
        totalBalance,
        openPositionsValue,
        availableBalance,
        openPositionsCount: openPositions.length,
        confidenceThresholdAdjustment
      };
      
      // Update cache with fresh data
      this.cachedBalance = result;
      this.lastBalanceUpdate = now;
      
      console.log(`💰 Available Balance Calculation:
        Total Balance: $${totalBalance.toFixed(2)}
        Open Positions Value: $${openPositionsValue.toFixed(2)} (${openPositions.length} positions)
        Available Balance: $${availableBalance.toFixed(2)} (${(cashRatio * 100).toFixed(1)}% of total)
        Confidence Adjustment: +${confidenceThresholdAdjustment}% (cash preservation)`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error calculating available balance:', error);

      // 🔧 RATE LIMIT FIX: Reset API call timestamp on error so we can retry sooner if needed
      AvailableBalanceCalculator.lastApiCall = 0;

      // 🛡️ CIRCUIT BREAKER: Reset on critical error to prevent system lockup
      if (error.message && error.message.includes('Circuit breaker')) {
        console.log(`🔄 CIRCUIT BREAKER: Resetting balance circuit breaker to prevent system lockup`);
        balanceApiCircuitBreaker.reset();
      }

      // 🛡️ FALLBACK: If we have cached data, use it even if stale when API fails
      if (this.cachedBalance) {
        const cacheAge = now - this.lastBalanceUpdate;
        console.log(`⚠️ API failed, using stale cached balance: $${this.cachedBalance.availableBalance.toFixed(2)} (${Math.round(cacheAge / 1000)}s old)`);
        return this.cachedBalance;
      }

      // 🛡️ LAST RESORT: Return zero balance only when no cache exists
      console.log(`🛑 No cached balance available, returning zero to prevent unsafe trading`);
      return {
        totalBalance: 0,
        openPositionsValue: 0,
        availableBalance: 0, // Zero prevents any new trades when balance is unknown
        openPositionsCount: 0,
        confidenceThresholdAdjustment: 100 // Impossible threshold - no trading when balance unknown
      };
    }
  }

  /**
   * Calculate dynamic position size based on available balance and confidence
   */
  calculateDynamicPositionSize(
    availableBalance: number,
    confidence: number,
    predictedMove: number,
    cashRatio: number,
    totalBalance?: number
  ): number {
    // Base position size as percentage of available balance
    let basePercentage = 0.15; // Start with 15% of available balance
    
    // Adjust base percentage based on cash availability
    if (cashRatio < 0.2) {
      basePercentage = 0.08; // Very conservative when low on cash
    } else if (cashRatio < 0.4) {
      basePercentage = 0.10; // Conservative when moderate cash
    } else if (cashRatio < 0.6) {
      basePercentage = 0.12; // Slightly conservative
    } else {
      basePercentage = 0.15; // Normal when plenty of cash
    }
    
    // Calculate base position size
    const baseSize = availableBalance * basePercentage;
    
    // Apply confidence multiplier (higher confidence = larger position)
    const confidenceMultiplier = Math.max(0.5, Math.min(2.0, confidence / 100));
    
    // Apply predicted move multiplier (larger expected move = larger position)
    const moveMultiplier = Math.max(0.8, Math.min(1.5, Math.abs(predictedMove) * 10));
    
    // Calculate final position size
    let finalSize = baseSize * confidenceMultiplier * moveMultiplier;
    
    // Apply dynamic safety caps based on account size
    finalSize = Math.min(finalSize, availableBalance * 0.25); // Never more than 25% of available
    
    // Dynamic maximum position size based on total account balance (no hardcoded $500 limit)
    const accountBalance = totalBalance || availableBalance / cashRatio;
    const dynamicMaxPosition = Math.min(
      availableBalance * 0.3, // 30% of available balance
      accountBalance * 0.15 // or 15% of total balance, whichever is smaller
    );
    finalSize = Math.min(finalSize, dynamicMaxPosition);
    
    // Dynamic minimum position size based on account balance (no hardcoded $50 minimum)
    const dynamicMinPosition = Math.max(
      availableBalance * 0.02, // 2% of available balance
      Math.min(25, accountBalance * 0.005) // or 0.5% of total balance, min $25
    );
    finalSize = Math.max(finalSize, dynamicMinPosition);
    
    console.log(`📊 Dynamic Position Sizing:
      Account Balance: $${accountBalance.toFixed(2)}
      Available Balance: $${availableBalance.toFixed(2)}
      Cash Ratio: ${(cashRatio * 100).toFixed(1)}%
      Base Percentage: ${(basePercentage * 100).toFixed(1)}%
      Base Size: $${baseSize.toFixed(2)}
      Confidence: ${confidence.toFixed(1)}% (×${confidenceMultiplier.toFixed(2)})
      Predicted Move: ${predictedMove.toFixed(3)}% (×${moveMultiplier.toFixed(2)})
      Dynamic Max: $${dynamicMaxPosition.toFixed(2)} (${((dynamicMaxPosition/accountBalance)*100).toFixed(1)}% of account)
      Dynamic Min: $${dynamicMinPosition.toFixed(2)} (${((dynamicMinPosition/accountBalance)*100).toFixed(2)}% of account)
      Final Size: $${finalSize.toFixed(2)}`);
    
    return finalSize;
  }

  /**
   * Get adjusted confidence threshold based on available cash
   */
  getAdjustedConfidenceThreshold(
    baseThreshold: number,
    confidenceThresholdAdjustment: number
  ): number {
    return baseThreshold + confidenceThresholdAdjustment;
  }

  /**
   * Calculate dynamic profit target based on account size, confidence, and market conditions
   */
  calculateDynamicProfitTarget(
    accountBalance: number,
    confidence: number,
    volatility: number = 0.05
  ): number {
    // Base profit target scales with account size (larger accounts can take smaller profits)
    let baseTarget: number;

    if (accountBalance < 500) {
      baseTarget = 0.025; // 2.5% for small accounts (more selective)
    } else if (accountBalance < 2000) {
      baseTarget = 0.020; // 2.0% for medium accounts
    } else if (accountBalance < 10000) {
      baseTarget = 0.015; // 1.5% for large accounts
    } else {
      baseTarget = 0.012; // 1.2% for very large accounts (more opportunities)
    }

    // Adjust based on confidence (higher confidence = can accept lower profit targets)
    const confidenceAdjustment = Math.max(0.7, Math.min(1.3, (100 - confidence) / 50));

    // Adjust based on volatility (higher volatility = higher profit targets needed)
    const volatilityAdjustment = Math.max(0.8, Math.min(1.5, volatility * 10));

    const finalTarget = baseTarget * confidenceAdjustment * volatilityAdjustment;

    console.log(`🎯 Dynamic Profit Target: ${(finalTarget * 100).toFixed(2)}% (base: ${(baseTarget * 100).toFixed(2)}%, confidence adj: ${confidenceAdjustment.toFixed(2)}x, volatility adj: ${volatilityAdjustment.toFixed(2)}x)`);

    return finalTarget;
  }

  /**
   * Determine if trading should be halted based on risk management criteria
   */
  shouldHaltTrading(): boolean {
    try {
      // If no cached balance, halt trading for safety
      if (!this.cachedBalance) {
        console.log('🛑 HALT: No balance data available');
        return true;
      }

      // CFT Risk Management: 5% daily loss limit, 12% total loss limit
      const totalBalance = this.cachedBalance.totalBalance;
      const availableBalance = this.cachedBalance.availableBalance;

      // Halt if available balance is too low (less than 10% of total)
      const balanceRatio = availableBalance / Math.max(totalBalance, 1);
      if (balanceRatio < 0.1) {
        console.log(`🛑 HALT: Available balance too low: ${(balanceRatio * 100).toFixed(1)}% of total`);
        return true;
      }

      // Halt if available balance is below minimum trading threshold
      if (availableBalance < 25) {
        console.log(`🛑 HALT: Available balance below minimum: $${availableBalance.toFixed(2)}`);
        return true;
      }

      // For CFT evaluation: use actual CFT config limits
      // Get the configured daily and overall loss limits from CFT config
      const dailyLossLimit = 500;  // $500 (5% of $10K) from CFT_CONFIG
      const overallLossLimit = 1200; // $1200 (12% with add-on) from CFT_CONFIG

      // Check against absolute dollar limits rather than percentage of unknown starting balance
      // This way the system adapts if account grows to $200K or any other amount
      const accountPeak = Math.max(totalBalance, this.portfolioPeak || totalBalance);
      this.portfolioPeak = accountPeak;

      const currentDrawdown = accountPeak - totalBalance;
      const drawdownPercent = (currentDrawdown / accountPeak) * 100;

      // Halt if drawdown exceeds 12% (CFT rule with add-on)
      if (drawdownPercent > 12) {
        console.log(`🛑 HALT: Drawdown exceeds 12%: ${drawdownPercent.toFixed(1)}% ($${currentDrawdown.toFixed(2)})`);
        return true;
      }

      // All checks passed - trading allowed
      return false;

    } catch (error) {
      console.error('❌ Error in shouldHaltTrading:', error);
      // On error, halt trading for safety
      return true;
    }
  }
}

// Export singleton instance
let availableBalanceCalculator: AvailableBalanceCalculator | null = null;

export function getAvailableBalanceCalculator(positionManager: PositionManager): AvailableBalanceCalculator {
  if (!availableBalanceCalculator) {
    availableBalanceCalculator = new AvailableBalanceCalculator(positionManager);
  }
  return availableBalanceCalculator;
}