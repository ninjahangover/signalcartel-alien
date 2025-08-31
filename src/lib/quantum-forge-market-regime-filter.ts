/**
 * QUANTUM FORGE™ Market Regime Filter
 * 
 * Experimental feature for Dev1 testing against Dev2 baseline
 * Adds technical pattern recognition and dynamic position sizing
 */

// Using console for logging - no separate logger module needed

interface MarketConditions {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  volume: { current: number; average: number; ratio: number };
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  orderBookPressure: number;
  sentimentScore: number;
}

interface TechnicalPattern {
  pattern: string;
  reliability: number;
  timeframe: string;
  confidence: number;
}

export class MarketRegimeFilter {
  private readonly positionLimits = {
    excellent: 10,    // Market score > 85%
    good: 5,          // Market score 70-85%
    neutral: 3,       // Market score 55-70%
    caution: 1,       // Market score 40-55%
    stop: 0           // Market score < 40%
  };

  private readonly technicalPatterns = {
    // Bullish patterns
    bullFlag: { reliability: 0.75, minConfidence: 0.65 },
    morningstar: { reliability: 0.72, minConfidence: 0.60 },
    goldenCross: { reliability: 0.78, minConfidence: 0.70 },
    
    // Bearish patterns
    bearFlag: { reliability: 0.74, minConfidence: 0.65 },
    eveningStar: { reliability: 0.71, minConfidence: 0.60 },
    deathCross: { reliability: 0.77, minConfidence: 0.70 },
    
    // Neutral patterns
    doji: { reliability: 0.65, minConfidence: 0.55 },
    insideBar: { reliability: 0.68, minConfidence: 0.58 }
  };

  /**
   * Calculate composite market score from multiple indicators
   */
  async calculateMarketScore(conditions: MarketConditions): Promise<number> {
    const weights = {
      technical: 0.30,
      sentiment: 0.25,
      orderBook: 0.25,
      volume: 0.10,
      volatility: 0.10
    };

    // Technical score (RSI + MACD)
    const technicalScore = this.calculateTechnicalScore(conditions.rsi, conditions.macd);
    
    // Volume score (higher is better for confirmation)
    const volumeScore = Math.min(conditions.volume.ratio, 2) / 2;
    
    // Volatility score (lower is better for stability)
    const volatilityScore = conditions.volatility < 0.02 ? 1 : 
                            conditions.volatility < 0.05 ? 0.7 : 
                            conditions.volatility < 0.10 ? 0.4 : 0.2;
    
    // Weighted composite
    const marketScore = (
      technicalScore * weights.technical +
      conditions.sentimentScore * weights.sentiment +
      conditions.orderBookPressure * weights.orderBook +
      volumeScore * weights.volume +
      volatilityScore * weights.volatility
    ) * 100;

    console.log(`📊 Market Regime Score: ${marketScore.toFixed(1)}%`, {
      technical: technicalScore.toFixed(2),
      sentiment: conditions.sentimentScore.toFixed(2),
      orderBook: conditions.orderBookPressure.toFixed(2),
      volume: volumeScore.toFixed(2),
      volatility: volatilityScore.toFixed(2)
    });

    return marketScore;
  }

  /**
   * Calculate technical indicator score
   */
  private calculateTechnicalScore(rsi: number, macd: any): number {
    let score = 0.5; // Neutral baseline

    // RSI scoring
    if (rsi < 30) score += 0.25;      // Oversold = bullish
    else if (rsi > 70) score -= 0.25; // Overbought = bearish
    else if (rsi >= 45 && rsi <= 55) score += 0.1; // Neutral zone = stable

    // MACD scoring
    if (macd.histogram > 0 && macd.value > macd.signal) {
      score += 0.25; // Bullish crossover
    } else if (macd.histogram < 0 && macd.value < macd.signal) {
      score -= 0.25; // Bearish crossover
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect technical patterns in price action
   */
  async detectPatterns(
    prices: number[], 
    volumes: number[], 
    timeframe: string
  ): Promise<TechnicalPattern[]> {
    const patterns: TechnicalPattern[] = [];
    
    // Simple pattern detection (expandable)
    const recentPrices = prices.slice(-20);
    const sma20 = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, prices.length);
    
    // Golden/Death cross detection
    if (sma20 > sma50 * 1.02) {
      patterns.push({
        pattern: 'goldenCross',
        reliability: this.technicalPatterns.goldenCross.reliability,
        timeframe,
        confidence: 0.75
      });
    } else if (sma20 < sma50 * 0.98) {
      patterns.push({
        pattern: 'deathCross',
        reliability: this.technicalPatterns.deathCross.reliability,
        timeframe,
        confidence: 0.73
      });
    }

    // Volume surge detection
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    
    if (currentVolume > avgVolume * 1.5) {
      console.log('📈 Volume surge detected - potential breakout');
    }

    return patterns;
  }

  /**
   * Get maximum allowed positions based on market conditions
   */
  getPositionLimit(marketScore: number): number {
    if (marketScore >= 85) return this.positionLimits.excellent;
    if (marketScore >= 70) return this.positionLimits.good;
    if (marketScore >= 55) return this.positionLimits.neutral;
    if (marketScore >= 40) return this.positionLimits.caution;
    return this.positionLimits.stop;
  }

  /**
   * Determine if trading should be allowed
   */
  async shouldAllowTrading(
    marketScore: number,
    currentPositions: number,
    patterns: TechnicalPattern[]
  ): Promise<{ allowed: boolean; reason: string; confidence: number }> {
    const positionLimit = this.getPositionLimit(marketScore);
    
    // Check position limits
    if (currentPositions >= positionLimit) {
      return {
        allowed: false,
        reason: `Position limit reached (${currentPositions}/${positionLimit})`,
        confidence: 0
      };
    }

    // Check market score threshold
    if (marketScore < 40) {
      return {
        allowed: false,
        reason: `Market conditions unfavorable (score: ${marketScore.toFixed(1)}%)`,
        confidence: marketScore / 100
      };
    }

    // Check for bearish patterns
    const bearishPatterns = patterns.filter(p => 
      ['bearFlag', 'eveningStar', 'deathCross'].includes(p.pattern)
    );
    
    if (bearishPatterns.length > 0 && marketScore < 60) {
      return {
        allowed: false,
        reason: `Bearish patterns detected with weak market (${bearishPatterns[0].pattern})`,
        confidence: marketScore / 100
      };
    }

    // Check for bullish confirmation
    const bullishPatterns = patterns.filter(p => 
      ['bullFlag', 'morningstar', 'goldenCross'].includes(p.pattern)
    );
    
    const patternBonus = bullishPatterns.length > 0 ? 0.1 : 0;
    const finalConfidence = Math.min(1, (marketScore / 100) + patternBonus);

    return {
      allowed: true,
      reason: `Market favorable (score: ${marketScore.toFixed(1)}%, patterns: ${bullishPatterns.length})`,
      confidence: finalConfidence
    };
  }

  /**
   * Adjust position size based on market conditions and patterns
   */
  calculatePositionSize(
    baseSize: number,
    marketScore: number,
    patterns: TechnicalPattern[]
  ): number {
    let multiplier = 1.0;

    // Market score adjustment
    if (marketScore >= 90) multiplier = 1.0;
    else if (marketScore >= 80) multiplier = 0.75;
    else if (marketScore >= 70) multiplier = 0.5;
    else if (marketScore >= 60) multiplier = 0.35;
    else multiplier = 0.25;

    // Pattern bonus/penalty
    const bullishPatterns = patterns.filter(p => 
      ['bullFlag', 'morningstar', 'goldenCross'].includes(p.pattern)
    );
    
    if (bullishPatterns.length > 0) {
      multiplier *= 1.15; // 15% size increase with bullish patterns
    }

    const adjustedSize = baseSize * multiplier;
    
    console.log(`📏 Position size adjusted: ${baseSize} → ${adjustedSize.toFixed(4)} (${(multiplier * 100).toFixed(0)}%)`, {
      marketScore: marketScore.toFixed(1),
      patterns: patterns.map(p => p.pattern).join(', ')
    });

    return adjustedSize;
  }
}

export const marketRegimeFilter = new MarketRegimeFilter();