/**
 * Adaptive Tensor Learning System
 * 
 * This system learns optimal thresholds through experience rather than hard-coded limits.
 * It adapts based on actual trading results and market conditions.
 */

export interface TradeOutcome {
  timestamp: Date;
  symbol: string;
  
  // Decision inputs
  informationContent: number;
  consensusStrength: number;
  expectedReturn: number;
  confidence: number;
  
  // Actual outcome
  actualReturn: number;
  profitable: boolean;
  
  // Market context
  volatility: number;
  phase: number;
}

export interface AdaptiveThresholds {
  informationThreshold: number;
  consensusThreshold: number;
  confidenceThreshold: number;
  minProfitThreshold: number;
  
  // Adaptive factors
  explorationRate: number;  // How much to explore vs exploit
  learningRate: number;     // How fast to adapt
}

export class AdaptiveTensorLearning {
  private outcomes: TradeOutcome[] = [];
  private thresholds: AdaptiveThresholds;
  private phaseThresholds: Map<number, AdaptiveThresholds> = new Map();
  
  // Performance tracking
  private recentWinRate: number = 0.5;
  private recentAvgReturn: number = 0;
  private tradingFrequency: number = 0;
  
  constructor() {
    // Start with very permissive thresholds - let the system learn what works
    this.thresholds = {
      informationThreshold: 0.1,    // Start very low
      consensusThreshold: 0.1,      // Start very low
      confidenceThreshold: 0.1,     // Start very low
      minProfitThreshold: 0.0042,   // Just cover commission initially
      
      explorationRate: 0.3,         // 30% exploration initially
      learningRate: 0.1              // 10% learning rate
    };
  }
  
  /**
   * Learn from a trade outcome and adjust thresholds
   */
  async learnFromOutcome(outcome: TradeOutcome): Promise<void> {
    this.outcomes.push(outcome);
    
    // Keep only recent outcomes (last 100 trades)
    if (this.outcomes.length > 100) {
      this.outcomes.shift();
    }
    
    // Calculate recent performance
    this.updatePerformanceMetrics();
    
    // Adapt thresholds based on performance
    await this.adaptThresholds(outcome);
    
    // Update phase-specific thresholds
    this.updatePhaseThresholds(outcome.phase);
  }
  
  /**
   * Get current adaptive thresholds for a given phase
   */
  getThresholds(phase: number): AdaptiveThresholds {
    // Get phase-specific thresholds if available
    const phaseSpecific = this.phaseThresholds.get(phase);
    if (phaseSpecific) {
      return this.applyExploration(phaseSpecific);
    }
    
    // Otherwise use global thresholds
    return this.applyExploration(this.thresholds);
  }
  
  /**
   * Apply exploration to thresholds (sometimes try different values)
   */
  private applyExploration(base: AdaptiveThresholds): AdaptiveThresholds {
    if (Math.random() < base.explorationRate) {
      // Exploration: randomly adjust thresholds to explore new strategies
      const exploration = Math.random() * 0.4 - 0.2; // ±20% exploration
      
      return {
        ...base,
        informationThreshold: Math.max(0.01, base.informationThreshold * (1 + exploration)),
        consensusThreshold: Math.max(0.01, base.consensusThreshold * (1 + exploration)),
        confidenceThreshold: Math.max(0.01, base.confidenceThreshold * (1 + exploration)),
        minProfitThreshold: Math.max(0.001, base.minProfitThreshold * (1 + exploration))
      };
    }
    
    return base;
  }
  
  /**
   * Adapt thresholds based on recent performance
   */
  private async adaptThresholds(lastOutcome: TradeOutcome): Promise<void> {
    const learningRate = this.thresholds.learningRate;
    
    if (lastOutcome.profitable) {
      // Trade was profitable - learn what made it work
      
      // If information content was high, slightly increase threshold toward it
      if (lastOutcome.informationContent > this.thresholds.informationThreshold) {
        this.thresholds.informationThreshold += 
          (lastOutcome.informationContent - this.thresholds.informationThreshold) * learningRate * 0.5;
      }
      
      // If consensus was strong, learn from it
      if (lastOutcome.consensusStrength > this.thresholds.consensusThreshold) {
        this.thresholds.consensusThreshold += 
          (lastOutcome.consensusStrength - this.thresholds.consensusThreshold) * learningRate * 0.5;
      }
      
      // Reduce exploration rate (we're finding good strategies)
      this.thresholds.explorationRate = Math.max(0.05, this.thresholds.explorationRate * 0.95);
      
    } else {
      // Trade was not profitable - adjust to avoid similar trades
      
      // If this trade barely met thresholds, raise them
      if (lastOutcome.informationContent < this.thresholds.informationThreshold * 1.2) {
        this.thresholds.informationThreshold *= (1 + learningRate);
      }
      
      if (lastOutcome.consensusStrength < this.thresholds.consensusThreshold * 1.2) {
        this.thresholds.consensusThreshold *= (1 + learningRate);
      }
      
      // Increase exploration rate (need to find better strategies)
      this.thresholds.explorationRate = Math.min(0.5, this.thresholds.explorationRate * 1.1);
    }
    
    // Adapt based on trading frequency
    if (this.tradingFrequency < 0.5) { // Less than 0.5 trades per hour
      // Too few trades - lower thresholds
      this.thresholds.informationThreshold *= 0.95;
      this.thresholds.consensusThreshold *= 0.95;
      this.thresholds.confidenceThreshold *= 0.95;
      
      console.log('📉 Lowering thresholds due to low trading frequency');
    } else if (this.tradingFrequency > 5 && this.recentWinRate < 0.4) {
      // Too many losing trades - raise thresholds
      this.thresholds.informationThreshold *= 1.1;
      this.thresholds.consensusThreshold *= 1.1;
      this.thresholds.confidenceThreshold *= 1.1;
      
      console.log('📈 Raising thresholds due to low win rate');
    }
    
    // Adapt profit threshold based on actual returns
    if (this.recentAvgReturn > 0) {
      // We're profitable - can be slightly more selective
      this.thresholds.minProfitThreshold = Math.min(
        this.recentAvgReturn * 0.3, // Aim for 30% of average return
        0.01 // Cap at 1%
      );
    } else {
      // Not profitable - need to be less selective
      this.thresholds.minProfitThreshold = Math.max(
        0.0042, // At least cover commission
        this.thresholds.minProfitThreshold * 0.9
      );
    }
    
    // Keep thresholds in reasonable bounds
    this.thresholds.informationThreshold = Math.max(0.01, Math.min(5, this.thresholds.informationThreshold));
    this.thresholds.consensusThreshold = Math.max(0.01, Math.min(0.9, this.thresholds.consensusThreshold));
    this.thresholds.confidenceThreshold = Math.max(0.01, Math.min(0.9, this.thresholds.confidenceThreshold));
    
    console.log(`🧠 Adaptive Thresholds Updated:
      Information: ${this.thresholds.informationThreshold.toFixed(2)} bits
      Consensus: ${(this.thresholds.consensusThreshold * 100).toFixed(1)}%
      Confidence: ${(this.thresholds.confidenceThreshold * 100).toFixed(1)}%
      Min Profit: ${(this.thresholds.minProfitThreshold * 100).toFixed(3)}%
      Exploration: ${(this.thresholds.explorationRate * 100).toFixed(1)}%`);
  }
  
  /**
   * Update performance metrics from recent outcomes
   */
  private updatePerformanceMetrics(): void {
    if (this.outcomes.length === 0) return;
    
    // Calculate metrics from recent trades
    const recent = this.outcomes.slice(-20); // Last 20 trades
    
    const wins = recent.filter(o => o.profitable).length;
    this.recentWinRate = wins / recent.length;
    
    const totalReturn = recent.reduce((sum, o) => sum + o.actualReturn, 0);
    this.recentAvgReturn = totalReturn / recent.length;
    
    // Calculate trading frequency (trades per hour)
    if (recent.length >= 2) {
      const timeSpan = recent[recent.length - 1].timestamp.getTime() - recent[0].timestamp.getTime();
      const hours = timeSpan / (1000 * 60 * 60);
      this.tradingFrequency = recent.length / Math.max(1, hours);
    }
  }
  
  /**
   * Update phase-specific thresholds
   */
  private updatePhaseThresholds(phase: number): void {
    // Get outcomes for this phase
    const phaseOutcomes = this.outcomes.filter(o => o.phase === phase);
    
    if (phaseOutcomes.length < 5) {
      // Not enough data for phase-specific learning
      return;
    }
    
    // Calculate phase-specific performance
    const wins = phaseOutcomes.filter(o => o.profitable).length;
    const phaseWinRate = wins / phaseOutcomes.length;
    
    // Initialize phase thresholds if needed
    if (!this.phaseThresholds.has(phase)) {
      this.phaseThresholds.set(phase, { ...this.thresholds });
    }
    
    const phaseThresholds = this.phaseThresholds.get(phase)!;
    
    // Adapt phase thresholds based on phase performance
    if (phaseWinRate > 0.6) {
      // This phase is working well - can be slightly more aggressive
      phaseThresholds.informationThreshold *= 0.95;
      phaseThresholds.consensusThreshold *= 0.95;
      phaseThresholds.explorationRate = Math.max(0.05, phaseThresholds.explorationRate * 0.9);
    } else if (phaseWinRate < 0.4) {
      // This phase needs more conservative thresholds
      phaseThresholds.informationThreshold *= 1.05;
      phaseThresholds.consensusThreshold *= 1.05;
      phaseThresholds.explorationRate = Math.min(0.5, phaseThresholds.explorationRate * 1.1);
    }
    
    console.log(`📊 Phase ${phase} Adaptive Learning:
      Win Rate: ${(phaseWinRate * 100).toFixed(1)}%
      Information: ${phaseThresholds.informationThreshold.toFixed(2)} bits
      Consensus: ${(phaseThresholds.consensusThreshold * 100).toFixed(1)}%`);
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    return {
      recentWinRate: this.recentWinRate,
      recentAvgReturn: this.recentAvgReturn,
      tradingFrequency: this.tradingFrequency,
      currentThresholds: this.thresholds,
      totalOutcomes: this.outcomes.length,
      phaseCount: this.phaseThresholds.size
    };
  }
}

// Singleton instance
export const adaptiveLearning = new AdaptiveTensorLearning();