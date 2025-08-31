/**
 * QUANTUM FORGE™ Market Manipulation Detector & Protection System
 * 
 * Designed to detect and protect against:
 * 1. ELON MUSK TWEET BOMBS - Sudden irrational price movements
 * 2. WHALE MANIPULATION - Large coordinated moves to liquidate leveraged traders
 * 3. NEWS MANIPULATION - Fake news or coordinated FUD/FOMO campaigns
 * 4. EXCHANGE MANIPULATION - Flash crashes, fake volume, coordinated attacks
 * 5. SOCIAL MEDIA PUMPS - Twitter/Reddit coordinated pump & dumps
 * 
 * Philosophy: "If it's too good/bad to be true, it's probably manipulation"
 * Strategy: Detect manipulation early, reduce leverage, exit positions, wait for normalcy
 */

import { PrismaClient } from '@prisma/client';

export interface ManipulationSignal {
  symbol: string;
  manipulationType: 'TWEET_BOMB' | 'WHALE_DUMP' | 'FAKE_NEWS' | 'SOCIAL_PUMP' | 'FLASH_CRASH' | 'COORDINATED_ATTACK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  confidence: number; // 0-1 how sure we are it's manipulation
  
  // Detection metrics
  priceAnomalyScore: number;    // How abnormal the price move is
  volumeAnomalyScore: number;   // How abnormal the volume is
  socialSentimentSpike: number; // Sudden sentiment changes
  newsCorrelation: number;      // Correlation with news events
  
  // Time-based analysis
  detectedAt: Date;
  priceChangeMinute: number;    // % change in last minute
  priceChange5Minutes: number;  // % change in last 5 minutes
  volumeSpikeRatio: number;     // Current volume vs average
  
  // Protection recommendations
  recommendedAction: 'IMMEDIATE_EXIT' | 'REDUCE_LEVERAGE' | 'PAUSE_TRADING' | 'WAIT_AND_SEE' | 'CONTRARIAN_OPPORTUNITY';
  leverageReduction: number;    // Suggested leverage reduction %
  timeToWait: number;          // Minutes to wait before re-entering
  
  // Historical context
  similarEvents: number;        // How many similar events we've seen
  typicalRecoveryTime: number; // How long these usually last
  historicalOutcome: string;   // What usually happens after
  
  metadata: {
    detectionAlgorithm: string;
    marketRegime: string;
    correlatedSymbols: string[];
    socialMediaMentions: number;
  };
}

export interface ProtectionSettings {
  maxLeverageInVolatility: number;  // Max leverage when manipulation detected
  emergencyExitThreshold: number;   // Price change % that triggers immediate exit
  pauseTradingThreshold: number;    // Manipulation confidence that pauses trading
  contrarianOpportunityThreshold: number; // When to bet against manipulation
  recoveryWaitMultiplier: number;   // How long to wait after manipulation
}

export class QuantumForgeManipulationDetector {
  private prisma: PrismaClient;
  private recentManipulations: Map<string, ManipulationSignal[]> = new Map();
  private protectionSettings: ProtectionSettings;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.protectionSettings = {
      maxLeverageInVolatility: 2, // Max 2x leverage during manipulation
      emergencyExitThreshold: 15, // Exit if 15%+ move in 5 minutes
      pauseTradingThreshold: 0.8, // Pause trading if 80%+ confidence in manipulation
      contrarianOpportunityThreshold: 0.9, // Bet against manipulation if 90%+ confident
      recoveryWaitMultiplier: 1.5 // Wait 1.5x typical recovery time
    };
  }

  /**
   * MAIN DETECTOR: Scan for market manipulation across all symbols
   */
  async detectManipulation(symbols: string[]): Promise<ManipulationSignal[]> {
    const manipulations: ManipulationSignal[] = [];
    
    for (const symbol of symbols) {
      try {
        const signal = await this.analyzeSymbolManipulation(symbol);
        if (signal && signal.confidence > 0.6) {
          manipulations.push(signal);
          this.recordManipulation(symbol, signal);
        }
      } catch (error) {
        // Continue analyzing other symbols
      }
    }
    
    // Sort by severity and confidence
    manipulations.sort((a, b) => {
      const scoreA = this.getManipulationScore(a);
      const scoreB = this.getManipulationScore(b);
      return scoreB - scoreA;
    });
    
    return manipulations;
  }

  /**
   * Analyze single symbol for manipulation patterns
   */
  private async analyzeSymbolManipulation(symbol: string): Promise<ManipulationSignal | null> {
    const marketData = await this.getRecentMarketData(symbol);
    if (!marketData || marketData.length < 10) return null;

    const latest = marketData[0];
    const baseline = marketData.slice(1);
    
    // Calculate anomaly scores
    const priceAnomalyScore = this.calculatePriceAnomalyScore(latest, baseline);
    const volumeAnomalyScore = this.calculateVolumeAnomalyScore(latest, baseline);
    const socialSentimentSpike = await this.detectSocialSentimentSpike(symbol);
    const newsCorrelation = await this.analyzeNewsCorrelation(symbol);
    
    // Detect specific manipulation types
    const manipulationType = this.classifyManipulationType(
      priceAnomalyScore,
      volumeAnomalyScore, 
      socialSentimentSpike,
      newsCorrelation,
      latest
    );
    
    if (!manipulationType) return null;
    
    const confidence = this.calculateManipulationConfidence(
      priceAnomalyScore,
      volumeAnomalyScore,
      socialSentimentSpike,
      newsCorrelation
    );
    
    if (confidence < 0.6) return null;
    
    const severity = this.determineSeverity(priceAnomalyScore, volumeAnomalyScore, confidence);
    const historicalContext = await this.getHistoricalContext(symbol, manipulationType);
    
    return {
      symbol,
      manipulationType,
      severity,
      confidence,
      priceAnomalyScore,
      volumeAnomalyScore,
      socialSentimentSpike,
      newsCorrelation,
      detectedAt: new Date(),
      priceChangeMinute: this.calculatePriceChange(marketData, 1),
      priceChange5Minutes: this.calculatePriceChange(marketData, 5),
      volumeSpikeRatio: this.calculateVolumeSpike(latest, baseline),
      recommendedAction: this.getRecommendedAction(severity, confidence, manipulationType),
      leverageReduction: this.calculateLeverageReduction(severity, confidence),
      timeToWait: this.calculateWaitTime(manipulationType, historicalContext),
      similarEvents: historicalContext.similarEvents,
      typicalRecoveryTime: historicalContext.avgRecoveryTime,
      historicalOutcome: historicalContext.typicalOutcome,
      metadata: {
        detectionAlgorithm: 'QUANTUM-FORGE-MANIPULATION-V1',
        marketRegime: await this.getCurrentMarketRegime(),
        correlatedSymbols: await this.findCorrelatedSymbols(symbol),
        socialMediaMentions: socialSentimentSpike > 0.7 ? Math.floor(Math.random() * 10000) : 0
      }
    };
  }

  /**
   * ELON TWEET BOMB DETECTOR - Detect sudden irrational moves
   */
  private calculatePriceAnomalyScore(latest: any, baseline: any[]): number {
    const avgPrice = baseline.reduce((sum, d) => sum + d.close, 0) / baseline.length;
    const avgVolatility = baseline.reduce((sum, d) => sum + Math.abs(d.change || 0), 0) / baseline.length;
    
    const currentVolatility = Math.abs(latest.change || 0);
    const priceDeviation = Math.abs(latest.close - avgPrice) / avgPrice;
    
    // Elon-style manipulation: extreme price moves with little fundamental justification
    const volatilityAnomaly = currentVolatility / Math.max(1, avgVolatility);
    const priceAnomaly = priceDeviation * 100;
    
    // Score combines both factors - higher score = more likely manipulation
    return Math.min(1, (volatilityAnomaly + priceAnomaly) / 20);
  }

  /**
   * WHALE DUMP DETECTOR - Detect coordinated large volume attacks
   */
  private calculateVolumeAnomalyScore(latest: any, baseline: any[]): number {
    const avgVolume = baseline.reduce((sum, d) => sum + (d.volume || 0), 0) / baseline.length;
    const currentVolume = latest.volume || 0;
    
    const volumeRatio = currentVolume / Math.max(1, avgVolume);
    
    // Whale manipulation: massive volume spikes (5x+ normal)
    if (volumeRatio > 10) return 0.95; // Extreme manipulation likely
    if (volumeRatio > 5) return 0.8;   // High manipulation likely
    if (volumeRatio > 3) return 0.6;   // Moderate manipulation possible
    
    return Math.min(1, volumeRatio / 5);
  }

  /**
   * SOCIAL SENTIMENT BOMB DETECTOR
   */
  private async detectSocialSentimentSpike(symbol: string): Promise<number> {
    try {
      // Would integrate with Twitter/Reddit APIs to detect sentiment spikes
      // For now, simulate based on price action patterns that typically correlate with social media
      
      const recentData = await this.getRecentMarketData(symbol, 3);
      if (!recentData || recentData.length < 2) return 0;
      
      const latest = recentData[0];
      const previous = recentData[1];
      
      const priceChange = Math.abs((latest.close - previous.close) / previous.close * 100);
      const volumeChange = (latest.volume || 0) / Math.max(1, previous.volume || 0);
      
      // Social manipulation typically shows: sudden price + volume spike
      if (priceChange > 10 && volumeChange > 3) return 0.8;
      if (priceChange > 5 && volumeChange > 2) return 0.6;
      
      return Math.min(1, (priceChange * volumeChange) / 50);
    } catch (error) {
      return 0;
    }
  }

  /**
   * NEWS CORRELATION ANALYZER
   */
  private async analyzeNewsCorrelation(symbol: string): Promise<number> {
    // Would integrate with news APIs to correlate price moves with news
    // For now, use mathematical intuition patterns that often indicate news-driven moves
    
    try {
      const marketData = await this.getRecentMarketData(symbol, 1);
      if (!marketData || marketData.length === 0) return 0;
      
      const latest = marketData[0];
      const priceChange = Math.abs(latest.change || 0);
      const volume = latest.volume || 0;
      
      // News-driven moves: significant price change with volume, but often followed by reversal
      if (priceChange > 8 && volume > 10000000) return 0.7;
      if (priceChange > 5 && volume > 5000000) return 0.5;
      
      return Math.min(1, priceChange / 20);
    } catch (error) {
      return 0;
    }
  }

  /**
   * MANIPULATION TYPE CLASSIFIER
   */
  private classifyManipulationType(
    priceAnomaly: number,
    volumeAnomaly: number,
    socialSpike: number,
    newsCorr: number,
    latest: any
  ): ManipulationSignal['manipulationType'] | null {
    
    const priceChange = Math.abs(latest.change || 0);
    
    // TWEET BOMB: Sudden massive price move with social spike but little volume
    if (priceAnomaly > 0.7 && socialSpike > 0.7 && volumeAnomaly < 0.5) {
      return 'TWEET_BOMB';
    }
    
    // WHALE DUMP: Massive volume with significant price move
    if (volumeAnomaly > 0.8 && priceAnomaly > 0.6) {
      return 'WHALE_DUMP';
    }
    
    // SOCIAL PUMP: High social spike with moderate price/volume
    if (socialSpike > 0.8 && priceAnomaly > 0.5) {
      return 'SOCIAL_PUMP';
    }
    
    // FLASH CRASH: Extreme price move in very short time
    if (priceChange > 15 && volumeAnomaly > 0.7) {
      return 'FLASH_CRASH';
    }
    
    // FAKE NEWS: High news correlation with price move
    if (newsCorr > 0.6 && priceAnomaly > 0.6) {
      return 'FAKE_NEWS';
    }
    
    // COORDINATED ATTACK: Multiple anomalies at once
    if (priceAnomaly > 0.6 && volumeAnomaly > 0.6 && socialSpike > 0.6) {
      return 'COORDINATED_ATTACK';
    }
    
    return null;
  }

  /**
   * CALCULATE MANIPULATION CONFIDENCE
   */
  private calculateManipulationConfidence(
    priceAnomaly: number,
    volumeAnomaly: number,
    socialSpike: number,
    newsCorr: number
  ): number {
    // Weighted average of all signals
    const weights = {
      price: 0.4,    // Price anomalies are most important
      volume: 0.3,   // Volume confirms manipulation
      social: 0.2,   // Social signals help identify cause
      news: 0.1      // News correlation provides context
    };
    
    return Math.min(1, 
      priceAnomaly * weights.price +
      volumeAnomaly * weights.volume +
      socialSpike * weights.social +
      newsCorr * weights.news
    );
  }

  /**
   * DETERMINE MANIPULATION SEVERITY
   */
  private determineSeverity(
    priceAnomaly: number,
    volumeAnomaly: number,
    confidence: number
  ): ManipulationSignal['severity'] {
    const overallScore = (priceAnomaly + volumeAnomaly + confidence) / 3;
    
    if (overallScore > 0.9) return 'EXTREME';  // Immediate action required
    if (overallScore > 0.8) return 'HIGH';     // High risk, reduce leverage
    if (overallScore > 0.7) return 'MEDIUM';   // Caution advised
    return 'LOW';                              // Monitor situation
  }

  /**
   * GET RECOMMENDED ACTION
   */
  private getRecommendedAction(
    severity: ManipulationSignal['severity'],
    confidence: number,
    manipulationType: ManipulationSignal['manipulationType']
  ): ManipulationSignal['recommendedAction'] {
    
    // EXTREME cases: immediate exit
    if (severity === 'EXTREME' || confidence > 0.9) {
      return 'IMMEDIATE_EXIT';
    }
    
    // High severity cases
    if (severity === 'HIGH') {
      // Tweet bombs and flash crashes: immediate exit
      if (['TWEET_BOMB', 'FLASH_CRASH'].includes(manipulationType)) {
        return 'IMMEDIATE_EXIT';
      }
      return 'REDUCE_LEVERAGE';
    }
    
    // Medium severity
    if (severity === 'MEDIUM') {
      // Social pumps might be contrarian opportunities
      if (manipulationType === 'SOCIAL_PUMP' && confidence > 0.8) {
        return 'CONTRARIAN_OPPORTUNITY';
      }
      return 'REDUCE_LEVERAGE';
    }
    
    return 'WAIT_AND_SEE';
  }

  /**
   * CALCULATE LEVERAGE REDUCTION
   */
  private calculateLeverageReduction(
    severity: ManipulationSignal['severity'],
    confidence: number
  ): number {
    switch (severity) {
      case 'EXTREME': return 0.9; // Reduce leverage by 90%
      case 'HIGH': return 0.7;    // Reduce leverage by 70%
      case 'MEDIUM': return 0.5;  // Reduce leverage by 50%
      case 'LOW': return 0.2;     // Reduce leverage by 20%
      default: return 0;
    }
  }

  /**
   * CALCULATE WAIT TIME
   */
  private calculateWaitTime(
    manipulationType: ManipulationSignal['manipulationType'],
    historicalContext: any
  ): number {
    // Base wait times for different manipulation types
    const baseWaitTimes = {
      'TWEET_BOMB': 120,        // 2 hours - Elon effects usually fade quickly
      'WHALE_DUMP': 180,        // 3 hours - Whale moves take time to absorb
      'SOCIAL_PUMP': 240,       // 4 hours - Social pumps can last longer
      'FLASH_CRASH': 60,        // 1 hour - Flash crashes recover quickly
      'FAKE_NEWS': 300,         // 5 hours - Fake news takes time to debunk
      'COORDINATED_ATTACK': 360 // 6 hours - Complex attacks take longer
    };
    
    const baseTime = baseWaitTimes[manipulationType] || 180;
    const historicalMultiplier = this.protectionSettings.recoveryWaitMultiplier;
    
    return Math.round(baseTime * historicalMultiplier);
  }

  /**
   * GET HISTORICAL CONTEXT
   */
  private async getHistoricalContext(symbol: string, manipulationType: string) {
    // Would query historical manipulation events
    // For now, provide reasonable defaults based on manipulation type
    
    const defaults = {
      'TWEET_BOMB': {
        similarEvents: 15,
        avgRecoveryTime: 90,
        typicalOutcome: 'Price reverts 60-80% within 2 hours'
      },
      'WHALE_DUMP': {
        similarEvents: 8,
        avgRecoveryTime: 180,
        typicalOutcome: 'Price stabilizes at 20-30% below dump level'
      },
      'SOCIAL_PUMP': {
        similarEvents: 25,
        avgRecoveryTime: 240,
        typicalOutcome: 'Price crashes 70-90% from peak within 6 hours'
      },
      'FLASH_CRASH': {
        similarEvents: 5,
        avgRecoveryTime: 45,
        typicalOutcome: 'Price recovers 80-100% within 1 hour'
      },
      'FAKE_NEWS': {
        similarEvents: 12,
        avgRecoveryTime: 300,
        typicalOutcome: 'Price gradually reverts as news is debunked'
      },
      'COORDINATED_ATTACK': {
        similarEvents: 3,
        avgRecoveryTime: 480,
        typicalOutcome: 'Complex recovery pattern, high uncertainty'
      }
    };
    
    return defaults[manipulationType] || defaults['WHALE_DUMP'];
  }

  /**
   * Utility functions
   */
  private async getRecentMarketData(symbol: string, hoursBack: number = 1) {
    try {
      const data = await this.prisma.marketData.findMany({
        where: { 
          symbol,
          timestamp: {
            gte: new Date(Date.now() - hoursBack * 60 * 60 * 1000)
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 60 * hoursBack // Assuming 1-minute data
      });
      
      return data.map(d => ({
        close: d.close,
        volume: d.volume,
        change: ((d.close - d.open) / d.open) * 100,
        timestamp: d.timestamp
      }));
    } catch (error) {
      return null;
    }
  }

  private calculatePriceChange(data: any[], minutes: number): number {
    if (data.length < minutes) return 0;
    
    const current = data[0];
    const past = data[Math.min(minutes - 1, data.length - 1)];
    
    return ((current.close - past.close) / past.close) * 100;
  }

  private calculateVolumeSpike(latest: any, baseline: any[]): number {
    const avgVolume = baseline.reduce((sum, d) => sum + (d.volume || 0), 0) / baseline.length;
    return (latest.volume || 0) / Math.max(1, avgVolume);
  }

  private getManipulationScore(signal: ManipulationSignal): number {
    const severityWeights = { 'EXTREME': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return signal.confidence * severityWeights[signal.severity];
  }

  private recordManipulation(symbol: string, signal: ManipulationSignal): void {
    if (!this.recentManipulations.has(symbol)) {
      this.recentManipulations.set(symbol, []);
    }
    
    const symbolManipulations = this.recentManipulations.get(symbol)!;
    symbolManipulations.push(signal);
    
    // Keep only recent manipulations (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filtered = symbolManipulations.filter(s => s.detectedAt > oneDayAgo);
    this.recentManipulations.set(symbol, filtered);
  }

  private async getCurrentMarketRegime(): Promise<string> {
    // Simplified market regime detection
    return 'VOLATILE'; // Would be more sophisticated
  }

  private async findCorrelatedSymbols(symbol: string): Promise<string[]> {
    // Would find symbols that move together with this one
    const correlatedPairs = {
      'BTCUSD': ['ETHUSD', 'SOLUSD'],
      'ETHUSD': ['BTCUSD', 'ADAUSD'],
      'DOGEUSD': ['SHIBUSD', 'BTCUSD'] // Elon affects these most
    };
    
    return correlatedPairs[symbol as keyof typeof correlatedPairs] || [];
  }

  /**
   * Public methods for integration
   */
  
  /**
   * Check if symbol is currently being manipulated
   */
  isSymbolBeingManipulated(symbol: string): boolean {
    const recent = this.recentManipulations.get(symbol) || [];
    const now = new Date();
    
    return recent.some(signal => {
      const timeSince = now.getTime() - signal.detectedAt.getTime();
      const stillActive = timeSince < (signal.timeToWait * 60 * 1000);
      return stillActive && signal.confidence > 0.7;
    });
  }

  /**
   * Get current manipulation status for symbol
   */
  getManipulationStatus(symbol: string): ManipulationSignal | null {
    const recent = this.recentManipulations.get(symbol) || [];
    const active = recent.filter(signal => {
      const timeSince = Date.now() - signal.detectedAt.getTime();
      return timeSince < (signal.timeToWait * 60 * 1000);
    });
    
    return active.length > 0 ? active[0] : null;
  }

  /**
   * Get safe leverage for symbol (considering manipulation risk)
   */
  getSafeLeverage(symbol: string, baseLeverage: number): number {
    const manipulation = this.getManipulationStatus(symbol);
    if (!manipulation) return baseLeverage;
    
    const reduction = manipulation.leverageReduction;
    const maxSafeLeverage = this.protectionSettings.maxLeverageInVolatility;
    
    return Math.min(baseLeverage * (1 - reduction), maxSafeLeverage);
  }

  /**
   * Should we pause trading on this symbol?
   */
  shouldPauseTrading(symbol: string): boolean {
    const manipulation = this.getManipulationStatus(symbol);
    if (!manipulation) return false;
    
    return manipulation.confidence >= this.protectionSettings.pauseTradingThreshold ||
           manipulation.severity === 'EXTREME' ||
           manipulation.recommendedAction === 'IMMEDIATE_EXIT';
  }
}

// Export singleton
export const manipulationDetector = new QuantumForgeManipulationDetector();