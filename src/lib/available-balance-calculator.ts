/**
 * Available Balance Calculator
 * Calculates actual available balance by subtracting open positions from total balance
 */

import { krakenApiService } from './kraken-api-service.js';
import { PositionManager, Position } from './position-management/position-manager.js';

export interface AvailableBalanceResult {
  totalBalance: number;
  openPositionsValue: number;
  availableBalance: number;
  openPositionsCount: number;
  confidenceThresholdAdjustment: number;
}

export class AvailableBalanceCalculator {
  private positionManager: PositionManager;
  private cachedBalance: AvailableBalanceResult | null = null;
  private lastBalanceUpdate: number = 0;
  private balanceCacheTime: number = 120000; // 2 minutes cache for non-priority pairs
  private priorityPairs: Set<string> = new Set();
  
  constructor(positionManager: PositionManager) {
    this.positionManager = positionManager;
  }

  /**
   * Update priority pairs from profit predator (only these get fresh Kraken API calls)
   */
  updatePriorityPairs(pairs: string[]) {
    this.priorityPairs = new Set(pairs);
    console.log(`🎯 Priority pairs for Kraken API: ${Array.from(this.priorityPairs).join(', ')}`);
  }

  /**
   * Calculate available balance for trading (cached for non-priority pairs)
   */
  async calculateAvailableBalance(symbol?: string): Promise<AvailableBalanceResult> {
    const now = Date.now();
    const isPriorityPair = !symbol || this.priorityPairs.has(symbol);
    
    // Use cached balance for non-priority pairs if cache is fresh
    if (!isPriorityPair && this.cachedBalance && (now - this.lastBalanceUpdate) < this.balanceCacheTime) {
      console.log(`💰 Using cached balance for ${symbol}: $${this.cachedBalance.availableBalance.toFixed(2)} (${Math.round((now - this.lastBalanceUpdate) / 1000)}s old)`);
      return this.cachedBalance;
    }

    try {
      // Only call Kraken API for priority pairs or when cache is stale
      const accountInfo = await krakenApiService.getAccountInfo();
      const totalBalance = parseFloat(accountInfo.balance?.ZUSD || '0');
      
      console.log(`💰 Kraken Balance ${isPriorityPair ? '(PRIORITY)' : '(CACHE REFRESH)'}: $${totalBalance.toFixed(2)} for ${symbol || 'system'}`);
      
      // Get all open positions
      const openPositions = await this.positionManager.getOpenPositions();
      
      // Calculate total value of open positions
      let openPositionsValue = 0;
      for (const position of openPositions) {
        const positionValue = Math.abs(position.quantity * position.entryPrice);
        openPositionsValue += positionValue;
        console.log(`📊 Open Position: ${position.symbol} ${position.side} $${positionValue.toFixed(2)}`);
      }
      
      // Calculate available balance
      const availableBalance = Math.max(0, totalBalance - openPositionsValue);
      
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
      
      // Fallback to conservative defaults
      return {
        totalBalance: 350, // Conservative fallback
        openPositionsValue: 0,
        availableBalance: 300, // Leave some buffer
        openPositionsCount: 0,
        confidenceThresholdAdjustment: 20 // High confidence required when uncertain
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
    cashRatio: number
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
    
    // Apply safety caps
    finalSize = Math.min(finalSize, availableBalance * 0.25); // Never more than 25% of available
    finalSize = Math.min(finalSize, 500); // Hard cap at $500 per position
    finalSize = Math.max(finalSize, 50);  // Minimum $50 per position
    
    console.log(`📊 Dynamic Position Sizing:
      Available Balance: $${availableBalance.toFixed(2)}
      Cash Ratio: ${(cashRatio * 100).toFixed(1)}%
      Base Percentage: ${(basePercentage * 100).toFixed(1)}%
      Base Size: $${baseSize.toFixed(2)}
      Confidence: ${confidence.toFixed(1)}% (×${confidenceMultiplier.toFixed(2)})
      Predicted Move: ${predictedMove.toFixed(3)}% (×${moveMultiplier.toFixed(2)})
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
}

// Export singleton instance
let availableBalanceCalculator: AvailableBalanceCalculator | null = null;

export function getAvailableBalanceCalculator(positionManager: PositionManager): AvailableBalanceCalculator {
  if (!availableBalanceCalculator) {
    availableBalanceCalculator = new AvailableBalanceCalculator(positionManager);
  }
  return availableBalanceCalculator;
}