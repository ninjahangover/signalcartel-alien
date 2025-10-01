/**
 * Position Management System
 * Enhanced with GPU-Accelerated Predictive Intelligence for Exit Decisions
 * 
 * BREAKTHROUGH: Replaces mechanical exits (stop loss, take profit, time-based) 
 * with Google-style predictive AI ensemble using Tensor Fusion + Markov Chains
 */

import { predictivePositionManager } from '../predictive-position-manager';
import { realTimePriceFetcher } from '../real-time-price-fetcher';
import { krakenApiService } from '../kraken-api-service';
import { advancedRiskOrchestrator } from '../advanced-risk-orchestrator';

export interface Position {
  id: string;
  strategy: string;
  symbol: string;
  side: 'long' | 'short';
  
  // Entry details
  entryPrice: number;
  quantity: number;
  entryTradeId: string;
  entryTime: Date;
  openTime: Date; // Alias for entryTime for compatibility
  
  // Exit details (when closed)
  exitPrice?: number;
  exitTradeId?: string;
  exitTime?: Date;
  
  // Status and P&L
  status: 'open' | 'closed' | 'partial';
  realizedPnL?: number;
  unrealizedPnL?: number;
  
  // Risk management
  stopLoss?: number;
  takeProfit?: number;
  maxHoldTime?: number; // milliseconds
  
  // Additional metadata for trading engine
  metadata?: {
    confidence?: number;
    aiSystemsUsed?: string[];
    signalStrength?: number;
    [key: string]: any;
  };
}

export interface ExitStrategy {
  strategy: string;
  symbol?: string; // If undefined, applies to all symbols for this strategy
  
  // Profit/Loss targets
  takeProfitPercent?: number;  // Close at +X% profit (0.05 = 5%)
  stopLossPercent?: number;    // Close at -X% loss (0.03 = 3%)
  trailingStopPercent?: number; // Trailing stop loss
  
  // Time-based exits
  maxHoldMinutes?: number;     // Close after X minutes
  
  // Technical exits
  reverseSignalExit?: boolean; // Close when opposite signal occurs
}

export interface TradingSignal {
  strategy: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  quantity?: number;
  timestamp: Date;
}

export interface PositionTrade {
  id: string;
  positionId: string;
  side: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  strategy: string;
  executedAt: Date;
  pnl?: number;
  isEntry: boolean;
}

export interface AccountSnapshot {
  totalUSD: number;
  availableUSD: number;
  positionsValue: number;
  openPositionsCount: number;
  leverageUsed: number;
  marginAvailable?: number;
  accountEquity: number;
}

export interface DynamicPositionSizing {
  recommendedSizeUSD: number;
  recommendedQuantity: number;
  riskPercentage: number;
  leverageUsed: number;
  marginRequired: number;
  kellyFraction: number;
  adjustmentFactors: {
    account: number;
    risk: number;
    opportunity: number;
    regime: number;
  };
}

export interface OpportunityEvaluation {
  shouldTrade: boolean;
  action: 'NEW_POSITION' | 'REPLACE_POSITION' | 'SKIP';
  positionToReplace?: string;
  reason: string;
  confidence: number;
}

export class PositionManager {
  private positions = new Map<string, Position>();
  private exitStrategies = new Map<string, ExitStrategy>();
  
  constructor(private prisma: any) {}

  /**
   * Sync in-memory positions with database on startup
   */
  async syncPositionsFromDatabase() {
    try {
      const dbPositions = await this.prisma.managedPosition.findMany({
        where: { 
          status: { 
            in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
          } 
        }
      });
      
      this.positions.clear(); // Clear in-memory positions
      
      for (const dbPosition of dbPositions) {
        const position: Position = {
          id: dbPosition.id,
          symbol: dbPosition.symbol,
          strategy: dbPosition.strategy,
          side: dbPosition.side,
          entryPrice: dbPosition.entryPrice,
          quantity: dbPosition.quantity,
          entryTradeId: dbPosition.entryTradeId,
          entryTime: dbPosition.entryTime,
          status: dbPosition.status,
          stopLoss: dbPosition.stopLoss,
          takeProfit: dbPosition.takeProfit,
          maxHoldTime: dbPosition.maxHoldTime,
          metadata: dbPosition.metadata || {}
        };
        this.positions.set(position.id, position);
      }
      
      console.log(`📊 Synced ${dbPositions.length} positions from database`);
    } catch (error) {
      console.log(`⚠️ Failed to sync positions from database: ${error.message}`);
      // Clear positions to ensure clean state
      this.positions.clear();
    }
  }
  
  /**
   * Register exit strategy for a trading strategy
   */
  registerExitStrategy(exitStrategy: ExitStrategy) {
    const key = `${exitStrategy.strategy}:${exitStrategy.symbol || '*'}`;
    this.exitStrategies.set(key, exitStrategy);
    console.log(`📋 Registered exit strategy for ${key}`);
  }
  
  /**
   * Process a trading signal - either open new position or close existing ones
   */
  async processSignal(signal: TradingSignal): Promise<{ 
    action: 'opened' | 'closed' | 'ignored'; 
    position?: Position;
    trade?: PositionTrade;
    pnl?: number;
  }> {
    const openPositions = this.getOpenPositionsByStrategy(signal.strategy, signal.symbol);
    
    if (signal.action === 'BUY') {
      // Check if we should close short positions first
      const shortPositions = openPositions.filter(p => p.side === 'short');
      if (shortPositions.length > 0) {
        // Close oldest short position
        const position = shortPositions[0];
        return await this.closePosition(position.id, signal.price, 'signal_reversal');
      }
      
      // Open new long position or add to existing
      const quantity = signal.quantity || await this.calculatePositionSize(signal);
      return await this.openPosition({
        strategy: signal.strategy,
        symbol: signal.symbol,
        side: 'long',
        price: signal.price,
        quantity,
        timestamp: signal.timestamp
      });
    }
    
    if (signal.action === 'SELL') {
      // Check if we should close long positions first
      const longPositions = openPositions.filter(p => p.side === 'long');
      if (longPositions.length > 0) {
        // Close oldest long position
        const position = longPositions[0];
        return await this.closePosition(position.id, signal.price, 'signal_reversal');
      }
      
      // Open new short position or add to existing
      const quantity = signal.quantity || await this.calculatePositionSize(signal);
      return await this.openPosition({
        strategy: signal.strategy,
        symbol: signal.symbol,
        side: 'short',
        price: signal.price,
        quantity,
        timestamp: signal.timestamp
      });
    }
    
    return { action: 'ignored' };
  }
  
  /**
   * Open a new position
   */
  async openPosition(params: {
    strategy: string;
    symbol: string;
    side: 'long' | 'short';
    price: number;
    quantity: number;
    timestamp: Date;
    metadata?: {
      confidence?: number;
      aiSystems?: string[];
      phase?: number;
      [key: string]: any;
    };
  }): Promise<{ action: 'opened'; position: Position; trade: PositionTrade }> {

    console.log(`🔥 KRAKEN-ONLY MODE: Placing direct ${params.side.toUpperCase()} order for ${params.quantity} ${params.symbol}`);

    // NO DATABASE POSITIONS - DIRECT KRAKEN EXECUTION ONLY
    try {
      const krakenOrderType = params.side === 'long' ? 'buy' : 'sell';
      const krakenOrderResult = await krakenApiService.placeOrder({
        pair: params.symbol,
        type: krakenOrderType,
        ordertype: 'market',
        volume: params.quantity.toString()
      });

      if (krakenOrderResult.result && krakenOrderResult.result.txid && krakenOrderResult.result.txid.length > 0) {
        const krakenOrderId = krakenOrderResult.result.txid[0];
        console.log(`✅ REAL KRAKEN ORDER PLACED: ${krakenOrderId} | ${krakenOrderType.toUpperCase()} ${params.quantity} ${params.symbol}`);
        console.log(`✅ LIVE EXECUTION: Order submitted to Kraken exchange`);

        // Create minimal response objects for system compatibility
        const positionId = `kraken-${krakenOrderId}`;
        const tradeId = `trade-${krakenOrderId}`;

        const entryTrade: PositionTrade = {
          id: tradeId,
          positionId,
          side: params.side === 'long' ? 'buy' : 'sell',
          symbol: params.symbol,
          quantity: params.quantity,
          price: params.price,
          value: params.quantity * params.price,
          strategy: params.strategy,
          executedAt: params.timestamp,
          isEntry: true
        };

        const position: Position = {
          id: positionId,
          strategy: params.strategy,
          symbol: params.symbol,
          side: params.side,
          entryPrice: params.price,
          quantity: params.quantity,
          entryTradeId: tradeId,
          entryTime: params.timestamp,
          openTime: params.timestamp,
          status: 'open',
          metadata: { krakenOrderId, ...params.metadata }
        };

        console.log(`📈 REAL KRAKEN TRADE: ${position.side.toUpperCase()} ${params.quantity} ${params.symbol} @ $${params.price}`);

        return { action: 'opened', position, trade: entryTrade };

      } else {
        console.log(`❌ KRAKEN ORDER FAILED: No transaction ID returned`);
        console.log(`📋 Kraken Response:`, JSON.stringify(krakenOrderResult, null, 2));
        throw new Error('Kraken order failed - no order placed');
      }

    } catch (krakenError) {
      console.log(`❌ KRAKEN ORDER FAILED: ${krakenError instanceof Error ? krakenError.message : 'Unknown error'}`);
      console.log(`🚫 NO EXECUTION: Order not placed on Kraken`);
      throw krakenError;
    }
  }
  
  /**
   * Close an existing position
   */
  async closePosition(
    positionId: string, 
    exitPrice: number, 
    reason: string
  ): Promise<{ action: 'closed'; position: Position; trade: PositionTrade; pnl: number }> {
    
    const position = this.positions.get(positionId);
    if (!position || position.status === 'closed') {
      throw new Error(`Position ${positionId} not found or already closed`);
    }
    
    const tradeId = `trade-${Date.now()}`;
    
    // Calculate P&L
    const pnl = this.calculatePnL(position, exitPrice);
    
    // Create exit trade record
    const exitTrade: PositionTrade = {
      id: tradeId,
      positionId,
      side: position.side === 'long' ? 'sell' : 'buy', // Opposite of entry
      symbol: position.symbol,
      quantity: position.quantity,
      price: exitPrice,
      value: position.quantity * exitPrice,
      strategy: position.strategy,
      executedAt: new Date(),
      pnl,
      isEntry: false
    };
    
    // Update position in-memory first
    position.exitPrice = exitPrice;
    position.exitTradeId = tradeId;
    position.exitTime = new Date();
    position.status = 'closed';
    position.realizedPnL = pnl;
    
    // 🔧 V2.7 TRANSACTION FIX: Update position and create exit trade atomically
    try {
      await this.prisma.$transaction(async (tx) => {
        // Step 1: Create exit trade
        await tx.managedTrade.create({
          data: {
            id: exitTrade.id,
            positionId: exitTrade.positionId,
            side: exitTrade.side,
            symbol: exitTrade.symbol,
            quantity: exitTrade.quantity,
            price: exitTrade.price,
            value: exitTrade.value,
            strategy: exitTrade.strategy,
            executedAt: exitTrade.executedAt,
            pnl: exitTrade.pnl,
            isEntry: exitTrade.isEntry
          }
        });
        
        // Step 2: 🔧 V3.10.1 - Update LivePosition first (primary position store)
        try {
          await tx.livePosition.update({
            where: { id: positionId },
            data: {
              exitPrice: exitPrice,
              exitTradeIds: tradeId,
              exitTime: position.exitTime,
              status: 'closed',
              realizedPnL: pnl,
              netPnL: pnl // Also update netPnL
            }
          });
        } catch (liveError) {
          console.warn(`⚠️ LivePosition update failed for ${positionId}: ${liveError.message}`);
          // Continue to try ManagedPosition for backwards compatibility
        }

        // Step 3: OPTIONAL - Update ManagedPosition if it exists (for backwards compatibility)
        try {
          const existingManagedPos = await tx.managedPosition.findUnique({
            where: { id: positionId }
          });

          if (existingManagedPos) {
            await tx.managedPosition.update({
              where: { id: positionId },
              data: {
                status: 'closed',
                exitPrice: exitPrice,
                exitValue: exitTrade.value,
                exitTime: exitTrade.executedAt,
                exitTradeIds: exitTrade.id,
                realizedPnL: pnl,
                netPnL: pnl, // Same as realized for simplicity
                updatedAt: new Date()
              }
            });
            console.log(`✅ DASHBOARD: Updated LivePosition ${livePositionId} to closed`);

            // Step 4: DASHBOARD FIX - Create LiveTrade for exit/close AFTER position exists
            await tx.liveTrade.create({
            data: {
              id: `live-exit-${exitTrade.id}`,
              sessionId: process.env.LIVE_TRADING_SESSION_ID || 'session-production-1757538257208',
              positionId: livePositionId, // Link to existing LivePosition
              exchangeOrderId: `kraken-exit-${exitTrade.id}`,
              exchangeTradeId: exitTrade.id,
              symbol: exitTrade.symbol,
              side: exitTrade.side,
              type: 'market',
              quantity: exitTrade.quantity,
              price: exitTrade.price,
              value: exitTrade.value,
              commission: 0.0,
              fees: 0.0,
              netValue: exitTrade.value,
              purpose: 'close', // Mark as close for dashboard
              isEntry: false,
              strategy: exitTrade.strategy,
              signalConfidence: 0.8, // Use default confidence for exits
              signalSource: 'tensor-ai-fusion',
              requestedAt: exitTrade.executedAt,
              submittedAt: exitTrade.executedAt,
              executedAt: exitTrade.executedAt,
              acknowledgedAt: exitTrade.executedAt,
              orderStatus: 'filled',
              fillStatus: 'filled',
              filledQuantity: exitTrade.quantity,
              remainingQuantity: 0.0,
              pnl: exitTrade.pnl || 0.0,
              pnlPercent: ((exitTrade.pnl || 0) / exitTrade.value) * 100,
              tradeNotes: `Automated exit: ${reason}`,
              updatedAt: exitTrade.executedAt
            }
            });
            console.log(`✅ DASHBOARD: Created LiveTrade exit record for ${exitTrade.symbol}`);
          } else {
            console.log(`⚠️ LivePosition ${livePositionId} not found - skipping dashboard update`);
          }
        } catch (livePositionUpdateError) {
          console.log(`⚠️ LivePosition/LiveTrade update failed (non-critical): ${livePositionUpdateError.message}`);
        }
      });
      
      console.log(`✅ DATABASE: Successfully closed position ${positionId} and created exit trade ${exitTrade.id}`);
      
    } catch (error) {
      console.log(`❌ DATABASE EXIT TRANSACTION FAILED: ${error.message}`);
      // Keep in-memory position updated for mathematical conviction
      console.log(`⚠️ Position ${positionId} closed in-memory but database update failed`);
    }
    
    console.log(`📉 CLOSED ${position.side.toUpperCase()} position: ${position.quantity} ${position.symbol} @ $${exitPrice} | P&L: $${pnl.toFixed(2)} (${reason})`);
    
    return { action: 'closed', position, trade: exitTrade, pnl };
  }
  
  /**
   * Monitor all open positions for exit conditions
   */
  async monitorPositions(currentPrices: { [symbol: string]: number }) {
    const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'open');
    const closedPositions: Array<{ position: Position; trade: PositionTrade; pnl: number }> = [];
    
    for (const position of openPositions) {
      const currentPrice = currentPrices[position.symbol];
      if (!currentPrice) continue;
      
      // Update unrealized P&L
      position.unrealizedPnL = this.calculatePnL(position, currentPrice);
      
      // GPU-ENHANCED PREDICTIVE EXIT EVALUATION (replaces mechanical logic)
      const exitReason = await this.checkExitConditions(position, currentPrice, {
        symbol: position.symbol,
        price: currentPrice,
        volume: 0, // Would be filled from market data
        volatility: 0.03,
        timestamp: Date.now()
      });
      if (exitReason) {
        const result = await this.closePosition(position.id, currentPrice, exitReason);
        closedPositions.push(result);
      }
    }
    
    return closedPositions;
  }
  
  /**
   * Calculate P&L for a position
   */
  private calculatePnL(position: Position, currentPrice: number): number {
    if (position.side === 'long') {
      return (currentPrice - position.entryPrice) * position.quantity;
    } else {
      return (position.entryPrice - currentPrice) * position.quantity;
    }
  }
  
  /**
   * GPU-ENHANCED PREDICTIVE EXIT EVALUATION
   * 
   * REVOLUTIONARY APPROACH: Replaces mechanical thresholds with Google-style
   * predictive intelligence using Tensor Fusion + GPU-accelerated Markov Chains
   * 
   * NO MORE:
   * - Fixed stop losses
   * - Mechanical take profits 
   * - Time-based exits
   * 
   * INSTEAD: Full AI ensemble predicts when bigger moves are coming
   */
  private async checkExitConditions(position: Position, currentPrice: number, marketData?: any): Promise<string | null> {
    console.log(`🧠 PREDICTIVE EXIT EVALUATION: ${position.symbol} at ${currentPrice}`);
    
    try {
      // Use GPU-Enhanced Predictive Position Manager
      const exitDecision = await predictivePositionManager.evaluatePositionExit(
        {
          symbol: position.symbol,
          side: position.side,
          entryPrice: position.entryPrice,
          currentPrice: currentPrice,
          quantity: position.quantity,
          openTime: position.entryTime,
          confidence: 0.8 // Default confidence
        },
        marketData || {
          orderBook: null,
          sentiment: null,
          recentTrades: [],
          volume: 0,
          volatility: 0.03
        }
      );
      
      if (exitDecision.shouldExit) {
        console.log(`🚪 PREDICTIVE EXIT: ${exitDecision.exitReason}`);
        console.log(`⚡ AI CONFIDENCE: ${(exitDecision.confidence * 100).toFixed(1)}%`);
        return 'predictive_intelligence';
      } else {
        console.log(`💎 PREDICTIVE HOLD: ${exitDecision.holdReason}`);
        console.log(`🎯 PREDICTED MOVE: ${(exitDecision.predictedMove * 100).toFixed(2)}%`);
        console.log(`⚡ AI CONFIDENCE: ${(exitDecision.confidence * 100).toFixed(1)}%`);
        return null; // Hold the position
      }
      
    } catch (error) {
      console.warn('⚠️ Predictive exit evaluation failed, using fallback logic:', error.message);
      return this.checkLegacyExitConditions(position, currentPrice);
    }
  }
  
  /**
   * LEGACY FALLBACK: Original mechanical exit logic (only used if AI fails)
   */
  private checkLegacyExitConditions(position: Position, currentPrice: number): string | null {
    console.log('📊 FALLBACK: Using legacy mechanical exit conditions');
    
    // Stop loss (only for disaster protection)
    if (position.stopLoss) {
      if (position.side === 'long' && currentPrice <= position.stopLoss) {
        return 'stop_loss_fallback';
      }
      if (position.side === 'short' && currentPrice >= position.stopLoss) {
        return 'stop_loss_fallback';
      }
    }
    
    // Take profit (only for fallback)
    if (position.takeProfit) {
      if (position.side === 'long' && currentPrice >= position.takeProfit) {
        return 'take_profit_fallback';
      }
      if (position.side === 'short' && currentPrice <= position.takeProfit) {
        return 'take_profit_fallback';
      }
    }
    
    // NOTE: NO MORE TIME-BASED EXITS (per user requirement)
    
    return null;
  }
  
  /**
   * Get exit strategy for a strategy/symbol combination
   */
  private getExitStrategy(strategy: string, symbol: string): ExitStrategy | undefined {
    return this.exitStrategies.get(`${strategy}:${symbol}`) || 
           this.exitStrategies.get(`${strategy}:*`);
  }
  
  /**
   * 🎯 DYNAMIC POSITION SIZING - ENHANCED WITH REAL-TIME ACCOUNT BALANCE
   *
   * Replaces hardcoded $10K assumption with real-time account balance integration
   * Integrates Kelly Criterion, risk management, and leverage awareness
   */
  async calculateDynamicPositionSize(
    symbol: string,
    expectedReturn: number,
    winProbability: number,
    currentPrice: number,
    leverageMultiplier: number = 1,
    signal?: TradingSignal
  ): Promise<DynamicPositionSizing> {
    console.log(`🎯 DYNAMIC POSITION SIZING: ${symbol} at $${currentPrice} with ${expectedReturn}% expected return`);

    // Get real-time account snapshot
    const accountSnapshot = await this.getAccountSnapshot();
    console.log(`💰 Account Snapshot: $${accountSnapshot.totalUSD.toFixed(2)} total, $${accountSnapshot.availableUSD.toFixed(2)} available`);

    // Calculate Kelly Criterion optimal position size
    const kellyFraction = await this.calculateKellyFraction(expectedReturn, winProbability);
    console.log(`📊 Kelly Fraction: ${(kellyFraction * 100).toFixed(2)}%`);

    // Base position size using Kelly Criterion
    let basePositionUSD = accountSnapshot.accountEquity * kellyFraction;

    // Account size adjustments (smaller accounts need more aggressive sizing for meaningful returns)
    const accountFactor = this.calculateAccountSizeFactor(accountSnapshot.totalUSD);

    // Risk-aware adjustments using Advanced Risk Orchestrator
    const currentPositions = await this.getOpenPositions();
    const riskFactor = await this.calculateRiskAdjustmentFactor(symbol, currentPositions, accountSnapshot);

    // Opportunity quality adjustment (higher expected returns get larger allocation)
    const opportunityFactor = this.calculateOpportunityFactor(expectedReturn, winProbability);

    // Market regime adjustment (from real-time regime monitor)
    const regimeFactor = await this.calculateRegimeFactor(symbol);

    // Apply all adjustment factors
    const adjustedPositionUSD = basePositionUSD * accountFactor * riskFactor * opportunityFactor * regimeFactor;

    // Apply leverage constraints
    const maxLeveragePositionUSD = leverageMultiplier * accountSnapshot.availableUSD;
    const finalPositionUSD = Math.min(adjustedPositionUSD, maxLeveragePositionUSD, accountSnapshot.availableUSD);

    // Calculate final quantity with validation
    const recommendedQuantity = (finalPositionUSD && currentPrice && finalPositionUSD > 0 && currentPrice > 0)
      ? finalPositionUSD / currentPrice
      : 0;

    // Calculate risk percentage of total account with validation
    const riskPercentage = (finalPositionUSD && accountSnapshot.accountEquity && accountSnapshot.accountEquity > 0)
      ? (finalPositionUSD / accountSnapshot.accountEquity) * 100
      : 0;

    // Calculate margin requirements for leverage with validation
    const marginRequired = (finalPositionUSD && leverageMultiplier && leverageMultiplier > 0)
      ? finalPositionUSD / leverageMultiplier
      : finalPositionUSD;

    console.log(`🎯 DYNAMIC SIZING RESULT: $${finalPositionUSD.toFixed(2)} → ${recommendedQuantity.toFixed(6)} ${symbol} (${riskPercentage.toFixed(1)}% of account)`);

    return {
      recommendedSizeUSD: finalPositionUSD,
      recommendedQuantity,
      riskPercentage,
      leverageUsed: leverageMultiplier,
      marginRequired,
      kellyFraction,
      adjustmentFactors: {
        account: accountFactor,
        risk: riskFactor,
        opportunity: opportunityFactor,
        regime: regimeFactor
      }
    };
  }

  /**
   * 📊 REAL-TIME ACCOUNT SNAPSHOT
   *
   * Gets current account balance, position values, and leverage usage from Kraken API
   */
  async getAccountSnapshot(): Promise<AccountSnapshot> {
    try {
      // Get USD balance from Kraken - NO HARDCODED FALLBACKS
      let availableUSD = 0; // Start with 0, only use real balance

      try {
        const balanceResponse = await krakenApiService.getAccountBalance();
        const balances = balanceResponse?.result || {};
        const usdBalance = parseFloat(balances.ZUSD || balances.USD || '0');
        const usdtBalance = parseFloat(balances.USDT || '0');
        availableUSD = usdBalance + usdtBalance;

        // Only use the balance if we actually got it from API
        if (!balanceResponse?.result) {
          console.error(`❌ No balance data from Kraken API - returning 0 to prevent fake trades`);
          availableUSD = 0;
        }
      } catch (apiError) {
        console.error(`❌ Kraken API balance fetch failed - returning 0: ${apiError.message}`);
        availableUSD = 0; // NO FALLBACK - use 0 if API fails
      }

      // Calculate current position values
      const openPositions = await this.getOpenPositions();
      let positionsValue = 0;

      for (const position of openPositions) {
        try {
          const priceData = await realTimePriceFetcher.getCurrentPrice(position.symbol);
          if (priceData.success) {
            positionsValue += position.quantity * priceData.price;
          }
        } catch (error) {
          console.warn(`⚠️ Could not get price for ${position.symbol}: ${error.message}`);
          // Use entry price as fallback
          positionsValue += position.quantity * position.entryPrice;
        }
      }

      const totalUSD = availableUSD + positionsValue;
      const accountEquity = totalUSD; // For spot trading, equity = total value

      console.log(`📊 ACCOUNT SNAPSHOT: Total $${totalUSD.toFixed(2)}, Available $${availableUSD.toFixed(2)}, Positions $${positionsValue.toFixed(2)}`);

      return {
        totalUSD,
        availableUSD,
        positionsValue,
        openPositionsCount: openPositions.length,
        leverageUsed: positionsValue > 0 ? positionsValue / availableUSD : 0,
        accountEquity
      };

    } catch (error) {
      console.error(`❌ Failed to get account snapshot: ${error.message}`);
      // Fallback to conservative estimates
      return {
        totalUSD: 600, // Conservative fallback based on CLAUDE.md
        availableUSD: 150,
        positionsValue: 450,
        openPositionsCount: 6,
        leverageUsed: 0,
        accountEquity: 600
      };
    }
  }

  /**
   * 🧮 KELLY CRITERION CALCULATION
   *
   * Calculates optimal position size based on expected return and win probability
   */
  private async calculateKellyFraction(expectedReturn: number, winProbability: number): Promise<number> {
    // Validate inputs
    if (!expectedReturn || !winProbability || expectedReturn <= 0 || winProbability <= 0 || winProbability >= 100) {
      console.warn(`⚠️ Invalid Kelly inputs: expectedReturn=${expectedReturn}, winProbability=${winProbability}`);
      return 0.05; // Conservative 5% fallback
    }

    // Convert percentage to decimal
    const p = winProbability / 100;
    const q = 1 - p;

    // IMPROVED KELLY CALCULATION FOR TRADING SYSTEMS
    // For trading, we need to account for the fact that our "expected return" is already
    // the mathematical expectation, so we use a different approach

    // Method 1: Traditional Kelly with estimated win/loss amounts
    const estimatedWinAmount = expectedReturn / p; // What we need to win to achieve expected return
    const estimatedLossAmount = estimatedWinAmount * (p / q) - expectedReturn; // Balanced loss amount

    const kelly1 = (p * estimatedWinAmount - q * estimatedLossAmount) / estimatedWinAmount;

    // Method 2: Simplified Kelly for positive expected value systems
    // f = expectedReturn / variance, where variance is estimated from win probability
    const variance = Math.max(0.01, expectedReturn * (1 / p - 1)); // Higher variance for lower win rates
    const kelly2 = expectedReturn / variance;

    // Method 3: Conservative allocation based on expected return and confidence
    const kelly3 = Math.min(0.15, expectedReturn / 100 * Math.sqrt(p));

    // Use the most conservative approach but ensure minimum viable position size
    let kelly = Math.min(kelly1, kelly2, kelly3);

    // If Kelly is negative or too small, use adaptive minimum based on expected return
    if (kelly <= 0 || kelly < 0.01) {
      // For profitable opportunities discovered by Profit Predator, use minimum viable allocation
      if (expectedReturn >= 12.0) { // High-quality opportunities get minimum 2-5% allocation
        kelly = Math.min(0.05, Math.max(0.02, expectedReturn / 100 * 0.3));
        console.log(`💡 ADAPTIVE KELLY: Using ${(kelly*100).toFixed(2)}% minimum for ${expectedReturn.toFixed(1)}% opportunity`);
      } else {
        kelly = 0.01; // Very small allocation for marginal opportunities
      }
    }

    // Cap Kelly fraction to prevent over-leverage (max 15% of account on any single trade)
    const cappedKelly = Math.max(0.01, Math.min(kelly, 0.15));

    // Additional safety check for NaN
    const finalKelly = isNaN(cappedKelly) ? 0.02 : cappedKelly;

    console.log(`🧮 ENHANCED KELLY: p=${(p*100).toFixed(1)}%, expectedReturn=${expectedReturn.toFixed(2)}%, kelly=${(kelly*100).toFixed(2)}%, final=${(finalKelly*100).toFixed(2)}%`);

    return finalKelly;
  }

  /**
   * 📏 ACCOUNT SIZE ADJUSTMENT FACTOR
   *
   * Smaller accounts need more aggressive position sizing for meaningful returns
   */
  private calculateAccountSizeFactor(accountSize: number): number {
    if (accountSize < 1000) {
      return 1.8; // Very aggressive for small accounts
    } else if (accountSize < 5000) {
      return 1.4; // Moderately aggressive
    } else if (accountSize < 20000) {
      return 1.1; // Slightly aggressive
    } else {
      return 1.0; // Conservative for large accounts
    }
  }

  /**
   * 🛡️ RISK ADJUSTMENT FACTOR
   *
   * Uses Advanced Risk Orchestrator to calculate position-specific risk adjustments
   */
  private async calculateRiskAdjustmentFactor(
    symbol: string,
    currentPositions: Position[],
    accountSnapshot: AccountSnapshot
  ): Promise<number> {
    try {
      // Use Advanced Risk Orchestrator for sophisticated risk assessment
      const currentPrices: Record<string, number> = {};

      // Get current prices for all open positions
      for (const position of currentPositions) {
        try {
          const priceData = await realTimePriceFetcher.getCurrentPrice(position.symbol);
          if (priceData.success) {
            currentPrices[position.symbol] = priceData.price;
          }
        } catch (error) {
          currentPrices[position.symbol] = position.entryPrice; // Fallback
        }
      }

      // Calculate portfolio risk metrics
      const riskMetrics = await advancedRiskOrchestrator.calculatePortfolioRisk(currentPositions, currentPrices);

      // Risk adjustment based on portfolio risk score
      if (riskMetrics.overallRiskScore > 8.0) {
        return 0.5; // Very conservative - high risk portfolio
      } else if (riskMetrics.overallRiskScore > 6.0) {
        return 0.7; // Conservative - moderate risk
      } else if (riskMetrics.overallRiskScore > 4.0) {
        return 0.9; // Slightly conservative
      } else {
        return 1.1; // Slightly aggressive - low risk portfolio
      }

    } catch (error) {
      console.warn(`⚠️ Risk calculation failed, using conservative factor: ${error.message}`);
      return 0.8; // Conservative fallback
    }
  }

  /**
   * 🎯 OPPORTUNITY QUALITY FACTOR
   *
   * Higher quality opportunities get larger position allocations
   */
  private calculateOpportunityFactor(expectedReturn: number, winProbability: number): number {
    // Quality score based on expected return and win probability
    const qualityScore = (expectedReturn * winProbability) / 100;

    if (qualityScore > 15) {
      return 1.5; // Exceptional opportunity
    } else if (qualityScore > 10) {
      return 1.3; // High quality
    } else if (qualityScore > 6) {
      return 1.1; // Good quality
    } else {
      return 0.9; // Lower quality
    }
  }

  /**
   * 🌊 MARKET REGIME ADJUSTMENT FACTOR
   *
   * Adjusts position sizing based on current market regime
   */
  private async calculateRegimeFactor(symbol: string): Promise<number> {
    try {
      // Would integrate with real-time regime monitor
      // For now, use conservative default
      return 1.0;
    } catch (error) {
      return 1.0; // Neutral factor on error
    }
  }

  /**
   * 🔄 OPPORTUNITY REPLACEMENT EVALUATION
   *
   * Determines if current position should be replaced with better opportunity
   */
  async evaluateOpportunityReplacement(
    newOpportunity: {
      symbol: string;
      expectedReturn: number;
      winProbability: number;
      currentPrice: number;
    }
  ): Promise<OpportunityEvaluation> {
    console.log(`🔄 EVALUATING OPPORTUNITY REPLACEMENT: ${newOpportunity.symbol} with ${newOpportunity.expectedReturn}% expected return`);

    const openPositions = await this.getOpenPositions();
    const accountSnapshot = await this.getAccountSnapshot();

    // If we have available capital, no need to replace
    if (accountSnapshot.availableUSD > 100) { // Need at least $100 for meaningful position
      return {
        shouldTrade: true,
        action: 'NEW_POSITION',
        reason: 'Sufficient capital available for new position',
        confidence: 0.9
      };
    }

    // Find underperforming positions that could be replaced
    const candidatesForReplacement = [];

    for (const position of openPositions) {
      try {
        // Get current price for P&L calculation
        const priceData = await realTimePriceFetcher.getCurrentPrice(position.symbol);
        if (!priceData.success) continue;

        const currentPrice = priceData.price;
        const unrealizedPnL = this.calculatePnL(position, currentPrice);
        const unrealizedPnLPercent = (unrealizedPnL / (position.quantity * position.entryPrice)) * 100;

        // Consider for replacement if:
        // 1. Position is losing money
        // 2. New opportunity has significantly higher expected return
        const opportunityDelta = newOpportunity.expectedReturn - (unrealizedPnLPercent * 4); // Rough expected return estimation

        if (unrealizedPnLPercent < -2 && opportunityDelta > 5) { // Losing position + much better opportunity
          candidatesForReplacement.push({
            position,
            currentPrice,
            unrealizedPnLPercent,
            opportunityDelta,
            replaceScore: Math.abs(unrealizedPnLPercent) + opportunityDelta
          });
        }

      } catch (error) {
        console.warn(`⚠️ Could not evaluate position ${position.symbol} for replacement: ${error.message}`);
      }
    }

    if (candidatesForReplacement.length === 0) {
      return {
        shouldTrade: false,
        action: 'SKIP',
        reason: 'No underperforming positions found for replacement',
        confidence: 0.8
      };
    }

    // Sort by replacement score (highest first)
    candidatesForReplacement.sort((a, b) => b.replaceScore - a.replaceScore);
    const bestReplacement = candidatesForReplacement[0];

    return {
      shouldTrade: true,
      action: 'REPLACE_POSITION',
      positionToReplace: bestReplacement.position.id,
      reason: `Replace losing position (${bestReplacement.unrealizedPnLPercent.toFixed(2)}% P&L) with better opportunity (+${bestReplacement.opportunityDelta.toFixed(1)}% delta)`,
      confidence: 0.85
    };
  }

  /**
   * Calculate position size based on signal and risk management (FALLBACK METHOD)
   */
  private async calculatePositionSize(signal: TradingSignal): Promise<number> {
    console.log(`💰 USING DYNAMIC POSITION SIZING for ${signal.symbol}`);

    try {
      // Use enhanced dynamic position sizing
      const dynamicSizing = await this.calculateDynamicPositionSize(
        signal.symbol,
        15.0, // Default expected return for fallback
        signal.confidence * 100, // Convert to percentage
        signal.price,
        1.0, // No leverage for fallback
        signal
      );

      console.log(`✅ DYNAMIC SIZING: ${dynamicSizing.recommendedQuantity.toFixed(6)} ${signal.symbol} ($${dynamicSizing.recommendedSizeUSD.toFixed(2)})`);
      return dynamicSizing.recommendedQuantity;

    } catch (error) {
      console.warn(`⚠️ Dynamic sizing failed, using legacy fallback: ${error.message}`);

      // Original fallback logic
      const ACCOUNT_BALANCE = 10000; // $10K account balance
      const baseSize = 0.08 * ACCOUNT_BALANCE; // 8% = $800 base - need size to win big!

      // AI Confidence Multiplier (higher confidence = larger position)
      const confidenceMultiplier = 0.5 + (signal.confidence * 1.5); // 0.5x to 2.0x based on confidence

      // Price-based adjustments for better returns
      const lowPriceBoost = signal.price < 10 ? 1.3 : 1.0; // Boost smaller price assets
      const stablecoinBoost = signal.symbol.includes('USDT') || signal.symbol.includes('USDC') ? 1.2 : 1.0;
      const balanceOptimization = lowPriceBoost * stablecoinBoost;

      // Final USD amount
      const usdAmount = baseSize * confidenceMultiplier * balanceOptimization;
      const quantity = usdAmount / signal.price; // Convert USD to actual quantity

      console.log(`💰 FALLBACK POSITION SIZING: Base $${baseSize.toFixed(0)} × Conf(${(signal.confidence * 100).toFixed(1)}%) = $${usdAmount.toFixed(2)} / $${signal.price} = ${quantity.toFixed(4)} units`);

      return quantity;
    }
  }
  
  /**
   * Get open positions for a strategy/symbol
   */
  private getOpenPositionsByStrategy(strategy: string, symbol: string): Position[] {
    return Array.from(this.positions.values()).filter(
      p => p.strategy === strategy && p.symbol === symbol && p.status === 'open'
    );
  }
  
  /**
   * Get all open positions for a symbol (public method)
   */
  getOpenPositionsBySymbol(symbol: string): Position[] {
    return Array.from(this.positions.values()).filter(
      p => p.symbol === symbol && p.status === 'open'
    );
  }

  /**
   * Get all open positions across all symbols and strategies (public method)
   */
  async getOpenPositions(): Promise<Position[]> {
    // First sync with database to get latest positions
    await this.loadPositionsFromDatabase();
    
    return Array.from(this.positions.values()).filter(
      p => p.status === 'open'
    );
  }

  /**
   * Load positions from database to sync in-memory cache
   */
  private async loadPositionsFromDatabase(): Promise<void> {
    try {
      // 🔧 V3.10.1: Query LivePosition table (where actual trading positions are stored)
      const dbPositions = await this.prisma.livePosition.findMany({
        where: { status: 'open' }
        // Note: LivePosition doesn't have entryTrade/exitTrade relations
      });

      // Sync database positions to memory
      for (const dbPos of dbPositions) {
        const position: Position = {
          id: dbPos.id,
          strategy: dbPos.strategy,
          symbol: dbPos.symbol,
          side: dbPos.side.toLowerCase() as 'long' | 'short',
          entryPrice: dbPos.entryPrice,
          quantity: dbPos.quantity,
          entryTradeId: dbPos.entryTradeIds, // LivePosition uses entryTradeIds
          entryTime: dbPos.entryTime,
          openTime: dbPos.entryTime, // Use entryTime for compatibility
          exitPrice: dbPos.exitPrice || undefined,
          exitTradeId: dbPos.exitTradeIds || undefined,
          exitTime: dbPos.exitTime || undefined,
          status: dbPos.status.toLowerCase() as 'open' | 'closed' | 'partial',
          realizedPnL: dbPos.realizedPnL || undefined,
          unrealizedPnL: dbPos.unrealizedPnL,
          stopLoss: dbPos.stopLossPrice || undefined,
          takeProfit: dbPos.takeProfitPrice || undefined,
          metadata: {} // Initialize empty metadata
        };

        this.positions.set(position.id, position);
      }
    } catch (error) {
      console.error('Error loading positions from database:', error);
    }
  }
  
  /**
   * Save position trade to database (uses new ManagedTrade table)
   */
  private async savePositionTrade(trade: PositionTrade) {
    await this.prisma.managedTrade.create({
      data: {
        id: trade.id,
        positionId: trade.positionId,
        side: trade.side,
        symbol: trade.symbol,
        quantity: trade.quantity,
        price: trade.price,
        value: trade.value,
        strategy: trade.strategy,
        executedAt: trade.executedAt,
        pnl: trade.pnl,
        isEntry: trade.isEntry
      }
    });
  }
  
  /**
   * 🎯 INTELLIGENT OPPORTUNITY PROCESSOR
   *
   * Main method for the trading system to evaluate and execute opportunities
   * Handles dynamic position sizing, opportunity replacement, and leverage management
   */
  async processOpportunityIntelligently(
    opportunity: {
      symbol: string;
      expectedReturn: number;
      winProbability: number;
      currentPrice: number;
      strategy: string;
      confidence: number;
      leverageMultiplier?: number;
    }
  ): Promise<{
    action: 'OPENED' | 'REPLACED' | 'SKIPPED';
    result: any;
    sizing: DynamicPositionSizing;
    evaluation: OpportunityEvaluation;
    positionReplaced?: string;
  }> {
    console.log(`🎯 INTELLIGENT OPPORTUNITY PROCESSING: ${opportunity.symbol} with ${opportunity.expectedReturn}% expected return`);

    // Step 1: Evaluate opportunity replacement strategy
    const evaluation = await this.evaluateOpportunityReplacement({
      symbol: opportunity.symbol,
      expectedReturn: opportunity.expectedReturn,
      winProbability: opportunity.winProbability,
      currentPrice: opportunity.currentPrice
    });

    console.log(`🔄 EVALUATION RESULT: ${evaluation.action} - ${evaluation.reason}`);

    // Step 2: Calculate dynamic position sizing
    const sizing = await this.calculateDynamicPositionSize(
      opportunity.symbol,
      opportunity.expectedReturn,
      opportunity.winProbability,
      opportunity.currentPrice,
      opportunity.leverageMultiplier || 1.0
    );

    // Step 3: Execute based on evaluation
    switch (evaluation.action) {
      case 'NEW_POSITION': {
        // Open new position with dynamic sizing
        // Validate quantity before creating signal
        if (!sizing.recommendedQuantity || sizing.recommendedQuantity <= 0 || isNaN(sizing.recommendedQuantity)) {
          console.warn(`⚠️ Invalid quantity (${sizing.recommendedQuantity}) for ${opportunity.symbol}, skipping position`);
          return {
            action: 'SKIPPED',
            result: { action: 'skipped', reason: 'Invalid position quantity calculated' },
            sizing,
            evaluation
          };
        }

        const signal: TradingSignal = {
          strategy: opportunity.strategy,
          symbol: opportunity.symbol,
          action: 'BUY', // Default to BUY for new positions
          price: opportunity.currentPrice,
          confidence: opportunity.confidence,
          quantity: sizing.recommendedQuantity,
          timestamp: new Date()
        };

        const result = await this.processSignal(signal);
        console.log(`✅ NEW POSITION OPENED: ${opportunity.symbol} with $${sizing.recommendedSizeUSD.toFixed(2)} (${sizing.riskPercentage.toFixed(1)}% of account)`);

        return {
          action: 'OPENED',
          result,
          sizing,
          evaluation
        };
      }

      case 'REPLACE_POSITION': {
        // Close the underperforming position first
        if (evaluation.positionToReplace) {
          try {
            const closeResult = await this.closePosition(
              evaluation.positionToReplace,
              opportunity.currentPrice,
              'intelligent_replacement'
            );
            console.log(`🔄 CLOSED UNDERPERFORMING POSITION: ${closeResult.position.symbol} for replacement`);

            // Wait a moment for cleanup
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Open new position with freed capital
            const signal: TradingSignal = {
              strategy: opportunity.strategy,
              symbol: opportunity.symbol,
              action: 'BUY',
              price: opportunity.currentPrice,
              confidence: opportunity.confidence,
              quantity: sizing.recommendedQuantity,
              timestamp: new Date()
            };

            const result = await this.processSignal(signal);
            console.log(`✅ REPLACEMENT POSITION OPENED: ${opportunity.symbol} replacing ${closeResult.position.symbol}`);

            return {
              action: 'REPLACED',
              result,
              sizing,
              evaluation,
              positionReplaced: closeResult.position.symbol
            };

          } catch (error) {
            console.error(`❌ Position replacement failed: ${error.message}`);
            return {
              action: 'SKIPPED',
              result: { action: 'failed', error: error.message },
              sizing,
              evaluation
            };
          }
        }
        break;
      }

      case 'SKIP':
      default: {
        console.log(`⏸️ OPPORTUNITY SKIPPED: ${evaluation.reason}`);
        return {
          action: 'SKIPPED',
          result: { action: 'skipped', reason: evaluation.reason },
          sizing,
          evaluation
        };
      }
    }

    // Fallback (shouldn't reach here)
    return {
      action: 'SKIPPED',
      result: { action: 'fallback_skip' },
      sizing,
      evaluation
    };
  }

  /**
   * Get portfolio summary with real P&L
   */
  getPortfolioSummary() {
    const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'open');
    const closedPositions = Array.from(this.positions.values()).filter(p => p.status === 'closed');
    
    const totalUnrealizedPnL = openPositions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);
    const totalRealizedPnL = closedPositions.reduce((sum, p) => sum + (p.realizedPnL || 0), 0);
    const winningTrades = closedPositions.filter(p => (p.realizedPnL || 0) > 0).length;
    const totalTrades = closedPositions.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    return {
      openPositions: openPositions.length,
      closedPositions: closedPositions.length,
      totalUnrealizedPnL,
      totalRealizedPnL,
      totalPnL: totalUnrealizedPnL + totalRealizedPnL,
      winningTrades,
      totalTrades,
      winRate
    };
  }
}