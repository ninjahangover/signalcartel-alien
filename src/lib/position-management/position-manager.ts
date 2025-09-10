/**
 * Position Management System
 * Enhanced with GPU-Accelerated Predictive Intelligence for Exit Decisions
 * 
 * BREAKTHROUGH: Replaces mechanical exits (stop loss, take profit, time-based) 
 * with Google-style predictive AI ensemble using Tensor Fusion + Markov Chains
 */

import { predictivePositionManager } from '../predictive-position-manager';

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
        where: { status: 'open' }
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
      return await this.openPosition({
        strategy: signal.strategy,
        symbol: signal.symbol,
        side: 'long',
        price: signal.price,
        quantity: signal.quantity || this.calculatePositionSize(signal),
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
      return await this.openPosition({
        strategy: signal.strategy,
        symbol: signal.symbol,
        side: 'short',
        price: signal.price,
        quantity: signal.quantity || this.calculatePositionSize(signal),
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
    
    const positionId = `${params.strategy}-${params.symbol}-${Date.now()}`;
    const tradeId = `trade-${Date.now()}`;
    
    // Create entry trade record
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
    
    // Get exit strategy for this position
    const exitStrategy = this.getExitStrategy(params.strategy, params.symbol);
    
    // Create position
    const position: Position = {
      id: positionId,
      strategy: params.strategy,
      symbol: params.symbol,
      side: params.side,
      entryPrice: params.price,
      quantity: params.quantity,
      entryTradeId: tradeId,
      entryTime: params.timestamp,
      openTime: params.timestamp, // Set openTime for compatibility
      status: 'open',
      metadata: params.metadata || {}, // Include metadata
      
      // Apply exit strategy rules
      stopLoss: exitStrategy?.stopLossPercent ? 
        params.price * (1 - (params.side === 'long' ? exitStrategy.stopLossPercent : -exitStrategy.stopLossPercent)) : 
        undefined,
      takeProfit: exitStrategy?.takeProfitPercent ? 
        params.price * (1 + (params.side === 'long' ? exitStrategy.takeProfitPercent : -exitStrategy.takeProfitPercent)) : 
        undefined,
      maxHoldTime: exitStrategy?.maxHoldMinutes ? exitStrategy.maxHoldMinutes * 60 * 1000 : undefined
    };
    
    this.positions.set(positionId, position);
    
    // 🔧 V2.7 TRANSACTION FIX: Create position and trade atomically to resolve foreign key constraints
    console.log(`🔧 DEBUG: About to start database transaction for position ${position.id}`);
    console.log(`🔧 DEBUG: this.prisma is ${this.prisma ? 'defined' : 'undefined'}`);
    
    if (!this.prisma) {
      console.error(`❌ CRITICAL ERROR: Prisma client is undefined in PositionManager`);
      console.log(`📈 OPENED ${position.side.toUpperCase()} position: ${params.quantity} ${params.symbol} @ $${params.price} (IN-MEMORY ONLY - DATABASE FAILED)`);
      return { action: 'opened', position, trade: entryTrade };
    }
    
    try {
      await this.prisma.$transaction(async (tx) => {
        // Step 1: Create trade first (no circular dependency)
        await tx.managedTrade.create({
          data: {
            id: entryTrade.id,
            positionId: position.id, // Reference the position we're about to create
            side: entryTrade.side,
            symbol: entryTrade.symbol,
            quantity: entryTrade.quantity,
            price: entryTrade.price,
            value: entryTrade.value,
            strategy: entryTrade.strategy,
            executedAt: entryTrade.executedAt,
            pnl: entryTrade.pnl,
            isEntry: entryTrade.isEntry
          }
        });
        
        // Step 2: Create position with correct entryTradeId
        await tx.managedPosition.create({
          data: {
            id: position.id,
            strategy: position.strategy,
            symbol: position.symbol,
            side: position.side,
            entryPrice: position.entryPrice,
            quantity: position.quantity,
            entryTradeId: entryTrade.id, // Now we have the real trade ID
            entryTime: position.entryTime,
            status: position.status,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            maxHoldTime: position.maxHoldTime
            // Removed metadata field - not in database schema
          }
        });
        
        // Step 3: DASHBOARD FIX - Also create LiveTrade for dashboard visibility
        try {
          const sessionId = process.env.LIVE_TRADING_SESSION_ID || 'session-production-1757538257208';
          await tx.liveTrade.create({
            data: {
              id: `live-${entryTrade.id}`,
              sessionId: sessionId,
              positionId: null, // No LivePosition equivalent
              exchangeOrderId: `kraken-${entryTrade.id}`,
              exchangeTradeId: entryTrade.id,
              symbol: entryTrade.symbol,
              side: entryTrade.side,
              type: 'market',
              quantity: entryTrade.quantity,
              price: entryTrade.price,
              value: entryTrade.value,
              commission: 0.0,
              fees: 0.0,
              netValue: entryTrade.value,
              purpose: entryTrade.isEntry ? 'open' : 'close',
              isEntry: entryTrade.isEntry,
              strategy: entryTrade.strategy,
              signalConfidence: params.metadata?.confidence || 0.5,
              signalSource: 'tensor-ai-fusion',
              requestedAt: entryTrade.executedAt,
              submittedAt: entryTrade.executedAt,
              executedAt: entryTrade.executedAt,
              acknowledgedAt: entryTrade.executedAt,
              orderStatus: 'filled',
              fillStatus: 'filled',
              filledQuantity: entryTrade.quantity,
              remainingQuantity: 0.0,
              pnl: entryTrade.pnl || 0.0,
              pnlPercent: 0.0,
              tradeNotes: 'Automated Tensor AI Fusion trade',
              updatedAt: entryTrade.executedAt
            }
          });
        } catch (liveTradeError) {
          console.log(`⚠️ LiveTrade creation failed (non-critical): ${liveTradeError.message}`);
        }
      });
      
      console.log(`✅ DATABASE: Successfully created position ${position.id} and trade ${entryTrade.id}`);
      
    } catch (error) {
      console.log(`❌ DATABASE TRANSACTION FAILED: ${error.message}`);
      console.error(`❌ POSITION MANAGER ERROR: ${error.message}`, error.stack);
      // Don't throw - keep in-memory position for mathematical conviction to work
      // but log the error for debugging
      console.log(`⚠️ Position ${position.id} exists in-memory but not in database`);
    }
    
    console.log(`📈 OPENED ${position.side.toUpperCase()} position: ${params.quantity} ${params.symbol} @ $${params.price}`);
    
    return { action: 'opened', position, trade: entryTrade };
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
        
        // Step 2: Update position with exit information
        await tx.managedPosition.update({
          where: { id: positionId },
          data: {
            exitPrice: exitPrice,
            exitTradeId: tradeId,
            exitTime: position.exitTime,
            status: 'closed',
            realizedPnL: pnl
          }
        });
        
        // Step 3: DASHBOARD FIX - Also create LiveTrade for exit/close for dashboard visibility
        try {
          const sessionId = process.env.LIVE_TRADING_SESSION_ID || 'session-production-1757538257208';
          await tx.liveTrade.create({
            data: {
              id: `live-exit-${exitTrade.id}`,
              sessionId: sessionId,
              positionId: null, // No LivePosition equivalent
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
        } catch (liveTradeExitError) {
          console.log(`⚠️ LiveTrade exit creation failed (non-critical): ${liveTradeExitError.message}`);
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
   * Calculate position size based on signal and risk management
   */
  private calculatePositionSize(signal: TradingSignal): number {
    // 🔥 MATHEMATICAL POSITION SIZING - MATCH AI-FOCUSED ENGINE
    // Use 8% of $10K account with confidence scaling
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
      const dbPositions = await this.prisma.managedPosition.findMany({
        where: { status: 'open' },
        include: { entryTrade: true, exitTrade: true }
      });

      // Sync database positions to memory
      for (const dbPos of dbPositions) {
        const position: Position = {
          id: dbPos.id,
          strategy: dbPos.strategy,
          symbol: dbPos.symbol,
          side: dbPos.side as 'long' | 'short',
          entryPrice: parseFloat(dbPos.entryPrice),
          quantity: parseFloat(dbPos.quantity),
          entryTradeId: dbPos.entryTradeId,
          entryTime: dbPos.openTime,
          openTime: dbPos.openTime, // Set openTime for compatibility
          exitPrice: dbPos.exitPrice ? parseFloat(dbPos.exitPrice) : undefined,
          exitTradeId: dbPos.exitTradeId || undefined,
          exitTime: dbPos.exitTime || undefined,
          status: dbPos.status.toLowerCase() as 'open' | 'closed' | 'partial',
          realizedPnL: dbPos.realizedPnL ? parseFloat(dbPos.realizedPnL) : undefined,
          stopLoss: dbPos.stopLoss ? parseFloat(dbPos.stopLoss) : undefined,
          takeProfit: dbPos.takeProfit ? parseFloat(dbPos.takeProfit) : undefined,
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