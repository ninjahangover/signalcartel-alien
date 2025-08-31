/**
 * QUANTUM FORGE™ Leverage-Safe Profit Predator
 * 
 * Enhanced predator system with institutional stability awareness and manipulation protection:
 * 1. INSTITUTIONAL STABILITY DETECTOR - Recognizes when institutions are stabilizing markets
 * 2. ELON-PROOF PROTECTION - Detects tweet bombs and social manipulation before they kill leveraged positions
 * 3. ADAPTIVE LEVERAGE - Dynamically adjusts leverage based on manipulation risk and institutional flow
 * 4. ETF IMPACT AWARENESS - Factors in institutional buying/selling pressure
 * 5. VETERAN TRADER INTELLIGENCE - Uses patterns from 2015+ crypto evolution
 * 
 * Philosophy: "Use institutional stability as a shield, AI intelligence as a sword"
 * Strategy: Higher leverage when institutions are active, lower leverage when manipulation risk is high
 */

import { profitPredator, ProfitHunt } from './quantum-forge-profit-predator';
import { manipulationDetector, ManipulationSignal } from './quantum-forge-manipulation-detector';
import { PrismaClient } from '@prisma/client';

export interface InstitutionalFlow {
  symbol: string;
  institutionalPresence: number; // 0-1 how much institutional money is in this asset
  etfFlowDirection: 'BUYING' | 'SELLING' | 'NEUTRAL';
  etfFlowStrength: number; // 0-1 strength of institutional flow
  stabilityScore: number; // 0-1 how stable the asset is due to institutional presence
  largeHolderConcentration: number; // 0-1 how concentrated large holders are
  liquidityDepth: number; // 0-1 how deep the order book is
  manipulationResistance: number; // 0-1 resistance to manipulation due to institutional presence
}

export interface LeverageSafeHunt extends ProfitHunt {
  // Institutional context
  institutionalFlow: InstitutionalFlow;
  manipulationRisk: ManipulationSignal | null;
  
  // Leverage safety
  baseLeverage: number; // Base leverage for this opportunity
  safeLeverage: number; // Actual safe leverage considering risks
  leverageReduction: number; // % reduction due to risks
  leverageReasonings: string[]; // Why leverage was adjusted
  
  // Enhanced protection
  maxPositionSize: number; // Max position size considering manipulation risk
  emergencyExitTrigger: number; // Price move % that triggers immediate exit
  institutionalSupport: number; // 0-1 level of institutional support for this move
  veteranTraderScore: number; // 0-1 score based on 2015+ crypto patterns
}

export class QuantumForgeLeverageSafePredator {
  private prisma: PrismaClient;
  private institutionalAssets: Map<string, InstitutionalFlow> = new Map();
  
  // Leverage parameters (2015+ crypto veteran knowledge)
  private baseLeverageSettings = {
    'BTCUSD': 5,    // Most institutional support
    'ETHUSD': 4,    // Strong institutional support
    'SOLUSD': 3,    // Growing institutional interest
    'ADAUSD': 2,    // Moderate institutional presence
    'DOGEUSD': 1,   // HIGH ELON RISK - minimal leverage
    'SHIBUSD': 1,   // HIGH MANIPULATION RISK
    default: 2      // Conservative default
  };
  
  // Institutional stability thresholds
  private institutionalThresholds = {
    highInstitutionalPresence: 0.7,  // 70%+ institutional = very stable
    moderateInstitutionalPresence: 0.4, // 40%+ = somewhat stable
    lowInstitutionalPresence: 0.2,   // 20%+ = still risky
    noInstitutionalPresence: 0.1     // <10% = pure speculation
  };

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeInstitutionalData();
  }

  /**
   * MAIN ENHANCED HUNTING: Hunt with leverage safety and manipulation protection
   */
  async huntLeverageSafeOpportunities(): Promise<LeverageSafeHunt[]> {
    console.log('🐅 QUANTUM FORGE™ Leverage-Safe Predator - ENHANCED HUNTING');
    console.log('🏛️ Factoring in institutional stability and manipulation protection');
    console.log('⚡ 2015+ crypto veteran intelligence active');

    // Update institutional flow data
    await this.updateInstitutionalFlows();

    // Get base hunting opportunities
    const baseHunts = await profitPredator.huntForProfits();
    
    if (baseHunts.length === 0) {
      console.log('⚠️ No base hunting opportunities detected');
      return [];
    }

    // Enhance each hunt with leverage safety and institutional awareness
    const leverageSafeHunts: LeverageSafeHunt[] = [];
    
    for (const hunt of baseHunts) {
      try {
        const enhancedHunt = await this.enhanceHuntWithLeverageSafety(hunt);
        if (enhancedHunt && enhancedHunt.safeLeverage > 0) {
          leverageSafeHunts.push(enhancedHunt);
        }
      } catch (error) {
        console.log(`⚠️ Failed to enhance hunt for ${hunt.symbol}: ${error.message}`);
      }
    }

    // Sort by institutional support and safety
    leverageSafeHunts.sort((a, b) => {
      const scoreA = this.calculateSafetyScore(a);
      const scoreB = this.calculateSafetyScore(b);
      return scoreB - scoreA;
    });

    console.log(`🛡️ Enhanced ${leverageSafeHunts.length} hunts with leverage safety protection`);
    
    if (leverageSafeHunts.length > 0) {
      console.log('\\n🏆 TOP LEVERAGE-SAFE HUNTS:');
      leverageSafeHunts.slice(0, 5).forEach((hunt, idx) => {
        const instPresence = (hunt.institutionalFlow.institutionalPresence * 100).toFixed(0);
        const safetyRating = hunt.manipulationRisk ? '🚨' : hunt.institutionalFlow.manipulationResistance > 0.7 ? '🛡️' : '⚠️';
        console.log(`   ${idx + 1}. ${hunt.symbol} ${safetyRating} ${hunt.safeLeverage.toFixed(1)}x leverage (${instPresence}% institutional)`);
      });
    }

    return leverageSafeHunts;
  }

  /**
   * Enhance hunt with leverage safety and institutional awareness
   */
  private async enhanceHuntWithLeverageSafety(hunt: ProfitHunt): Promise<LeverageSafeHunt | null> {
    // Get institutional flow data
    const institutionalFlow = await this.getInstitutionalFlow(hunt.symbol);
    
    // Check for manipulation risk
    const manipulationRisk = await manipulationDetector.detectManipulation([hunt.symbol]);
    const currentManipulation = manipulationRisk.length > 0 ? manipulationRisk[0] : null;

    // Calculate base leverage for this symbol
    const baseLeverage = this.baseLeverageSettings[hunt.symbol as keyof typeof this.baseLeverageSettings] 
                        || this.baseLeverageSettings.default;

    // Calculate safe leverage
    const leverageCalculation = this.calculateSafeLeverage(
      hunt,
      institutionalFlow,
      currentManipulation,
      baseLeverage
    );

    // Skip if leverage is too low to be worthwhile
    if (leverageCalculation.safeLeverage < 1.2) {
      return null;
    }

    // Calculate veteran trader score (2015+ patterns)
    const veteranTraderScore = this.calculateVeteranTraderScore(hunt, institutionalFlow);

    // Enhanced position sizing considering manipulation risk
    const maxPositionSize = this.calculateMaxPositionSize(hunt, institutionalFlow, currentManipulation);

    // Emergency exit trigger (tighter for high-risk assets)
    const emergencyExitTrigger = this.calculateEmergencyExitTrigger(hunt.symbol, institutionalFlow, currentManipulation);

    // Institutional support level for this specific move
    const institutionalSupport = this.calculateInstitutionalSupport(hunt, institutionalFlow);

    return {
      ...hunt,
      institutionalFlow,
      manipulationRisk: currentManipulation,
      baseLeverage,
      safeLeverage: leverageCalculation.safeLeverage,
      leverageReduction: leverageCalculation.reductionPercent,
      leverageReasonings: leverageCalculation.reasonings,
      maxPositionSize,
      emergencyExitTrigger,
      institutionalSupport,
      veteranTraderScore
    };
  }

  /**
   * Calculate safe leverage considering all risk factors
   */
  private calculateSafeLeverage(
    hunt: ProfitHunt,
    institutional: InstitutionalFlow,
    manipulation: ManipulationSignal | null,
    baseLeverage: number
  ) {
    let safeLeverage = baseLeverage;
    const reasonings: string[] = [];
    
    // INSTITUTIONAL SUPPORT ADJUSTMENT
    if (institutional.institutionalPresence > this.institutionalThresholds.highInstitutionalPresence) {
      safeLeverage *= 1.2; // 20% boost for high institutional presence
      reasonings.push('Institutional stability boost (+20%)');
    } else if (institutional.institutionalPresence < this.institutionalThresholds.lowInstitutionalPresence) {
      safeLeverage *= 0.6; // 40% reduction for low institutional presence
      reasonings.push('Low institutional presence (-40%)');
    }

    // ETF FLOW ADJUSTMENT
    if (institutional.etfFlowDirection === 'BUYING' && institutional.etfFlowStrength > 0.6) {
      safeLeverage *= 1.15; // 15% boost for strong institutional buying
      reasonings.push('Strong ETF buying flow (+15%)');
    } else if (institutional.etfFlowDirection === 'SELLING' && institutional.etfFlowStrength > 0.6) {
      safeLeverage *= 0.7; // 30% reduction for strong institutional selling
      reasonings.push('Strong ETF selling pressure (-30%)');
    }

    // MANIPULATION RISK ADJUSTMENT
    if (manipulation) {
      const manipReduction = manipulation.leverageReduction;
      safeLeverage *= (1 - manipReduction);
      reasonings.push(`${manipulation.manipulationType} risk (-${(manipReduction * 100).toFixed(0)}%)`);
      
      // Extra reduction for Elon-sensitive assets
      if (['DOGEUSD', 'SHIBUSD', 'BTCUSD'].includes(hunt.symbol) && 
          manipulation.manipulationType === 'TWEET_BOMB') {
        safeLeverage *= 0.5; // 50% additional reduction for Elon tweet risk
        reasonings.push('Elon tweet bomb risk (-50%)');
      }
    }

    // LIQUIDITY ADJUSTMENT
    if (institutional.liquidityDepth < 0.3) {
      safeLeverage *= 0.8; // 20% reduction for low liquidity
      reasonings.push('Low liquidity (-20%)');
    }

    // CONCENTRATION RISK ADJUSTMENT  
    if (institutional.largeHolderConcentration > 0.8) {
      safeLeverage *= 0.75; // 25% reduction for high concentration (whale risk)
      reasonings.push('High whale concentration (-25%)');
    }

    // EXPECTANCY BOOST (high expectancy = can handle more leverage)
    if (hunt.expectancyRatio > 2.5) {
      safeLeverage *= 1.1; // 10% boost for excellent expectancy
      reasonings.push('Excellent expectancy (+10%)');
    }

    // MINIMUM LEVERAGE CAP (never go below 1x)
    safeLeverage = Math.max(1, safeLeverage);
    
    // MAXIMUM LEVERAGE CAP (veteran trader wisdom: never go above 10x in crypto)
    safeLeverage = Math.min(10, safeLeverage);

    const reductionPercent = (baseLeverage - safeLeverage) / baseLeverage;

    return {
      safeLeverage: Math.round(safeLeverage * 10) / 10, // Round to 1 decimal
      reductionPercent: Math.max(0, reductionPercent),
      reasonings
    };
  }

  /**
   * Calculate veteran trader score (2015+ crypto patterns)
   */
  private calculateVeteranTraderScore(hunt: ProfitHunt, institutional: InstitutionalFlow): number {
    let score = 0.5; // Base score
    
    // Pattern recognition from 2015+ crypto evolution
    
    // 1. Institutional presence = more predictable (veteran traders know this)
    score += institutional.institutionalPresence * 0.2;
    
    // 2. High volume + moderate price move = institutional activity (good sign)
    if (hunt.metadata.rawSignalData?.volume > 50000000 && 
        Math.abs(hunt.metadata.rawSignalData?.priceChange || 0) < 8) {
      score += 0.15;
    }
    
    // 3. Avoid pure speculation assets (veteran wisdom)
    if (['DOGEUSD', 'SHIBUSD'].includes(hunt.symbol)) {
      score -= 0.2; // Meme coins are dangerous
    }
    
    // 4. Strong expectancy + institutional support = veteran trader dream
    if (hunt.expectancyRatio > 2 && institutional.institutionalPresence > 0.5) {
      score += 0.25;
    }
    
    // 5. Manipulation resistance (veterans learned to avoid manipulation-prone assets)
    score += institutional.manipulationResistance * 0.15;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate maximum position size considering all risks
   */
  private calculateMaxPositionSize(
    hunt: ProfitHunt,
    institutional: InstitutionalFlow,
    manipulation: ManipulationSignal | null
  ): number {
    let maxSize = hunt.positionRisk; // Start with base position risk
    
    // Institutional support allows larger positions
    if (institutional.institutionalPresence > 0.7) {
      maxSize *= 1.3; // 30% larger positions for high institutional presence
    }
    
    // Manipulation risk reduces position size
    if (manipulation) {
      maxSize *= (1 - manipulation.leverageReduction * 0.5);
    }
    
    // Liquidity constraints
    if (institutional.liquidityDepth < 0.5) {
      maxSize *= 0.7; // Smaller positions in illiquid markets
    }
    
    return Math.min(0.15, maxSize); // Never risk more than 15% per position
  }

  /**
   * Calculate emergency exit trigger
   */
  private calculateEmergencyExitTrigger(
    symbol: string,
    institutional: InstitutionalFlow,
    manipulation: ManipulationSignal | null
  ): number {
    let trigger = 8; // Base 8% move triggers emergency exit
    
    // Elon-sensitive assets need tighter triggers
    if (['DOGEUSD', 'SHIBUSD'].includes(symbol)) {
      trigger = 5; // 5% move triggers exit (Elon can move these 30%+ instantly)
    }
    
    // Institutional support allows wider triggers
    if (institutional.institutionalPresence > 0.7) {
      trigger *= 1.3; // 30% wider trigger for stable assets
    }
    
    // Manipulation risk tightens triggers
    if (manipulation && manipulation.severity === 'HIGH') {
      trigger *= 0.6; // 40% tighter trigger during manipulation
    }
    
    return trigger;
  }

  /**
   * Calculate institutional support for this specific move
   */
  private calculateInstitutionalSupport(hunt: ProfitHunt, institutional: InstitutionalFlow): number {
    let support = institutional.institutionalPresence * 0.5; // Base support
    
    // ETF flows indicate institutional sentiment
    if (institutional.etfFlowDirection === 'BUYING' && hunt.expectedReturn > 0) {
      support += institutional.etfFlowStrength * 0.3; // Aligned with institutional buying
    } else if (institutional.etfFlowDirection === 'SELLING' && hunt.expectedReturn < 0) {
      support += institutional.etfFlowStrength * 0.3; // Aligned with institutional selling
    }
    
    // Stability score adds support
    support += institutional.stabilityScore * 0.2;
    
    return Math.min(1, support);
  }

  /**
   * Calculate overall safety score for sorting
   */
  private calculateSafetyScore(hunt: LeverageSafeHunt): number {
    return (
      hunt.expectancyRatio * 0.25 +
      hunt.institutionalSupport * 0.25 +
      hunt.veteranTraderScore * 0.2 +
      (hunt.manipulationRisk ? 0 : 0.15) + // Penalty for manipulation risk
      hunt.safeLeverage * 0.15
    );
  }

  /**
   * Initialize institutional data for major assets
   */
  private initializeInstitutionalData(): void {
    // Based on real institutional adoption as of 2024
    const institutionalData = {
      'BTCUSD': {
        institutionalPresence: 0.85, // Very high: BlackRock ETF, MicroStrategy, Tesla, etc.
        etfFlowDirection: 'BUYING' as const,
        etfFlowStrength: 0.7,
        stabilityScore: 0.8,
        largeHolderConcentration: 0.6,
        liquidityDepth: 0.9,
        manipulationResistance: 0.8
      },
      'ETHUSD': {
        institutionalPresence: 0.75, // High: ETF pending, institutional DeFi usage
        etfFlowDirection: 'BUYING' as const,
        etfFlowStrength: 0.6,
        stabilityScore: 0.7,
        largeHolderConcentration: 0.5,
        liquidityDepth: 0.8,
        manipulationResistance: 0.75
      },
      'SOLUSD': {
        institutionalPresence: 0.4, // Moderate: Growing institutional interest
        etfFlowDirection: 'NEUTRAL' as const,
        etfFlowStrength: 0.3,
        stabilityScore: 0.5,
        largeHolderConcentration: 0.7,
        liquidityDepth: 0.6,
        manipulationResistance: 0.5
      },
      'DOGEUSD': {
        institutionalPresence: 0.1, // Very low: Pure speculation, Elon influence
        etfFlowDirection: 'NEUTRAL' as const,
        etfFlowStrength: 0.1,
        stabilityScore: 0.2,
        largeHolderConcentration: 0.9, // Very concentrated (Elon effect)
        liquidityDepth: 0.4,
        manipulationResistance: 0.1 // Extremely vulnerable to manipulation
      }
    };

    Object.entries(institutionalData).forEach(([symbol, data]) => {
      this.institutionalAssets.set(symbol, { symbol, ...data });
    });
  }

  /**
   * Update institutional flows (would connect to real data sources)
   */
  private async updateInstitutionalFlows(): Promise<void> {
    // Would update with real ETF flow data, institutional holdings, etc.
    // For now, institutional data is static but in production would be dynamic
  }

  /**
   * Get institutional flow data for symbol
   */
  private async getInstitutionalFlow(symbol: string): Promise<InstitutionalFlow> {
    const existing = this.institutionalAssets.get(symbol);
    if (existing) return existing;
    
    // Default for unknown assets (assume low institutional presence)
    return {
      symbol,
      institutionalPresence: 0.2,
      etfFlowDirection: 'NEUTRAL',
      etfFlowStrength: 0.1,
      stabilityScore: 0.3,
      largeHolderConcentration: 0.8,
      liquidityDepth: 0.4,
      manipulationResistance: 0.3
    };
  }

  /**
   * Public methods for integration
   */
  
  /**
   * Get safe leverage for a symbol
   */
  async getSafeLeverageForSymbol(symbol: string): Promise<number> {
    const institutional = await this.getInstitutionalFlow(symbol);
    const manipulation = await manipulationDetector.detectManipulation([symbol]);
    const baseLeverage = this.baseLeverageSettings[symbol as keyof typeof this.baseLeverageSettings] 
                        || this.baseLeverageSettings.default;

    const mockHunt: ProfitHunt = {
      symbol,
      huntType: 'VOLUME_SPIKE',
      expectedReturn: 5,
      maxDownside: 3,
      expectancyRatio: 1.67,
      probabilityOfProfit: 0.6,
      signalStrength: 0.7,
      uniquenessScore: 0.5,
      timeDecay: 0.5,
      competitorThreat: 0.5,
      aggressiveness: 'MEDIUM',
      entrySpeed: 'FAST',
      exitSpeed: 'TARGET',
      positionRisk: 0.05,
      maxHoldMinutes: 120,
      similarHistoricalTrades: 10,
      historicalSuccessRate: 0.6,
      avgHistoricalReturn: 5,
      learningConfidence: 0.7,
      marketRegime: 'NORMAL',
      volatilityLevel: 'MEDIUM',
      liquidityLevel: 'MEDIUM',
      newsContext: [],
      competitiveAdvantage: 'AI detection',
      metadata: {
        detectedAt: new Date(),
        hunterVersion: '1.0',
        rawSignalData: {},
        evolutionGeneration: 1
      }
    };

    const leverageCalc = this.calculateSafeLeverage(
      mockHunt,
      institutional,
      manipulation.length > 0 ? manipulation[0] : null,
      baseLeverage
    );

    return leverageCalc.safeLeverage;
  }

  /**
   * Check if it's safe to trade a symbol with leverage
   */
  async isSafeToTrade(symbol: string): Promise<boolean> {
    const safeLeverage = await this.getSafeLeverageForSymbol(symbol);
    const manipulation = manipulationDetector.getManipulationStatus(symbol);
    
    return safeLeverage >= 1.2 && // At least 1.2x leverage available
           !manipulationDetector.shouldPauseTrading(symbol) && // No manipulation pause
           (!manipulation || manipulation.severity !== 'EXTREME'); // No extreme manipulation
  }
}

// Export singleton
export const leverageSafePredator = new QuantumForgeLeverageSafePredator();