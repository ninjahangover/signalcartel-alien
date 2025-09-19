/**
 * MATHEMATICAL PAIR SELECTOR - Intelligent Decision Tree
 *
 * Uses comprehensive mathematical scoring to select optimal trading pairs
 * regardless of market cap or volume. Focuses on PROFIT POTENTIAL.
 *
 * Core Philosophy: "Every pair has opportunity - find it mathematically"
 */

import { PrismaClient } from '@prisma/client';

export interface PairOpportunityScore {
  symbol: string;

  // Core Profit Metrics
  expectedReturn: number;           // Mathematical expectation of profit
  sharpeRatio: number;              // Risk-adjusted return metric
  kellyFraction: number;            // Optimal position sizing
  probabilityOfProfit: number;      // Win probability 0-1

  // Market Dynamics Scores (0-100)
  momentumScore: number;            // Price momentum strength
  volatilityScore: number;          // Volatility opportunity
  liquidityScore: number;           // Execution feasibility
  spreadScore: number;              // Bid-ask efficiency

  // Technical Pattern Recognition (0-100)
  trendStrength: number;            // Trend continuation probability
  supportResistance: number;        // Key level proximity
  volumePattern: number;            // Volume confirmation
  pricePattern: number;             // Chart pattern quality

  // Mathematical Indicators
  rsi: number;                      // Relative Strength Index
  macdSignal: number;              // MACD crossover strength
  bollingerPosition: number;       // Position in Bollinger Bands
  stochasticSignal: number;        // Stochastic oscillator

  // AI System Scores (from existing systems)
  orderBookScore: number;           // Order book imbalance
  sentimentScore: number;           // Market sentiment
  intuitionScore: number;           // Mathematical intuition
  bayesianScore: number;           // Bayesian probability

  // Risk Metrics
  maxDrawdown: number;              // Maximum potential loss
  valueAtRisk: number;             // 95% VaR
  correlationRisk: number;         // Portfolio correlation
  liquidationDistance: number;      // Distance to liquidation (for margin)

  // Opportunity Uniqueness
  crowdedness: number;              // How many others see this (0=unique, 100=crowded)
  edgeDecay: number;               // How fast opportunity disappears
  informationRatio: number;        // Signal to noise ratio

  // Final Composite Score
  totalScore: number;               // Weighted mathematical score (0-1000)
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;               // Confidence in recommendation (0-1)

  // Execution Parameters
  optimalEntry: number;             // Mathematically optimal entry price
  optimalExit: number;              // Target exit price
  stopLoss: number;                // Risk management stop
  timeHorizon: number;             // Expected hold time in minutes
  positionSize: number;            // Recommended position size (% of capital)
}

export class MathematicalPairSelector {
  private prisma: PrismaClient;

  // Configurable weights for different factors
  private readonly WEIGHTS = {
    expectedReturn: 0.20,
    sharpeRatio: 0.15,
    probabilityOfProfit: 0.15,
    momentumScore: 0.10,
    volatilityScore: 0.08,
    liquidityScore: 0.07,
    aiConsensus: 0.10,
    riskMetrics: 0.10,
    uniqueness: 0.05
  };

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * MAIN SELECTOR: Evaluate ALL pairs mathematically
   */
  async selectOptimalPairs(
    availableCapital: number,
    maxPositions: number = 5,
    allowMargin: boolean = false,
    targetReturn: number = 0.05 // 5% default target
  ): Promise<PairOpportunityScore[]> {
    console.log('🧮 MATHEMATICAL PAIR SELECTOR: Analyzing all opportunities...');

    // Get all tradeable pairs
    const allPairs = await this.getAllTradeablePairs();
    console.log(`📊 Evaluating ${allPairs.length} pairs mathematically...`);

    // Score each pair using comprehensive mathematics
    const scoredPairs: PairOpportunityScore[] = [];

    for (const pair of allPairs) {
      try {
        const score = await this.calculateComprehensiveScore(
          pair,
          availableCapital,
          allowMargin
        );

        // Only include pairs with positive expectancy
        if (score.expectedReturn > 0 && score.probabilityOfProfit > 0.3) {
          scoredPairs.push(score);
        }
      } catch (error) {
        // Skip pairs that fail evaluation
        continue;
      }
    }

    // Sort by total score (best opportunities first)
    scoredPairs.sort((a, b) => b.totalScore - a.totalScore);

    // Apply portfolio optimization
    const optimizedPortfolio = this.optimizePortfolio(
      scoredPairs,
      availableCapital,
      maxPositions,
      targetReturn
    );

    console.log(`✅ Selected ${optimizedPortfolio.length} optimal opportunities`);

    return optimizedPortfolio;
  }

  /**
   * Calculate comprehensive mathematical score for a pair
   */
  private async calculateComprehensiveScore(
    symbol: string,
    capital: number,
    allowMargin: boolean
  ): Promise<PairOpportunityScore> {
    // Get market data
    const marketData = await this.getMarketData(symbol);
    if (!marketData) throw new Error(`No market data for ${symbol}`);

    // Calculate all scoring components
    const profitMetrics = this.calculateProfitMetrics(marketData);
    const marketDynamics = this.calculateMarketDynamics(marketData);
    const technicalPatterns = this.calculateTechnicalPatterns(marketData);
    const mathIndicators = this.calculateMathematicalIndicators(marketData);
    const aiScores = await this.getAISystemScores(symbol, marketData);
    const riskMetrics = this.calculateRiskMetrics(marketData, capital, allowMargin);
    const uniqueness = this.calculateUniqueness(marketData);

    // Calculate weighted total score
    const totalScore = this.calculateTotalScore({
      profitMetrics,
      marketDynamics,
      technicalPatterns,
      mathIndicators,
      aiScores,
      riskMetrics,
      uniqueness
    });

    // Determine recommendation based on score
    const recommendation = this.getRecommendation(totalScore, profitMetrics.expectedReturn);

    // Calculate optimal execution parameters
    const execution = this.calculateOptimalExecution(
      marketData,
      profitMetrics,
      riskMetrics,
      capital
    );

    return {
      symbol,
      ...profitMetrics,
      ...marketDynamics,
      ...technicalPatterns,
      ...mathIndicators,
      ...aiScores,
      ...riskMetrics,
      ...uniqueness,
      totalScore,
      recommendation,
      confidence: Math.min(1, totalScore / 700), // Normalize confidence
      ...execution
    };
  }

  /**
   * Calculate profit metrics using mathematical expectancy
   */
  private calculateProfitMetrics(marketData: any): any {
    const price = marketData.price || 0;
    const change24h = marketData.change24h || 0;
    const volume = marketData.volume24h || 0;
    const volatility = marketData.volatility || Math.abs(change24h);

    // Expected Return: Use momentum, volatility, and volume profile
    const momentumFactor = Math.tanh(change24h / 10); // -1 to 1
    const volatilityOpportunity = Math.min(volatility / 5, 2); // Cap at 2x
    const volumeConfirmation = Math.log10(Math.max(volume, 1000)) / 7; // Normalize

    const expectedReturn = momentumFactor * volatilityOpportunity * 0.1 * (0.5 + volumeConfirmation);

    // Sharpe Ratio: Return per unit of risk
    const riskFreeRate = 0.001; // 0.1% per period
    const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

    // Kelly Fraction: Optimal bet size
    const winRate = 0.5 + momentumFactor * 0.2; // Adjust win rate based on momentum
    const avgWin = Math.abs(expectedReturn * 1.5);
    const avgLoss = Math.abs(expectedReturn * 0.8);
    const kellyFraction = avgLoss > 0 ? (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin : 0;

    // Probability of Profit: Bayesian approach
    const probabilityOfProfit = this.calculateWinProbability(
      momentumFactor,
      volatilityOpportunity,
      volumeConfirmation
    );

    return {
      expectedReturn,
      sharpeRatio,
      kellyFraction: Math.max(0, Math.min(kellyFraction, 0.25)), // Cap at 25%
      probabilityOfProfit
    };
  }

  /**
   * Calculate market dynamics scores
   */
  private calculateMarketDynamics(marketData: any): any {
    const price = marketData.price || 0;
    const change24h = marketData.change24h || 0;
    const volume = marketData.volume24h || 0;
    const high24h = marketData.high24h || price * 1.05;
    const low24h = marketData.low24h || price * 0.95;

    // Momentum Score: Rate of change acceleration
    const momentumScore = Math.min(100, Math.abs(change24h) * 5);

    // Volatility Score: Opportunity in price swings
    const range = (high24h - low24h) / price;
    const volatilityScore = Math.min(100, range * 500);

    // Liquidity Score: Logarithmic scale, doesn't penalize small caps
    const liquidityScore = Math.min(100, Math.log10(Math.max(volume, 1000)) * 15);

    // Spread Score: Estimated from volatility (would use real bid-ask in production)
    const estimatedSpread = Math.min(0.01, volatilityScore / 5000);
    const spreadScore = Math.max(0, 100 - estimatedSpread * 10000);

    return {
      momentumScore,
      volatilityScore,
      liquidityScore,
      spreadScore
    };
  }

  /**
   * Calculate technical pattern recognition scores
   */
  private calculateTechnicalPatterns(marketData: any): any {
    // Simplified pattern recognition (would be more sophisticated in production)
    const price = marketData.price || 0;
    const change24h = marketData.change24h || 0;
    const volume = marketData.volume24h || 0;

    // Trend Strength: Based on directional movement
    const trendStrength = Math.min(100, Math.abs(change24h) * 3);

    // Support/Resistance: Distance from round numbers
    const roundDistance = Math.abs(price - Math.round(price)) / price;
    const supportResistance = Math.max(0, 100 - roundDistance * 1000);

    // Volume Pattern: Unusual volume detection
    const avgVolume = 5000000; // Would calculate real average
    const volumeRatio = volume / avgVolume;
    const volumePattern = Math.min(100, volumeRatio * 20);

    // Price Pattern: Detect potential breakouts
    const pricePattern = this.detectPricePattern(marketData);

    return {
      trendStrength,
      supportResistance,
      volumePattern,
      pricePattern
    };
  }

  /**
   * Calculate mathematical indicators
   */
  private calculateMathematicalIndicators(marketData: any): any {
    const price = marketData.price || 0;
    const change24h = marketData.change24h || 0;
    const high24h = marketData.high24h || price * 1.05;
    const low24h = marketData.low24h || price * 0.95;

    // RSI: Simplified calculation
    const rsi = 50 + change24h * 2; // Simplified, would use real RSI

    // MACD Signal: Momentum convergence
    const macdSignal = change24h > 0 ? Math.min(100, change24h * 10) : 0;

    // Bollinger Position: Position within bands
    const mid = (high24h + low24h) / 2;
    const bollingerPosition = ((price - mid) / (high24h - low24h)) * 100 + 50;

    // Stochastic: Momentum indicator
    const stochasticSignal = ((price - low24h) / (high24h - low24h)) * 100;

    return {
      rsi: Math.max(0, Math.min(100, rsi)),
      macdSignal,
      bollingerPosition: Math.max(0, Math.min(100, bollingerPosition)),
      stochasticSignal: Math.max(0, Math.min(100, stochasticSignal))
    };
  }

  /**
   * Get AI system scores (would integrate with existing systems)
   */
  private async getAISystemScores(symbol: string, marketData: any): Promise<any> {
    // Placeholder scores - would integrate with real AI systems
    return {
      orderBookScore: Math.random() * 100,
      sentimentScore: Math.random() * 100,
      intuitionScore: Math.random() * 100,
      bayesianScore: Math.random() * 100
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(marketData: any, capital: number, allowMargin: boolean): any {
    const price = marketData.price || 0;
    const volatility = marketData.volatility || 5;

    // Max Drawdown: Based on volatility
    const maxDrawdown = volatility * 2;

    // Value at Risk (95% confidence)
    const valueAtRisk = volatility * 1.65; // 95% confidence interval

    // Correlation Risk: Simplified
    const correlationRisk = 30; // Would calculate real portfolio correlation

    // Liquidation Distance (for margin trading)
    const leverage = allowMargin ? 2 : 1;
    const liquidationDistance = allowMargin ? (100 / leverage) : 100;

    return {
      maxDrawdown,
      valueAtRisk,
      correlationRisk,
      liquidationDistance
    };
  }

  /**
   * Calculate opportunity uniqueness
   */
  private calculateUniqueness(marketData: any): any {
    const volume = marketData.volume24h || 0;

    // Crowdedness: Higher volume = more crowded
    const crowdedness = Math.min(100, Math.log10(Math.max(volume, 1000)) * 12);

    // Edge Decay: How fast opportunity disappears
    const edgeDecay = 50; // Moderate decay assumption

    // Information Ratio: Signal quality
    const informationRatio = 60; // Would calculate from historical accuracy

    return {
      crowdedness,
      edgeDecay,
      informationRatio
    };
  }

  /**
   * Calculate total weighted score
   */
  private calculateTotalScore(components: any): number {
    let score = 0;

    // Profit metrics contribution
    score += components.profitMetrics.expectedReturn * 1000 * this.WEIGHTS.expectedReturn;
    score += components.profitMetrics.sharpeRatio * 50 * this.WEIGHTS.sharpeRatio;
    score += components.profitMetrics.probabilityOfProfit * 100 * this.WEIGHTS.probabilityOfProfit;

    // Market dynamics contribution
    score += components.marketDynamics.momentumScore * this.WEIGHTS.momentumScore;
    score += components.marketDynamics.volatilityScore * this.WEIGHTS.volatilityScore;
    score += components.marketDynamics.liquidityScore * this.WEIGHTS.liquidityScore;

    // AI consensus contribution
    const aiAverage = (
      components.aiScores.orderBookScore +
      components.aiScores.sentimentScore +
      components.aiScores.intuitionScore +
      components.aiScores.bayesianScore
    ) / 4;
    score += aiAverage * this.WEIGHTS.aiConsensus;

    // Risk adjustment (negative contribution for high risk)
    const riskPenalty = (
      components.riskMetrics.maxDrawdown * 0.5 +
      components.riskMetrics.valueAtRisk * 0.3 +
      components.riskMetrics.correlationRisk * 0.2
    ) / 100;
    score -= riskPenalty * 100 * this.WEIGHTS.riskMetrics;

    // Uniqueness bonus
    const uniquenessBonus = (100 - components.uniqueness.crowdedness) * 0.5;
    score += uniquenessBonus * this.WEIGHTS.uniqueness;

    return Math.max(0, score);
  }

  /**
   * Get recommendation based on score
   */
  private getRecommendation(score: number, expectedReturn: number): any {
    if (score >= 700 && expectedReturn > 0.05) return 'STRONG_BUY';
    if (score >= 500 && expectedReturn > 0.02) return 'BUY';
    if (score >= 300) return 'HOLD';
    if (score >= 100 && expectedReturn < 0) return 'SELL';
    return 'STRONG_SELL';
  }

  /**
   * Calculate optimal execution parameters
   */
  private calculateOptimalExecution(
    marketData: any,
    profitMetrics: any,
    riskMetrics: any,
    capital: number
  ): any {
    const price = marketData.price || 0;

    // Optimal entry: Slightly below current price for better fills
    const optimalEntry = price * 0.999;

    // Optimal exit: Based on expected return
    const optimalExit = price * (1 + Math.abs(profitMetrics.expectedReturn));

    // Stop loss: Based on max acceptable loss
    const stopLoss = price * (1 - riskMetrics.maxDrawdown / 100);

    // Time horizon: Based on volatility and momentum
    const timeHorizon = Math.max(30, Math.min(360, 180 / marketData.volatility));

    // Position size: Kelly criterion with safety factor
    const positionSize = Math.min(
      profitMetrics.kellyFraction * 0.5, // Half Kelly for safety
      0.1 // Max 10% per position
    );

    return {
      optimalEntry,
      optimalExit,
      stopLoss,
      timeHorizon,
      positionSize
    };
  }

  /**
   * Portfolio optimization using Markowitz principles
   */
  private optimizePortfolio(
    scoredPairs: PairOpportunityScore[],
    capital: number,
    maxPositions: number,
    targetReturn: number
  ): PairOpportunityScore[] {
    // Start with highest scoring opportunities
    const selected: PairOpportunityScore[] = [];
    let totalAllocation = 0;
    let expectedPortfolioReturn = 0;

    for (const pair of scoredPairs) {
      if (selected.length >= maxPositions) break;
      if (totalAllocation >= 0.95) break; // Keep 5% cash reserve

      // Check if adding this improves portfolio
      const marginalBenefit = this.calculateMarginalBenefit(
        pair,
        selected,
        expectedPortfolioReturn,
        targetReturn
      );

      if (marginalBenefit > 0) {
        selected.push(pair);
        totalAllocation += pair.positionSize;
        expectedPortfolioReturn += pair.expectedReturn * pair.positionSize;
      }
    }

    return selected;
  }

  /**
   * Calculate marginal benefit of adding pair to portfolio
   */
  private calculateMarginalBenefit(
    pair: PairOpportunityScore,
    currentPortfolio: PairOpportunityScore[],
    currentReturn: number,
    targetReturn: number
  ): number {
    // Benefit from expected return
    const returnBenefit = pair.expectedReturn * pair.positionSize;

    // Penalty for correlation (simplified)
    const correlationPenalty = currentPortfolio.length * 0.01;

    // Bonus for helping reach target
    const targetBonus = currentReturn < targetReturn ? 0.1 : 0;

    return returnBenefit - correlationPenalty + targetBonus;
  }

  /**
   * Calculate win probability using Bayesian inference
   */
  private calculateWinProbability(
    momentum: number,
    volatility: number,
    volume: number
  ): number {
    // Prior probability
    const prior = 0.5;

    // Likelihood based on indicators
    const momentumLikelihood = 0.5 + momentum * 0.3;
    const volatilityLikelihood = Math.min(0.8, 0.3 + volatility * 0.2);
    const volumeLikelihood = Math.min(0.7, 0.4 + volume * 0.3);

    // Bayesian update
    const likelihood = momentumLikelihood * volatilityLikelihood * volumeLikelihood;
    const evidence = likelihood * prior + (1 - likelihood) * (1 - prior);

    return evidence > 0 ? (likelihood * prior) / evidence : prior;
  }

  /**
   * Detect price patterns
   */
  private detectPricePattern(marketData: any): number {
    const change = marketData.change24h || 0;

    // Simple pattern detection
    if (Math.abs(change) > 10) return 80; // Strong breakout
    if (Math.abs(change) > 5) return 60;  // Moderate move
    if (Math.abs(change) > 2) return 40;  // Small move
    return 20; // Consolidation
  }

  /**
   * Get all tradeable pairs
   */
  private async getAllTradeablePairs(): Promise<string[]> {
    // Would fetch from database or config
    // For now, return a sample including small caps
    return [
      'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'AVAXUSD', 'DOTUSD',
      'SLAYUSD', 'PEPEUSD', 'SHIBUSD', 'BONKUSD', 'WIFUSD',
      'CORNUSD', 'FARTCOINUSD', 'CATUSD', 'DUCKUSD', 'MOODENGUSD'
    ];
  }

  /**
   * Get market data for a pair
   */
  private async getMarketData(symbol: string): Promise<any> {
    // Simplified mock data - would fetch real data
    const basePrice = symbol.includes('BTC') ? 100000 :
                     symbol.includes('ETH') ? 3000 :
                     symbol.includes('SLAY') ? 0.0354 :
                     symbol.includes('PEPE') ? 0.00001 :
                     Math.random() * 100;

    return {
      symbol,
      price: basePrice,
      change24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 10000000,
      high24h: basePrice * 1.1,
      low24h: basePrice * 0.9,
      volatility: Math.random() * 10 + 2
    };
  }
}

// Export singleton
export const mathematicalPairSelector = new MathematicalPairSelector();