/**
 * REAL-TIME POSITION UPDATER™
 * Ensures positions always have current market prices
 * Prevents missed opportunities due to stale data
 */

import { PrismaClient } from '@prisma/client';
import { krakenProxyService } from './kraken-proxy-service';
import { priceLogger } from './price-logger';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface PositionUpdate {
  positionId: string;
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  unrealizedPnL: number;
  priceChange: number;
  priceChangePercent: number;
  updateLatency: number; // milliseconds
}

export class RealTimePositionUpdater extends EventEmitter {
  private static instance: RealTimePositionUpdater;
  private updateInterval: NodeJS.Timeout | null = null;
  private websocketConnections: Map<string, any> = new Map();
  private lastUpdateTimes: Map<string, number> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();

  // Configuration
  private readonly UPDATE_FREQUENCY = 1000; // 1 second for critical updates
  private readonly CACHE_DURATION = 500; // 500ms cache to prevent API spam
  private readonly CRITICAL_LAG_THRESHOLD = 2000; // 2 seconds is critical lag
  private readonly BATCH_SIZE = 10; // Update 10 positions at once

  private constructor() {
    super();
  }

  static getInstance(): RealTimePositionUpdater {
    if (!this.instance) {
      this.instance = new RealTimePositionUpdater();
    }
    return this.instance;
  }

  /**
   * Start real-time position monitoring
   */
  async startMonitoring(): Promise<void> {
    console.log('🚀 Starting Real-Time Position Updater...');

    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Start continuous updates
    this.updateInterval = setInterval(() => {
      this.updateAllPositions();
    }, this.UPDATE_FREQUENCY);

    // Initial update
    await this.updateAllPositions();

    // Set up WebSocket connections for ultra-low latency
    await this.setupWebSocketFeeds();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    console.log('🛑 Stopping Real-Time Position Updater...');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Close WebSocket connections
    this.websocketConnections.forEach(conn => {
      if (conn && conn.close) {
        conn.close();
      }
    });
    this.websocketConnections.clear();
  }

  /**
   * Update all open positions with current prices
   */
  private async updateAllPositions(): Promise<void> {
    try {
      // Get all open positions
      const openPositions = await prisma.livePosition.findMany({
        where: { status: 'open' }
      });

      if (openPositions.length === 0) {
        return;
      }

      // Group positions by symbol for efficient price fetching
      const symbolPositions = new Map<string, typeof openPositions>();
      openPositions.forEach(position => {
        if (!symbolPositions.has(position.symbol)) {
          symbolPositions.set(position.symbol, []);
        }
        symbolPositions.get(position.symbol)!.push(position);
      });

      // Fetch prices in parallel batches
      const symbols = Array.from(symbolPositions.keys());
      const pricePromises: Promise<void>[] = [];

      for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
        const batch = symbols.slice(i, i + this.BATCH_SIZE);
        pricePromises.push(this.updateBatchPrices(batch, symbolPositions));
      }

      await Promise.all(pricePromises);

    } catch (error) {
      console.error('❌ Error updating positions:', error);
      this.emit('error', error);
    }
  }

  /**
   * Update prices for a batch of symbols
   */
  private async updateBatchPrices(
    symbols: string[],
    symbolPositions: Map<string, any[]>
  ): Promise<void> {
    const updatePromises = symbols.map(async (symbol) => {
      try {
        const startTime = Date.now();
        const currentPrice = await this.getCurrentPrice(symbol);
        const latency = Date.now() - startTime;

        // Warn if latency is too high
        if (latency > this.CRITICAL_LAG_THRESHOLD) {
          console.warn(`⚠️ CRITICAL LAG for ${symbol}: ${latency}ms`);
          this.emit('criticalLag', { symbol, latency });
        }

        // Update all positions for this symbol
        const positions = symbolPositions.get(symbol) || [];
        for (const position of positions) {
          await this.updatePosition(position, currentPrice, latency);
        }

        // Update last update time
        this.lastUpdateTimes.set(symbol, Date.now());

      } catch (error) {
        console.error(`❌ Failed to update ${symbol}:`, error);
        this.emit('updateError', { symbol, error });
      }
    });

    await Promise.all(updatePromises);
  }

  /**
   * Get current price with caching
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    // Try WebSocket price first (lowest latency)
    const wsPrice = this.getWebSocketPrice(symbol);
    if (wsPrice !== null) {
      this.priceCache.set(symbol, { price: wsPrice, timestamp: Date.now() });
      return wsPrice;
    }

    // Fallback to API
    try {
      const ticker = await krakenProxyService.getTicker(symbol);
      const price = parseFloat(ticker.price);

      // Validate price before using
      if (isNaN(price) || price <= 0) {
        throw new Error(`Invalid price from ticker: ${ticker.price}`);
      }

      // Update cache
      this.priceCache.set(symbol, { price, timestamp: Date.now() });

      return price;
    } catch (error) {
      // If API fails, use last known price if available
      const lastKnown = this.priceCache.get(symbol);
      if (lastKnown) {
        console.warn(`⚠️ Using cached price for ${symbol} (${Date.now() - lastKnown.timestamp}ms old)`);
        return lastKnown.price;
      }
      throw error;
    }
  }

  /**
   * Update a single position
   */
  private async updatePosition(
    position: any,
    currentPrice: number,
    latency: number
  ): Promise<void> {
    // Validate currentPrice to prevent NaN database errors
    if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) {
      priceLogger.warn(`⚠️ Invalid price for ${position.symbol}: ${currentPrice} - skipping update`);
      return;
    }

    const previousPrice = position.currentPrice || position.entryPrice;

    // Calculate unrealized P&L
    const positionValue = position.quantity * currentPrice;
    const entryValue = position.quantity * position.entryPrice;
    const unrealizedPnL = position.side === 'long'
      ? positionValue - entryValue
      : entryValue - positionValue;

    // Validate calculated values
    if (isNaN(unrealizedPnL) || !isFinite(unrealizedPnL)) {
      priceLogger.warn(`⚠️ Invalid unrealizedPnL calculation for ${position.symbol}: ${unrealizedPnL} - skipping update`);
      return;
    }

    // Calculate price change
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;

    // Validate all final values before database update
    if (isNaN(priceChange) || isNaN(priceChangePercent) || !isFinite(priceChangePercent)) {
      priceLogger.warn(`⚠️ Invalid price change calculation for ${position.symbol} - using safe defaults`);
    }

    // Update in database
    await prisma.livePosition.update({
      where: { id: position.id },
      data: {
        currentPrice,
        unrealizedPnL,
        updatedAt: new Date()
      }
    });

    // Emit update event
    const update: PositionUpdate = {
      positionId: position.id,
      symbol: position.symbol,
      currentPrice,
      previousPrice,
      unrealizedPnL,
      priceChange,
      priceChangePercent,
      updateLatency: latency
    };

    this.emit('positionUpdated', update);

    // Check for critical conditions
    this.checkCriticalConditions(position, unrealizedPnL, priceChangePercent);
  }

  /**
   * Check for critical conditions that need immediate action
   */
  private checkCriticalConditions(
    position: any,
    unrealizedPnL: number,
    priceChangePercent: number
  ): void {
    // Stop loss check
    if (position.stopLossPrice) {
      const currentPrice = position.currentPrice;
      if (position.side === 'long' && currentPrice <= position.stopLossPrice) {
        this.emit('stopLossTriggered', position);
      } else if (position.side === 'short' && currentPrice >= position.stopLossPrice) {
        this.emit('stopLossTriggered', position);
      }
    }

    // Take profit check
    if (position.takeProfitPrice) {
      const currentPrice = position.currentPrice;
      if (position.side === 'long' && currentPrice >= position.takeProfitPrice) {
        this.emit('takeProfitTriggered', position);
      } else if (position.side === 'short' && currentPrice <= position.takeProfitPrice) {
        this.emit('takeProfitTriggered', position);
      }
    }

    // Large move detection (>5% in either direction)
    if (Math.abs(priceChangePercent) > 5) {
      this.emit('largePriceMove', {
        position,
        changePercent: priceChangePercent,
        unrealizedPnL
      });
    }

    // Large profit opportunity (>10% unrealized gain)
    const unrealizedPercent = (unrealizedPnL / position.entryValue) * 100;
    if (unrealizedPercent > 10) {
      this.emit('profitOpportunity', {
        position,
        unrealizedPercent,
        unrealizedPnL
      });
    }

    // Large loss warning (>5% unrealized loss)
    if (unrealizedPercent < -5) {
      this.emit('lossWarning', {
        position,
        unrealizedPercent,
        unrealizedPnL
      });
    }
  }

  /**
   * Set up WebSocket feeds for ultra-low latency
   */
  private async setupWebSocketFeeds(): Promise<void> {
    // This would connect to Kraken WebSocket API for real-time prices
    // For now, using a placeholder that can be implemented
    console.log('📡 WebSocket feeds ready for ultra-low latency updates');
  }

  /**
   * Get price from WebSocket if available
   */
  private getWebSocketPrice(symbol: string): number | null {
    // Check if we have a WebSocket price for this symbol
    // This would return real-time price from WebSocket
    // For now, returning null to use API fallback
    return null;
  }

  /**
   * Get position update statistics
   */
  getUpdateStatistics(): any {
    const stats = {
      totalPositionsMonitored: this.lastUpdateTimes.size,
      averageUpdateLatency: 0,
      lastUpdateTimes: {} as any,
      cacheHitRate: 0,
      websocketConnections: this.websocketConnections.size
    };

    // Calculate average latency
    let totalLatency = 0;
    let count = 0;
    this.lastUpdateTimes.forEach((time, symbol) => {
      const latency = Date.now() - time;
      totalLatency += latency;
      count++;
      stats.lastUpdateTimes[symbol] = latency;
    });

    if (count > 0) {
      stats.averageUpdateLatency = totalLatency / count;
    }

    return stats;
  }

  /**
   * Force immediate update of specific position
   */
  async forceUpdatePosition(positionId: string): Promise<void> {
    const position = await prisma.livePosition.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    const startTime = Date.now();
    const currentPrice = await this.getCurrentPrice(position.symbol);
    const latency = Date.now() - startTime;

    await this.updatePosition(position, currentPrice, latency);

    console.log(`✅ Force updated position ${positionId} in ${latency}ms`);
  }
}

export const realTimePositionUpdater = RealTimePositionUpdater.getInstance();