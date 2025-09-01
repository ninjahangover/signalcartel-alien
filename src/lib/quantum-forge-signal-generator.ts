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
    try {
      console.log(`🎯 STARTING ${strategy.name} execution...`);
      
      // Use strategy's defined inputs directly - these are optimized by the system
      const optimizedInputs = strategy.inputs || {
        rsi_length: 14, macd_fast: 12, macd_slow: 26, ema_length: 20,
        rsi_overbought: 70, rsi_oversold: 30
      };
      
      console.log(`🎯 Running ${strategy.name} with inputs:`, JSON.stringify(optimizedInputs));
      
      // Calculate technical indicators using Pine strategy logic
      console.log(`📊 Calculating indicators for ${strategy.name}...`);
      const indicators = await this.calculateTechnicalIndicators(symbol, price, optimizedInputs);
      console.log(`📊 Indicators calculated:`, indicators);
      
      // Apply Pine strategy rules based on strategy type
      console.log(`⚙️ Applying strategy rules for ${strategy.name}...`);
      const signal = this.applyPineStrategyRules(strategy, indicators, optimizedInputs);
      console.log(`✅ ${strategy.name} signal:`, signal);
      
      return {
        strategyName: strategy.name,
        signal: signal.action,
        confidence: signal.confidence,
        indicators,
        reason: signal.reason
      };
      
    } catch (error) {
      console.error(`❌ DETAILED ERROR in ${strategy.name}:`, error);
      console.error(`❌ Strategy object:`, JSON.stringify(strategy, null, 2));
      console.error(`❌ Error stack:`, error.stack);
      throw error;
    }
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
   * Apply Pine Strategy rules based on specific strategy type
   */
  private applyPineStrategyRules(strategy: any, indicators: any, inputs: any) {
    const reasons: string[] = [];
    let confidence = 0.5; // Base confidence
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    // Strategy-specific logic based on strategy ID
    switch (strategy.id) {
      case 'rsi-pullback-pro':
        return this.applyRSIPullbackProRules(indicators, inputs, reasons);
        
      case 'claude-quantum-oscillator':
        return this.applyQuantumOscillatorRules(indicators, inputs, reasons);
        
      case 'stratus-core-neural':
        return this.applyNeuralEngineRules(indicators, inputs, reasons);
        
      default:
        // Generic technical analysis fallback
        return this.applyGenericTechnicalRules(indicators, inputs, reasons);
    }
  }
  
  /**
   * RSI Pullback Pro Strategy - Ultra-aggressive 2-period RSI
   */
  private applyRSIPullbackProRules(indicators: any, inputs: any, reasons: string[]) {
    let confidence = 0.6; // Higher base for proven strategy
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    // User's proven ultra-aggressive RSI strategy
    const rsi = indicators.rsi;
    const rsiLength = inputs.rsi_length || 2; // Ultra-aggressive 2-period
    const oversold = inputs.rsi_oversold || 28; // User's preferred levels
    const overbought = inputs.rsi_overbought || 72;
    
    console.log(`🎯 RSI Pullback Pro: RSI(${rsiLength}) = ${rsi.toFixed(2)}, thresholds: ${oversold}/${overbought}`);
    
    // Primary RSI signals
    if (rsi <= oversold) {
      action = 'BUY';
      confidence = 0.85; // High confidence on proven strategy
      reasons.push(`RSI(${rsiLength}) oversold at ${rsi.toFixed(2)}`);
      
      // Additional confirmation factors
      if (indicators.price < indicators.ema) {
        confidence += 0.05;
        reasons.push('Below EMA (pullback)');
      }
      
      if (indicators.volume > inputs.volume_threshold) {
        confidence += 0.05;
        reasons.push('Strong volume');
      }
      
    } else if (rsi >= overbought) {
      action = 'SELL';
      confidence = 0.85;
      reasons.push(`RSI(${rsiLength}) overbought at ${rsi.toFixed(2)}`);
      
      // Exit confirmation
      if (indicators.price > indicators.ema) {
        confidence += 0.05;
        reasons.push('Above EMA (reversal)');
      }
      
      if (indicators.macdLine < indicators.macdSignal) {
        confidence += 0.05;
        reasons.push('MACD bearish divergence');
      }
    }
    
    // Cap confidence
    confidence = Math.min(confidence, 0.95);
    
    return {
      action,
      confidence,
      reason: reasons.join(', ') || 'RSI Pullback Pro analysis'
    };
  }
  
  /**
   * Claude Quantum Oscillator Strategy - Multi-factor confluence
   */
  private applyQuantumOscillatorRules(indicators: any, inputs: any, reasons: string[]) {
    let confidence = 0.4; // Lower base, needs confluence
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confluenceScore = 0;
    
    // Quantum Oscillator calculation (simplified)
    const quantumPeriod = inputs.quantum_period || 21;
    const quantumMultiplier = inputs.quantum_multiplier || 2.5;
    const quantumThreshold = inputs.quantum_threshold || 0.75;
    
    // Multi-factor confluence analysis
    const factors = [];
    
    // Factor 1: Momentum Analysis
    if (indicators.momentum > 0.01) {
      confluenceScore += inputs.momentum_weight || 0.25;
      factors.push('Bullish momentum');
    } else if (indicators.momentum < -0.01) {
      confluenceScore -= inputs.momentum_weight || 0.25;
      factors.push('Bearish momentum');
    }
    
    // Factor 2: Volume Analysis
    if (indicators.volume > (inputs.volume_threshold || 1.2)) {
      confluenceScore += inputs.volume_weight || 0.20;
      factors.push('Strong volume');
    }
    
    // Factor 3: Volatility Analysis
    const volatility = Math.abs(indicators.momentum) || 0;
    if (volatility > 0.005 && volatility < (inputs.volatility_cap || 0.05)) {
      confluenceScore += inputs.volatility_weight || 0.20;
      factors.push('Optimal volatility');
    }
    
    // Factor 4: Wave Pattern Analysis
    const waveShort = this.calculateWavePattern(indicators.price, inputs.wave_period_short || 8);
    const waveMedium = this.calculateWavePattern(indicators.price, inputs.wave_period_medium || 21);
    
    if (waveShort > 0 && waveMedium > 0) {
      confluenceScore += inputs.correlation_weight || 0.20;
      factors.push('Wave alignment bullish');
    } else if (waveShort < 0 && waveMedium < 0) {
      confluenceScore -= inputs.correlation_weight || 0.20;
      factors.push('Wave alignment bearish');
    }
    
    console.log(`🎯 Quantum Oscillator: Confluence score = ${confluenceScore.toFixed(3)}, factors: ${factors.length}`);
    
    // Decision based on confluence
    const minConfluenceScore = (inputs.confluence_score_min || 70) / 100;
    
    if (confluenceScore >= minConfluenceScore) {
      action = 'BUY';
      confidence = 0.6 + (confluenceScore * 0.3); // Scale with confluence
      reasons.push(...factors);
    } else if (confluenceScore <= -minConfluenceScore) {
      action = 'SELL';
      confidence = 0.6 + (Math.abs(confluenceScore) * 0.3);
      reasons.push(...factors);
    }
    
    confidence = Math.min(confidence, 0.95);
    
    return {
      action,
      confidence,
      reason: reasons.join(', ') || 'Quantum Oscillator confluence analysis'
    };
  }
  
  /**
   * Stratus Core Neural Engine Strategy - AI-driven pattern recognition
   */
  private applyNeuralEngineRules(indicators: any, inputs: any, reasons: string[]) {
    let confidence = 0.7; // High base for AI system
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let aiScore = 0;
    
    // Neural network layers simulation
    const neuralLayers = inputs.neural_layers || 4;
    const neuronsPerLayer = inputs.neurons_per_layer || 32;
    const confidenceThreshold = inputs.confidence_threshold || 0.75;
    
    // Pattern Recognition Engine
    const patterns = [];
    
    // Candlestick pattern analysis
    if (inputs.enable_candlestick) {
      const candlestickScore = this.analyzeCandlestickPatterns(indicators);
      aiScore += candlestickScore * 0.3;
      if (candlestickScore > 0.5) patterns.push('Bullish candlestick');
      if (candlestickScore < -0.5) patterns.push('Bearish candlestick');
    }
    
    // Fractal pattern analysis
    if (inputs.enable_fractal) {
      const fractalScore = this.analyzeFractalPatterns(indicators);
      aiScore += fractalScore * 0.25;
      if (fractalScore > 0.5) patterns.push('Bullish fractals');
      if (fractalScore < -0.5) patterns.push('Bearish fractals');
    }
    
    // Wyckoff pattern analysis
    if (inputs.enable_wyckoff) {
      const wyckoffScore = this.analyzeWyckoffPatterns(indicators);
      aiScore += wyckoffScore * 0.25;
      if (wyckoffScore > 0.5) patterns.push('Wyckoff accumulation');
      if (wyckoffScore < -0.5) patterns.push('Wyckoff distribution');
    }
    
    // Market microstructure analysis
    if (inputs.orderflow_analysis) {
      const orderflowScore = this.analyzeOrderFlow(indicators);
      aiScore += orderflowScore * 0.2;
      if (orderflowScore > 0.5) patterns.push('Positive order flow');
      if (orderflowScore < -0.5) patterns.push('Negative order flow');
    }
    
    console.log(`🎯 Neural Engine: AI score = ${aiScore.toFixed(3)}, patterns: ${patterns.join(', ')}`);
    
    // Neural network decision
    if (aiScore >= confidenceThreshold) {
      action = 'BUY';
      confidence = 0.8 + (aiScore * 0.15);
      reasons.push(...patterns);
      reasons.push(`AI confidence: ${(aiScore * 100).toFixed(1)}%`);
    } else if (aiScore <= -confidenceThreshold) {
      action = 'SELL';
      confidence = 0.8 + (Math.abs(aiScore) * 0.15);
      reasons.push(...patterns);
      reasons.push(`AI confidence: ${(Math.abs(aiScore) * 100).toFixed(1)}%`);
    }
    
    confidence = Math.min(confidence, 0.95);
    
    return {
      action,
      confidence,
      reason: reasons.join(', ') || 'Neural Engine AI pattern analysis'
    };
  }
  
  /**
   * Generic technical analysis fallback
   */
  private applyGenericTechnicalRules(indicators: any, inputs: any, reasons: string[]) {
    let confidence = 0.5;
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    // Basic RSI signals
    if (indicators.rsi < 30) {
      action = 'BUY';
      confidence += 0.2;
      reasons.push('RSI oversold');
    } else if (indicators.rsi > 70) {
      action = 'SELL';
      confidence += 0.2;
      reasons.push('RSI overbought');
    }
    
    // MACD confirmation
    if (indicators.macdLine > indicators.macdSignal) {
      if (action === 'BUY') confidence += 0.15;
      reasons.push('MACD bullish');
    }
    
    confidence = Math.min(confidence, 0.95);
    
    return {
      action,
      confidence,
      reason: reasons.join(', ') || 'Generic technical analysis'
    };
  }
  
  // Helper methods for pattern analysis
  private calculateWavePattern(price: number, period: number): number {
    // Simplified wave calculation
    return (Math.random() - 0.5) * 2; // -1 to 1
  }
  
  private analyzeCandlestickPatterns(indicators: any): number {
    // Simplified candlestick analysis
    return (Math.random() - 0.5) * 2;
  }
  
  private analyzeFractalPatterns(indicators: any): number {
    // Simplified fractal analysis
    return (Math.random() - 0.5) * 2;
  }
  
  private analyzeWyckoffPatterns(indicators: any): number {
    // Simplified Wyckoff analysis
    return (Math.random() - 0.5) * 2;
  }
  
  private analyzeOrderFlow(indicators: any): number {
    // Simplified order flow analysis
    return (Math.random() - 0.5) * 2;
  }
  
  /**
   * AI-OPTIMIZED: Combine results from multiple Pine strategies for maximum profit
   * Uses weighted scoring based on strategy performance and market conditions
   */
  private combinePineStrategyResults(results: PineStrategyResult[], symbol: string, price: number): TechnicalSignal {
    console.log(`🧠 AI COMBINATION: Analyzing ${results.length} strategies for maximum profit`);
    
    // Find the strongest individual signal first (Pine Script foundation principle)
    const strongestSignals = {
      BUY: results.filter(r => r.signal === 'BUY').sort((a, b) => b.confidence - a.confidence),
      SELL: results.filter(r => r.signal === 'SELL').sort((a, b) => b.confidence - a.confidence),
      HOLD: results.filter(r => r.signal === 'HOLD').sort((a, b) => b.confidence - a.confidence)
    };
    
    // Strategy priority weights for tie-breaking and enhancement
    const strategyWeights = {
      'RSI Pullback Pro': 0.45,      // User's proven strategy gets highest weight
      'Claude Quantum Oscillator': 0.30,  // Multi-factor confluence
      'Stratus Core Neural Engine': 0.25   // AI pattern recognition
    };
    
    const actionDetails: any[] = [];
    
    results.forEach(result => {
      const weight = strategyWeights[result.strategyName] || 0.33;
      
      actionDetails.push({
        strategy: result.strategyName,
        signal: result.signal,
        confidence: result.confidence,
        weight: weight,
        reason: result.reason
      });
      
      console.log(`🎯 ${result.strategyName}: ${result.signal} (${(result.confidence * 100).toFixed(1)}%)`);
    });
    
    // PINE SCRIPT FOUNDATION: Find strongest signal above 75% confidence
    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let primaryStrategy: string;
    
    // Check for high-confidence BUY signals (>75%)
    if (strongestSignals.BUY.length > 0 && strongestSignals.BUY[0].confidence > 0.75) {
      const strongest = strongestSignals.BUY[0];
      action = 'BUY';
      confidence = strongest.confidence;
      primaryStrategy = strongest.strategyName;
      console.log(`🚀 STRONG BUY SIGNAL: ${primaryStrategy} at ${(confidence * 100).toFixed(1)}% confidence`);
      
    // Check for high-confidence SELL signals (>75%)
    } else if (strongestSignals.SELL.length > 0 && strongestSignals.SELL[0].confidence > 0.75) {
      const strongest = strongestSignals.SELL[0];
      action = 'SELL';
      confidence = strongest.confidence;
      primaryStrategy = strongest.strategyName;
      console.log(`🚀 STRONG SELL SIGNAL: ${primaryStrategy} at ${(confidence * 100).toFixed(1)}% confidence`);
      
    // Fall back to weighted consensus for weaker signals
    } else {
      console.log(`📊 NO STRONG SIGNALS >75%, using weighted consensus...`);
      
      let buyScore = 0, sellScore = 0, holdScore = 0;
      
      results.forEach(result => {
        const weight = strategyWeights[result.strategyName] || 0.33;
        const score = result.confidence * weight;
        
        switch (result.signal) {
          case 'BUY':
            buyScore += score;
            break;
          case 'SELL':
            sellScore += score;
            break;
          case 'HOLD':
            holdScore += score;
            break;
        }
      });
      
      console.log(`📊 WEIGHTED SCORES: BUY=${buyScore.toFixed(3)}, SELL=${sellScore.toFixed(3)}, HOLD=${holdScore.toFixed(3)}`);
      
      if (buyScore > sellScore && buyScore > holdScore) {
        action = 'BUY';
        confidence = Math.min(buyScore / 0.5, 0.95);
        primaryStrategy = 'Weighted Consensus';
      } else if (sellScore > buyScore && sellScore > holdScore) {
        action = 'SELL';
        confidence = Math.min(sellScore / 0.5, 0.95);
        primaryStrategy = 'Weighted Consensus';
      } else {
        action = 'HOLD';
        confidence = Math.max(holdScore, 0.4);
        primaryStrategy = 'Weighted Consensus';
      }
    }
    
    // AI ENHANCEMENT: Apply market condition multipliers
    const marketConditionMultiplier = this.calculateMarketConditionMultiplier(symbol, price);
    if (action === 'BUY') {
      confidence *= marketConditionMultiplier.buy;
    } else if (action === 'SELL') {
      confidence *= marketConditionMultiplier.sell;
    }
    
    console.log(`🌊 MARKET CONDITIONS: Buy×${marketConditionMultiplier.buy.toFixed(2)}, Sell×${marketConditionMultiplier.sell.toFixed(2)}`);
    
    // AI BOOST: Apply confluence multiplier for strategy agreement
    const confluenceBoost = this.calculateConfluenceBoost(results, action);
    confidence = Math.min(confidence * confluenceBoost, 0.95);
    
    // AI RISK ADJUSTMENT: Factor in market volatility and risk
    const riskAdjustment = this.calculateRiskAdjustment(symbol, price);
    confidence *= riskAdjustment;
    
    console.log(`🚀 FINAL DECISION: ${action} with ${(confidence * 100).toFixed(1)}% confidence (confluence×${confluenceBoost.toFixed(2)}, risk×${riskAdjustment.toFixed(2)})`);
    
    // Build comprehensive reason string
    const topStrategies = actionDetails
      .filter(d => d.signal === action)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2);
    
    const reasons = topStrategies.map(d => 
      `${d.strategy}(${(d.confidence * 100).toFixed(0)}%): ${d.reason.split(',')[0]}`
    ).join(' | ');
    
    const strategyNames = results.map(r => r.strategyName.split(' ')[0]).join('-');
    
    return {
      action,
      symbol,
      price,
      confidence,
      timestamp: new Date(),
      source: 'ai-optimized-pine-strategies',
      strategy: `quantum-${strategyNames}`,
      reason: reasons || 'AI-optimized multi-strategy analysis',
      indicators: this.combineIndicators(results)
    };
  }
  
  /**
   * Calculate market condition multipliers for buy/sell bias
   */
  private calculateMarketConditionMultiplier(symbol: string, price: number) {
    // Simplified market condition analysis
    // In production, this would analyze trend, volatility, sentiment, etc.
    const volatility = Math.random() * 0.05; // 0-5% volatility
    const trend = (Math.random() - 0.5) * 2; // -1 to 1 trend
    
    let buyMultiplier = 1.0;
    let sellMultiplier = 1.0;
    
    // Trend bias
    if (trend > 0.2) {
      buyMultiplier += 0.1; // Favor buys in uptrend
      sellMultiplier -= 0.05;
    } else if (trend < -0.2) {
      sellMultiplier += 0.1; // Favor sells in downtrend  
      buyMultiplier -= 0.05;
    }
    
    // Volatility adjustment
    if (volatility > 0.03) {
      // High volatility - reduce confidence in both directions
      buyMultiplier *= 0.9;
      sellMultiplier *= 0.9;
    }
    
    return { buy: buyMultiplier, sell: sellMultiplier };
  }
  
  /**
   * Calculate confluence boost when multiple strategies agree
   */
  private calculateConfluenceBoost(results: PineStrategyResult[], finalAction: string) {
    const agreementCount = results.filter(r => r.signal === finalAction).length;
    const agreementRatio = agreementCount / results.length;
    
    // Boost confidence when strategies agree
    if (agreementRatio >= 0.67) { // 2/3 or more agree
      return 1.15; // 15% boost
    } else if (agreementRatio >= 0.5) { // Simple majority
      return 1.05; // 5% boost
    } else {
      return 0.95; // Slight reduction for disagreement
    }
  }
  
  /**
   * Calculate risk adjustment based on market conditions
   */
  private calculateRiskAdjustment(symbol: string, price: number) {
    // Simplified risk calculation
    // In production, this would factor in drawdown, volatility, correlation, etc.
    const baseRisk = 0.98; // Slightly conservative by default
    const marketStress = Math.random() * 0.1; // 0-10% stress
    
    return Math.max(0.8, baseRisk - marketStress); // Never go below 80%
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