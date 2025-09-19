/**
 * TRADE LIFECYCLE MANAGER™
 * Advanced trade management system with unique identifiers and lifecycle tracking
 *
 * Features:
 * - Unique trade IDs for every position
 * - Complete trade lifecycle management (PENDING → OPEN → CLOSED)
 * - Risk management integration
 * - Performance tracking per trade
 * - Integration with Unified Tensor Coordinator decisions
 */

import { PrismaClient } from '@prisma/client';
import { krakenApiService } from './kraken-api-service';
import { realTimePriceFetcher } from './real-time-price-fetcher';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface TradeIdentifier {
  tradeId: string;          // Unique UUID for this trade
  symbol: string;           // Trading pair (e.g., "BTCUSD")
  side: 'BUY' | 'SELL';     // Trade direction
  timestamp: Date;          // When trade was initiated
  source: 'unified_coordinator' | 'profit_predator' | 'manual' | 'stop_loss' | 'take_profit';
}

export interface TradeLifecycleState {
  tradeId: string;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'CANCELLED' | 'FAILED';

  // Order information
  krakenOrderId?: string;   // Kraken's order ID
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

export class TradeLifecycleManager {
  private static instance: TradeLifecycleManager;
  private activeTrades: Map<string, TradeLifecycleState> = new Map();
  private tradeHistory: TradeLifecycleState[] = [];

  static getInstance(): TradeLifecycleManager {
    if (!TradeLifecycleManager.instance) {
      TradeLifecycleManager.instance = new TradeLifecycleManager();
    }
    return TradeLifecycleManager.instance;
  }

  constructor() {
    console.log('🆔 TRADE LIFECYCLE MANAGER™ INITIALIZED');
    console.log('⚡ Unique trade identifier and lifecycle management active');

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
    source: TradeIdentifier['source'] = 'unified_coordinator'
  ): Promise<{ tradeId: string; success: boolean; krakenOrderId?: string; error?: string }> {

    // Generate unique trade identifier
    const tradeId = this.generateTradeId(symbol, side);

    console.log(`🆔 INITIATING TRADE: ${tradeId} - ${side} ${quantity} ${symbol}`);

    try {
      // Create initial trade lifecycle state
      const tradeState: TradeLifecycleState = {
        tradeId,
        status: 'PENDING',
        krakenOrderId: undefined,
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

      // Execute trade through Kraken API
      const orderType = unifiedDecision?.execution?.orderType || 'market';
      const limitPrice = unifiedDecision?.execution?.limitPrice;

      const orderResult = await krakenApiService.placeOrder({
        symbol,
        side: side.toLowerCase(),
        quantity,
        orderType,
        price: limitPrice,
        timeInForce: unifiedDecision?.execution?.timeInForce || 'GTC'
      });

      if (orderResult.success && orderResult.orderId) {
        // Update trade state with Kraken order ID
        tradeState.krakenOrderId = orderResult.orderId;
        tradeState.status = 'PARTIALLY_FILLED'; // Will update based on fill status
        tradeState.lastUpdated = new Date();

        // Store in database
        await this.persistTradeToDatabase(tradeState, symbol, side, source);

        console.log(`✅ TRADE INITIATED: ${tradeId} → Kraken Order: ${orderResult.orderId}`);

        // Start monitoring this specific trade
        this.monitorTradeExecution(tradeId);

        return {
          tradeId,
          success: true,
          krakenOrderId: orderResult.orderId
        };

      } else {
        // Order failed
        tradeState.status = 'FAILED';
        tradeState.closingReason = `Order placement failed: ${orderResult.error}`;
        tradeState.closedAt = new Date();

        // Move to history
        this.activeTrades.delete(tradeId);
        this.tradeHistory.push(tradeState);

        console.error(`❌ TRADE FAILED: ${tradeId} - ${orderResult.error}`);

        return {
          tradeId,
          success: false,
          error: orderResult.error
        };
      }

    } catch (error) {
      console.error(`❌ TRADE INITIATION ERROR: ${tradeId}`, error);

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
    orderType: 'market' | 'limit' = 'market',
    limitPrice?: number
  ): Promise<{ success: boolean; krakenOrderId?: string; error?: string }> {

    const trade = this.activeTrades.get(tradeId);
    if (!trade) {
      return { success: false, error: `Trade ${tradeId} not found in active trades` };
    }

    if (trade.status !== 'OPEN' && trade.status !== 'FILLED') {
      return { success: false, error: `Trade ${tradeId} is not in open state (status: ${trade.status})` };
    }

    console.log(`🔄 CLOSING TRADE: ${tradeId} - Reason: ${reason}`);

    try {
      // Determine closing side (opposite of opening)
      const symbol = await this.getSymbolFromTradeId(tradeId);
      const closingSide = trade.openingDecision?.finalDecision === 'BUY' ? 'sell' : 'buy';
      const closeQuantity = trade.filledQuantity;

      // Execute closing order
      const closeResult = await krakenApiService.placeOrder({
        symbol,
        side: closingSide,
        quantity: closeQuantity,
        orderType,
        price: limitPrice,
        timeInForce: 'GTC'
      });

      if (closeResult.success) {
        // Update trade state
        trade.status = 'CLOSING';
        trade.closingReason = reason;
        trade.lastUpdated = new Date();

        console.log(`✅ CLOSE ORDER PLACED: ${tradeId} → Kraken Order: ${closeResult.orderId}`);

        // Monitor the closing order
        this.monitorTradeClosing(tradeId, closeResult.orderId!);

        return {
          success: true,
          krakenOrderId: closeResult.orderId
        };

      } else {
        console.error(`❌ CLOSE ORDER FAILED: ${tradeId} - ${closeResult.error}`);
        return {
          success: false,
          error: closeResult.error
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
  getActiveTrades(): Map<string, TradeLifecycleState> {
    return new Map(this.activeTrades);
  }

  /**
   * Get specific trade by ID
   */
  getTradeById(tradeId: string): TradeLifecycleState | undefined {
    return this.activeTrades.get(tradeId);
  }

  /**
   * Get trade statistics
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

      // Risk metrics
      totalUnrealizedPnL: active.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0),
      maxDrawdownActive: Math.min(0, ...active.map(t => t.maxDrawdown || 0)),

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
   * PRIVATE METHODS
   */

  private generateTradeId(symbol: string, side: 'BUY' | 'SELL'): string {
    const timestamp = Date.now();
    const uuid = uuidv4().slice(0, 8); // Short UUID
    return `${symbol}_${side}_${timestamp}_${uuid}`;
  }

  private async loadExistingPositions(): Promise<void> {
    try {
      // Load open positions from database and create trade IDs
      const openPositions = await prisma.managedPosition.findMany({
        where: { status: 'open' }
      });

      console.log(`📋 LOADING EXISTING POSITIONS: Found ${openPositions.length} open positions`);

      for (const position of openPositions) {
        // Create trade ID for existing position (if not already exists)
        const existingTradeId = position.metadata?.tradeId as string;
        const tradeId = existingTradeId || this.generateTradeId(position.symbol, position.side.toUpperCase() as 'BUY' | 'SELL');

        const tradeState: TradeLifecycleState = {
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

        // Track trade ID in memory - database schema doesn't support metadata
        if (!existingTradeId) {
          // Store trade ID mapping in memory for this session
          if (!position.metadata) {
            position.metadata = {};
          }
          position.metadata.tradeId = tradeId;
          console.log(`📝 Trade ID ${tradeId} mapped to position ${position.id} (in-memory)`);
        }
      }

    } catch (error) {
      console.error('❌ Error loading existing positions:', error);
    }
  }

  private startPositionMonitoring(): void {
    // Update all positions every 30 seconds
    setInterval(async () => {
      try {
        await this.updateAllPositions();
      } catch (error) {
        console.error('❌ Position monitoring error:', error);
      }
    }, 30000);

    console.log('📊 Position monitoring started (30s intervals)');
  }

  private async monitorTradeExecution(tradeId: string): Promise<void> {
    const maxAttempts = 20; // 2 minutes max
    let attempts = 0;

    const checkFill = async () => {
      const trade = this.activeTrades.get(tradeId);
      if (!trade || !trade.krakenOrderId) return;

      try {
        // Check order status with Kraken
        const orderStatus = await krakenApiService.getOrderStatus(trade.krakenOrderId);

        if (orderStatus.status === 'closed') {
          // Order filled
          trade.status = 'FILLED';
          trade.filledQuantity = orderStatus.filledQuantity || trade.requestedQuantity;
          trade.averageFillPrice = orderStatus.averagePrice || 0;
          trade.entryPrice = trade.averageFillPrice;
          trade.openedAt = new Date();
          trade.lastUpdated = new Date();

          // Mark as OPEN for position tracking
          trade.status = 'OPEN';

          console.log(`✅ TRADE FILLED: ${tradeId} - ${trade.filledQuantity} @ ${trade.averageFillPrice}`);

          // Set up risk management orders if specified
          await this.setupRiskManagementOrders(tradeId);

        } else if (orderStatus.status === 'canceled' || orderStatus.status === 'expired') {
          // Order failed
          trade.status = 'CANCELLED';
          trade.closingReason = `Order ${orderStatus.status}`;
          trade.closedAt = new Date();

          // Move to history
          this.activeTrades.delete(tradeId);
          this.tradeHistory.push(trade);

          console.log(`❌ TRADE CANCELLED: ${tradeId} - ${orderStatus.status}`);

        } else if (attempts < maxAttempts) {
          // Still pending, check again in 6 seconds
          setTimeout(checkFill, 6000);
          attempts++;
        } else {
          // Timeout
          console.warn(`⏰ TRADE MONITORING TIMEOUT: ${tradeId}`);
        }

      } catch (error) {
        console.error(`❌ Trade execution monitoring error for ${tradeId}:`, error);
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
        const orderStatus = await krakenApiService.getOrderStatus(closeOrderId);

        if (orderStatus.status === 'closed') {
          // Calculate final P&L
          const closingPrice = orderStatus.averagePrice || 0;
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

          console.log(`✅ TRADE CLOSED: ${tradeId} - P&L: ${pnl.toFixed(4)} (${trade.holdTime.toFixed(1)}min)`);

          // Move to history
          this.activeTrades.delete(tradeId);
          this.tradeHistory.push(trade);

          // Update database
          await this.updateDatabaseOnClose(trade);

        } else if (attempts < maxAttempts) {
          setTimeout(checkClose, 6000);
          attempts++;
        } else {
          console.warn(`⏰ TRADE CLOSE MONITORING TIMEOUT: ${tradeId}`);
        }

      } catch (error) {
        console.error(`❌ Trade closing monitoring error for ${tradeId}:`, error);
      }
    };

    setTimeout(checkClose, 2000);
  }

  private async setupRiskManagementOrders(tradeId: string): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade || !trade.entryPrice) return;

    try {
      const symbol = await this.getSymbolFromTradeId(tradeId);

      // Set up stop loss if specified
      if (trade.stopLossPrice) {
        const stopResult = await krakenApiService.placeOrder({
          symbol,
          side: trade.openingDecision?.finalDecision === 'BUY' ? 'sell' : 'buy',
          quantity: trade.filledQuantity,
          orderType: 'stop_loss',
          stopPrice: trade.stopLossPrice,
          timeInForce: 'GTC'
        });

        if (stopResult.success) {
          trade.stopLossOrderId = stopResult.orderId;
          console.log(`🛡️ STOP LOSS SET: ${tradeId} @ ${trade.stopLossPrice}`);
        }
      }

      // Set up take profit if specified
      if (trade.takeProfitPrice) {
        const profitResult = await krakenApiService.placeOrder({
          symbol,
          side: trade.openingDecision?.finalDecision === 'BUY' ? 'sell' : 'buy',
          quantity: trade.filledQuantity,
          orderType: 'limit',
          price: trade.takeProfitPrice,
          timeInForce: 'GTC'
        });

        if (profitResult.success) {
          trade.takeProfitOrderId = profitResult.orderId;
          console.log(`🎯 TAKE PROFIT SET: ${tradeId} @ ${trade.takeProfitPrice}`);
        }
      }

    } catch (error) {
      console.error(`❌ Risk management setup error for ${tradeId}:`, error);
    }
  }

  private async updateTradePosition(tradeId: string): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade || trade.status !== 'OPEN') return;

    try {
      const symbol = await this.getSymbolFromTradeId(tradeId);

      // Get current market price using the correct service
      const priceData = await realTimePriceFetcher.getCurrentPrice(symbol);
      if (!priceData.success) return;

      const currentPrice = priceData.price;
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
      console.error(`❌ Position update error for ${tradeId}:`, error);
    }
  }

  private async persistTradeToDatabase(
    trade: TradeLifecycleState,
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
          strategy: 'unified_tensor_coordinator',
          confidence: trade.openingDecision?.confidence || 0.5,
          metadata: {
            tradeId: trade.tradeId,
            source,
            unifiedDecision: trade.openingDecision,
            krakenOrderId: trade.krakenOrderId
          }
        }
      });
    } catch (error) {
      console.error(`❌ Database persistence error for ${trade.tradeId}:`, error);
    }
  }

  private async updateDatabaseOnClose(trade: TradeLifecycleState): Promise<void> {
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
      console.error(`❌ Database update on close error for ${trade.tradeId}:`, error);
    }
  }

  private async getSymbolFromTradeId(tradeId: string): Promise<string> {
    // Extract symbol from trade ID format: SYMBOL_SIDE_TIMESTAMP_UUID
    return tradeId.split('_')[0];
  }

  private calculateSourceBreakdown(trades: TradeLifecycleState[]): any {
    const breakdown: { [key: string]: number } = {};

    for (const trade of trades) {
      const source = trade.openingDecision?.source || 'unknown';
      breakdown[source] = (breakdown[source] || 0) + 1;
    }

    return breakdown;
  }
}

// Export singleton instance
export const tradeLifecycleManager = TradeLifecycleManager.getInstance();

export default tradeLifecycleManager;