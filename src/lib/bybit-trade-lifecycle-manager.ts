/**
 * BYBIT TRADE LIFECYCLE MANAGER™
 * Advanced trade management system with unique identifiers and lifecycle tracking
 * Adapted for ByBit CFT evaluation
 *
 * Features:
 * - Unique trade IDs for every position
 * - Complete trade lifecycle management (PENDING → OPEN → CLOSED)
 * - ByBit API integration for CFT evaluation
 * - Risk management integration
 * - Performance tracking per trade
 * - Integration with Unified Tensor Coordinator decisions
 */

import { PrismaClient } from '@prisma/client';
import { createByBitCFTClient } from './bybit-cft-client';
import { realTimePriceFetcher } from './real-time-price-fetcher';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface ByBitTradeIdentifier {
  tradeId: string;          // Unique UUID for this trade
  symbol: string;           // Trading pair (e.g., "BTCUSDT")
  side: 'BUY' | 'SELL';     // Trade direction
  timestamp: Date;          // When trade was initiated
  source: 'unified_coordinator' | 'profit_predator' | 'manual' | 'stop_loss' | 'take_profit';
}

export interface ByBitTradeLifecycleState {
  tradeId: string;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'CANCELLED' | 'FAILED';

  // Order information
  bybitOrderId?: string;    // ByBit's order ID
  requestedQuantity: number;
  filledQuantity: number;
  averageFillPrice: number;

  // Position tracking
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;

  // Risk management
  stopLossPrice?: number;
  takeProfitPrice?: number;
  stopLossOrderId?: string;
  takeProfitOrderId?: string;

  // Lifecycle timestamps
  createdAt: Date;
  openedAt?: Date;
  closedAt?: Date;
  lastUpdated: Date;

  // Decision context (for analysis)
  openingDecision?: any;    // Unified decision that opened this trade
  closingReason?: string;   // Why the trade was closed

  // Performance metrics
  holdTime?: number;        // Minutes held
  maxDrawdown?: number;     // Maximum unrealized loss
  maxProfit?: number;       // Maximum unrealized profit
}

export class ByBitTradeLifecycleManager {
  private static instance: ByBitTradeLifecycleManager;
  private activeTrades: Map<string, ByBitTradeLifecycleState> = new Map();
  private tradeHistory: ByBitTradeLifecycleState[] = [];
  private bybitClient: any;

  static getInstance(): ByBitTradeLifecycleManager {
    if (!ByBitTradeLifecycleManager.instance) {
      ByBitTradeLifecycleManager.instance = new ByBitTradeLifecycleManager();
    }
    return ByBitTradeLifecycleManager.instance;
  }

  constructor() {
    console.log('🆔 BYBIT TRADE LIFECYCLE MANAGER™ INITIALIZED');
    console.log('⚡ Unique trade identifier and lifecycle management active for CFT');

    try {
      this.bybitClient = createByBitCFTClient();
    } catch (error) {
      console.log('⚠️ CFT trading credentials not configured - trade lifecycle manager in read-only mode');
      this.bybitClient = null;
    }

    // Initialize by loading existing open positions
    this.loadExistingPositions();

    // Start periodic position updates
    this.startPositionMonitoring();
  }

  /**
   * CORE: Initiate a new trade with unique identifier
   */
  async initiateNewTrade(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    unifiedDecision: any,
    source: ByBitTradeIdentifier['source'] = 'unified_coordinator'
  ): Promise<{ tradeId: string; success: boolean; bybitOrderId?: string; error?: string }> {

    // Generate unique trade identifier
    const tradeId = this.generateTradeId(symbol, side);

    console.log(`🆔 INITIATING CFT TRADE: ${tradeId} - ${side} ${quantity} ${symbol}`);

    try {
      // Create initial trade lifecycle state
      const tradeState: ByBitTradeLifecycleState = {
        tradeId,
        status: 'PENDING',
        bybitOrderId: undefined,
        requestedQuantity: quantity,
        filledQuantity: 0,
        averageFillPrice: 0,
        createdAt: new Date(),
        lastUpdated: new Date(),
        openingDecision: unifiedDecision,

        // Risk management from unified decision
        stopLossPrice: unifiedDecision?.riskAssessment?.stopLoss,
        takeProfitPrice: unifiedDecision?.riskAssessment?.takeProfit
      };

      // Store in active trades
      this.activeTrades.set(tradeId, tradeState);

      // Execute trade through ByBit API
      const orderType = unifiedDecision?.execution?.orderType || 'Market';
      const limitPrice = unifiedDecision?.execution?.limitPrice;

      const orderResult = await this.bybitClient.placeOrder({
        category: 'spot',
        symbol,
        side,
        orderType,
        qty: quantity.toString(),
        price: limitPrice?.toString(),
        timeInForce: unifiedDecision?.execution?.timeInForce || 'GTC'
      });

      if (orderResult && orderResult.retCode === 0 && orderResult.result?.orderId) {
        // Update trade state with ByBit order ID
        tradeState.bybitOrderId = orderResult.result.orderId;
        tradeState.status = 'PARTIALLY_FILLED'; // Will update based on fill status
        tradeState.lastUpdated = new Date();

        // Store in database
        await this.persistTradeToDatabase(tradeState, symbol, side, source);

        console.log(`✅ CFT TRADE INITIATED: ${tradeId} → ByBit Order: ${orderResult.result.orderId}`);

        // Start monitoring this specific trade
        this.monitorTradeExecution(tradeId);

        return {
          tradeId,
          success: true,
          bybitOrderId: orderResult.result.orderId
        };

      } else {
        // Order failed
        tradeState.status = 'FAILED';
        tradeState.closingReason = `Order placement failed: ${orderResult?.retMsg || 'Unknown error'}`;
        tradeState.closedAt = new Date();

        // Move to history
        this.activeTrades.delete(tradeId);
        this.tradeHistory.push(tradeState);

        console.error(`❌ CFT TRADE FAILED: ${tradeId} - ${orderResult?.retMsg || 'Unknown error'}`);

        return {
          tradeId,
          success: false,
          error: orderResult?.retMsg || 'Unknown error'
        };
      }

    } catch (error) {
      console.error(`❌ CFT TRADE INITIATION ERROR: ${tradeId}`, error);

      // Clean up failed trade
      this.activeTrades.delete(tradeId);

      return {
        tradeId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close a specific trade by trade ID
   */
  async closeTradeById(
    tradeId: string,
    reason: string = 'manual_close',
    orderType: 'Market' | 'Limit' = 'Market',
    limitPrice?: number
  ): Promise<{ success: boolean; bybitOrderId?: string; error?: string }> {

    const trade = this.activeTrades.get(tradeId);
    if (!trade) {
      return { success: false, error: `Trade ${tradeId} not found in active trades` };
    }

    if (trade.status !== 'OPEN' && trade.status !== 'FILLED') {
      return { success: false, error: `Trade ${tradeId} is not in open state (status: ${trade.status})` };
    }

    console.log(`🔄 CLOSING CFT TRADE: ${tradeId} - Reason: ${reason}`);

    try {
      // Determine closing side (opposite of opening)
      const symbol = this.getSymbolFromTradeId(tradeId);
      const closingSide = trade.openingDecision?.finalDecision === 'BUY' ? 'Sell' : 'Buy';
      const closeQuantity = trade.filledQuantity;

      // Execute closing order
      const closeResult = await this.bybitClient.placeOrder({
        category: 'spot',
        symbol,
        side: closingSide,
        orderType,
        qty: closeQuantity.toString(),
        price: limitPrice?.toString(),
        timeInForce: 'GTC'
      });

      if (closeResult && closeResult.retCode === 0) {
        // Update trade state
        trade.status = 'CLOSING';
        trade.closingReason = reason;
        trade.lastUpdated = new Date();

        console.log(`✅ CLOSE ORDER PLACED: ${tradeId} → ByBit Order: ${closeResult.result.orderId}`);

        // Monitor the closing order
        this.monitorTradeClosing(tradeId, closeResult.result.orderId);

        return {
          success: true,
          bybitOrderId: closeResult.result.orderId
        };

      } else {
        console.error(`❌ CLOSE ORDER FAILED: ${tradeId} - ${closeResult?.retMsg}`);
        return {
          success: false,
          error: closeResult?.retMsg || 'Unknown error'
        };
      }

    } catch (error) {
      console.error(`❌ TRADE CLOSING ERROR: ${tradeId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all active trades
   */
  getActiveTrades(): Map<string, ByBitTradeLifecycleState> {
    return new Map(this.activeTrades);
  }

  /**
   * Get specific trade by ID
   */
  getTradeById(tradeId: string): ByBitTradeLifecycleState | undefined {
    return this.activeTrades.get(tradeId);
  }

  /**
   * Get trade statistics for CFT evaluation tracking
   */
  getTradeStatistics(): any {
    const active = Array.from(this.activeTrades.values());
    const history = this.tradeHistory;
    const all = [...active, ...history];

    const completed = history.filter(t => t.status === 'CLOSED');
    const profitable = completed.filter(t => (t.realizedPnL || 0) > 0);

    return {
      activeTrades: active.length,
      totalTrades: all.length,
      completedTrades: completed.length,
      winRate: completed.length > 0 ? profitable.length / completed.length : 0,
      totalPnL: completed.reduce((sum, t) => sum + (t.realizedPnL || 0), 0),
      averageHoldTime: completed.length > 0 ?
        completed.reduce((sum, t) => sum + (t.holdTime || 0), 0) / completed.length : 0,

      // CFT-specific metrics
      totalUnrealizedPnL: active.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0),
      maxDrawdownActive: Math.min(0, ...active.map(t => t.maxDrawdown || 0)),
      dailyTrades: this.getDailyTradeCount(),

      // Trade sources
      sourceBreakdown: this.calculateSourceBreakdown(all)
    };
  }

  /**
   * Update all active trade positions with current market prices
   */
  async updateAllPositions(): Promise<void> {
    const updatePromises = Array.from(this.activeTrades.keys()).map(tradeId =>
      this.updateTradePosition(tradeId)
    );

    await Promise.allSettled(updatePromises);
  }

  /**
   * Get CFT evaluation progress summary
   */
  getCFTEvaluationSummary(): string {
    const stats = this.getTradeStatistics();

    return `
🏆 CFT TRADE TRACKING SUMMARY:
📊 Active Trades: ${stats.activeTrades}
🎯 Total Trades: ${stats.totalTrades}
✅ Completed: ${stats.completedTrades}
📈 Win Rate: ${(stats.winRate * 100).toFixed(1)}%
💰 Total P&L: $${stats.totalPnL.toFixed(2)}
⏱️ Avg Hold Time: ${stats.averageHoldTime.toFixed(1)} min
🔄 Today's Trades: ${stats.dailyTrades}
    `.trim();
  }

  /**
   * PRIVATE METHODS
   */

  private generateTradeId(symbol: string, side: 'BUY' | 'SELL'): string {
    const timestamp = Date.now();
    const uuid = uuidv4().slice(0, 8); // Short UUID
    return `CFT_${symbol}_${side}_${timestamp}_${uuid}`;
  }

  private async loadExistingPositions(): Promise<void> {
    try {
      // Load open positions from database and create trade IDs
      const openPositions = await prisma.managedPosition.findMany({
        where: { status: 'open' }
      });

      console.log(`📋 LOADING EXISTING CFT POSITIONS: Found ${openPositions.length} open positions`);

      for (const position of openPositions) {
        // Create trade ID for existing position (if not already exists)
        const existingTradeId = position.metadata?.tradeId as string;
        const tradeId = existingTradeId || this.generateTradeId(position.symbol, position.side.toUpperCase() as 'BUY' | 'SELL');

        const tradeState: ByBitTradeLifecycleState = {
          tradeId,
          status: 'OPEN',
          requestedQuantity: position.quantity,
          filledQuantity: position.quantity,
          averageFillPrice: position.entryPrice,
          entryPrice: position.entryPrice,
          currentPrice: position.entryPrice, // Will be updated
          createdAt: position.createdAt,
          openedAt: position.createdAt,
          lastUpdated: new Date()
        };

        this.activeTrades.set(tradeId, tradeState);

        // Track trade ID in memory
        if (!existingTradeId) {
          console.log(`📝 CFT Trade ID ${tradeId} mapped to position ${position.id}`);
        }
      }

    } catch (error) {
      console.error('❌ Error loading existing CFT positions:', error);
    }
  }

  private startPositionMonitoring(): void {
    // Update all positions every 30 seconds
    setInterval(async () => {
      try {
        await this.updateAllPositions();
      } catch (error) {
        console.error('❌ CFT position monitoring error:', error);
      }
    }, 30000);

    console.log('📊 CFT position monitoring started (30s intervals)');
  }

  private async monitorTradeExecution(tradeId: string): Promise<void> {
    const maxAttempts = 20; // 2 minutes max
    let attempts = 0;

    const checkFill = async () => {
      const trade = this.activeTrades.get(tradeId);
      if (!trade || !trade.bybitOrderId) return;

      try {
        // Check order status with ByBit
        const orderStatus = await this.bybitClient.getOrderHistory({
          category: 'spot',
          orderId: trade.bybitOrderId
        });

        if (orderStatus && orderStatus.result?.list?.[0]) {
          const order = orderStatus.result.list[0];

          if (order.orderStatus === 'Filled') {
            // Order filled
            trade.status = 'FILLED';
            trade.filledQuantity = parseFloat(order.cumExecQty || trade.requestedQuantity.toString());
            trade.averageFillPrice = parseFloat(order.avgPrice || '0');
            trade.entryPrice = trade.averageFillPrice;
            trade.openedAt = new Date();
            trade.lastUpdated = new Date();

            // Mark as OPEN for position tracking
            trade.status = 'OPEN';

            console.log(`✅ CFT TRADE FILLED: ${tradeId} - ${trade.filledQuantity} @ ${trade.averageFillPrice}`);

            // Set up risk management orders if specified
            await this.setupRiskManagementOrders(tradeId);

          } else if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Rejected') {
            // Order failed
            trade.status = 'CANCELLED';
            trade.closingReason = `Order ${order.orderStatus}`;
            trade.closedAt = new Date();

            // Move to history
            this.activeTrades.delete(tradeId);
            this.tradeHistory.push(trade);

            console.log(`❌ CFT TRADE CANCELLED: ${tradeId} - ${order.orderStatus}`);

          } else if (attempts < maxAttempts) {
            // Still pending, check again in 6 seconds
            setTimeout(checkFill, 6000);
            attempts++;
          } else {
            // Timeout
            console.warn(`⏰ CFT TRADE MONITORING TIMEOUT: ${tradeId}`);
          }
        }

      } catch (error) {
        console.error(`❌ CFT trade execution monitoring error for ${tradeId}:`, error);
      }
    };

    // Start monitoring
    setTimeout(checkFill, 2000); // Initial check after 2 seconds
  }

  private async monitorTradeClosing(tradeId: string, closeOrderId: string): Promise<void> {
    const maxAttempts = 20;
    let attempts = 0;

    const checkClose = async () => {
      const trade = this.activeTrades.get(tradeId);
      if (!trade) return;

      try {
        const orderStatus = await this.bybitClient.getOrderHistory({
          category: 'spot',
          orderId: closeOrderId
        });

        if (orderStatus && orderStatus.result?.list?.[0]) {
          const order = orderStatus.result.list[0];

          if (order.orderStatus === 'Filled') {
            // Calculate final P&L
            const closingPrice = parseFloat(order.avgPrice || '0');
            const quantity = trade.filledQuantity;

            // Calculate P&L based on trade direction
            const isLong = trade.openingDecision?.finalDecision === 'BUY';
            const pnl = isLong ?
              (closingPrice - trade.entryPrice!) * quantity :
              (trade.entryPrice! - closingPrice) * quantity;

            // Update final trade state
            trade.status = 'CLOSED';
            trade.realizedPnL = pnl;
            trade.closedAt = new Date();
            trade.holdTime = (trade.closedAt.getTime() - trade.openedAt!.getTime()) / 60000; // minutes

            console.log(`✅ CFT TRADE CLOSED: ${tradeId} - P&L: $${pnl.toFixed(4)} (${trade.holdTime.toFixed(1)}min)`);

            // Move to history
            this.activeTrades.delete(tradeId);
            this.tradeHistory.push(trade);

            // Update database
            await this.updateDatabaseOnClose(trade);

          } else if (attempts < maxAttempts) {
            setTimeout(checkClose, 6000);
            attempts++;
          } else {
            console.warn(`⏰ CFT TRADE CLOSE MONITORING TIMEOUT: ${tradeId}`);
          }
        }

      } catch (error) {
        console.error(`❌ CFT trade closing monitoring error for ${tradeId}:`, error);
      }
    };

    setTimeout(checkClose, 2000);
  }

  private async setupRiskManagementOrders(tradeId: string): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade || !trade.entryPrice) return;

    try {
      const symbol = this.getSymbolFromTradeId(tradeId);

      // Set up stop loss if specified
      if (trade.stopLossPrice) {
        const stopResult = await this.bybitClient.placeOrder({
          category: 'spot',
          symbol,
          side: trade.openingDecision?.finalDecision === 'BUY' ? 'Sell' : 'Buy',
          orderType: 'Market', // ByBit uses Market for stop loss in spot
          qty: trade.filledQuantity.toString(),
          triggerPrice: trade.stopLossPrice.toString(),
          timeInForce: 'GTC'
        });

        if (stopResult && stopResult.retCode === 0) {
          trade.stopLossOrderId = stopResult.result.orderId;
          console.log(`🛡️ CFT STOP LOSS SET: ${tradeId} @ ${trade.stopLossPrice}`);
        }
      }

      // Set up take profit if specified
      if (trade.takeProfitPrice) {
        const profitResult = await this.bybitClient.placeOrder({
          category: 'spot',
          symbol,
          side: trade.openingDecision?.finalDecision === 'BUY' ? 'Sell' : 'Buy',
          orderType: 'Limit',
          qty: trade.filledQuantity.toString(),
          price: trade.takeProfitPrice.toString(),
          timeInForce: 'GTC'
        });

        if (profitResult && profitResult.retCode === 0) {
          trade.takeProfitOrderId = profitResult.result.orderId;
          console.log(`🎯 CFT TAKE PROFIT SET: ${tradeId} @ ${trade.takeProfitPrice}`);
        }
      }

    } catch (error) {
      console.error(`❌ CFT risk management setup error for ${tradeId}:`, error);
    }
  }

  private async updateTradePosition(tradeId: string): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade || trade.status !== 'OPEN') return;

    try {
      const symbol = this.getSymbolFromTradeId(tradeId);

      // Get current market price
      const currentPrice = await realTimePriceFetcher.getCurrentPrice(symbol);
      if (!currentPrice) return;

      const isLong = trade.openingDecision?.finalDecision === 'BUY';

      // Calculate unrealized P&L
      const unrealizedPnL = isLong ?
        (currentPrice - trade.entryPrice!) * trade.filledQuantity :
        (trade.entryPrice! - currentPrice) * trade.filledQuantity;

      // Update trade state
      trade.currentPrice = currentPrice;
      trade.unrealizedPnL = unrealizedPnL;
      trade.lastUpdated = new Date();

      // Track maximum profit/drawdown
      if (!trade.maxProfit || unrealizedPnL > trade.maxProfit) {
        trade.maxProfit = unrealizedPnL;
      }
      if (!trade.maxDrawdown || unrealizedPnL < trade.maxDrawdown) {
        trade.maxDrawdown = unrealizedPnL;
      }

    } catch (error) {
      console.error(`❌ CFT position update error for ${tradeId}:`, error);
    }
  }

  private async persistTradeToDatabase(
    trade: ByBitTradeLifecycleState,
    symbol: string,
    side: 'BUY' | 'SELL',
    source: string
  ): Promise<void> {
    try {
      await prisma.managedTrade.create({
        data: {
          symbol,
          side: side.toLowerCase(),
          quantity: trade.requestedQuantity,
          entryPrice: trade.averageFillPrice || 0,
          status: 'open',
          strategy: 'cft_unified_tensor_coordinator',
          confidence: trade.openingDecision?.confidence || 0.5,
          metadata: {
            tradeId: trade.tradeId,
            source,
            unifiedDecision: trade.openingDecision,
            bybitOrderId: trade.bybitOrderId
          }
        }
      });
    } catch (error) {
      console.error(`❌ CFT database persistence error for ${trade.tradeId}:`, error);
    }
  }

  private async updateDatabaseOnClose(trade: ByBitTradeLifecycleState): Promise<void> {
    try {
      await prisma.managedTrade.updateMany({
        where: {
          metadata: {
            path: ['tradeId'],
            equals: trade.tradeId
          }
        },
        data: {
          status: 'closed',
          realizedPnL: trade.realizedPnL,
          metadata: {
            path: ['closingData'],
            set: {
              closedAt: trade.closedAt,
              holdTime: trade.holdTime,
              closingReason: trade.closingReason
            }
          }
        }
      });
    } catch (error) {
      console.error(`❌ CFT database update on close error for ${trade.tradeId}:`, error);
    }
  }

  private getSymbolFromTradeId(tradeId: string): string {
    // Extract symbol from trade ID format: CFT_SYMBOL_SIDE_TIMESTAMP_UUID
    return tradeId.split('_')[1];
  }

  private getDailyTradeCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.tradeHistory.filter(trade =>
      trade.createdAt >= today
    ).length;
  }

  private calculateSourceBreakdown(trades: ByBitTradeLifecycleState[]): any {
    const breakdown: { [key: string]: number } = {};

    for (const trade of trades) {
      const source = trade.openingDecision?.source || 'unknown';
      breakdown[source] = (breakdown[source] || 0) + 1;
    }

    return breakdown;
  }
}

// Export singleton instance
export const bybitTradeLifecycleManager = ByBitTradeLifecycleManager.getInstance();

export default bybitTradeLifecycleManager;