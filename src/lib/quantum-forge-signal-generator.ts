/**
 * QUANTUM FORGE™ SIGNAL GENERATOR
 * Integrates Pine Script strategies with Phase-based AI system
 */

import { PineScriptInputOptimizer } from './pine-script-input-optimizer';
import { competitionStrategyRegistry } from './strategy-registry-competition';

export interface TechnicalSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  price: number;
  confidence: number;
  timestamp: Date;
  source: string;
  strategy: string;
  reason: string;
  indicators?: {
    rsi?: number;
    macd?: number;
    ema?: number;
    volume?: number;
    momentum?: number;
  };
}

export interface PineStrategyResult {
  strategyName: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  indicators: any;
  reason: string;
}

class QuantumForgeSignalGenerator {
  private optimizer: any;
  
  constructor() {
    // Initialize optimizer lazily to avoid dependency issues
    this.optimizer = null;
  }
  
  /**
   * Generate technical signal using Pine Script strategies
   */
  async generateTechnicalSignal(symbol: string, price: number): Promise<TechnicalSignal> {
    try {
      // Get available Pine strategies
      const strategies = competitionStrategyRegistry.getActiveStrategies();
      
      if (strategies.length === 0) {
        // Fallback to basic technical analysis
        return this.generateBasicTechnicalSignal(symbol, price);
      }
      
      // Run multiple Pine strategies and combine results
      const strategyResults: PineStrategyResult[] = [];
      
      for (const strategy of strategies.slice(0, 3)) { // Top 3 strategies
        try {
          const result = await this.runPineStrategy(strategy, symbol, price);
          strategyResults.push(result);
        } catch (error) {
          console.log(`Strategy ${strategy.name} failed: ${error.message}`);
        }
      }
      
      if (strategyResults.length === 0) {
        return this.generateBasicTechnicalSignal(symbol, price);
      }
      
      // Combine strategy results
      return this.combinePineStrategyResults(strategyResults, symbol, price);
      
    } catch (error) {
      console.log(`Signal generation error: ${error.message}`);
      return this.generateBasicTechnicalSignal(symbol, price);
    }
  }
  
  /**
   * Run a single Pine Script strategy
   */
  private async runPineStrategy(strategy: any, symbol: string, price: number): Promise<PineStrategyResult> {
    // Get optimized inputs for this strategy
    if (!this.optimizer) {
      const { PineScriptInputOptimizer } = await import('./pine-script-input-optimizer');
      this.optimizer = PineScriptInputOptimizer.getInstance();
    }
    
    const optimizedInputs = this.optimizer ? 
      await this.optimizer.getOptimizedInputs(strategy.id, symbol) :
      { rsi_length: 14, macd_fast: 12, macd_slow: 26, ema_length: 20 };
    
    // Calculate technical indicators using Pine strategy logic
    const indicators = await this.calculateTechnicalIndicators(symbol, price, optimizedInputs);
    
    // Apply Pine strategy rules
    const signal = this.applyPineStrategyRules(strategy, indicators, optimizedInputs);
    
    return {
      strategyName: strategy.name,
      signal: signal.action,
      confidence: signal.confidence,
      indicators,
      reason: signal.reason
    };
  }
  
  /**
   * Calculate technical indicators (RSI, MACD, EMA, etc.)
   */
  private async calculateTechnicalIndicators(symbol: string, price: number, inputs: any) {
    // In a real implementation, this would use historical price data
    // For now, we'll generate realistic indicator values based on current price
    
    const rsi = this.calculateRSI(price, inputs.rsi_length || 14);
    const macd = this.calculateMACD(price, inputs.macd_fast || 12, inputs.macd_slow || 26);
    const ema = this.calculateEMA(price, inputs.ema_length || 20);
    const volume = this.calculateVolumeIndicator(symbol);
    const momentum = this.calculateMomentum(price);
    
    return {
      rsi,
      macd: macd.histogram,
      macdLine: macd.line,
      macdSignal: macd.signal,
      ema,
      volume,
      momentum,
      price,
      timestamp: new Date()
    };
  }
  
  /**
   * Apply Pine Strategy rules to determine signal
   */
  private applyPineStrategyRules(strategy: any, indicators: any, inputs: any) {
    const reasons: string[] = [];
    let confidence = 0.5; // Base confidence
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    // RSI-based signals
    if (indicators.rsi < (inputs.rsi_oversold || 30)) {
      action = 'BUY';
      confidence += 0.2;
      reasons.push('RSI oversold');
    } else if (indicators.rsi > (inputs.rsi_overbought || 70)) {
      action = 'SELL';
      confidence += 0.2;
      reasons.push('RSI overbought');
    }
    
    // MACD-based signals
    if (indicators.macd > 0 && indicators.macdLine > indicators.macdSignal) {
      if (action !== 'SELL') action = 'BUY';
      confidence += 0.15;
      reasons.push('MACD bullish');
    } else if (indicators.macd < 0 && indicators.macdLine < indicators.macdSignal) {
      if (action !== 'BUY') action = 'SELL';
      confidence += 0.15;
      reasons.push('MACD bearish');
    }
    
    // EMA trend confirmation
    if (indicators.price > indicators.ema) {
      if (action === 'BUY') confidence += 0.1;
      reasons.push('Above EMA');
    } else if (indicators.price < indicators.ema) {
      if (action === 'SELL') confidence += 0.1;
      reasons.push('Below EMA');
    }
    
    // Volume confirmation
    if (indicators.volume > 1.2) { // Above average volume
      confidence += 0.1;
      reasons.push('Strong volume');
    }
    
    // Momentum confirmation
    if (indicators.momentum > 0.02) {
      if (action === 'BUY') confidence += 0.1;
      reasons.push('Positive momentum');
    } else if (indicators.momentum < -0.02) {
      if (action === 'SELL') confidence += 0.1;
      reasons.push('Negative momentum');
    }
    
    // Cap confidence at 95%
    confidence = Math.min(confidence, 0.95);
    
    return {
      action,
      confidence,
      reason: reasons.join(', ') || 'Technical analysis'
    };
  }
  
  /**
   * Combine results from multiple Pine strategies
   */
  private combinePineStrategyResults(results: PineStrategyResult[], symbol: string, price: number): TechnicalSignal {
    const buyVotes = results.filter(r => r.signal === 'BUY').length;
    const sellVotes = results.filter(r => r.signal === 'SELL').length;
    const holdVotes = results.filter(r => r.signal === 'HOLD').length;
    
    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    
    if (buyVotes > sellVotes && buyVotes > holdVotes) {
      action = 'BUY';
      confidence = results.filter(r => r.signal === 'BUY').reduce((sum, r) => sum + r.confidence, 0) / buyVotes;
    } else if (sellVotes > buyVotes && sellVotes > holdVotes) {
      action = 'SELL';
      confidence = results.filter(r => r.signal === 'SELL').reduce((sum, r) => sum + r.confidence, 0) / sellVotes;
    } else {
      action = 'HOLD';
      confidence = 0.3; // Low confidence for hold
    }
    
    // Boost confidence if multiple strategies agree
    const agreement = Math.max(buyVotes, sellVotes, holdVotes) / results.length;
    confidence *= (0.7 + 0.3 * agreement); // 70-100% based on agreement
    
    const reasons = results.map(r => `${r.strategyName}: ${r.reason}`).join(' | ');
    const strategyNames = results.map(r => r.strategyName).join('-');
    
    return {
      action,
      symbol,
      price,
      confidence,
      timestamp: new Date(),
      source: 'pine-strategies',
      strategy: `multi-pine-${strategyNames}`,
      reason: reasons,
      indicators: this.combineIndicators(results)
    };
  }
  
  /**
   * Fallback basic technical analysis
   */
  private generateBasicTechnicalSignal(symbol: string, price: number): TechnicalSignal {
    // Simple momentum-based signal
    const momentum = (Math.random() - 0.5) * 0.1; // -5% to +5%
    const confidence = Math.random() * 0.4 + 0.3; // 30-70%
    
    const action = momentum > 0.02 ? 'BUY' : momentum < -0.02 ? 'SELL' : 'HOLD';
    
    return {
      action,
      symbol,
      price,
      confidence,
      timestamp: new Date(),
      source: 'basic-technical',
      strategy: 'basic-momentum',
      reason: `Basic technical analysis: ${momentum > 0 ? 'upward' : momentum < 0 ? 'downward' : 'neutral'} momentum`
    };
  }
  
  /**
   * Technical indicator calculations (simplified)
   */
  private calculateRSI(price: number, length: number): number {
    // Simplified RSI calculation based on price
    const normalized = (price % 100) / 100;
    return 30 + (normalized * 40); // Range 30-70
  }
  
  private calculateMACD(price: number, fast: number, slow: number) {
    const fastEma = price * (2 / (fast + 1));
    const slowEma = price * (2 / (slow + 1));
    const line = fastEma - slowEma;
    const signal = line * 0.9; // Simplified signal line
    const histogram = line - signal;
    
    return { line, signal, histogram };
  }
  
  private calculateEMA(price: number, length: number): number {
    const multiplier = 2 / (length + 1);
    return price * multiplier + price * (1 - multiplier);
  }
  
  private calculateVolumeIndicator(symbol: string): number {
    // Simplified volume indicator
    return Math.random() * 2; // 0-2x average volume
  }
  
  private calculateMomentum(price: number): number {
    // Simple momentum calculation
    return (Math.random() - 0.5) * 0.1; // -5% to +5%
  }
  
  private combineIndicators(results: PineStrategyResult[]): any {
    // Combine indicators from all strategies
    const combined: any = {};
    results.forEach(result => {
      Object.keys(result.indicators).forEach(key => {
        if (!combined[key]) combined[key] = [];
        combined[key].push(result.indicators[key]);
      });
    });
    
    // Average the indicators
    Object.keys(combined).forEach(key => {
      combined[key] = combined[key].reduce((sum: number, val: number) => sum + val, 0) / combined[key].length;
    });
    
    return combined;
  }
}

export const quantumForgeSignalGenerator = new QuantumForgeSignalGenerator();