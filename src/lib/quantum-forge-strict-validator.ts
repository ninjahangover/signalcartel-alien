/**
 * QUANTUM FORGE™ Strict Validation System
 * 
 * This validator ensures ALL AI layers must agree before executing trades.
 * It prevents the runaway losses caused by bypassing proper validation.
 */

import { PrismaClient } from '@prisma/client';

export interface ValidationResult {
  passed: boolean;
  score: number;
  reasons: string[];
  blockers: string[];
  metadata: Record<string, any>;
}

export interface AILayerSignal {
  layer: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'SKIP';
  confidence: number;
  reasoning: string;
}

export class QuantumForgeStrictValidator {
  private static instance: QuantumForgeStrictValidator;
  private prisma: PrismaClient;
  
  // Trade frequency limiter
  private recentTrades: Map<string, Date[]> = new Map();
  private readonly MAX_TRADES_PER_HOUR = 50; // Down from 948!
  private readonly MIN_TRADE_INTERVAL_SECONDS = 60; // At least 1 minute between trades
  
  // Consensus requirements
  private readonly MIN_LAYER_AGREEMENT = 0.8; // 80% of layers must agree
  private readonly MIN_CONFIDENCE_CONSENSUS = 0.7; // Average confidence must be 70%+
  private readonly MAX_CONFIDENCE_SPREAD = 0.3; // Max 30% spread between layer confidences
  
  private constructor() {
    this.prisma = new PrismaClient();
  }
  
  static getInstance(): QuantumForgeStrictValidator {
    if (!this.instance) {
      this.instance = new QuantumForgeStrictValidator();
    }
    return this.instance;
  }
  
  /**
   * MAIN VALIDATION GATE - All trades must pass through here
   */
  async validateTrade(
    symbol: string,
    signals: AILayerSignal[],
    expectancy: number,
    recentWinRate: number
  ): Promise<ValidationResult> {
    const blockers: string[] = [];
    const reasons: string[] = [];
    let score = 0;
    
    console.log('🛡️ STRICT VALIDATOR: Beginning comprehensive validation');
    console.log(`   Symbol: ${symbol}`);
    console.log(`   AI Layers: ${signals.length}`);
    console.log(`   Expectancy: $${expectancy.toFixed(2)}`);
    console.log(`   Recent Win Rate: ${(recentWinRate * 100).toFixed(1)}%`);
    
    // 1. CHECK TRADE FREQUENCY LIMITS
    const frequencyCheck = this.checkTradeFrequency(symbol);
    if (!frequencyCheck.allowed) {
      blockers.push(`FREQUENCY: ${frequencyCheck.reason}`);
      console.log(`   ❌ ${frequencyCheck.reason}`);
    } else {
      score += 0.1;
      reasons.push('Trade frequency within limits');
    }
    
    // 2. CHECK EXPECTANCY (CRITICAL)
    if (expectancy < 0) {
      blockers.push(`EXPECTANCY: Negative expectancy $${expectancy.toFixed(2)}`);
      console.log(`   ❌ Negative expectancy - trade will lose money`);
    } else if (expectancy < 0.5) {
      blockers.push(`EXPECTANCY: Too low ($${expectancy.toFixed(2)} < $0.50 minimum)`);
      console.log(`   ⚠️ Low expectancy - high risk trade`);
    } else {
      score += 0.2;
      reasons.push(`Positive expectancy $${expectancy.toFixed(2)}`);
    }
    
    // 3. CHECK AI LAYER CONSENSUS
    const consensusCheck = this.checkLayerConsensus(signals);
    if (!consensusCheck.hasConsensus) {
      blockers.push(`CONSENSUS: ${consensusCheck.reason}`);
      console.log(`   ❌ ${consensusCheck.reason}`);
    } else {
      score += 0.3;
      reasons.push(`Strong consensus: ${consensusCheck.agreementRate.toFixed(1)}% agreement`);
    }
    
    // 4. CHECK CONFIDENCE LEVELS
    const confidenceCheck = this.checkConfidenceLevels(signals);
    if (!confidenceCheck.valid) {
      blockers.push(`CONFIDENCE: ${confidenceCheck.reason}`);
      console.log(`   ❌ ${confidenceCheck.reason}`);
    } else {
      score += 0.2;
      reasons.push(`Confidence validated: avg ${(confidenceCheck.avgConfidence * 100).toFixed(1)}%`);
    }
    
    // 5. CHECK WIN RATE TREND
    if (recentWinRate < 0.35) {
      blockers.push(`WIN_RATE: System performing poorly (${(recentWinRate * 100).toFixed(1)}% < 35% minimum)`);
      console.log(`   ❌ Win rate too low - system needs adjustment`);
    } else if (recentWinRate < 0.45) {
      console.log(`   ⚠️ Win rate below target (${(recentWinRate * 100).toFixed(1)}%)`);
      score += 0.1;
    } else {
      score += 0.2;
      reasons.push(`Acceptable win rate: ${(recentWinRate * 100).toFixed(1)}%`);
    }
    
    // 6. CHECK FOR CONFLICTING SIGNALS
    const conflicts = this.checkForConflicts(signals);
    if (conflicts.hasConflict) {
      blockers.push(`CONFLICT: ${conflicts.reason}`);
      console.log(`   ❌ ${conflicts.reason}`);
    }
    
    // FINAL DECISION
    const passed = blockers.length === 0 && score >= 0.6;
    
    console.log('🛡️ VALIDATION COMPLETE:');
    console.log(`   Score: ${(score * 100).toFixed(1)}%`);
    console.log(`   Passed: ${passed ? '✅ YES' : '❌ NO'}`);
    if (blockers.length > 0) {
      console.log(`   Blockers: ${blockers.join(', ')}`);
    }
    
    return {
      passed,
      score,
      reasons,
      blockers,
      metadata: {
        symbol,
        expectancy,
        winRate: recentWinRate,
        layerCount: signals.length,
        timestamp: new Date()
      }
    };
  }
  
  /**
   * Check if we're trading too frequently
   */
  private checkTradeFrequency(symbol: string): { allowed: boolean; reason?: string } {
    const now = new Date();
    const trades = this.recentTrades.get(symbol) || [];
    
    // Clean old trades (keep last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentTrades = trades.filter(t => t > oneHourAgo);
    this.recentTrades.set(symbol, recentTrades);
    
    // Check frequency limits
    if (recentTrades.length >= this.MAX_TRADES_PER_HOUR) {
      return {
        allowed: false,
        reason: `Too many trades (${recentTrades.length}/${this.MAX_TRADES_PER_HOUR} per hour)`
      };
    }
    
    // Check minimum interval
    if (recentTrades.length > 0) {
      const lastTrade = recentTrades[recentTrades.length - 1];
      const secondsSinceLastTrade = (now.getTime() - lastTrade.getTime()) / 1000;
      
      if (secondsSinceLastTrade < this.MIN_TRADE_INTERVAL_SECONDS) {
        return {
          allowed: false,
          reason: `Too soon since last trade (${secondsSinceLastTrade.toFixed(0)}s < ${this.MIN_TRADE_INTERVAL_SECONDS}s minimum)`
        };
      }
    }
    
    // Record this trade attempt
    recentTrades.push(now);
    this.recentTrades.set(symbol, recentTrades);
    
    return { allowed: true };
  }
  
  /**
   * Check if AI layers have consensus
   */
  private checkLayerConsensus(signals: AILayerSignal[]): {
    hasConsensus: boolean;
    agreementRate: number;
    reason?: string;
  } {
    if (signals.length < 3) {
      return {
        hasConsensus: false,
        agreementRate: 0,
        reason: 'Insufficient AI layers for consensus (need 3+)'
      };
    }
    
    // Count action agreements
    const actionCounts = new Map<string, number>();
    signals.forEach(signal => {
      const count = actionCounts.get(signal.action) || 0;
      actionCounts.set(signal.action, count + 1);
    });
    
    // Find dominant action
    let maxCount = 0;
    let dominantAction = '';
    actionCounts.forEach((count, action) => {
      if (count > maxCount) {
        maxCount = count;
        dominantAction = action;
      }
    });
    
    const agreementRate = (maxCount / signals.length) * 100;
    
    // Check if we have sufficient agreement
    if (agreementRate < this.MIN_LAYER_AGREEMENT * 100) {
      return {
        hasConsensus: false,
        agreementRate,
        reason: `Insufficient consensus (${agreementRate.toFixed(1)}% < ${this.MIN_LAYER_AGREEMENT * 100}% required)`
      };
    }
    
    // Don't allow SKIP or HOLD to have consensus for trading
    if (dominantAction === 'SKIP' || dominantAction === 'HOLD') {
      return {
        hasConsensus: false,
        agreementRate,
        reason: `Consensus is to ${dominantAction} - not a trade signal`
      };
    }
    
    return {
      hasConsensus: true,
      agreementRate
    };
  }
  
  /**
   * Check confidence levels across layers
   */
  private checkConfidenceLevels(signals: AILayerSignal[]): {
    valid: boolean;
    avgConfidence: number;
    reason?: string;
  } {
    if (signals.length === 0) {
      return {
        valid: false,
        avgConfidence: 0,
        reason: 'No signals to validate'
      };
    }
    
    const confidences = signals.map(s => s.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);
    const maxConfidence = Math.max(...confidences);
    const spread = maxConfidence - minConfidence;
    
    // Check average confidence
    if (avgConfidence < this.MIN_CONFIDENCE_CONSENSUS) {
      return {
        valid: false,
        avgConfidence,
        reason: `Average confidence too low (${(avgConfidence * 100).toFixed(1)}% < ${this.MIN_CONFIDENCE_CONSENSUS * 100}%)`
      };
    }
    
    // Check confidence spread
    if (spread > this.MAX_CONFIDENCE_SPREAD) {
      return {
        valid: false,
        avgConfidence,
        reason: `Confidence spread too high (${(spread * 100).toFixed(1)}% > ${this.MAX_CONFIDENCE_SPREAD * 100}% max)`
      };
    }
    
    // Cap unrealistic confidence
    if (maxConfidence > 0.95) {
      return {
        valid: false,
        avgConfidence,
        reason: `Unrealistic confidence detected (${(maxConfidence * 100).toFixed(1)}% > 95% max)`
      };
    }
    
    return {
      valid: true,
      avgConfidence
    };
  }
  
  /**
   * Check for conflicting signals between layers
   */
  private checkForConflicts(signals: AILayerSignal[]): {
    hasConflict: boolean;
    reason?: string;
  } {
    // Check if we have both BUY and SELL signals
    const hasBuy = signals.some(s => s.action === 'BUY');
    const hasSell = signals.some(s => s.action === 'SELL');
    
    if (hasBuy && hasSell) {
      return {
        hasConflict: true,
        reason: 'Conflicting BUY and SELL signals from different layers'
      };
    }
    
    // Check for high confidence conflicts
    const highConfidenceSignals = signals.filter(s => s.confidence > 0.7);
    if (highConfidenceSignals.length >= 2) {
      const actions = new Set(highConfidenceSignals.map(s => s.action));
      if (actions.size > 1) {
        return {
          hasConflict: true,
          reason: 'High confidence signals disagree on action'
        };
      }
    }
    
    return { hasConflict: false };
  }
  
  /**
   * Record trade execution for frequency tracking
   */
  recordTradeExecution(symbol: string): void {
    const trades = this.recentTrades.get(symbol) || [];
    trades.push(new Date());
    this.recentTrades.set(symbol, trades);
    
    console.log(`📝 Trade recorded for ${symbol}. Recent trades: ${trades.length}`);
  }
  
  /**
   * Get current trading statistics
   */
  getTradeStats(symbol: string): {
    tradesLastHour: number;
    lastTradeTime: Date | null;
    canTradeNow: boolean;
  } {
    const now = new Date();
    const trades = this.recentTrades.get(symbol) || [];
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentTrades = trades.filter(t => t > oneHourAgo);
    
    const lastTradeTime = recentTrades.length > 0 
      ? recentTrades[recentTrades.length - 1] 
      : null;
    
    const canTradeNow = recentTrades.length < this.MAX_TRADES_PER_HOUR &&
      (!lastTradeTime || (now.getTime() - lastTradeTime.getTime()) / 1000 >= this.MIN_TRADE_INTERVAL_SECONDS);
    
    return {
      tradesLastHour: recentTrades.length,
      lastTradeTime,
      canTradeNow
    };
  }
}

export default QuantumForgeStrictValidator;